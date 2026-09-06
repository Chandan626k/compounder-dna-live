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
    const current = rows[i], previous = rows[i - 1];
    if (!previous) continue;
    ranges.push(Math.max(current.high - current.low, Math.abs(current.high - previous.close), Math.abs(current.low - previous.close)));
  }
  return ranges.length === period ? ranges.reduce((sum, value) => sum + value, 0) / period : null;
}
function confirmedPivotsAt(rows, index, { pivotSpan = 2, lookback = 120 } = {}) {
  const first = Math.max(0, index - lookback), highs = [], lows = [], lastPivotIndex = index - pivotSpan;
  for (let pivot = first + pivotSpan; pivot <= lastPivotIndex; pivot += 1) {
    const row = rows[pivot], before = rows.slice(pivot - pivotSpan, pivot), after = rows.slice(pivot + 1, pivot + 1 + pivotSpan);
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
function volumeStatus(rv) { if (rv == null) return 'UNAVAILABLE'; return rv >= 1.2 ? 'CONFIRMED' : 'LOW'; }
function chooseBreakout(rows, index, options) {
  const pivots = confirmedPivotsAt(rows, index, options), high = pivots.highs.at(-1), low = pivots.lows.at(-1), row = rows[index], candidates = [];
  if (high && row.high > high.price) candidates.push({ direction: 'UP', level: high.price, pivot: high });
  if (low && row.low < low.price) candidates.push({ direction: 'DOWN', level: low.price, pivot: low });
  if (!candidates.length) return null;
  candidates.sort((a, b) => Math.abs(row.close - b.level) - Math.abs(row.close - a.level));
  return candidates[0];
}
function isConfirmedCross(rows, index, candidate) {
  if (!candidate || index <= 0) return false;
  const row = rows[index], previous = rows[index - 1];
  return candidate.direction === 'UP' ? row.close > candidate.level && previous.close <= candidate.level : row.close < candidate.level && previous.close >= candidate.level;
}
function riskEvidence({ direction, entry, entryZone, invalidation, targetZones, targetEvidence, status, timeframe, provenance, breakoutLevel, retestZone, retestAttempt, marketStructure, supportResistance, atrAtBreakout }) {
  const validEntry = finite(entry), rawInvalidation = invalidation;
  const invalidationIsDefensible = validEntry && finite(rawInvalidation) && (direction === 'UP' ? rawInvalidation < entry : rawInvalidation > entry);
  const validInvalidation = invalidationIsDefensible ? rawInvalidation : null;
  const risk = validEntry && validInvalidation != null ? Math.abs(entry - validInvalidation) : null;
  const targets = targetZones.filter(finite);
  const positiveRewards = targets.map((target) => direction === 'UP' ? target - entry : entry - target).filter((value) => value > 0);
  const reward = risk != null && positiveRewards.length ? Math.min(...positiveRewards) : null;
  const rr = risk > 0 && reward != null ? reward / risk : null;
  return {
    entryZone: entryZone ?? (validEntry ? { center: entry } : null),
    invalidationLevel: validInvalidation,
    stopReference: validInvalidation != null ? { level: validInvalidation, basis: 'retest extreme beyond breakout level' } : null,
    invalidationEvidence: {
      available: validInvalidation != null,
      breakoutLevel: finite(breakoutLevel) ? breakoutLevel : null,
      retestZone: retestZone ?? null,
      retestAttempt: retestAttempt ?? null,
      retestExtreme: finite(rawInvalidation) ? rawInvalidation : null,
      marketStructure: marketStructure ?? null,
      supportResistance: supportResistance ?? null,
      atrAtBreakout: finite(atrAtBreakout) ? atrAtBreakout : null,
      directionalCheck: invalidationIsDefensible,
    },
    targetZones: targets.length ? targets : null,
    targetEvidence: targetEvidence?.length ? targetEvidence : null,
    risk,
    reward,
    riskReward: rr,
    status: status === 'SUCCESSFUL_RETEST' || status === 'CONTINUATION' ? (risk > 0 && reward != null ? 'VERIFIED' : 'UNAVAILABLE') : 'UNAVAILABLE',
    basis: { breakoutLevel, retestZone, marketStructure: marketStructure ?? null, supportResistance: supportResistance ?? null, atrAtBreakout: finite(atrAtBreakout) ? atrAtBreakout : null },
    timeframe,
    provenance,
  };
}
export function calculateCanonicalBreakoutLifecycle(rows, context = {}, options = {}) {
  const timeframe = context.timeframe || '1d', provenance = { symbol: context.symbol || null, source: context.source || null, retrievedAt: context.retrievedAt || null, timeframe, dataQuality: 'VERIFIED', engine: 'canonical-breakout-lifecycle' }, pivotSpan = options.pivotSpan ?? 2, lookback = options.lookback ?? 120, maxRetestBars = options.maxRetestBars ?? 10;
  if (!Array.isArray(rows) || rows.length < Math.max(30, pivotSpan * 2 + 5)) return { status: 'INSUFFICIENT_DATA', setupType: null, direction: null, timeframe, evidenceAvailability: 'INSUFFICIENT_DATA', provenance };
  let active = null;
  const events = [];
  for (let i = Math.max(20, pivotSpan * 2 + 2); i < rows.length; i += 1) {
    const row = rows[i], candidate = chooseBreakout(rows, i, { pivotSpan, lookback });
    if (isConfirmedCross(rows, i, candidate)) {
      const atr = atrAt(rows, i), rv = relativeVolumeAt(rows, i);
      active = { direction: candidate.direction, level: candidate.level, breakoutIndex: i, breakoutDate: row.date, breakoutClose: row.close, breakoutHigh: row.high, breakoutLow: row.low, breakoutDisplacement: candidate.direction === 'UP' ? row.close - candidate.level : candidate.level - row.close, breakoutAtr: atr, breakoutRelativeVolume: rv, breakoutVolumeStatus: volumeStatus(rv), retestZone: levelZone(candidate.level, atr), retestIndex: null, retestDate: null, retestExtreme: null, status: 'PENDING_RETEST' };
      events.push({ type: 'BREAKOUT_CONFIRMED', index: i, date: row.date, level: candidate.level, direction: candidate.direction });
      continue;
    }
    if (!active || active.status === 'FAILED' || active.status === 'FAILED_RETEST' || active.status === 'CONTINUATION') continue;
    const barsSinceBreakout = i - active.breakoutIndex;
    if (barsSinceBreakout <= 0) continue;
    const zone = active.retestZone, touched = zone && active.direction === 'UP' ? row.low <= zone.upper && row.high >= zone.lower : zone && row.high >= zone.lower && row.low <= zone.upper, closesBackInside = active.direction === 'UP' ? row.close < active.level : row.close > active.level;
    if (active.retestIndex == null) {
      if (closesBackInside) {
        active.status = 'FAILED'; active.failureIndex = i; active.failureDate = row.date; active.failureReason = 'CLOSE_BACK_BELOW_BREAKOUT_LEVEL';
        events.push({ type: 'FAILED', index: i, date: row.date }); continue;
      }
      if (touched && barsSinceBreakout <= maxRetestBars) {
        active.retestIndex = i; active.retestDate = row.date; active.retestExtreme = active.direction === 'UP' ? row.low : row.high; active.status = 'RETEST_PENDING'; active.retestVolumeStatus = volumeStatus(relativeVolumeAt(rows, i)); events.push({ type: 'RETEST_TOUCHED', index: i, date: row.date }); continue;
      }
    } else if (active.status === 'RETEST_PENDING') {
      if (closesBackInside) {
        active.status = 'FAILED_RETEST'; active.failureIndex = i; active.failureDate = row.date; active.failureReason = 'RETEST_CLOSE_BACK_ACROSS_BREAKOUT_LEVEL';
        events.push({ type: 'FAILED_RETEST', index: i, date: row.date }); continue;
      }
      active.status = 'SUCCESSFUL_RETEST';
      events.push({ type: 'RETEST_CONFIRMED', index: i, date: row.date });
      continue;
    }
    if (active.status === 'SUCCESSFUL_RETEST') {
      const continued = active.direction === 'UP' ? row.close > active.breakoutHigh : row.close < active.breakoutLow;
      if (continued) { active.status = 'CONTINUATION'; active.continuationIndex = i; active.continuationDate = row.date; events.push({ type: 'CONTINUATION', index: i, date: row.date }); continue; }
    }
    if (barsSinceBreakout > maxRetestBars && active.retestIndex == null) { active.status = 'CONFIRMED'; active.retestStatus = 'NO_RETEST_OBSERVED'; }
  }
  if (!active) return { status: 'NO_BREAKOUT', setupType: 'BREAKOUT_WATCH', direction: null, timeframe, evidenceAvailability: 'SUFFICIENT_NO_BREAKOUT', events, provenance };
  const current = rows.at(-1), atrNow = atrAt(rows, rows.length - 1), invalidationCandidate = active.retestIndex != null ? active.retestExtreme : null;
  const rawTargetLevels = Array.isArray(context.targetLevels) ? context.targetLevels : [];
  const targetCandidates = rawTargetLevels.map((target) => {
    if (typeof target === 'number') return { price: target, type: null, touches: null, strength: null, lastDate: null };
    return { price: target?.price, type: target?.type ?? null, touches: target?.touches ?? null, strength: target?.strength ?? null, lastDate: target?.lastDate ?? null };
  }).filter((target) => finite(target.price));
  const directionalTargets = targetCandidates.filter((target) => {
    const validType = target.type == null || (active.direction === 'UP' ? target.type === 'RESISTANCE' : target.type === 'SUPPORT');
    return validType && (active.direction === 'UP' ? target.price > active.level : target.price < active.level);
  });
  const dedupedTargetMap = new Map();
  for (const target of directionalTargets) if (!dedupedTargetMap.has(Number(target.price.toFixed(6)))) dedupedTargetMap.set(Number(target.price.toFixed(6)), target);
  const dedupedTargets = [...dedupedTargetMap.entries()].sort((a, b) => active.direction === 'UP' ? a[0] - b[0] : b[0] - a[0]).slice(0, 3);
  const targetLevels = dedupedTargets.map(([price]) => price), targetEvidence = dedupedTargets.map(([price, evidence]) => ({ price, type: evidence.type, touches: evidence.touches, strength: evidence.strength, lastDate: evidence.lastDate }));
  const risk = riskEvidence({ direction: active.direction, entry: active.retestIndex != null ? active.level : null, entryZone: active.retestZone, invalidation: invalidationCandidate, targetZones: targetLevels, targetEvidence, status: active.status, timeframe, provenance, breakoutLevel: active.level, retestZone: active.retestZone, retestAttempt: active.retestIndex != null ? { date: active.retestDate, extreme: active.retestExtreme } : null, marketStructure: context.marketStructure, supportResistance: context.supportResistance, atrAtBreakout: active.breakoutAtr });
  const overextended = finite(atrNow) && Math.abs(current.close - active.level) > 2 * atrNow, technicalConfidence = active.status === 'FAILED' || active.status === 'FAILED_RETEST' ? 0 : Math.round([true, active.breakoutVolumeStatus === 'CONFIRMED', active.breakoutVolumeStatus !== 'UNAVAILABLE', active.status === 'SUCCESSFUL_RETEST' || active.status === 'CONTINUATION', !overextended, risk.invalidationLevel != null, context.marketStructure?.state != null].filter(Boolean).length / 7 * 100);
  return { status: active.status, setupType: active.status === 'FAILED' || active.status === 'FAILED_RETEST' ? 'FAILED_BREAKOUT' : 'BREAKOUT_RETEST', direction: active.direction, timeframe, breakoutLevel: active.level, breakoutCandle: { date: active.breakoutDate, close: active.breakoutClose, high: active.breakoutHigh, low: active.breakoutLow }, breakoutDisplacement: active.breakoutDisplacement, retestZone: active.retestZone, retestAttempt: active.retestIndex != null ? { date: active.retestDate, extreme: active.retestExtreme } : null, confirmationEvidence: { closeBeyondLevel: true, volumeStatus: active.breakoutVolumeStatus, relativeVolume: active.breakoutRelativeVolume, atrAtBreakout: active.breakoutAtr, pivotConfirmedBeforeBreakout: true }, failureEvidence: active.failureIndex != null ? { date: active.failureDate, reason: active.failureReason } : null, supportResistanceFlip: active.retestIndex != null && active.status !== 'FAILED_RETEST' ? { direction: active.direction, level: active.level, confirmed: active.status === 'SUCCESSFUL_RETEST' || active.status === 'CONTINUATION' } : null, continuation: active.status === 'CONTINUATION' ? { confirmed: true, date: active.continuationDate } : null, overextended, riskEvidence: risk, technicalConfidence, evidenceAvailability: risk.invalidationLevel == null ? 'BREAKOUT_CONFIRMED_BUT_RISK_EVIDENCE_INCOMPLETE' : 'SUFFICIENT', events, noLookAhead: { pivotConfirmationBars: pivotSpan, currentObservationDate: current.date, historicalEventsUseOnlyBarsAvailableAtEvent: true }, provenance };
}
