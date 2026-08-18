// Decision layer: converts verified research inputs into an actionable, horizon-specific stance.
// It never fabricates missing data and never bypasses the production BUY/SELL gate.

const n = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const round = (v, d = 1) => n(v) == null ? null : Number(v.toFixed(d));
const clamp = (v, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n(v) ?? lo));

export const ACTIONABILITY_POLICY_VERSION = '1.0';

function sectorCoverage(analysis) {
  const s = analysis?.score?.sectorFramework || analysis?.dataQuality?.sectorFramework || {};
  const available = n(s.available);
  const total = n(s.total);
  if (available != null && total > 0) return round((available / total) * 100, 0);
  return null;
}

function technicalState(t) {
  const price = n(t?.last);
  const e20 = n(t?.e20);
  const e50 = n(t?.e50);
  const e200 = n(t?.e200);
  const rsi = n(t?.rsi);
  const relVol = n(t?.relativeVolume);
  const macd = n(t?.macd?.histogram);
  const support = n(t?.support);
  const resistance = n(t?.resistance);
  const atr = n(t?.atr);
  const vwap = n(t?.vwap);

  const bullishStructure = e20 != null && e50 != null && e200 != null && e20 > e50 && e50 > e200;
  const priceAbove20 = price != null && e20 != null && price > e20;
  const priceAbove50 = price != null && e50 != null && price > e50;
  const priceAbove200 = price != null && e200 != null && price > e200;
  const momentumWeak = (rsi != null && rsi < 50) || (macd != null && macd < 0);
  const volumeWeak = relVol != null && relVol < 1;
  const belowVwap = price != null && vwap != null && price < vwap;

  let stance = 'MIXED';
  if (bullishStructure && priceAbove200 && priceAbove20 && !momentumWeak) stance = 'BULLISH_CONFIRMATION';
  else if (bullishStructure && priceAbove200 && (!priceAbove20 || momentumWeak || volumeWeak)) stance = 'BULLISH_PULLBACK';
  else if (!priceAbove50 && !priceAbove200) stance = 'BEARISH_STRUCTURE';

  const reclaim = e20;
  const breakdown = support;
  const stop = support != null && atr != null ? support - atr : null;
  const target1 = resistance;
  const target2 = resistance != null && atr != null ? resistance + atr : null;

  return {
    stance,
    price, e20, e50, e200, rsi, relVol, macd, support, resistance, atr, vwap,
    bullishStructure, priceAbove20, priceAbove50, priceAbove200, momentumWeak, volumeWeak, belowVwap,
    triggers: { reclaim, breakdown, stop, target1, target2 },
  };
}

function buildSwing(t, confidence) {
  const blocked = confidence == null || confidence < 70;
  const s = technicalState(t);
  const reasons = [];

  if (s.bullishStructure) reasons.push('EMA20 > EMA50 > EMA200 keeps the primary structure bullish.');
  if (!s.priceAbove20 && s.e20 != null) reasons.push(`Price is below EMA20 (${s.e20.toFixed(0)}), so momentum has not reconfirmed.`);
  if (s.rsi != null && s.rsi < 50) reasons.push(`RSI ${s.rsi.toFixed(1)} is below 50, showing weak short-term momentum.`);
  if (s.macd != null && s.macd < 0) reasons.push('MACD histogram is negative.');
  if (s.relVol != null && s.relVol < 1) reasons.push(`Relative volume ${s.relVol.toFixed(2)}x is below average; breakout confirmation is weak.`);

  if (s.stance === 'BULLISH_CONFIRMATION' && !blocked) {
    return {
      action: 'CONDITIONAL BUY SETUP',
      status: 'READY FOR MANUAL CONFIRMATION',
      entry: s.e20 != null && s.atr != null ? { low: s.e20 - 0.25 * s.atr, high: s.e20 + 0.25 * s.atr } : null,
      breakout: s.e20,
      stopLoss: s.triggers.stop,
      target1: s.triggers.target1,
      target2: s.triggers.target2,
      reasons: reasons.length ? reasons : ['Trend, momentum and volume are aligned.'],
      trigger: 'Enter only after price reclaims the trigger with confirmation volume.',
    };
  }

  const triggerText = s.e20 != null
    ? `Wait for a daily close above EMA20 (~${s.e20.toFixed(0)}) with improving volume before a fresh long entry.`
    : 'Wait for a confirmed momentum reclaim before a fresh long entry.';

  return {
    action: blocked ? 'WAIT — DATA / VALIDATION' : 'WAIT FOR CONFIRMATION',
    status: blocked ? 'NOT DECISION-READY FOR NEW POSITION' : 'SETUP NOT CONFIRMED',
    entry: s.support != null && s.atr != null ? { low: s.support, high: s.support + 0.5 * s.atr } : null,
    breakout: s.e20,
    stopLoss: s.triggers.stop,
    target1: s.triggers.target1,
    target2: s.triggers.target2,
    reasons: reasons.length ? reasons : ['No high-conviction technical trigger is currently confirmed.'],
    trigger: triggerText,
  };
}

