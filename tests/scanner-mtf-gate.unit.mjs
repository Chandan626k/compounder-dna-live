import assert from 'node:assert/strict';
import { gateNextSessionAction } from '../lib/scanner-engine-v2.js';

assert.deepEqual(gateNextSessionAction('BUY_READY', null), {
  action: 'WAIT_MTF_UNAVAILABLE', status: 'UNAVAILABLE',
});
assert.deepEqual(gateNextSessionAction('SELL_READY', null), {
  action: 'WAIT_MTF_UNAVAILABLE', status: 'UNAVAILABLE',
});
assert.deepEqual(gateNextSessionAction('BUY_READY', { bullScore: 51, bearScore: 49 }), {
  action: 'WAIT_MTF_CONFLICT', status: 'CONFLICT',
});
assert.deepEqual(gateNextSessionAction('SELL_READY', { bullScore: 49, bearScore: 51 }), {
  action: 'WAIT_MTF_CONFLICT', status: 'CONFLICT',
});
assert.deepEqual(gateNextSessionAction('BUY_READY', { bullScore: 52, bearScore: 48 }), {
  action: 'BUY_READY', status: 'CONFIRMED',
});
assert.deepEqual(gateNextSessionAction('SELL_READY', { bullScore: 48, bearScore: 52 }), {
  action: 'SELL_READY', status: 'CONFIRMED',
});
assert.deepEqual(gateNextSessionAction('WAIT', null), {
  action: 'WAIT', status: 'NOT_REQUIRED',
});

console.log('scanner-mtf-gate.unit: PASS');
