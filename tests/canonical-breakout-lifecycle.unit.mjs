import assert from 'node:assert/strict';
import { calculateCanonicalBreakoutLifecycle } from '../lib/canonical-breakout-lifecycle.js';
import { calculateCanonicalTechnical } from '../lib/canonical-technical-engine.js';

function makeRows(closes, volumes = []) {
  return closes.map((close, index) => ({ date: new Date(Date.UTC(2025, 0, 1 + index)).toISOString(), open: close, high: close + 1, low: close - 1, close, volume: volumes[index] ?? 1000 }));
}

const base = Array.from({ length: 30 }, (_, i) => (i % 2 === 0 ? 101 : 99));
const breakoutCloses = [...base, 102, 103, 104, 105, 103, 101, 100, 102, 101, 100, 110, 107, 113, 112, 116, 118, 115, 117, 114, 112];
const breakoutVolumes = Array(breakoutCloses.length).fill(1000);
breakoutVolumes[40] = 2200;
breakoutVolumes[41] = 700;
breakoutVolumes[42] = 1600;
const rows = makeRows(breakoutCloses, breakoutVolumes);
rows[41] = { ...rows[41], low: 102, high: 108 };

const lifecycle = calculateCanonicalBreakoutLifecycle(rows, { timeframe: '1d', symbol: 'TEST.NS', source: 'fixture', retrievedAt: '2025-02-12T00:00:00.000Z', targetLevels: [{ price: 119, type: 'RESISTANCE', touches: 2, strength: 70, lastDate: '2025-02-10T00:00:00.000Z' }], marketStructure: { state: 'UPTREND_STRUCTURE' }, supportResistance: { support: 102, resistance: 119, status: 'VERIFIED_REACTION_ZONES' } });
assert.equal(lifecycle.status, 'CONTINUATION');
assert.equal(lifecycle.direction, 'UP');
assert.equal(lifecycle.breakoutLevel, 103);
assert.equal(lifecycle.confirmationEvidence.volumeStatus, 'CONFIRMED');
assert.equal(lifecycle.retestAttempt.extreme, 102);
assert.equal(lifecycle.supportResistanceFlip.confirmed, true);
assert.equal(lifecycle.riskEvidence.invalidationLevel, 102);
assert.equal(lifecycle.riskEvidence.invalidationEvidence.directionalCheck, true);
assert.equal(lifecycle.riskEvidence.invalidationEvidence.breakoutLevel, 103);
assert.equal(lifecycle.riskEvidence.invalidationEvidence.retestExtreme, 102);
assert.equal(lifecycle.riskEvidence.invalidationEvidence.supportResistance.support, 102);
assert.equal(lifecycle.riskEvidence.targetZones[0], 119);
assert.equal(lifecycle.riskEvidence.targetEvidence[0].type, 'RESISTANCE');
assert.equal(lifecycle.riskEvidence.targetEvidence[0].touches, 2);
assert.equal(lifecycle.riskEvidence.targetEvidence[0].strength, 70);
assert.equal(lifecycle.riskEvidence.riskReward > 0, true);
assert.equal(lifecycle.riskEvidence.basis.marketStructure.state, 'UPTREND_STRUCTURE');
assert.equal(lifecycle.riskEvidence.basis.atrAtBreakout > 0, true);
assert.equal(lifecycle.timeframe, '1d');
assert.equal(lifecycle.provenance.symbol, 'TEST.NS');

const nearestTarget = calculateCanonicalBreakoutLifecycle(rows, { timeframe: '1d', targetLevels: [110, 119] });
assert.equal(nearestTarget.riskEvidence.riskReward, 7);

