import assert from 'node:assert/strict';
import { buildScannerSetup } from '../lib/scanner-engine-v2.js';

const base = {
  last: 101,
  e20: 100,
  prices: [98, 99, 100, 101],
  structure: { breakout: { level: 100 }, breakdown: { level: 90 } },
  trend: 'UPTREND',
  rsi: 60,
  relativeVolume: 1.0,
  bullScore: 80,
  bearScore: 20,
  historyBars: 300,
};

const noAtr = buildScannerSetup({ ...base, atr: null }, null);
assert.equal(noAtr.action, 'WAIT', 'scanner must not create a READY setup without verified ATR');
assert.equal(noAtr.riskRewardScore, null, 'missing ATR must keep R/R unavailable');
assert.equal(noAtr.buy.stop, null, 'missing ATR must not fabricate a stop');
assert.equal(noAtr.buy.target1, null, 'missing ATR must not fabricate a target');
assert.equal(noAtr.buy.riskReward, null, 'missing ATR must not fabricate R/R');
assert.equal(noAtr.gates.riskRewardConfirmed, false);

const weakVolume = buildScannerSetup({ ...base, atr: 1, relativeVolume: 1.0 }, null);
assert.equal(weakVolume.action, 'WAIT', 'below-confirmation volume must not qualify as READY');
assert.equal(weakVolume.gates.volumeConfirmed, false);

const confirmed = buildScannerSetup({ ...base, atr: 1, relativeVolume: 1.2 }, null);
assert.equal(confirmed.action, 'BUY_READY', 'verified ATR + confirmation volume may qualify when other gates pass');
assert.equal(confirmed.gates.volumeConfirmed, true);
assert.equal(confirmed.gates.riskRewardConfirmed, true);
assert.ok(Number.isFinite(confirmed.buy.riskReward));

console.log('scanner-setup-quality.unit: PASS');
