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
  const p = tech.last;
  const atrv = tech.atr || (p != null ? p * 0.02 : null);
  const support = tech.support;
  const resistance = tech.resistance;
  const base = { entry: null, breakout: null, stopLoss: null, target1: null, target2: null, riskReward: null };
  if (p == null || atrv == null) return { ...base, action: 'NO TRADE', reason: 'Insufficient verified technical evidence.' };
  const longBias = tech.score >= 65 && tech.trend !== 'DOWNTREND';
  const shortBias = tech.score <= 38 && tech.trend === 'DOWNTREND';
  if (longBias) {
    const entryLow = support && support < p ? p * 0.985 : support || p - atrv * 0.6;
    const entryHigh = p;
    const sl = Math.min(entryLow - atrv * 0.6, p - 1.5 * atrv);
    const t1 = resistance && resistance > p ? resistance : p + 2 * atrv;
    const t2 = Math.max(t1 + atrv * 1.5, p + 3.5 * atrv);
    base.entry = { low: entryLow, high: entryHigh };
    base.breakout = resistance && resistance > p ? resistance : null;
    base.stopLoss = sl;
    base.target1 = t1;
    base.target2 = t2;
    base.riskReward = (t1 - p) / (p - sl);
  } else if (shortBias) {
    const sl = p + 1.5 * atrv;
    const t1 = support && support < p ? support : p - 2 * atrv;
    const t2 = Math.min(t1 - atrv * 1.5, p - 3.5 * atrv);
    base.entry = { low: p, high: p };
    base.stopLoss = sl;
    base.target1 = t1;
    base.target2 = t2;
    base.riskReward = (p - t1) / (sl - p);
  }
  let action = 'NO TRADE', reason = 'Signals are mixed.';
  if (longBias && tech.rsi != null && tech.rsi < 78) { action = 'BUY'; reason = 'Trend, momentum and structure are aligned.'; }
  else if (shortBias) { action = 'SELL'; reason = 'Trend and momentum are bearish.'; }
  else if (tech.trend !== 'DOWNTREND' && tech.rsi != null && tech.rsi < 45) { action = 'BUY ON PULLBACK'; reason = 'Trend is constructive but momentum needs a better entry.'; }
  else if (tech.trend === 'UPTREND') { action = 'HOLD / WAIT'; reason = 'Trend is positive but current confirmation is not strong enough for a fresh entry.'; }
  return { ...base, action, reason };
}

/**
 * Trading consumer migration boundary.
 *
 * All market-derived technical calculations now originate in the canonical
 * technical engine through technicalCompatibility(). This module retains the
 * legacy consumer shape and its interpretation temporarily so downstream API
 * contracts do not change during the migration. Canonical breakout/structure/
 * risk evidence is exposed under technical.canonicalEvidence and remains the
 * authoritative evidence source for subsequent consumer migrations.
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
