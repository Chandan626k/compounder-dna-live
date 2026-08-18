import assert from 'node:assert/strict';
import { applyDecisionEvidenceGate } from '../lib/decision-evidence-gate.js';

const blocked = applyDecisionEvidenceGate({
  score: { financialStrengthCoverage: 'CURRENT_FIELDS_ONLY' },
  dataQuality: {
    confidence: 65,
    criticalMissingFields: ['Debt/Equity'],
    financialStrengthCoverage: 'CURRENT_FIELDS_ONLY',
    sectorFramework: { available: 2, total: 8 },
  },
  decision: {
    action: 'BUY ON WEAKNESS / HOLD',
    blockers: ['Sector KPI coverage is only 25%.'],
  },
});

assert.equal(blocked.decision.action, 'WAIT — EVIDENCE INCOMPLETE');
assert.equal(blocked.decision.gate.status, 'BLOCKED');
assert.equal(blocked.decision.gate.sectorCoverage, 25);
assert.ok(blocked.decision.blockers.some((x) => x.includes('Debt/Equity')));

const passed = applyDecisionEvidenceGate({
  score: { financialStrengthCoverage: 'FULL' },
  dataQuality: {
    confidence: 82,
    criticalMissingFields: [],
    financialStrengthCoverage: 'FULL',
    sectorFramework: { available: 7, total: 8 },
  },
  decision: { action: 'BUY / ACCUMULATE', blockers: [] },
});

assert.equal(passed.decision.action, 'BUY / ACCUMULATE');
assert.equal(passed.decision.gate.status, 'PASSED');
assert.equal(passed.decision.gate.sectorCoverage, 87.5);

console.log('decision-evidence-gate.unit: PASS');
