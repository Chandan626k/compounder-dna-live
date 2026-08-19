// Evidence-first scenario engine for StockSamjho.
// This module does not invent probabilities. Historical probabilities must be supplied
// from validated out-of-sample observations; otherwise they remain UNVALIDATED.

function finite(x) { return Number.isFinite(Number(x)) ? Number(x) : null; }
function pct(a, b) { const aa = finite(a), bb = finite(b); return aa === null || bb === null || bb === 0 ? null : ((aa / bb) - 1) * 100; }

export function buildScenarios({ price, support, resistance, atr, historicalEvidence = null }) {
  const p = finite(price);
  if (p === null || p <= 0) return { status: 'DATA_INSUFFICIENT', scenarios: [] };

  const s = finite(support);
  const r = finite(resistance);
  const a = finite(atr);
  const invalidation = s !== null ? s : (a !== null ? p - 1.5 * a : null);
  const upsideTarget = r !== null && r > p ? r : (a !== null ? p + 2 * a : null);

  const scenarios = [
    { id: 'bull', label: 'Bull', probability: null, target: upsideTarget, returnPct: pct(upsideTarget, p), trigger: r !== null ? `Close above ${r.toFixed(2)} with confirmation` : 'Validated breakout trigger required' },
    { id: 'base', label: 'Base', probability: null, target: r !== null ? r : p, returnPct: pct(r !== null ? r : p, p), trigger: 'Hold current structure; confirmation required' },
    { id: 'bear', label: 'Bear', probability: null, target: invalidation, returnPct: pct(invalidation, p), trigger: invalidation !== null ? `Break below ${invalidation.toFixed(2)}` : 'Validated invalidation required' },
  ];

  const evidence = historicalEvidence && Number.isFinite(historicalEvidence.sampleSize) && Number.isFinite(historicalEvidence.successes)
    ? { sampleSize: historicalEvidence.sampleSize, successes: historicalEvidence.successes, source: historicalEvidence.source || 'OOS', validated: true }
    : { sampleSize: 0, successes: 0, source: null, validated: false };

  if (evidence.validated && evidence.sampleSize > 0) {
    const rate = evidence.successes / evidence.sampleSize;
    scenarios[0].probability = rate;
    scenarios[2].probability = 1 - rate;
    scenarios[1].probability = 0;
  }

  const expectedReturn = scenarios.every(x => Number.isFinite(x.probability) && Number.isFinite(x.returnPct))
    ? scenarios.reduce((sum, x) => sum + x.probability * x.returnPct, 0)
    : null;

  return {
    status: evidence.validated ? 'VALIDATED' : 'UNVALIDATED',
    methodology: 'probabilities only from validated out-of-sample observations; no hard-coded probabilities',
    evidence,
    scenarios,
    expectedReturnPct: expectedReturn,
    riskReward: Number.isFinite(invalidation) && Number.isFinite(upsideTarget) && invalidation < p && upsideTarget > p
      ? (upsideTarget - p) / (p - invalidation)
      : null,
  };
}
