import assert from 'node:assert/strict';
import { qualifyBankPdfText } from '../lib/bank-ir-pdf-qualification.js';

const officialText = `Q1FY27 Earnings Presentation. Quarter ended June 30, 2026. Standalone financial results. Net interest income.`;
const base = {
  issuer: 'HDFC Bank Limited',
  ticker: 'HDFCBANK.NS',
  documentType: 'official-bank-pdf',
  documentTitle: 'Q1FY27 Earnings Presentation',
  documentDate: '2026-07-18',
  reportingPeriod: 'Q1 FY2027',
  periodType: 'Q1',
  statementScope: 'standalone',
  sourceUrl: 'https://www.hdfc.bank.in/about-us/investor-relations/financial-results',
  page: 4,
  table: 'Key performance metrics',
  documentVersion: null,
  extractedText: officialText,
};

const qualified = qualifyBankPdfText({
  ...base,
  fields: { nii: { value: 33530, unit: 'million INR', currency: 'INR', reportedOrDerived: 'reported', context: 'Net interest income' } },
});
assert.equal(qualified.qualification.status, 'QUALIFIED');
assert.equal(qualified.fields.nii.status, 'VERIFIED');
assert.equal(qualified.fields.nii.provenance.page, 4);
assert.equal(qualified.fields.nii.provenance.table, 'Key performance metrics');
assert.equal(qualified.fields.nii.provenance.reportingPeriod, 'Q1 FY2027');
assert.equal(qualified.fields.nii.provenance.statementScope, 'standalone');
assert.equal(qualified.fields.nii.provenance.reportedOrDerived, 'reported');

const ambiguousPeriod = qualifyBankPdfText({
  ...base,
  reportingPeriod: 'Q1 FY2027',
  extractedText: 'Q1FY27 Earnings Presentation. Standalone financial results. Net interest income.',
  fields: { nii: { value: 33530, unit: 'million INR', currency: 'INR', reportedOrDerived: 'reported', context: 'Net interest income' } },
});
assert.equal(ambiguousPeriod.qualification.status, 'UNVERIFIED');
assert.equal(ambiguousPeriod.fields.nii.value, null);
assert.ok(ambiguousPeriod.qualification.errors.includes('REPORTING_PERIOD_NOT_CONFIRMED_IN_EXTRACTED_TEXT'));

const ambiguousScope = qualifyBankPdfText({
  ...base,
  statementScope: 'standalone',
  extractedText: 'Q1FY27 Earnings Presentation. Quarter ended June 30, 2026. Net interest income.',
  fields: { nii: { value: 33530, unit: 'million INR', currency: 'INR', reportedOrDerived: 'reported', context: 'Net interest income' } },
});
assert.equal(ambiguousScope.qualification.status, 'UNVERIFIED');
assert.equal(ambiguousScope.fields.nii.value, null);
assert.ok(ambiguousScope.qualification.errors.includes('STATEMENT_SCOPE_NOT_CONFIRMED_IN_EXTRACTED_TEXT'));

const derived = qualifyBankPdfText({
  ...base,
  fields: { casa: { value: 123, unit: 'crore INR', currency: 'INR', reportedOrDerived: 'derived', context: 'CASA' } },
});
assert.equal(derived.fields.casa.value, null);

const missing = qualifyBankPdfText({ ...base, fields: {} });
assert.equal(missing.fields.roa.value, null);
assert.equal(missing.fields.roa.status, 'VERIFIED');

console.log('bank-ir-pdf-qualification.unit: PASS');
