import assert from 'node:assert/strict';
import { cacheGet, cacheSet, cacheStats } from '../lib/cache.js';

const key = `phase1-smoke:${Date.now()}`;
assert.equal(cacheGet(key), null, 'cache must miss before set');
cacheSet(key, { ok: true }, 2_000);
assert.deepEqual(cacheGet(key), { ok: true }, 'cache must return stored value');
assert.ok(cacheStats().entries >= 1, 'cache stats must report the stored entry');

console.log('Phase 1 smoke tests: PASS');
