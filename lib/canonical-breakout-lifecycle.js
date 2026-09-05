const finite = (value) => typeof value === 'number' && Number.isFinite(value);

function relativeVolumeAt(rows, index, period = 20) {
  const start = Math.max(0, index - period + 1);
  const sample = rows.slice(start, index + 1).map((row) => row.volume).filter(finite);
  if (sample.length < period) return null;
  const average = sample.reduce((sum, value) => sum + value, 0) / sample.length;
  return average > 0 ? rows[index].volume / average : null;
}

function atrAt(rows, index, period = 14) {
  if (index < period) return null;
  const ranges = [];
  for (let i = index - period + 1; i <= index; i += 1) {
    const current = rows[i];
    const previous = rows[i - 1];
    if (!previous) continue;
    ranges.push(Math.max(current.high - current.low, Math.abs(current.high - previous.close), Math.abs(current.low - previous.close)));
  }
  return ranges.length === period ? ranges.reduce((sum, value) => sum + value, 0) / period : null;
}

function confirmedPivotsAt(rows, index, { pivotSpan = 2, lookback = 120 } = {}) {
  const first = Math.max(0, index - lookback);
  const highs = [];
  const lows = [];
  const lastPivotIndex = index - pivotSpan;
  for (let pivot = first + pivotSpan; pivot <= lastPivotIndex; pivot += 1) {
    const row = rows[pivot];
    const before = rows.slice(pivot - pivotSpan, pivot);
    const after = rows.slice(pivot + 1, pivot + 1 + pivotSpan);
    if (after.length < pivotSpan) continue;
    if (row.high >= Math.max(...before.map((item) => item.high)) && row.high >= Math.max(...after.map((item) => item.high))) highs.push({ index: pivot, date: row.date, price: row.high });
    if (row.low <= Math.min(...before.map((item) => item.low)) && row.low <= Math.min(...after.map((item) => item.low))) lows.push({ index: pivot, date: row.date, price: row.low });
  }
  return { highs, lows };
}

function levelZone(level, atr, tolerancePct = 0.01, atrMultiplier = 0.5) {
  if (!finite(level)) return null;
  const width = Math.max(level * tolerancePct, finite(atr) ? atr * atrMultiplier : 0);
  return width > 0 ? { lower: level - width, upper: level + width, width } : null;
}

function volumeStatus(rv) {
  if (rv == null) return 'UNAVAILABLE';
  return rv >= 1.2 ? 'CONFIRMED' : 'LOW';
}

function chooseBreakout(rows, index, options) {
  const pivots = confirmedPivotsAt(rows, index, options);
  const high = pivots.highs.at(-1);
  const low = pivots.lows.at(-1);
  const row = rows[index];
  const candidates = [];
  if (high && row.high > high.price) candidates.push({ direction: 'UP', level: high.price, pivot: high });
  if (low && row.low < low.price) candidates.push({ direction: 'DOWN', level: low.price, pivot: low });
  if (!candidates.length) return null;
  candidates.sort((a, b) => Math.abs(row.close - b.level) - Math.abs(row.close - a.level));
  return candidates[0];
}

function riskEvidence({ direction, entry, entryZone, invalidation, targetZones, status, timeframe, provenance }) {
  const validEntry = finite(entry);
  const validInvalidation = finite(invalidation);
  const risk = validEntry && validInvalidation ? Math.abs(entry - invalidation) : null;
  const targets = targetZones.filter(finite);
  const positiveRewards = targets.map((target) => direction === 'UP' ? target - entry : entry - target).filter((value) => value > 0);
  const reward = risk != null && positiveRewards.length ? Math.max(...positiveRewards) : null;
  const rr = risk > 0 && reward != null ? reward / risk : null;
  return {
    entryZone: entryZone ?? (validEntry ? { center: entry } : null),
    invalidationLevel: validInvalidation ? invalidation : null,
    stopReference: validInvalidation ? { level: invalidation, basis: 'breakout/retest thesis invalidation' } : null,
    targetZones: targets.length ? targets : null,
    risk,
    reward,
    riskReward: rr,
    status: status === 'SUCCESSFUL_RETEST' || status === 'CONTINUATION' ? (risk > 0 && reward != null ? 'VERIFIED' : 'UNAVAILABLE') : 'UNAVAILABLE',
    timeframe,
    provenance,
  };
}

