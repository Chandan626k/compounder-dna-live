import assert from 'node:assert/strict';
import { IDENTITY_VALIDATION, createSecurityIdentity, resolveProviderMapping, sameSecurityIdentity, symbolWasValid } from '../lib/security-identity.js';
import { ACCESS_STATES, PIT_STATES, VALIDATION_STATES, buildDerivedFinancialEvidence, createFinancialEvidence, determinePitEligibility, isEconomicallyCompatible, isPeriodCompatible, isSupersessionCandidate } from '../lib/financial-evidence-contract.js';

const identity = createSecurityIdentity({
  securityId: 'SEC:INFY:NSE', issuerId: 'ISS:INFOSYS', ISIN: 'INE009A01021',
  exchange: 'NSE', instrumentType: 'EQUITY', canonicalSymbol: 'INFY',
  symbolValidityFrom: '2020-01-01T00:00:00Z',
  providerMappings: [
    { provider: 'yahoo', identifier: 'INFY.NS', validFrom: '2020-01-01T00:00:00Z' },
    { provider: 'upstox', identifier: 'NSE_EQ|INE009A01021', validFrom: '2020-01-01T00:00:00Z' },
  ],
});
assert.equal(identity.validationState, IDENTITY_VALIDATION.VALID);
assert.equal(resolveProviderMapping(identity.identity, 'yahoo').identifier, 'INFY.NS');
assert.equal(resolveProviderMapping(identity.identity, 'upstox').identifier, 'NSE_EQ|INE009A01021');
assert.equal(symbolWasValid(identity.identity, 'INFY', '2024-01-01T00:00:00Z'), true);
assert.equal(sameSecurityIdentity(identity.identity, { securityId: 'SEC:INFY:NSE' }), true);

const baseInput = {
  issuerIdentity: 'ISS:INFOSYS', securityIdentity: 'SEC:INFY:NSE', metric: 'netIncome', value: 100,
  unit: 'INR_CRORE', currency: 'INR', accountingBasis: 'IND_AS',
  reportingPeriodStart: '2024-04-01T00:00:00Z', reportingPeriodEnd: '2025-03-31T00:00:00Z',
  periodType: 'ANNUAL', statementScope: 'CONSOLIDATED', metricScope: 'GROUP',
  publicationTimestamp: '2025-05-15T10:00:00Z', availabilityTimestamp: '2025-05-15T10:05:00Z',
  effectiveTimestamp: '2025-05-15T10:05:00Z', sourceType: 'FILING', sourceAuthority: 'COMPANY_FILING',
  sourceDocumentId: 'DOC-2025-01', sourceDocumentVersion: 'v1', provider: 'company_filing',
  providerRecordId: 'REC-1', retrievedAt: '2025-05-20T10:00:00Z',
  validationState: VALIDATION_STATES.VALID, entitlementStatus: ACCESS_STATES.ALLOWED,
};
const base = createFinancialEvidence(baseInput);
assert.equal(base.validationState, VALIDATION_STATES.VALID);
assert.equal(determinePitEligibility(base.evidence, '2025-05-21T00:00:00Z'), PIT_STATES.PIT_VERIFIED);

const missingPublication = createFinancialEvidence({ ...baseInput, publicationTimestamp: null });
assert.equal(determinePitEligibility(missingPublication.evidence, '2025-05-21T00:00:00Z'), PIT_STATES.PIT_UNKNOWN);
const retrievalOnly = createFinancialEvidence({ ...baseInput, publicationTimestamp: null, availabilityTimestamp: null });
assert.equal(determinePitEligibility(retrievalOnly.evidence, '2025-05-21T00:00:00Z'), PIT_STATES.PIT_UNKNOWN);
assert.notEqual(retrievalOnly.evidence.retrievedAt, retrievalOnly.evidence.publicationTimestamp);

const fy2026 = createFinancialEvidence({ ...baseInput, reportingPeriodStart: '2025-04-01T00:00:00Z', reportingPeriodEnd: '2026-03-31T00:00:00Z', sourceDocumentId: 'DOC-2026-01' });
assert.equal(isPeriodCompatible(base, fy2026), false);
const q1 = createFinancialEvidence({ ...baseInput, periodType: 'QUARTERLY', reportingPeriodStart: '2025-04-01T00:00:00Z', reportingPeriodEnd: '2025-06-30T00:00:00Z' });
const q2 = createFinancialEvidence({ ...baseInput, periodType: 'QUARTERLY', reportingPeriodStart: '2025-07-01T00:00:00Z', reportingPeriodEnd: '2025-09-30T00:00:00Z' });
assert.equal(isPeriodCompatible(q1, q2), false);
assert.equal(isPeriodCompatible(base, q1), false);
assert.equal(isPeriodCompatible(createFinancialEvidence({ ...baseInput, periodType: 'TTM' }), base), false);

