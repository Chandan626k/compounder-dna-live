// Investment readiness is deliberately separate from the trading-strategy gate.
// It can classify a stock as an investment candidate only when verified
// fundamental/valuation/data evidence is sufficient. It never emits BUY/SELL.

const n = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const pct = (v) => n(v);
const clamp = (v, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n(v) ?? lo));

export const INVESTMENT_POLICY_VERSION = '1.0';

function qualityBand(confidence, coverage) {
  if (confidence == null || coverage == null) return 'DATA_INSUFFICIENT';
  if (confidence >= 80 && coverage >= 75) return 'HIGH';
  if (confidence >= 65 && coverage >= 55) return 'MEDIUM';
  return 'LOW';
}

function scoreFundamentals(financials = {}) {
  const r = financials.ratios || {};
  const g = financials.growth || {};
  const d = financials.derived || {};
  const checks = [];
  let points = 0;
  const add = (label, value, pass, weight) => {
    if (value == null) return;
    checks.push({ label, value, pass });
    if (pass) points += weight;
  };
  add('ROE', pct(r.roe ?? d.roeFromStatements), (r.roe ?? d.roeFromStatements) >= 15, 20);
  add('Revenue 3Y CAGR', pct(g.revenue3yCagr), (g.revenue3yCagr ?? -Infinity) >= 8, 15);
  add('EPS 3Y CAGR', pct(g.eps3yCagr), (g.eps3yCagr ?? -Infinity) >= 8, 15);
  add('FCF conversion', pct(d.fcfConversion), (d.fcfConversion ?? -Infinity) >= 70, 15);
  add('Net debt / EBITDA', pct(d.netDebtToEbitda), (d.netDebtToEbitda ?? Infinity) <= 2, 15);
  add('Operating margin', pct(r.operatingMargin), (r.operatingMargin ?? -Infinity) >= 10, 10);
  add('Latest revenue growth', pct(g.latestRevenueGrowth ?? r.revenueGrowth), (g.latestRevenueGrowth ?? r.revenueGrowth ?? -Infinity) >= 0, 10);
  return { score: checks.length ? Math.round(points / checks.reduce((s, x) => s + ({'ROE':20,'Revenue 3Y CAGR':15,'EPS 3Y CAGR':15,'FCF conversion':15,'Net debt / EBITDA':15,'Operating margin':10,'Latest revenue growth':10}[x.label] || 0), 0) * 100) : null, checks };
}

function scoreValuation(v = {}, price = null) {
  const mos = n(v.marginOfSafety);
  const verdict = String(v.verdict || '').toUpperCase();
  if (mos != null) return { score: clamp(50 + mos * 1.5), basis: 'provider-derived margin of safety', marginOfSafety: mos, verdict: v.verdict ?? null };
  if (/UNDERVALUED|ATTRACTIVE|FAIR/.test(verdict)) return { score: 65, basis: 'provider valuation verdict', marginOfSafety: null, verdict: v.verdict };
  if (/EXPENSIVE|OVERVALUED/.test(verdict)) return { score: 25, basis: 'provider valuation verdict', marginOfSafety: null, verdict: v.verdict };
  return { score: null, basis: 'valuation evidence unavailable', marginOfSafety: null, verdict: v.verdict ?? null };
}

export function buildInvestmentReadiness(analysis) {
  const dq = analysis?.dataQuality || {};
  const financials = analysis?.financials || {};
  const valuation = analysis?.valuation || {};
  const price = n(analysis?.technical?.last ?? analysis?.price);
  const confidence = n(dq.confidence);
  const coverage = n(dq.coverage);
  const band = qualityBand(confidence, coverage);
  const f = scoreFundamentals(financials);
  const v = scoreValuation(valuation, price);
  const overall = n(analysis?.score?.overall);

  const blockers = [];
  if (confidence == null || confidence < 65) blockers.push('Data confidence below investment threshold');
  if (coverage == null || coverage < 55) blockers.push('Fundamental/sector evidence coverage below investment threshold');
  if (f.score == null) blockers.push('Insufficient verified financial history for a fundamental score');
  if (v.score == null) blockers.push('Verified valuation evidence is unavailable');
  if (overall != null && overall < 55) blockers.push('Composite quality score is weak');
  if (analysis?.dataLimited) blockers.push('Analysis is explicitly data-limited');

  const investScoreParts = [f.score, v.score, confidence, coverage, overall].filter(x => x != null);
  const investmentScore = investScoreParts.length ? Math.round(investScoreParts.reduce((s, x) => s + x, 0) / investScoreParts.length) : null;
  const ready = blockers.length === 0 && investmentScore >= 65;

  let classification = 'RESEARCH ONLY';
  if (ready && investmentScore >= 80) classification = 'INVESTMENT CANDIDATE — HIGH EVIDENCE';
  else if (ready) classification = 'INVESTMENT CANDIDATE — MEDIUM EVIDENCE';
  else if (investmentScore != null && investmentScore >= 55) classification = 'WATCHLIST — EVIDENCE INCOMPLETE';

  const horizon = classification.startsWith('INVESTMENT CANDIDATE') ? 'LONG_TERM / STAGED ACCUMULATION' : 'WAIT FOR EVIDENCE';
  const action = classification.startsWith('INVESTMENT CANDIDATE') ? 'ACCUMULATE CANDIDATE' : 'NO ACTION';

  return {
    success: true,
    policyVersion: INVESTMENT_POLICY_VERSION,
    classification,
    action,
    investmentScore,
    evidenceBand: band,
    horizon,
    strategyTradingGate: 'UNCHANGED — BUY/SELL remains blocked until strategy validation passes',
    verifiedEvidence: {
      dataConfidence: confidence,
      coverage,
      fundamentalScore: f.score,
      valuationScore: v.score,
      compositeScore: overall,
      valuationVerdict: v.verdict,
      marginOfSafety: v.marginOfSafety,
      price,
    },
    checks: f.checks,
    blockers,
    accumulationFramework: ready ? {
      method: 'STAGED, NOT LUMP-SUM',
      tranches: [25, 25, 25, 25],
      trigger: 'Use only after independent review of thesis, valuation and risk; no price prediction is fabricated.',
      invalidation: analysis?.risk?.invalidation || null,
    } : null,
    riskDisclosure: 'This is an evidence-gated research classification, not a guarantee or personalized financial advice. Trading BUY/SELL signals remain disabled until strategy validation is production-ready.'
  };
}
