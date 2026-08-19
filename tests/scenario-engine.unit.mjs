import assert from 'node:assert/strict';
import { scenarioEvidenceFromValidation, buildScenarios } from '../lib/scenario-engine.js';

const validation = {
  costComparison: { conservative: { outOfSample: {
    trades: 53, targetRate: 16.9811320754717, stopRate: 73.58490566037736,
    timeExitRate: 9.433962264150944, winRate: 24.528301886792452,
    profitFactor: 0.46231878887798017, expectancyPct: -1.1797677445529007,
    avgWinPct: 4.135668486119562, avgLossPct: -2.907284519521451,
  } } },
  rollingOutOfSample: { parametersFixed: true, summary: { windows: 16, positiveWindowRate: 25, worstWindowDrawdownPct: 53.39028165450148 } },
  biasChecks: { lookAhead: 'PASS', contamination: 'PASS' },
};

const evidence = scenarioEvidenceFromValidation(validation);
assert.equal(evidence.status, 'RESEARCH_STATISTICALLY_ESTIMATED');
assert.equal(evidence.predictiveValidity, 'FAIL');
assert.equal(evidence.sampleSize, 53);
assert.equal(Math.round((evidence.probabilities.bull + evidence.probabilities.base + evidence.probabilities.bear) * 100), 100);
assert.ok(evidence.confidenceIntervals95.bull.lower < evidence.probabilities.bull);
assert.ok(evidence.confidenceIntervals95.bull.upper > evidence.probabilities.bull);

const scenarios = buildScenarios({ price: 1394.5, support: 1393.6, resistance: 1460, atr: 21.9615, historicalEvidence: evidence });
assert.equal(scenarios.expectedReturnPct, null);
assert.ok(scenarios.riskReward > 2 && scenarios.riskReward < 4);
assert.ok(scenarios.scenarios[2].target < 1394.5);

const insufficient = scenarioEvidenceFromValidation({});
assert.equal(insufficient.status, 'UNVALIDATED');
const noPrice = buildScenarios({ price: null, support: 100, resistance: 110, atr: 2, historicalEvidence: evidence });
assert.equal(noPrice.status, 'DATA_INSUFFICIENT');

console.log('scenario-engine.unit: PASS');