/**
 * Daily-first breakout/retest lifecycle. Every observation is classified only
 * from candles available at that timestamp. A pivot becomes eligible only
 * after pivotSpan completed candles confirm it, so future candles cannot
 * retroactively create a breakout or retest at an earlier timestamp.
 */
export function calculateCanonicalBreakoutLifecycle(rows, context = {}, options = {}) {
  const timeframe = context.timeframe || '1d';
  const provenance = {
    symbol: context.symbol || null,
    source: context.source || null,
    retrievedAt: context.retrievedAt || null,
    timeframe,
    dataQuality: 'VERIFIED',
    engine: 'canonical-breakout-lifecycle',
  };
  const pivotSpan = options.pivotSpan ?? 2;
  const lookback = options.lookback ?? 120;
  const maxRetestBars = options.maxRetestBars ?? 10;
  if (!Array.isArray(rows) || rows.length < Math.max(30, pivotSpan * 2 + 5)) {
    return { status: 'INSUFFICIENT_DATA', setupType: null, direction: null, timeframe, evidenceAvailability: 'INSUFFICIENT_DATA', provenance };
  }

  let active = null;
  const events = [];
  for (let i = Math.max(20, pivotSpan * 2 + 2); i < rows.length; i += 1) {
    const row = rows[i];
    if (!active) {
      const candidate = chooseBreakout(rows, i, { pivotSpan, lookback });
      if (candidate && ((candidate.direction === 'UP' && row.close > candidate.level) || (candidate.direction === 'DOWN' && row.close < candidate.level))) {
        const atr = atrAt(rows, i);
        const rv = relativeVolumeAt(rows, i);
        active = {
          direction: candidate.direction,
          level: candidate.level,
          breakoutIndex: i,
          breakoutDate: row.date,
          breakoutClose: row.close,
          breakoutHigh: row.high,
          breakoutLow: row.low,
          breakoutDisplacement: candidate.direction === 'UP' ? row.close - candidate.level : candidate.level - row.close,
          breakoutAtr: atr,
          breakoutRelativeVolume: rv,
          breakoutVolumeStatus: volumeStatus(rv),
          retestZone: levelZone(candidate.level, atr),
          retestIndex: null,
          retestDate: null,
          retestExtreme: null,
          status: 'CONFIRMED',
        };
        events.push({ type: 'BREAKOUT_CONFIRMED', index: i, date: row.date });
      }
      continue;
    }

    const barsSinceBreakout = i - active.breakoutIndex;
    if (barsSinceBreakout === 0) continue;
    const zone = active.retestZone;
    const touched = zone && active.direction === 'UP'
      ? row.low <= zone.upper && row.high >= zone.lower
      : zone && row.high >= zone.lower && row.low <= zone.upper;
    const closesBackInside = active.direction === 'UP' ? row.close < active.level : row.close > active.level;

    if (closesBackInside) {
      active.status = active.retestIndex == null ? 'FAILED' : 'FAILED_RETEST';
      active.failureIndex = i;
      active.failureDate = row.date;
      active.failureReason = active.retestIndex == null ? 'CLOSE_BACK_BELOW_BREAKOUT_LEVEL' : 'RETEST_CLOSE_BACK_ACROSS_BREAKOUT_LEVEL';
      events.push({ type: active.status, index: i, date: row.date });
      break;
    }

    if (active.retestIndex == null && touched && barsSinceBreakout <= maxRetestBars) {
      active.retestIndex = i;
      active.retestDate = row.date;
      active.retestExtreme = active.direction === 'UP' ? row.low : row.high;
      active.status = 'SUCCESSFUL_RETEST';
      active.retestVolumeStatus = volumeStatus(relativeVolumeAt(rows, i));
      events.push({ type: 'RETEST_HOLD', index: i, date: row.date });
      continue;
    }

    if (active.retestIndex != null) {
      const continued = active.direction === 'UP' ? row.close > active.breakoutHigh : row.close < active.breakoutLow;
      if (continued) {
        active.status = 'CONTINUATION';
        active.continuationIndex = i;
        active.continuationDate = row.date;
        events.push({ type: 'CONTINUATION', index: i, date: row.date });
        break;
      }
    }

    if (barsSinceBreakout <= maxRetestBars && active.retestIndex == null) active.status = 'PENDING_RETEST';
    if (barsSinceBreakout > maxRetestBars && active.retestIndex == null) {
      active.status = 'CONFIRMED';
      active.retestStatus = 'NO_RETEST_OBSERVED';
      break;
    }
  }

  if (!active) {
    return { status: 'NO_BREAKOUT', setupType: 'BREAKOUT_WATCH', direction: null, timeframe, evidenceAvailability: 'SUFFICIENT_NO_BREAKOUT', events, provenance };
  }

  const current = rows.at(-1);
  const atrNow = atrAt(rows, rows.length - 1);
  const invalidation = active.retestIndex != null ? active.retestExtreme : null;
  const targetLevels = Array.isArray(context.targetLevels) ? context.targetLevels
    .map((target) => typeof target === 'number' ? target : target?.price)
    .filter(finite)
    .filter((target) => active.direction === 'UP' ? target > active.level : target < active.level)
    : [];
  const dedupedTargets = [...new Set(targetLevels.map((value) => Number(value.toFixed(6))))]
    .sort((a, b) => active.direction === 'UP' ? a - b : b - a)
    .slice(0, 3);
  const risk = riskEvidence({
    direction: active.direction,
    entry: active.retestIndex != null ? active.level : null,
    entryZone: active.retestZone,
    invalidation: active.retestIndex != null ? invalidation : null,
    targetZones: dedupedTargets,
    status: active.status,
    timeframe,
    provenance,
  });

  const overextended = finite(atrNow) && Math.abs(current.close - active.level) > 2 * atrNow;
  const technicalConfidence = active.status === 'FAILED' || active.status === 'FAILED_RETEST'
    ? 0
    : Math.round([
        true,
        active.breakoutVolumeStatus === 'CONFIRMED',
        active.breakoutVolumeStatus !== 'UNAVAILABLE',
        active.retestIndex != null,
        active.status === 'CONTINUATION',
        !overextended,
        risk.invalidationLevel != null,
      ].filter(Boolean).length / 7 * 100);

  return {
    status: active.status,
    setupType: active.status === 'FAILED' || active.status === 'FAILED_RETEST' ? 'FAILED_BREAKOUT' : 'BREAKOUT_RETEST',
    direction: active.direction,
    timeframe,
    breakoutLevel: active.level,
    breakoutCandle: { date: active.breakoutDate, close: active.breakoutClose, high: active.breakoutHigh, low: active.breakoutLow },
    breakoutDisplacement: active.breakoutDisplacement,
    retestZone: active.retestZone,
    retestAttempt: active.retestIndex != null ? { date: active.retestDate, extreme: active.retestExtreme } : null,
    confirmationEvidence: {
      closeBeyondLevel: true,
      volumeStatus: active.breakoutVolumeStatus,
      relativeVolume: active.breakoutRelativeVolume,
      atrAtBreakout: active.breakoutAtr,
      pivotConfirmedBeforeBreakout: true,
    },
    failureEvidence: active.failureIndex != null ? { date: active.failureDate, reason: active.failureReason } : null,
    supportResistanceFlip: active.retestIndex != null && active.status !== 'FAILED_RETEST' ? { direction: active.direction, level: active.level, confirmed: true } : null,
    continuation: active.status === 'CONTINUATION' ? { confirmed: true, date: active.continuationDate } : null,
    overextended,
    riskEvidence: risk,
    technicalConfidence,
    evidenceAvailability: risk.invalidationLevel == null ? 'BREAKOUT_CONFIRMED_BUT_RISK_EVIDENCE_INCOMPLETE' : 'SUFFICIENT',
    events,
    noLookAhead: {
      pivotConfirmationBars: pivotSpan,
      currentObservationDate: current.date,
      historicalEventsUseOnlyBarsAvailableAtEvent: true,
    },
    provenance,
  };
}