const revised = createFinancialEvidence({ ...baseInput, sourceDocumentId: 'DOC-2025-02', sourceDocumentVersion: 'v2', providerRecordId: 'REC-2', publicationTimestamp: '2025-06-01T10:00:00Z', availabilityTimestamp: '2025-06-01T10:05:00Z', revisionStatus: 'REVISED', supersedes: { documentId: 'DOC-2025-01', documentVersion: 'v1' } });
assert.equal(isSupersessionCandidate(revised, base), true);
assert.equal(isSupersessionCandidate(createFinancialEvidence({ ...revised.evidence, revisionStatus: 'ORIGINAL', supersedes: null }), base), false);
const newerOnly = createFinancialEvidence({ ...baseInput, providerRecordId: 'REC-NEW', retrievedAt: '2025-06-10T10:00:00Z' });
assert.equal(isSupersessionCandidate(newerOnly, base), false);

assert.equal(isEconomicallyCompatible(base, createFinancialEvidence({ ...baseInput, issuerIdentity: 'ISS:OTHER' })), false);
assert.equal(isEconomicallyCompatible(base, createFinancialEvidence({ ...baseInput, securityIdentity: 'SEC:OTHER:NSE' })), false);
assert.equal(isEconomicallyCompatible(base, createFinancialEvidence({ ...baseInput, currency: 'USD' })), false);

const roe = buildDerivedFinancialEvidence({ metric: 'ROE', value: 20, unit: 'PERCENT', inputs: [base, createFinancialEvidence({ ...baseInput, metric: 'equity', value: 500, sourceDocumentId: 'DOC-2025-EQ' })], formula: 'netIncome / equity * 100', formulaVersion: 'ROE_V1', retrievedAt: '2025-05-21T00:00:00Z' });
assert.equal(roe.evidence.lineage.formulaVersion, 'ROE_V1');
assert.equal(roe.evidence.lineage.inputs.length, 2);
assert.equal(roe.evidence.sourceType, 'calculated');
const fcf = buildDerivedFinancialEvidence({ metric: 'FCF', value: 70, unit: 'INR_CRORE', inputs: [createFinancialEvidence({ ...baseInput, metric: 'operatingCashFlow', value: 100 }), createFinancialEvidence({ ...baseInput, metric: 'capitalExpenditure', value: -30, sourceDocumentId: 'DOC-2025-CAPEX' })], formula: 'operatingCashFlow + capitalExpenditure', formulaVersion: 'FCF_V1', retrievedAt: '2025-05-21T00:00:00Z' });
assert.equal(fcf.evidence.lineage.formulaVersion, 'FCF_V1');

const future = createFinancialEvidence({ ...baseInput, publicationTimestamp: '2025-07-01T00:00:00Z', availabilityTimestamp: '2025-07-01T00:05:00Z' });
assert.equal(determinePitEligibility(future.evidence, '2025-06-01T00:00:00Z'), PIT_STATES.PIT_INELIGIBLE);
assert.equal(determinePitEligibility(base.evidence, '2025-05-01T00:00:00Z'), PIT_STATES.PIT_INELIGIBLE);

const providerOnly = createFinancialEvidence({
  ...baseInput,
  provider: 'yahoo',
  providerRecordId: 'YF-1',
  sourceAuthority: 'SECONDARY_PROVIDER',
  sourceDocumentId: null,
  sourceDocumentVersion: null,
  publicationTimestamp: null,
  availabilityTimestamp: null,
});
assert.equal(determinePitEligibility(providerOnly.evidence, '2025-05-21T00:00:00Z'), PIT_STATES.PIT_UNKNOWN);
assert.equal(providerOnly.evidence.sourceAuthority, 'SECONDARY_PROVIDER');
assert.notEqual(providerOnly.evidence.sourceAuthority, 'COMPANY_FILING');

const fixture = createFinancialEvidence({ ...baseInput, fixtureStatus: 'DEVELOPMENT_FIXTURE', sourceAuthority: 'DEVELOPMENT_FIXTURE' });
assert.equal(fixture.evidence.fixtureStatus, 'DEVELOPMENT_FIXTURE');
assert.equal(fixture.evidence.sourceAuthority, 'DEVELOPMENT_FIXTURE');

const missingDoc = createFinancialEvidence({ ...baseInput, sourceDocumentId: null, sourceDocumentVersion: null });
assert.equal(missingDoc.validationState, VALIDATION_STATES.VALID);
assert.equal(determinePitEligibility(missingDoc.evidence, '2025-05-21T00:00:00Z'), PIT_STATES.PIT_UNKNOWN);

const identityChange = createSecurityIdentity({ ...identity.identity, canonicalSymbol: 'INFOSYS', symbolValidityTo: '2025-12-31T00:00:00Z' });
assert.equal(sameSecurityIdentity(identity.identity, identityChange.identity), true);

console.log('data-foundation-identity-pit: PASS');
