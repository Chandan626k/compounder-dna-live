import assert from 'node:assert/strict';
import { buildScannerSetup } from '../lib/scanner-engine-v2.js';

const base = {
  last: 101,
  e20: 100,
  prices: [98, 99, 100, 101],
  structure: { breakout: { level: 100 }, breakdown: { level: 90 } },
  trend: 'UPTREND',
  rsi: 60,
  relativeVolume: 1.2,
  bullScore: 80,
  bearScore: 20,
  historyBars: 300,
  breakoutLifecycle: {
    status: 'CONTINUATION',
    direction: 'UP',
    breakoutLevel: 100,
    overextended: false,
    confirmationEvidence: { volumeStatus: 'CONFIRMED', relativeVolume: 1.2 },
    riskEvidence: {
      status: 'VERIFIED',
      invalidationLevel: 99,
      targetZones: [110],
      targetEvidence: [{ price: 110, type: 'RESISTANCE', touches: 2, strength: 70, lastDate: '2026-09-05' }],
      riskReward: 9,
      invalidationEvidence: { atrAtBreakout: 1 },
    },
  },
};

const noCanonicalRisk = buildScannerSetup({ ...base, atr: 1, breakoutLifecycle: null }, null);
assert.equal(noCanonicalRisk.action, 'WAIT', 'scanner must not infer READY risk from local price/ATR formulas');
assert.equal(noCanonicalRisk.riskRewardScore, null, 'missing canonical risk evidence must keep R/R unavailable');
assert.equal(noCanonicalRisk.buy.stop, null, 'missing canonical risk must not fabricate a stop');
assert.equal(noCanonicalRisk.buy.target1, null, 'missing canonical risk must not fabricate a target');
assert.equal(noCanonicalRisk.buy.riskReward, null, 'missing canonical risk must not fabricate R/R');
assert.equal(noCanonicalRisk.gates.canonicalRiskVerified, false);

const noAtr = buildScannerSetup({ ...base, atr: null, breakoutLifecycle: { ...base.breakoutLifecycle, riskEvidence: { ...base.breakoutLifecycle.riskEvidence, invalidationEvidence: { atrAtBreakout: null } } } }, null);
assert.equal(noAtr.action, 'WAIT', 'scanner must not create a READY setup without verified ATR');
assert.equal(noAtr.riskRewardScore, null, 'unavailable ATR must keep risk/RR unavailable');
assert.equal(noAtr.buy.stop, null, 'unavailable ATR must fail closed for trade levels');
assert.equal(noAtr.buy.target1, null, 'unavailable ATR must fail closed for trade levels');
assert.equal(noAtr.buy.riskReward, null, 'unavailable ATR must keep R/R unavailable');
assert.equal(noAtr.gates.atrVerified, false);
assert.equal(noAtr.gates.riskRewardConfirmed, false);

const weakVolume = buildScannerSetup({ ...base, atr: 1, relativeVolume: 1.0, breakoutLifecycle: { ...base.breakoutLifecycle, confirmationEvidence: { volumeStatus: 'LOW', relativeVolume: 1.0 } } }, null);
assert.equal(weakVolume.action, 'WAIT', 'below-confirmation volume must not qualify as READY');
assert.equal(weakVolume.gates.volumeConfirmed, false);

const missingLocation = buildScannerSetup({ ...base, atr: 1, breakoutLifecycle: { ...base.breakoutLifecycle, riskEvidence: { ...base.breakoutLifecycle.riskEvidence, targetEvidence: null } } }, null);
assert.equal(missingLocation.action, 'WAIT', 'READY requires defensible target/location evidence');
assert.equal(missingLocation.gates.locationVerified, false);

const confirmed = buildScannerSetup({ ...base, atr: 1 }, null);
assert.equal(confirmed.action, 'BUY_READY', 'canonical breakout/retest + verified risk + confirmation volume may qualify as READY');
assert.equal(confirmed.gates.volumeConfirmed, true);
assert.equal(confirmed.gates.riskRewardConfirmed, true);
assert.equal(confirmed.gates.canonicalRiskVerified, true);
assert.equal(confirmed.gates.atrVerified, true);
assert.equal(confirmed.gates.locationVerified, true);
assert.equal(confirmed.buy.trigger, 100);
assert.equal(confirmed.buy.stop, 99);
assert.equal(confirmed.buy.target1, 110);
assert.equal(confirmed.buy.target2, null, 'scanner must not invent a second target');
assert.equal(confirmed.buy.riskReward, 9);

console.log('scanner-setup-quality.unit: PASS');
