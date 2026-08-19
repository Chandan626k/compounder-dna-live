// Evidence-first scenario engine for StockSamjho.
// Probabilities are derived only from fixed-parameter out-of-sample outcomes.
// No probability is invented when validated evidence is absent.

function finite(x) { return Number.isFinite(Number(x)) ? Number(x) : null; }
function pct(a, b) { const aa = finite(a), bb = finite(b); return aa === null || bb === null || bb === 0 ? null : ((aa / bb) - 1) * 100; }
function clamp01(x) { return Math.max(0, Math.min(1, Number(x))); }

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
  counts.base += trades - counts.bull - counts.bear - counts.base;

  const probabilities = {
    bull: targetRate / 100,
    base: timeExitRate / 100,
    bear: stopRate / 100,
  };

  const predictiveChecks = {
    oosWinRate: finite(oos.winRate) != null && oos.winRate >= 60,
    oosProfitFactor: finite(oos.profitFactor) != null && oos.profitFactor >= 1.25,
    oosExpectancy: finite(oos.expectancyPct) != null && oos.expectancyPct > 0,
    rollingStability: finite(rolling.positiveWindowRate) != null && rolling.positiveWindowRate >= 60,
    drawdown: finite(rolling.worstWindowDrawdownPct) != null && rolling.worstWindowDrawdownPct <= 20,
  };

  return {
    // The frequencies are statistically estimated from OOS observations, but are NOT
    // labelled predictive until the strategy itself passes fixed predictive checks.
    status: 'RESEARCH_STATISTICALLY_ESTIMATED',
    predictiveValidity: Object.values(predictiveChecks).every(Boolean) ? 'PASS' : 'FAIL',
    source: 'fixed-parameter conservative OOS strategy outcomes',
    sampleSize: trades,
    counts,
    probabilities,
    confidenceIntervals95: {
      bull: wilson(counts.bull, trades),
      base: wilson(counts.base, trades),
      bear: wilson(counts.bear, trades),
    },
    historicalPerformance: {
      oosWinRatePct: finite(oos.winRate),
      oosProfitFactor: finite(oos.profitFactor),
      oosExpectancyPct: finite(oos.expectancyPct),
      avgWinPct: finite(oos.avgWinPct),
      avgLossPct: finite(oos.avgLossPct),
      rollingPositiveWindowRatePct: finite(rolling.positiveWindowRate),
      rollingWorstDrawdownPct: finite(rolling.worstWindowDrawdownPct),
    },
    checks: {
      fixedParameters: fixed,
      lookAhead: lookAheadPass,
      contamination: contaminationPass,
      categoryAccounting: categoriesValid,
      minimumSample: true,
      rollingWindows: finite(rolling.windows) ?? null,
      positiveRollingWindowRatePct: finite(rolling.positiveWindowRate),
      predictiveChecks,
    },
    limitations: [
      'Probabilities are observed OOS outcome frequencies, not unconditional future-return probabilities.',
      'Predictive validity remains FAILED unless all fixed OOS robustness checks pass.',
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
  const stop = s !== null && a !== null ? s - a : (a !== null ? p - 1.5 * a : null);
  const upsideTarget = r !== null && r > p ? r : (a !== null ? p + 2 * a : null);

  const evidence = historicalEvidence?.status === 'RESEARCH_STATISTICALLY_ESTIMATED'
    ? historicalEvidence
    : { status: 'UNVALIDATED', reason: historicalEvidence?.reason || 'No validated OOS scenario evidence supplied.', sampleSize: 0 };

  const scenarios = [
    { id: 'bull', label: 'Bull', probability: evidence.probabilities?.bull ?? null, target: upsideTarget, returnPct: pct(upsideTarget, p), trigger: r !== null ? `Close above ${r.toFixed(2)} with confirmation` : 'Validated breakout trigger required' },
    { id: 'base', label: 'Base', probability: evidence.probabilities?.base ?? null, target: p, returnPct: 0, trigger: 'Hold current structure; confirmation required' },
    { id: 'bear', label: 'Bear', probability: evidence.probabilities?.bear ?? null, target: stop, returnPct: pct(stop, p), trigger: s !== null ? `Break below ${s.toFixed(2)}; invalidation near ${stop?.toFixed(2) ?? 'unavailable'}` : 'Validated invalidation required' },
  ];

  // Do not combine historical outcome probabilities with today's technical targets
  // into a pseudo-precise expected return. Those are different distributions.
  return {
    status: evidence.status,
    methodology: 'Bull=historical OOS target outcome; Base=historical OOS time-exit outcome; Bear=historical OOS stop outcome. Fixed parameters only; 95% Wilson intervals shown.',
    evidence,
    scenarios,
    expectedReturnPct: null,
    expectedReturnStatus: 'NOT_CALCULATED — historical outcome probabilities and current technical target/stop distributions are not interchangeable',
    riskReward: Number.isFinite(stop) && Number.isFinite(upsideTarget) && stop < p && upsideTarget > p
      ? (upsideTarget - p) / (p - stop)
      : null,
  };
}
