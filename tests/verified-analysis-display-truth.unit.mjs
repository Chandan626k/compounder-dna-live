import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync(new URL('../lib/verified-analysis.js', import.meta.url), 'utf8');

test('verified analysis masks absolute financial values when valuation evidence is not VERIFIED', () => {
  assert.match(source, /function maskUnverifiedFinancialDisplay\(/);
  assert.match(source, /valuationEvidenceAuthority\?\.valuationEvidenceStatus === 'VERIFIED'/);
  assert.match(source, /current\[key\] = null/);
  assert.match(source, /marketCapStatus: 'INSUFFICIENT_EVIDENCE'/);
  assert.match(source, /fairValue: null/);
  assert.match(source, /displayStatus: 'INSUFFICIENT_EVIDENCE'/);
  assert.match(source, /const displaySafe = maskUnverifiedFinancialDisplay\(/);
  assert.match(source, /fundamentals: \{ \.\.\.displaySafe\.financials/);
  assert.match(source, /valuation: \{ \.\.\.displaySafe\.valuation/);
});

test('production execution remains disabled after display-truth masking', () => {
  assert.match(source, /action: 'NO TRADE — VALIDATION REQUIRED'/);
  assert.match(source, /executionAuthority: 'DISABLED'/);
  assert.match(source, /productionActionsEnabled: false/);
});