const prefix = rows.slice(0, 41);
const beforeFuture = calculateCanonicalBreakoutLifecycle(prefix, { timeframe: '1d' });
assert.equal(beforeFuture.status, 'PENDING_RETEST');
assert.equal(beforeFuture.breakoutLevel, 103);
const retestPending = calculateCanonicalBreakoutLifecycle(rows.slice(0, 42), { timeframe: '1d' });
assert.equal(retestPending.status, 'RETEST_PENDING');
assert.equal(retestPending.events.at(-1).type, 'RETEST_TOUCHED');
assert.equal(retestPending.supportResistanceFlip.confirmed, false);
const futureShock = rows.slice(0, 41).concat({ ...rows[41], close: 101, open: 101, high: 102, low: 100, volume: 3000 });
const afterFuture = calculateCanonicalBreakoutLifecycle(futureShock, { timeframe: '1d' });
assert.equal(afterFuture.status, 'FAILED');
assert.equal(afterFuture.events.find((event) => event.type === 'BREAKOUT_CONFIRMED').date, beforeFuture.events.find((event) => event.type === 'BREAKOUT_CONFIRMED').date);

const failedRetest = calculateCanonicalBreakoutLifecycle(rows.slice(0, 42).concat({ ...rows[41], date: new Date(Date.UTC(2025, 0, 43)).toISOString(), close: 102, open: 102, high: 103, low: 101, volume: 1400 }), { timeframe: '1d' });
assert.equal(failedRetest.status, 'FAILED_RETEST');
assert.equal(failedRetest.failureEvidence.reason, 'RETEST_CLOSE_BACK_ACROSS_BREAKOUT_LEVEL');

const weakVolumes = [...breakoutVolumes];
weakVolumes[40] = 1050;
const weak = calculateCanonicalBreakoutLifecycle(makeRows(breakoutCloses.slice(0, 41), weakVolumes), { timeframe: '1d' });
assert.equal(weak.status, 'PENDING_RETEST');
assert.equal(weak.confirmationEvidence.volumeStatus, 'LOW');

const noBreakout = calculateCanonicalBreakoutLifecycle(makeRows(base.concat([100, 101, 99, 100, 101])), { timeframe: '1d' });
assert.equal(noBreakout.status, 'NO_BREAKOUT');

const falseBreakoutRows = makeRows(base.concat([103]));
falseBreakoutRows.at(-1).high = 105;
falseBreakoutRows.at(-1).close = 101;
falseBreakoutRows.at(-1).open = 101;
falseBreakoutRows.at(-1).low = 100;
const falseBreakout = calculateCanonicalBreakoutLifecycle(falseBreakoutRows, { timeframe: '1d' });
assert.equal(falseBreakout.status, 'NO_BREAKOUT');

const insufficient = calculateCanonicalBreakoutLifecycle(makeRows(base.slice(0, 20)), { timeframe: '1d' });
assert.equal(insufficient.status, 'INSUFFICIENT_DATA');

const missingVolume = makeRows(breakoutCloses.slice(0, 41));
missingVolume[40].volume = null;
const missingVolumeLifecycle = calculateCanonicalBreakoutLifecycle(missingVolume, { timeframe: '1d' });
assert.equal(missingVolumeLifecycle.confirmationEvidence.volumeStatus, 'UNAVAILABLE');

const intraday = calculateCanonicalBreakoutLifecycle(rows, { timeframe: '1h' });
assert.equal(intraday.timeframe, '1h');

const canonical = calculateCanonicalTechnical(rows, { timeframe: '1d', symbol: 'TEST.NS', source: 'fixture', retrievedAt: '2025-02-12T00:00:00.000Z', nowMs: Date.parse('2025-02-20T00:00:00.000Z') });
assert.equal(canonical.status, 'VERIFIED');
assert.equal(canonical.breakoutLifecycle.timeframe, '1d');
assert.equal(canonical.breakoutLifecycle.provenance.dataQuality, 'VERIFIED');

const invalid = [...rows];
invalid[10] = { ...invalid[10], high: invalid[10].close - 2 };
const invalidResult = calculateCanonicalTechnical(invalid, { timeframe: '1d', nowMs: Date.parse('2025-02-20T00:00:00.000Z') });
assert.equal(invalidResult.status, 'UNAVAILABLE');

console.log('canonical-breakout-lifecycle.unit: PASS');
