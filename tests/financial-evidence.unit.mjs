import assert from 'node:assert/strict';
import { areEvidenceCompatible, buildEvidenceId, createCanonicalEvidence } from '../lib/financial-evidence.js';

const make = (overrides = {}) => createCanonicalEvidence({
  source: 'YAHOO_FINANCE', sourceKey: 'totalDebt', issuer: 'Tata Consultancy Services Limited', ticker: 'TCS.NS',
  reportingDate: '2025-03-31T00:00:00.000Z', reportingPeriod: '2025-03-31', periodType: 'ANNUAL',
  statementScope: 'CONSOLIDATED', unit: 'INR_CRORE', currency: 'INR', reportedOrDerived: 'REPORTED', status: 'PROVIDER_RETURNED', ...overrides,
});

const annual = make();
assert.match(annual.evidenceId, /^ev_[a-f0-9]{24}$/);
assert.equal(annual.source, 'YAHOO_FINANCE');
assert.equal(annual.sourceKey, 'totalDebt');
assert.equal(annual.reportingDate, '2025-03-31T00:00:00.000Z');
assert.equal(annual.periodType, 'ANNUAL');
assert.equal(annual.statementScope, 'CONSOLIDATED');
assert.equal(annual.unit, 'INR_CRORE');
assert.equal(annual.currency, 'INR');
assert.equal(annual.reportedOrDerived, 'REPORTED');
assert.equal(buildEvidenceId(annual), annual.evidenceId);
assert.equal(areEvidenceCompatible(annual, make({ sourceKey: 'equity' })), true);
assert.equal(areEvidenceCompatible(annual, make({ reportingDate: '2026-03-31T00:00:00.000Z' })), false);
assert.equal(areEvidenceCompatible(annual, make({ periodType: 'QUARTERLY' })), false);
assert.equal(areEvidenceCompatible(annual, make({ periodType: 'TTM' })), false);
assert.equal(areEvidenceCompatible(annual, make({ statementScope: 'STANDALONE' })), false);
assert.equal(areEvidenceCompatible(annual, make({ statementScope: null })), false);
assert.equal(areEvidenceCompatible(annual, make({ unit: 'INR_MILLION' })), false);
assert.equal(areEvidenceCompatible(annual, make({ unit: null })), false);
assert.equal(areEvidenceCompatible(annual, make({ currency: 'USD' })), false);
assert.equal(areEvidenceCompatible(annual, make({ currency: null })), false);
assert.equal(areEvidenceCompatible(annual, make({ issuer: null })), false);
assert.equal(areEvidenceCompatible(annual, make({ ticker: 'INFY.NS' })), false);

console.log('financial-evidence.unit: PASS');
