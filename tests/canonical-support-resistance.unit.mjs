import assert from 'node:assert/strict';
import { calculateReactionSupportResistance } from '../lib/canonical-support-resistance.js';

const pattern = [100, 102, 105, 110, 105, 102, 100, 95, 90, 95, 100];
const rows = Array.from({ length: 66 }, (_, i) => {
  const close = pattern[i % pattern.length];
  return {
    date: new Date(Date.UTC(2025, 0, 1 + i)).toISOString(),
    open: close,
    high: close + 1,
    low: close - 1,
    close,
    volume: 1000,
  };
});

const result = calculateReactionSupportResistance(rows);
assert.equal(result.status, 'VERIFIED_REACTION_ZONES');
assert.equal(result.support, 89);
assert.equal(result.resistance, 111);
assert.ok(result.zones.some((zone) => zone.touches >= 2 && zone.type === 'RESISTANCE'));
assert.ok(result.zones.some((zone) => zone.touches >= 2 && zone.type === 'SUPPORT'));
assert.equal(result.evidence.currentExcluded, true);

const beforeHigh = result.resistance;
rows.at(-1).high = 9999;
const afterHighMutation = calculateReactionSupportResistance(rows);
assert.equal(afterHighMutation.resistance, beforeHigh);

const insufficient = calculateReactionSupportResistance(rows.slice(0, 19));
assert.equal(insufficient.status, 'UNAVAILABLE');
assert.equal(insufficient.support, null);
assert.equal(insufficient.resistance, null);

console.log('canonical-support-resistance.unit: ok');
