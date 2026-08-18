import assert from 'node:assert/strict';
import { buildValidationGate } from '../lib/validation-gate.js';

const blocked = buildValidationGate({
  decision: 'DO NOT PRODUCTION-VALIDATE',
  universeIntegrity: { status: 'BLOCKED', eligible: false },
  liquidity: { status: 'BLOCKED — DATA/INFRASTRUCTURE LIMITATION' },
});
assert.equal(blocked.productionEligible, false);
assert.equal(blocked.decision, 'DO NOT PRODUCTION-VALIDATE');
assert.deepEqual(blocked.blockers, [
  'SURVIVORSHIP_UNVALIDATED',
  'LIQUIDITY_MARKET_IMPACT_UNVALIDATED',
  'STRATEGY_NOT_PRODUCTION_VALIDATED',
]);
assert.equal(blocked.metricValidity.historicalBacktest, 'RESEARCH_ONLY');
assert.equal(blocked.metricValidity.rollingOutOfSample, 'RESEARCH_ONLY');
assert.equal(blocked.metricValidity.parameterSensitivity, 'DIAGNOSTIC_ONLY');

const eligible = buildValidationGate({
  decision: 'PRODUCTION-VALIDATE',
  universeIntegrity: { status: 'PASS', eligible: true },
  liquidity: { status: 'PASS' },
});
assert.equal(eligible.productionEligible, true);
assert.equal(eligible.decision, 'PRODUCTION-ELIGIBLE');
assert.deepEqual(eligible.blockers, []);
assert.equal(eligible.metricValidity.historicalBacktest, 'PRODUCTION_VALID');

console.log('Validation gate tests: PASS');
