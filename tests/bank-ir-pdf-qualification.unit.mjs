import assert from 'node:assert/strict';
import { qualifyBankPdfText } from '../lib/bank-ir-pdf-qualification.js';

// SYNTHETIC STRUCTURAL FIXTURE ONLY. These values are intentionally not financial evidence.
const SYNTHETIC_NII = 12345;
const SYNTHETIC_NIM = 4.2;
const officialText = `Q1FY27 Earnings Presentation. Quarter ended June 30, 2026. Standalone financial results. Net interest income. NIM`;
const base = {
  issuer: 'HDFC Bank Limited', ticker: 'HDFCBANK.NS', documentType: 'official-bank-pdf', documentTitle: 'Q1FY27 Earnings Presentation', documentDate: '2026-07-18',
  reportingPeriod: 'Q1 FY2027', periodType: 'Q1', statementScope: 'standalone', sourceUrl: 'https://www.hdfc.bank.in/about-us/investor-relations/financial-results',
  page: 4, table: 'Synthetic structural fixture', documentVersion: 'SYNTHETIC-NOT-A-REAL-PDF-HASH', extractedText: officialText,
};

const qualified = qualifyBankPdfText({ ...base, fields: { nii: { value: SYNTHETIC_NII, unit: 'crore INR', currency: 'INR', reportedOrDerived: 'reported', context: 'Net interest income' } } });
assert.equal(qualified.qualification.status, 'QUALIFIED');
assert.equal(qualified.fields.nii.status, 'VERIFIED');
assert.equal(qualified.fields.nii.provenance.page, 4);
assert.equal(qualified.fields.nii.provenance.table, 'Synthetic structural fixture');
assert.equal(qualified.fields.nii.provenance.reportingPeriod, 'Q1 FY2027');
assert.equal(qualified.fields.nii.provenance.statementScope, 'standalone');
assert.equal(qualified.fields.nii.provenance.reportedOrDerived, 'reported');

const ambiguousPeriod = qualifyBankPdfText({ ...base, extractedText: 'Earnings Presentation. Standalone financial results. Net interest income.', fields: { nii: { value: SYNTHETIC_NII, unit: 'crore INR', currency: 'INR', reportedOrDerived: 'reported', context: 'Net interest income' } } });
assert.equal(ambiguousPeriod.qualification.status, 'UNVERIFIED');
assert.equal(ambiguousPeriod.fields.nii.value, null);
assert.ok(ambiguousPeriod.qualification.errors.includes('REPORTING_PERIOD_NOT_CONFIRMED_IN_EXTRACTED_TEXT'));

const ambiguousScope = qualifyBankPdfText({ ...base, extractedText: 'Q1FY27 Earnings Presentation. Quarter ended June 30, 2026. Net interest income.', fields: { nii: { value: SYNTHETIC_NII, unit: 'crore INR', currency: 'INR', reportedOrDerived: 'reported', context: 'Net interest income' } } });
assert.equal(ambiguousScope.qualification.status, 'UNVERIFIED');
assert.equal(ambiguousScope.fields.nii.value, null);
assert.ok(ambiguousScope.qualification.errors.includes('STATEMENT_SCOPE_NOT_CONFIRMED_IN_EXTRACTED_TEXT'));

const wrongUnit = qualifyBankPdfText({ ...base, fields: { nim: { value: SYNTHETIC_NIM, unit: 'crore INR', currency: 'INR', reportedOrDerived: 'reported', context: 'NIM' } } });
assert.equal(wrongUnit.fields.nim.value, null);

const derived = qualifyBankPdfText({ ...base, fields: { casa: { value: 123, unit: 'crore INR', currency: 'INR', reportedOrDerived: 'derived', context: 'CASA' } } });
assert.equal(derived.fields.casa.value, null);

const missing = qualifyBankPdfText({ ...base, fields: {} });
assert.equal(missing.fields.roa.value, null);
assert.equal(missing.fields.roa.status, 'UNVERIFIED');

console.log('bank-ir-pdf-qualification.unit: PASS (synthetic structural fixture only)');