function buildShortTerm(t) {
  const s = technicalState(t);
  const bearishNow = s.momentumWeak && (s.belowVwap || !s.priceAbove20);
  if (s.stance === 'BEARISH_STRUCTURE') {
    return {
      action: 'NO FRESH LONG',
      status: 'BEARISH',
      trigger: s.breakdown != null ? `Avoid fresh longs while price remains below support ${s.breakdown.toFixed(0)}.` : 'Avoid fresh longs until structure improves.',
      invalidation: s.e20,
      reasons: ['Price structure is bearish across the main moving averages.'],
    };
  }
  return {
    action: bearishNow ? 'WAIT / NO FRESH LONG' : 'WAIT',
    status: bearishNow ? 'MOMENTUM WEAK' : 'NO HIGH-CONVICTION SIGNAL',
    trigger: s.e20 != null ? `Bullish short-term confirmation requires a reclaim of EMA20 (~${s.e20.toFixed(0)}) and stronger volume.` : 'Wait for a confirmed momentum signal.',
    invalidation: s.breakdown,
    reasons: [
      s.rsi != null ? `RSI ${s.rsi.toFixed(1)}.` : 'RSI unavailable.',
      s.macd != null ? `MACD histogram ${s.macd.toFixed(3)}.` : 'MACD unavailable.',
      s.relVol != null ? `Relative volume ${s.relVol.toFixed(2)}x.` : 'Relative volume unavailable.',
    ],
  };
}

function buildLongTerm(analysis, confidence, coverage) {
  const v = analysis?.valuation || {};
  const s = analysis?.score || {};
  const dataLimited = Boolean(analysis?.dataLimited || analysis?.stock?.dataLimited);
  const valuationAttractive = String(v.verdict || '').toUpperCase().match(/UNDERVALUED|ATTRACTIVE/);
  const blockers = [];
  if (confidence == null || confidence < 75) blockers.push('Evidence confidence is below the long-term decision threshold (75).');
  if (coverage == null || coverage < 60) blockers.push('Fundamental/sector evidence coverage is below 60%.');
  if (dataLimited) blockers.push('The analysis is explicitly data-limited.');
  if (s.financialStrengthCoverage && s.financialStrengthCoverage !== 'FULL') blockers.push(`Financial-strength coverage is ${s.financialStrengthCoverage}.`);
  if (valuationAttractive) blockers.push('Valuation framework is favorable, but valuation alone is not sufficient for a fresh position.');

  if (!blockers.length) {
    return {
      action: 'STAGED ACCUMULATION CANDIDATE',
      status: 'EVIDENCE SUFFICIENT',
      reason: 'Fundamental, valuation and data-quality evidence clear the long-term thresholds.',
      buyBelow: n(v.fairValue) != null ? v.fairValue * 0.90 : null,
    };
  }
  return {
    action: 'WATCH / WAIT FOR EVIDENCE',
    status: 'NOT READY FOR AGGRESSIVE NEW POSITION',
    reason: blockers[0],
    blockers,
    buyBelow: null,
  };
}

export function buildActionability(analysis, trading) {
  const confidence = n(analysis?.dataQuality?.confidence);
  const coverage = sectorCoverage(analysis);
  const t = trading?.technical || analysis?.technical || {};
  const swing = buildSwing(t, confidence);
  const shortTerm = buildShortTerm(t);
  const longTerm = buildLongTerm(analysis, confidence, coverage);

  const overallStance = longTerm.action.startsWith('STAGED') && swing.action.startsWith('CONDITIONAL')
    ? 'STAGED / CONDITIONAL BUY'
    : swing.action.startsWith('CONDITIONAL')
      ? 'CONDITIONAL SWING SETUP'
      : longTerm.action.startsWith('WATCH')
        ? 'WAIT — EVIDENCE FIRST'
        : 'WAIT';

  return {
    success: true,
    policyVersion: ACTIONABILITY_POLICY_VERSION,
    overallStance,
    productionTradingEnabled: false,
    decision: 'This is a deterministic research stance. It does not override the production BUY/SELL gate.',
    confidence,
    sectorCoverage: coverage,
    currentPrice: n(analysis?.stock?.price ?? t.last),
    technical: technicalState(t),
    horizons: { longTerm, swing, shortTerm },
    valuation: {
      verdict: analysis?.valuation?.verdict ?? null,
      fairValue: n(analysis?.valuation?.fairValue),
      marginOfSafety: n(analysis?.valuation?.marginOfSafety),
      conservative: n(analysis?.valuation?.conservativeFairValue),
      base: n(analysis?.valuation?.baseFairValue),
      optimistic: n(analysis?.valuation?.optimisticFairValue),
    },
    evidence: {
      warnings: analysis?.dataQuality?.warnings || [],
      blockers: analysis?.decision?.blockers || [],
      dataLimited: Boolean(analysis?.dataLimited || analysis?.stock?.dataLimited),
    },
  };
}
