import assert from 'node:assert/strict';
import { calculateCanonicalMarketStructure } from '../lib/canonical-market-structure.js';

const closes = [100, 99, 102, 98, 105, 100, 110, 103, 115, 108, 120, 112, 125, 119, 130, 123, 135, 128, 140, 134, 142, 136, 145];
const rows = closes.map((close, i) => ({
  date: new Date(Date.UTC(2025, 0, 1 + i)).toISOString(),
  open: close,
  high: close + 1,
  low: close - 1,
  close,
  volume: 1000,
}));

const structure = calculateCanonicalMarketStructure(rows);
assert.equal(structure.state, 'UPTREND_STRUCTURE');
assert.equal(structure.lastEvent, 'HIGHER_HIGH_HIGHER_LOW');
assert.equal(structure.breakout.confirmed, true);
assert.equal(structure.breakout.level, 143);
assert.equal(structure.evidence.currentExcluded, true);
assert.ok(structure.pivots.highs.length >= 2);
assert.ok(structure.pivots.lows.length >= 2);

const before = structure.breakout.level;
rows.at(-1).high = 9999;
const after = calculateCanonicalMarketStructure(rows);
assert.equal(after.breakout.level, before);

const insufficient = calculateCanonicalMarketStructure(rows.slice(0, 9));
assert.equal(insufficient.state, 'INSUFFICIENT_DATA');

console.log('canonical-market-structure.unit: ok');
