import assert from 'node:assert/strict';
import { parseIciciOfficialHtml, mergeBankIrEvidence } from '../lib/bank-ir-evidence.js';

const html = `
  <h1>Performance Review: Quarter ended June 30, 2026</h1>
  <p>Profit after tax increased by 15.9% to ₹ 14,805 crore in Q1-2027.</p>
  <p>Net interest income (NII) increased by 12.7% year-on-year to ₹ 24,384 crore in Q1-2027.</p>
  <p>Net interest margin was 4.36% in Q1-2027.</p>
  <p>Total period-end deposits increased by 14.0% year-on-year and 2.2% sequentially to ₹ 18,33,586 crore at June 30, 2026.</p>
  <p>Total advances increased by 19.6% year-on-year and 5.0% sequentially to ₹ 16,31,260 crore at June 30, 2026.</p>
  <p>Average current account and savings account (CASA) ratio was 38.1% in Q1-2027.</p>
  <p>The gross NPA ratio was 1.38% at June 30, 2026.</p>
  <p>The net NPA ratio was 0.35% at June 30, 2026.</p>
  <p>The provisioning coverage ratio on non-performing loans was 74.7% at June 30, 2026.</p>
  <p>The Bank’s total capital adequacy ratio at June 30, 2026 was 16.84% and CET-1 ratio was 16.19% compared to the minimum regulatory requirements.</p>
`;

const evidence = parseIciciOfficialHtml(html, '2026-08-24T00:00:00.000Z');
assert.equal(evidence.qualification.status, 'QUALIFIED');
assert.equal(evidence.reportingPeriod, 'Q1 FY2027');
assert.equal(evidence.periodType, 'Q1');
assert.equal(evidence.statementScope, 'standalone');
assert.equal(evidence.fields.nii.value, 24384);
assert.equal(evidence.fields.nim.value, 4.36);
assert.equal(evidence.fields.pat.value, 14805);
assert.equal(evidence.fields.gnpa.value, 1.38);
assert.equal(evidence.fields.nnpa.value, 0.35);
assert.equal(evidence.fields.provisionCoverage.value, 74.7);
assert.equal(evidence.fields.deposits.value, 1833586);
assert.equal(evidence.fields.advances.value, 1631260);
assert.equal(evidence.fields.casaRatio.value, 38.1);
assert.equal(evidence.fields.creditGrowth.value, 19.6);
assert.equal(evidence.fields.depositGrowth.value, 14);
assert.equal(evidence.fields.capitalAdequacy.value, 16.84);
assert.equal(evidence.fields.cet1.value, 16.19);
assert.equal(evidence.fields.casa.value, null);
assert.equal(evidence.fields.casa.status, 'UNVERIFIED');
assert.equal(evidence.fields.slippages.value, null);
assert.equal(evidence.fields.slippages.status, 'UNVERIFIED');
assert.equal(evidence.fields.nii.provenance.source, 'ICICI Bank Investor Relations');
assert.equal(evidence.fields.nii.provenance.reportingPeriod, 'Q1 FY2027');
assert.equal(evidence.fields.nii.provenance.statementScope, 'standalone');
assert.equal(evidence.fields.nii.provenance.reportedOrDerived, 'reported');

const merged = mergeBankIrEvidence({ current: { deposits: 123 }, bankEvidence: {} }, evidence);
assert.equal(merged.current.deposits, 123);
assert.equal(merged.bankEvidence['ICICIBANK.NS'].fields.nii.value, 24384);

console.log('bank-ir-evidence.unit: PASS');
