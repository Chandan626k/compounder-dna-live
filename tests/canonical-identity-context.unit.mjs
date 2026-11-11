import assert from 'node:assert/strict';
import { buildCanonicalIdentityContext } from '../lib/canonical-identity-context.js';
import { adaptStatementEvidenceToCanonical, buildFinancialStrengthInputFromCanonical } from '../lib/financial-evidence-adapter.js';
import { PIT_STATES } from '../lib/financial-evidence-contract.js';

const yahooContext = buildCanonicalIdentityContext({
  provider: 'Yahoo',
  providerIdentifier: 'INFY.NS',
});
assert.equal(yahooContext.issuerIdentity, null, 'a ticker must not be used as a durable issuer identity');
assert.equal(yahooContext.securityIdentity, null, 'a Yahoo symbol must not be used as a durable security identity');
assert.equal(yahooContext.identityResolution.status, 'UNRESOLVED');
assert.equal(yahooContext.identityResolution.reason, 'VERIFIED_SECURITY_MASTER_NOT_CONNECTED');
assert.deepEqual(yahooContext.identityResolution.providerReference, {
  provider: 'yahoo',
  identifier: 'INFY.NS',
});

const row = {
  date: '2025-03-31T00:00:00.000Z',
  reportingPeriodStart: '2024-04-01T00:00:00.000Z',
  periodType: '12M',
  currencyCode: 'INR',
  publicationTimestamp: '2025-05-15T10:00:00.000Z',
  availabilityTimestamp: '2025-05-15T10:05:00.000Z',
  sourceDocumentId: 'FIXTURE-DOC-2025',
  sourceDocumentVersion: 'v1',
  retrievedAt: '2025-05-20T10:00:00.000Z',
  validationState: 'VALID',
  sourceAuthority: 'DEVELOPMENT_FIXTURE',
  revisionStatus: 'ORIGINAL',
};
const statementEvidence = {
  provider: 'development fixture',
  fetchedAt: '2025-05-20T10:00:00.000Z',
  fixtureStatus: 'DEVELOPMENT_FIXTURE',
  currency: { tradingCurrency: 'INR', financialCurrency: 'INR', status: 'MATCH' },
  income: [{ ...row, EBITDA: 220 }],
  balance: [{
    ...row,
    totalDebt: 200,
    cashAndCashEquivalents: 50,
    stockholdersEquity: 1000,
    currentAssets: 500,
    currentLiabilities: 250,
  }],
  cash: [],
};
const adapted = adaptStatementEvidenceToCanonical(statementEvidence, {
  issuerIdentity: yahooContext.issuerIdentity,
  securityIdentity: yahooContext.securityIdentity,
  evaluationTimestamp: '2025-05-21T00:00:00.000Z',
});
const canonical = {
  ...adapted,
  identityResolution: yahooContext.identityResolution,
};
assert.equal(canonical.identityResolution.status, 'UNRESOLVED');
assert.ok(canonical.records.length > 0);
assert.ok(canonical.records.every((record) => record.evidence.issuerIdentity === null));
assert.ok(canonical.records.every((record) => record.evidence.securityIdentity === null));
assert.ok(canonical.records.every((record) => record.pitEligibility === PIT_STATES.PIT_UNKNOWN));
assert.ok(canonical.records.every((record) => record.evidence.sourceType === 'provider'));
assert.ok(canonical.records.every((record) => record.evidence.sourceAuthority === 'SECONDARY_PROVIDER'));
assert.ok(canonical.records.every((record) => record.evidence.validationState === 'UNKNOWN'));
assert.ok(canonical.records.every((record) => record.evidence.sourceDocumentId === null));
assert.ok(canonical.records.every((record) => record.evidence.publicationTimestamp === null));

const strength = buildFinancialStrengthInputFromCanonical(canonical, {
  sectorKey: 'MANUFACTURING',
  baseFinancials: { ratios: {}, derived: {}, current: {} },
  evaluationTimestamp: '2025-05-21T00:00:00.000Z',
});
assert.equal(strength.status, 'UNAVAILABLE', 'otherwise complete evidence must remain blocked without durable issuer/security identity');
assert.equal(strength.reason, 'CANONICAL_FINANCIAL_STRENGTH_EVIDENCE_INSUFFICIENT');

const missingProviderReference = buildCanonicalIdentityContext();
assert.equal(missingProviderReference.identityResolution.providerReference, null);
assert.equal(missingProviderReference.issuerIdentity, null);
assert.equal(missingProviderReference.securityIdentity, null);

console.log('canonical-identity-context: PASS');
