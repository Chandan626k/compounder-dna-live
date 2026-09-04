import assert from 'node:assert/strict';
import { qualifyAnnualRows } from '../lib/statement-evidence.js';

assert.deepEqual(
  qualifyAnnualRows([
    { periodType: '12M', date: '2025-03-31' },
    { periodType: '3M', date: '2025-06-30' },
    { date: '2025-09-30' },
  ]),
  [{ periodType: '12M', date: '2025-03-31' }],
);

assert.deepEqual(
  qualifyAnnualRows([
    { periodType: '3M', date: '2025-06-30' },
    { periodType: null, date: '2025-09-30' },
  ]),
  [],
);

console.log('statement-period-qualification.unit: PASS');
