import { technicalCompatibility } from './technical-compatibility-adapter.js';

const n = (v) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
};
const clamp = (x, a = 0, b = 100) => Math.max(a, Math.min(b, Number.isFinite(x) ? x : a));

function scoreTechnical(t) {
  let s = 50;
  const why = [];
  if (t.last > t.e20) { s += 7; why.push('Price above EMA20'); } else { s -= 7; why.push('Price below EMA20'); }
  if (t.e20 > t.e50) { s += 8; why.push('EMA20 above EMA50'); } else { s -= 8; why.push('EMA20 below EMA50'); }
  if (t.e50 > t.e200) { s += 8; why.push('EMA50 above EMA200'); } else { s -= 8; why.push('EMA50 below EMA200'); }
  if (t.rsi != null) {
    if (t.rsi >= 55 && t.rsi <= 72) { s += 7; why.push('RSI confirms momentum'); }
    else if (t.rsi > 75) { s -= 3; why.push('RSI overheated'); }
    else if (t.rsi < 40) { s -= 6; why.push('RSI weak'); }
  }
  if (t.macd?.histogram != null) { if (t.macd.histogram > 0) { s += 7; why.push('MACD positive'); } else { s -= 7; why.push('MACD negative'); } }
  if (t.adx != null) { if (t.adx >= 25) s += 6; else if (t.adx < 18) s -= 3; }
  if (t.relativeVolume != null && t.relativeVolume >= 1.2) s += 5;
  return { score: clamp(s), why };
}

function makeTrade(tech) {
  const lifecycle = tech.canonicalEvidence?.breakoutLifecycle || null;
  const risk = lifecycle?.riskEvidence;
  const verifiedRisk = lifecycle && ['SUCCESSFUL_RETEST', 'CONTINUATION'].includes(lifecycle.status)
    && risk?.status === 'VERIFIED'
    && n(risk.invalidationLevel) != null
    && Array.isArray(risk.targetZones)
    && risk.targetZones.length > 0
    && n(risk.riskReward) != null;
  const base = {
    entry: verifiedRisk ? (risk.entryZone ?? null) : null,
    breakout: lifecycle?.breakoutLevel ?? null,
    stopLoss: verifiedRisk ? risk.invalidationLevel : null,
    target1: verifiedRisk ? risk.targetZones[0] : null,
    target2: verifiedRisk ? (risk.targetZones[1] ?? null) : null,
    riskReward: verifiedRisk ? risk.riskReward : null,
  };
  return {
    ...base,
    action: 'NO TRADE',
    reason: verifiedRisk
      ? 'Canonical breakout/retest risk evidence is available for research; production trading remains disabled.'
      : lifecycle?.status === 'FAILED' || lifecycle?.status === 'FAILED_RETEST'
        ? 'Canonical breakout lifecycle failed; no trade action is authorized.'
        : 'Technical evidence is research-only; no production trade action is authorized.',
  };
}

/**
 * Trading consumer migration boundary.
 *
 * All market-derived technical calculations originate in the canonical
 * technical engine through technicalCompatibility(). The legacy consumer
 * shape remains for downstream compatibility, while canonical breakout,
 * structure and risk evidence are the authoritative technical evidence.
 * Technical score is explanatory evidence only and cannot authorize an action.
 */
function buildTrading(analysis, rows, context = {}) {
  const technical = technicalCompatibility(rows, {
    symbol: analysis?.stock?.symbol ?? context.symbol ?? null,
    source: context.source ?? 'Yahoo Finance chart',
    retrievedAt: context.retrievedAt ?? null,
    timeframe: context.timeframe ?? '1d',
    nowMs: context.nowMs ?? Date.now(),
  });

  const scoring = scoreTechnical(technical);
  const tech = { ...technical, score: scoring.score, why: scoring.why };
  const trade = makeTrade(tech);
  const f = analysis.fundamentals || {}, r = f.ratios || {}, v = analysis.valuation || {}, sc = analysis.score || {}, dq = analysis.dataQuality || {};
  const fundamental = clamp(50 + (Number(sc.overall) || 50) * 0.5 + (Number(r.roe) || 0) * 0.15);
  const valuation = v.verdict === 'UNDERVALUED' ? 85 : v.verdict === 'FAIRLY VALUED' ? 70 : v.verdict === 'EXPENSIVE' ? 45 : v.verdict === 'VERY EXPENSIVE' ? 25 : 55;
  const risk = clamp(100 - (Number(sc.risk) || 50));
  const longScore = clamp(fundamental * 0.55 + valuation * 0.25 + risk * 0.20);
  let longAction = longScore >= 78 ? 'BUY' : longScore >= 68 ? 'ACCUMULATE' : longScore >= 55 ? 'HOLD' : longScore >= 45 ? 'REDUCE' : 'SELL';
  const confidence = n(dq.confidence);
  if (confidence == null || confidence < 60) longAction = 'DATA INSUFFICIENT';
  else if (confidence < 70 && ['BUY', 'ACCUMULATE'].includes(longAction)) longAction = 'DATA INSUFFICIENT';
  else if (confidence < 80 && longAction === 'BUY') longAction = 'ACCUMULATE / DATA BUILDING';
  const longTerm = {
    score: Math.round(longScore),
    action: longAction,
    fundamental: Math.round(fundamental),
    valuation,
    financialStrength: Math.round(risk),
    buyBelow: v.baseFairValue ? Number(v.baseFairValue) * 0.9 : null,
    fairValue: v.baseFairValue ?? v.fairValue ?? null,
    reason: longAction === 'BUY' ? 'Quality, valuation and financial strength support accumulation.' : longAction === 'ACCUMULATE / DATA BUILDING' ? 'The investment case is constructive, but evidence coverage is not yet strong enough for an unqualified BUY.' : 'Evidence quality or risk/reward does not justify an aggressive new position.',
  };
  return {
    symbol: analysis.stock?.symbol,
    price: tech.last,
    currency: 'INR',
    asOf: new Date().toISOString(),
    chart: rows.filter((row) => n(row.close) != null && n(row.high) != null && n(row.low) != null && n(row.volume) != null).slice(-180),
    technical: tech,
    trade,
    periods: { longTerm: '3–10Y', swing: '2–20D', shortTerm: '1–5D' },
    longTerm,
    meta: { dataConfidence: confidence, source: 'Yahoo Finance chart + StockSamjho deterministic analysis', technicalEngine: 'canonical-technical-engine-v1 via technical-compatibility-adapter-v1' },
  };
}

export { buildTrading };
