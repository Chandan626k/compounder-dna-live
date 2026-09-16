import { calculateCanonicalTechnical } from './canonical-technical-engine.js';

function finite(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function legacyUsableRows(rows) {
  return (Array.isArray(rows) ? rows : []).filter((row) =>
    finite(row?.close) && finite(row?.high) && finite(row?.low) && finite(row?.volume)
  );
}

/**
 * Compatibility adapter:
 * canonical verified technical evidence -> legacy market-engine technical() contract.
 * The adapter preserves the legacy field names, but does not recalculate
 * technical metrics. Canonical values are authoritative; compatibility is
 * limited to shape/serialization and the legacy volumeTrend field now supplied
 * by the canonical engine.
 */
export function technicalCompatibility(rows, context = {}) {
  const usable = legacyUsableRows(rows);
  if (!usable.length) throw Error('No usable market prices returned by provider');
  const canonical = calculateCanonicalTechnical(usable, {
    symbol: context.symbol ?? null,
    source: context.source ?? 'Yahoo Finance chart',
    retrievedAt: context.retrievedAt ?? usable.at(-1)?.retrievedAt ?? null,
    timeframe: context.timeframe ?? '1d',
    nowMs: context.nowMs ?? Date.now(),
  });
  if (canonical.status !== 'VERIFIED') throw Error(`No usable market prices returned by provider: ${canonical.reason}`);
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
    adx: canonical.adx,
    macd: canonical.macd,
    bollinger: canonical.bollinger,
    high: canonical.high,
    low: canonical.low,
    high52Week: canonical.high52Week,
    low52Week: canonical.low52Week,
    support: canonical.support,
    resistance: canonical.resistance,
    volume: canonical.volume,
    avgVolume: canonical.avgVolume,
    volumeSpike: canonical.relativeVolume,
    relativeVolume: canonical.relativeVolume,
    volumeTrend: canonical.volumeTrend,
    trend: canonical.trend,
    trendStrength: canonical.trendStrength,
    trendStrengthBasis: canonical.trendStrengthBasis,
    has52WeekHistory: canonical.has52WeekHistory,
    last: canonical.last,
    change1d: canonical.change1d,
    change20d: canonical.change20d,
    change3m: canonical.change3m,
    change6m: canonical.change6m,
    change1y: canonical.change1y,
    distanceFrom200DMA: canonical.distanceFrom200DMA,
    distanceFrom52WHigh: canonical.distanceFrom52WHigh,
    distanceFrom52WLow: canonical.distanceFrom52WLow,
    drawdown: canonical.drawdown,
    rangePosition: canonical.rangePosition,
    provenance: {
      ...canonical.provenance,
      adapter: 'legacy-market-engine-technical-v2',
      compatibility: {
        fieldMapping: 'CANONICAL_TECHNICAL_ENGINE_V1',
        legacyFiltering: 'CLOSE_HIGH_LOW_VOLUME_FINITE_ONLY',
        semantics: 'NO_RECALCULATION; CANONICAL_VALUES_ONLY',
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
      breakoutLifecycle: canonical.breakoutLifecycle,
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
      volumeTrend: canonical.volumeTrend,
      high52Week: canonical.high52Week,
      low52Week: canonical.low52Week,
      has52WeekHistory: canonical.has52WeekHistory,
      historyBars: canonical.historyBars,
      provenance: canonical.provenance,
    },
  };
}
