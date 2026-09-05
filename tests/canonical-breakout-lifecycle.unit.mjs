import assert from 'node:assert/strict';
import { calculateCanonicalBreakoutLifecycle } from '../lib/canonical-breakout-lifecycle.js';
import { calculateCanonicalTechnical } from '../lib/canonical-technical-engine.js';

function makeRows(closes, volumes = []) {
  return closes.map((close, index) => {
    const volume = volumes[index] ?? 1000;
    return {
      date: new Date(Date.UTC(2025, 0, 1 + index)).toISOString(),
      open: close,
      high: close + 1,
      low: close - 1,
      close,
      volume,
    };
  });
}

const base = Array.from({ length: 30 }, (_, i) => (i % 2 === 0 ? 101 : 99));
const breakoutCloses = [...base, 102, 103, 104, 105, 103, 101, 100, 102, 101, 100, 110, 107, 113];
const breakoutVolumes = Array(breakoutCloses.length).fill(1000);
breakoutVolumes[40] = 2200;
breakoutVolumes[41] = 700;
breakoutVolumes[42] = 1600;
const rows = makeRows(breakoutCloses, breakoutVolumes);
rows[41] = { ...rows[41], low: 105, high: 108 };

const lifecycle = calculateCanonicalBreakoutLifecycle(rows, { timeframe: '1d', symbol: 'TEST.NS', source: 'fixture', retrievedAt: '2025-02-12T00:00:00.000Z' });
assert.equal(lifecycle.status, 'CONTINUATION');
assert.equal(lifecycle.direction, 'UP');
assert.equal(lifecycle.breakoutLevel, 106);
assert.equal(lifecycle.confirmationEvidence.volumeStatus, 'CONFIRMED');
assert.equal(lifecycle.retestAttempt.extreme, 105);
assert.equal(lifecycle.supportResistanceFlip.confirmed, true);
assert.equal(lifecycle.riskEvidence.invalidationLevel, 105);
assert.equal(lifecycle.riskEvidence.riskReward > 0, true);
assert.equal(lifecycle.timeframe, '1d');
assert.equal(lifecycle.provenance.symbol, 'TEST.NS');

const prefix = rows.slice(0, 41);
const beforeFuture = calculateCanonicalBreakoutLifecycle(prefix, { timeframe: '1d' });
assert.equal(beforeFuture.status, 'CONFIRMED');
assert.equal(beforeFuture.breakoutLevel, 106);
const futureShock = rows.slice(0, 41).concat({ ...rows[41], close: 90, open: 90, high: 91, low: 89, volume: 3000 });
const afterFuture = calculateCanonicalBreakoutLifecycle(futureShock, { timeframe: '1d' });
assert.equal(afterFuture.status, 'FAILED');
assert.equal(afterFuture.events.find((event) => event.type === 'BREAKOUT_CONFIRMED').date, beforeFuture.events.find((event) => event.type === 'BREAKOUT_CONFIRMED').date);

const weakVolumes = [...breakoutVolumes];
weakVolumes[40] = 1050;
const weak = calculateCanonicalBreakoutLifecycle(makeRows(breakoutCloses.slice(0, 41), weakVolumes), { timeframe: '1d' });
assert.equal(weak.status, 'CONFIRMED');
assert.equal(weak.confirmationEvidence.volumeStatus, 'LOW');

const noBreakout = calculateCanonicalBreakoutLifecycle(makeRows(base.concat([100, 101, 99, 100, 101])), { timeframe: '1d' });
assert.equal(noBreakout.status, 'NO_BREAKOUT');

const insufficient = calculateCanonicalBreakoutLifecycle(makeRows(base.slice(0, 20)), { timeframe: '1d' });
assert.equal(insufficient.status, 'INSUFFICIENT_DATA');

const missingVolume = makeRows(breakoutCloses.slice(0, 41));
missingVolume[40].volume = null;
const missingVolumeLifecycle = calculateCanonicalBreakoutLifecycle(missingVolume, { timeframe: '1d' });
assert.equal(missingVolumeLifecycle.confirmationEvidence.volumeStatus, 'UNAVAILABLE');

const canonical = calculateCanonicalTechnical(rows, {
  timeframe: '1d',
  symbol: 'TEST.NS',
  source: 'fixture',
  retrievedAt: '2025-02-12T00:00:00.000Z',
  nowMs: Date.parse('2025-02-20T00:00:00.000Z'),
});
assert.equal(canonical.status, 'VERIFIED');
assert.equal(canonical.breakoutLifecycle.timeframe, '1d');
assert.equal(canonical.breakoutLifecycle.provenance.dataQuality, 'VERIFIED');

const invalid = [...rows];
invalid[10] = { ...invalid[10], high: invalid[10].close - 2 };
const invalidResult = calculateCanonicalTechnical(invalid, { timeframe: '1d', nowMs: Date.parse('2025-02-20T00:00:00.000Z') });
assert.equal(invalidResult.status, 'UNAVAILABLE');

console.log('canonical-breakout-lifecycle.unit: PASS');
