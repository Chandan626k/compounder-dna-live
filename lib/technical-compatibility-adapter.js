import { calculateCanonicalTechnical } from './canonical-technical-engine.js';

function finite(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function legacyUsableRows(rows) {
  return (Array.isArray(rows) ? rows : []).filter((row) =>
    finite(row?.close) &&
    finite(row?.high) &&
    finite(row?.low) &&
    finite(row?.volume)
  );
}

function legacyTrend(canonical) {
  const last = canonical.last;
  const { e20, e50, e200 } = canonical;

  if (e200 != null) {
    if (last > e20 && e20 > e50 && e50 > e200) return 'STRONG UPTREND';
    if (last > e50 && e50 > e200) return 'UPTREND';
    if (last < e50 && e50 < e200) return 'DOWNTREND';
    return 'RECOVERING / MIXED';
  }

  return e50 != null && last > e50
    ? 'UPTREND'
    : 'RECOVERING / MIXED';
}

function legacySupportResistance(rows) {
  if (rows.length < 20) return { support: null, resistance: null };
  const recent = rows.slice(-20);
  return {
    support: Math.min(...recent.map((row) => row.low)),
    resistance: Math.max(...recent.map((row) => row.high)),
  };
}

function legacy52Week(rows) {
  if (rows.length < 252) {
    return { has52WeekHistory: false, high: null, low: null };
  }
  const year = rows.slice(-252);
  return {
    has52WeekHistory: true,
    high: Math.max(...year.map((row) => row.high)),
    low: Math.min(...year.map((row) => row.low)),
  };
}

function legacyVolumeTrend(rows) {
  if (rows.length < 40) return null;
  const volumes = rows.map((row) => row.volume);
  const current = volumes.slice(-20).reduce((sum, value) => sum + value, 0) / 20;
  const previous = volumes.slice(-40, -20).reduce((sum, value) => sum + value, 0) / 20;
  return previous > 0 ? ((current / previous) - 1) * 100 : null;
}

/**
 * Compatibility adapter:
 * canonical verified technical evidence -> legacy market-engine technical() contract.
 *
 * Compatibility semantics are intentionally preserved for fields consumed by
 * scoring/actionability:
 * - legacy trend strings
 * - legacy trendStrength = absolute distance from SMA200
 * - legacy 20-bar support/resistance
 * - legacy 252-usable-row 52-week qualification
 *
 * Canonical provenance and validation remain authoritative for the evidence
 * actually used to produce the compatibility output.
 */
export function technicalCompatibility(rows, context = {}) {
  const usable = legacyUsableRows(rows);

  if (!usable.length) {
    throw Error('No usable market prices returned by provider');
  }

  const canonical = calculateCanonicalTechnical(usable, {
    symbol: context.symbol ?? null,
    source: context.source ?? 'Yahoo Finance chart',
    retrievedAt: context.retrievedAt ?? usable.at(-1)?.retrievedAt ?? null,
    timeframe: context.timeframe ?? '1d',
    nowMs: context.nowMs ?? Date.now(),
  });

  if (canonical.status !== 'VERIFIED') {
    throw Error(`No usable market prices returned by provider: ${canonical.reason}`);
  }

  const { has52WeekHistory, high, low } = legacy52Week(usable);
  const { support, resistance } = legacySupportResistance(usable);
  const distanceFrom200DMA = canonical.distanceFrom200DMA;
  const volumeTrend = legacyVolumeTrend(usable);
  const trend = legacyTrend(canonical);

  return {
    prices: canonical.prices,
    s20: canonical.s20,
    s50: canonical.s50,
    s200: canonical.s200,
    e20: canonical.e20,
    e50: canonical.e50,
    e200: canonical.e200,
    rsi: canonical.rsi,
    atr: canonical.atr,
    high,
    low,
    high52Week: high,
    low52Week: low,
    support,
    resistance,
    volume: canonical.volume,
    avgVolume: canonical.avgVolume,
    volumeSpike: canonical.relativeVolume,
    relativeVolume: canonical.relativeVolume,
    volumeTrend,
    trend,
    trendStrength: Math.abs(distanceFrom200DMA ?? 0),
    trendStrengthBasis: 'absolute percentage distance from SMA200; not a statistical trend-strength score',
    has52WeekHistory,
    last: canonical.last,
    change1d: canonical.change1d,
    change20d: canonical.change20d,
    change3m: canonical.change3m,
    change6m: canonical.change6m,
    change1y: canonical.change1y,
    distanceFrom200DMA,
    distanceFrom52WHigh: high ? ((canonical.last / high) - 1) * 100 : null,
    distanceFrom52WLow: low ? ((canonical.last / low) - 1) * 100 : null,
    drawdown: high > 0 ? Math.max(0, (1 - canonical.last / high) * 100) : null,
    rangePosition: high != null && low != null && high > low
      ? ((canonical.last - low) / (high - low)) * 100
      : null,
    provenance: {
      ...canonical.provenance,
      adapter: 'legacy-market-engine-technical-v1',
      compatibility: {
        trend: 'LEGACY_MARKET_ENGINE_SEMANTICS',
        trendStrength: 'ABSOLUTE_DISTANCE_FROM_SMA200',
        supportResistance: 'LAST_20_USABLE_BARS_EXTREMA',
        week52: 'REQUIRES_252_USABLE_ROWS',
        legacyFiltering: 'CLOSE_HIGH_LOW_VOLUME_FINITE_ONLY',
      },
    },
    canonicalEvidence: {
      status: canonical.status,
      trend: canonical.trend,
      trendStrengthAdx: canonical.trendStrength,
      support: canonical.support,
      resistance: canonical.resistance,
      breakout: canonical.breakout,
      breakdown: canonical.breakdown,
      structure: canonical.structure,
      momentum: canonical.momentum,
      volatility: canonical.volatility,
      setup: canonical.setup,
      technicalConfidence: canonical.technicalConfidence,
      confidenceBasis: canonical.confidenceBasis,
      atrPct: canonical.atrPct,
      adx: canonical.adx,
      macd: canonical.macd,
      bollinger: canonical.bollinger,
      periodVwap: canonical.periodVwap,
      vwapSemantics: canonical.vwapSemantics,
      historyBars: canonical.historyBars,
      provenance: canonical.provenance,
    },
  };
}

export { legacyTrend, legacySupportResistance, legacy52Week, legacyVolumeTrend };
