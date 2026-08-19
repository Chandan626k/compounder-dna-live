// Evidence-first scenario engine for StockSamjho.
// Probabilities are derived only from fixed-parameter out-of-sample outcomes.
// No probability is invented when validated evidence is absent.

function finite(x) { return Number.isFinite(Number(x)) ? Number(x) : null; }
function pct(a, b) { const aa = finite(a), bb = finite(b); return aa === null || bb === null || bb === 0 ? null : ((aa / bb) - 1) * 100; }
function clamp01(x) { return Math.max(0, Math.min(1, Number(x))); }

// Wilson score interval for a binomial proportion. This is an uncertainty interval,
// not a guarantee of future performance.
function wilson(successes, sampleSize, z = 1.96) {
  const n = finite(sampleSize), k = finite(successes);
  if (n === null || k === null || n <= 0 || k < 0 || k > n) return null;
  const p = k / n;
  const z2 = z * z;
  const den = 1 + z2 / n;
  const center = (p + z2 / (2 * n)) / den;
  const half = (z * Math.sqrt((p * (1 - p) / n) + z2 / (4 * n * n))) / den;
  return { lower: clamp01(center - half), upper: clamp01(center + half), confidence: 0.95 };
}

export function scenarioEvidenceFromValidation(validation) {
  const oos = validation?.costComparison?.conservative?.outOfSample;
  const rolling = validation?.rollingOutOfSample?.summary;
  if (!oos || !rolling) return { status: 'UNVALIDATED', reason: 'Missing OOS outcome evidence.' };

  const targetRate = finite(oos.targetRate);
  const stopRate = finite(oos.stopRate);
  const timeExitRate = finite(oos.timeExitRate);
  const trades = finite(oos.trades);
  const fixed = validation?.rollingOutOfSample?.parametersFixed === true;
  const lookAheadPass = validation?.biasChecks?.lookAhead?.startsWith('PASS') === true;
  const contaminationPass = validation?.biasChecks?.contamination?.startsWith('PASS') === true;
  const categoriesValid = [targetRate, stopRate, timeExitRate].every(v => v != null && v >= 0 && v <= 100)
    && Math.abs((targetRate + stopRate + timeExitRate) - 100) < 0.25;

  if (!fixed || !lookAheadPass || !contaminationPass || !categoriesValid || trades == null || trades < 30) {
    return {
      status: 'UNVALIDATED',
      reason: 'OOS evidence failed minimum statistical/data-integrity requirements.',
      sampleSize: trades ?? 0,
      checks: { fixedParameters: fixed, lookAhead: lookAheadPass, contamination: contaminationPass, categoryAccounting: categoriesValid, minimumSample: trades != null && trades >= 30 },
    };
  }

  const counts = {
    bull: Math.round(trades * targetRate / 100),
    bear: Math.round(trades * stopRate / 100),
    base: Math.round(trades * timeExitRate / 100),
  };
  // Correct rounding drift without changing the observed proportions materially.
  const diff = trades - counts.bull - counts.bear - counts.base;
  counts.base += diff;

  const probabilities = {
    bull: targetRate / 100,
    base: timeExitRate / 100,
    bear: stopRate / 100,
  };

  return {
    status: 'RESEARCH_VALIDATED',
    source: 'fixed-parameter conservative OOS strategy outcomes',
    sampleSize: trades,
    counts,
    probabilities,
    confidenceIntervals95: {
      bull: wilson(counts.bull, trades),
      base: wilson(counts.base, trades),
      bear: wilson(counts.bear, trades),
    },
    checks: {
      fixedParameters: fixed,
      lookAhead: lookAheadPass,
      contamination: contaminationPass,
      categoryAccounting: categoriesValid,
      minimumSample: true,
      rollingWindows: finite(rolling.windows) ?? null,
      positiveRollingWindowRatePct: finite(rolling.positiveWindowRate),
    },
    limitations: [
      'Probabilities describe the validated strategy outcome categories, not an unconditional probability of future stock returns.',
      'Current validation still has survivorship/universe and market-impact blockers; this does not make the strategy production-eligible.',
    ],
  };
}

export function buildScenarios({ price, support, resistance, atr, historicalEvidence = null }) {
  const p = finite(price);
  if (p === null || p <= 0) return { status: 'DATA_INSUFFICIENT', scenarios: [] };

  const s = finite(support);
  const r = finite(resistance);
  const a = finite(atr);
  const invalidation = s !== null ? s : (a !== null ? p - 1.5 * a : null);
  const upsideTarget = r !== null && r > p ? r : (a !== null ? p + 2 * a : null);

  const evidence = historicalEvidence?.status === 'RESEARCH_VALIDATED'
    ? historicalEvidence
    : { status: 'UNVALIDATED', reason: historicalEvidence?.reason || 'No validated OOS scenario evidence supplied.', sampleSize: 0 };

  const scenarios = [
    { id: 'bull', label: 'Bull', probability: evidence.probabilities?.bull ?? null, target: upsideTarget, returnPct: pct(upsideTarget, p), trigger: r !== null ? `Close above ${r.toFixed(2)} with confirmation` : 'Validated breakout trigger required' },
    { id: 'base', label: 'Base', probability: evidence.probabilities?.base ?? null, target: p, returnPct: 0, trigger: 'Hold current structure; confirmation required' },
    { id: 'bear', label: 'Bear', probability: evidence.probabilities?.bear ?? null, target: invalidation, returnPct: pct(invalidation, p), trigger: invalidation !== null ? `Break below ${invalidation.toFixed(2)}` : 'Validated invalidation required' },
  ];

  const expectedReturn = scenarios.every(x => Number.isFinite(x.probability) && Number.isFinite(x.returnPct))
    ? scenarios.reduce((sum, x) => sum + x.probability * x.returnPct, 0)
    : null;

  return {
    status: evidence.status,
    methodology: 'Bull=historical OOS target outcome; Base=historical OOS time-exit outcome; Bear=historical OOS stop outcome. Fixed parameters only; 95% Wilson intervals shown.',
    evidence,
    scenarios,
    expectedReturnPct: expectedReturn,
    riskReward: Number.isFinite(invalidation) && Number.isFinite(upsideTarget) && invalidation < p && upsideTarget > p
      ? (upsideTarget - p) / (p - invalidation)
      : null,
  };
}
