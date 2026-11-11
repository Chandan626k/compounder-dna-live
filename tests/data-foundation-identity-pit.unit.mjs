import assert from 'node:assert/strict';
import { IDENTITY_VALIDATION, createSecurityIdentity, resolveProviderMapping, sameSecurityIdentity, symbolWasValid } from '../lib/security-identity.js';
import { ACCESS_STATES, PIT_STATES, REVISION_STATES, VALIDATION_STATES, buildDerivedFinancialEvidence, createFinancialEvidence, determinePitEligibility, isEconomicallyCompatible, isPeriodCompatible, isSupersessionCandidate } from '../lib/financial-evidence-contract.js';

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

const invalidTimestampIdentity = createSecurityIdentity({
  securityId: 'SEC:BAD:NSE', issuerId: 'ISS:BAD', exchange: 'NSE', instrumentType: 'EQUITY', canonicalSymbol: 'BAD',
  symbolValidityFrom: false,
  providerMappings: [{ provider: 'yahoo', identifier: 'BAD.NS', validFrom: [2025, 0, 1] }],
});
assert.equal(invalidTimestampIdentity.identity.symbolValidityFrom, null);
assert.equal(invalidTimestampIdentity.identity.providerMappings[0].validFrom, null);
assert.equal(invalidTimestampIdentity.validationState, IDENTITY_VALIDATION.INVALID,
  'explicit malformed identity validity timestamps must not become open-ended validity');
assert.ok(invalidTimestampIdentity.errors.some((error) => error.includes('symbolValidityFrom')));
assert.ok(invalidTimestampIdentity.errors.some((error) => error.includes('provider mapping validFrom')));

const timelessIdentity = createSecurityIdentity({
  securityId: 'SEC:TIMELESS:NSE', issuerId: 'ISS:TIMELESS', exchange: 'NSE', instrumentType: 'EQUITY',
  canonicalSymbol: 'INFY', providerMappings: [{ provider: 'yahoo', identifier: 'INFY.NS' }],
});
assert.equal(resolveProviderMapping(timelessIdentity.identity, 'yahoo', false), null,
  'a supplied boolean as-of value must not be treated as an epoch or as an omitted date');
assert.equal(resolveProviderMapping(timelessIdentity.identity, 'yahoo', 'not-a-date'), null,
  'an invalid supplied as-of value must not bypass mapping validity checks');
assert.equal(symbolWasValid(timelessIdentity.identity, 'INFY', false), false,
  'a boolean symbol-validity time must not be coerced to the Unix epoch');
assert.equal(symbolWasValid(timelessIdentity.identity, 'INFY', 0), true,
  'an explicit numeric epoch remains a valid symbol-validity time');

const baseInput = {
  issuerIdentity: 'ISS:INFOSYS', securityIdentity: 'SEC:INFY:NSE', metric: 'netIncome', value: 100,
  unit: 'INR_CRORE', currency: 'INR', accountingBasis: 'IND_AS',
  reportingPeriodStart: '2024-04-01T00:00:00Z', reportingPeriodEnd: '2025-03-31T00:00:00Z',
  periodType: 'ANNUAL', statementScope: 'CONSOLIDATED', metricScope: 'GROUP',
  publicationTimestamp: '2025-05-15T10:00:00Z', availabilityTimestamp: '2025-05-15T10:05:00Z',
  effectiveTimestamp: '2025-05-15T10:05:00Z', sourceType: 'FILING', sourceAuthority: 'COMPANY_FILING',
  sourceDocumentId: 'DOC-2025-01', sourceDocumentVersion: 'v1', provider: 'company_filing',
  providerRecordId: 'REC-1', retrievedAt: '2025-05-20T10:00:00Z',
  revisionStatus: REVISION_STATES.ORIGINAL,
  validationState: VALIDATION_STATES.VALID, entitlementStatus: ACCESS_STATES.ALLOWED,
};
const base = createFinancialEvidence(baseInput);
assert.equal(base.validationState, VALIDATION_STATES.VALID);
assert.equal(determinePitEligibility(base.evidence, '2025-05-21T00:00:00Z'), PIT_STATES.PIT_VERIFIED);

const coercedBooleanTimestamps = createFinancialEvidence({
  ...baseInput,
  publicationTimestamp: false,
  availabilityTimestamp: true,
});
assert.equal(coercedBooleanTimestamps.evidence.publicationTimestamp, null,
  'boolean publication timestamps must not be coerced to epoch dates');
assert.equal(coercedBooleanTimestamps.evidence.availabilityTimestamp, null,
  'boolean availability timestamps must not be coerced to epoch dates');
assert.equal(determinePitEligibility(coercedBooleanTimestamps.evidence, '2025-05-21T00:00:00Z'), PIT_STATES.PIT_UNKNOWN,
  'coerced boolean source timestamps must not satisfy PIT verification');

const coercedArrayTimestamp = createFinancialEvidence({
  ...baseInput,
  publicationTimestamp: [2025, 0, 1],
  availabilityTimestamp: [2025, 0, 2],
});
assert.equal(coercedArrayTimestamp.evidence.publicationTimestamp, null,
  'array publication timestamps must not be coerced into calendar dates');
assert.equal(coercedArrayTimestamp.evidence.availabilityTimestamp, null,
  'array availability timestamps must not be coerced into calendar dates');
assert.equal(determinePitEligibility(coercedArrayTimestamp.evidence, '2025-05-21T00:00:00Z'), PIT_STATES.PIT_UNKNOWN);

const explicitEpochEvidence = createFinancialEvidence({
  ...baseInput,
  reportingPeriodStart: 0,
  reportingPeriodEnd: 1,
  publicationTimestamp: 0,
  availabilityTimestamp: 1,
  effectiveTimestamp: new Date(1),
  retrievedAt: 2,
});
assert.equal(explicitEpochEvidence.evidence.publicationTimestamp, '1970-01-01T00:00:00.000Z');
assert.equal(explicitEpochEvidence.evidence.availabilityTimestamp, '1970-01-01T00:00:00.001Z');
assert.equal(determinePitEligibility(explicitEpochEvidence.evidence, 3), PIT_STATES.PIT_VERIFIED,
  'explicit finite numeric epoch milliseconds remain valid timestamps');

const preEpochEvidence = createFinancialEvidence({
  ...baseInput,
  reportingPeriodStart: '1960-04-01T00:00:00Z',
  reportingPeriodEnd: '1961-03-31T00:00:00Z',
  publicationTimestamp: '1961-05-15T10:00:00Z',
  availabilityTimestamp: '1961-05-15T10:05:00Z',
  effectiveTimestamp: '1961-05-15T10:05:00Z',
  retrievedAt: '1961-05-20T10:00:00Z',
});
assert.equal(preEpochEvidence.validationState, VALIDATION_STATES.VALID);
assert.equal(determinePitEligibility(preEpochEvidence.evidence, null), PIT_STATES.PIT_UNKNOWN,
  'null evaluation timestamp must not be coerced to the Unix epoch');
assert.equal(determinePitEligibility(preEpochEvidence.evidence, undefined), PIT_STATES.PIT_UNKNOWN,
  'missing evaluation timestamp must remain PIT_UNKNOWN');
assert.equal(determinePitEligibility(preEpochEvidence.evidence, ''), PIT_STATES.PIT_UNKNOWN,
  'empty evaluation timestamp must remain PIT_UNKNOWN');
assert.equal(determinePitEligibility(preEpochEvidence.evidence, false), PIT_STATES.PIT_UNKNOWN,
  'boolean evaluation timestamps must be rejected');
assert.equal(determinePitEligibility(preEpochEvidence.evidence, 0), PIT_STATES.PIT_VERIFIED,
  'an explicit finite Unix-epoch timestamp remains valid');

const missingRevisionStatus = createFinancialEvidence({ ...baseInput, revisionStatus: null });
assert.equal(missingRevisionStatus.evidence.revisionStatus, REVISION_STATES.UNKNOWN);
assert.equal(determinePitEligibility(missingRevisionStatus.evidence, '2025-05-21T00:00:00Z'), PIT_STATES.PIT_UNKNOWN,
  'missing revision status must not default to ORIGINAL');
const unknownRevisionStatus = createFinancialEvidence({ ...baseInput, revisionStatus: 'UNRECOGNIZED_REVISION' });
assert.equal(determinePitEligibility(unknownRevisionStatus.evidence, '2025-05-21T00:00:00Z'), PIT_STATES.PIT_UNKNOWN,
  'unrecognized revision status must fail closed');

const missingPublication = createFinancialEvidence({ ...baseInput, publicationTimestamp: null });
assert.equal(determinePitEligibility(missingPublication.evidence, '2025-05-21T00:00:00Z'), PIT_STATES.PIT_UNKNOWN);
const retrievalOnly = createFinancialEvidence({ ...baseInput, publicationTimestamp: null, availabilityTimestamp: null });
assert.equal(determinePitEligibility(retrievalOnly.evidence, '2025-05-21T00:00:00Z'), PIT_STATES.PIT_UNKNOWN);
assert.notEqual(retrievalOnly.evidence.retrievedAt, retrievalOnly.evidence.publicationTimestamp);

const invalidPeriodContract = createFinancialEvidence({
  ...baseInput,
  reportingPeriodStart: '2025-04-01T00:00:00Z',
  reportingPeriodEnd: '2024-03-31T00:00:00Z',
});
assert.equal(invalidPeriodContract.validationState, VALIDATION_STATES.INVALID);
assert.equal(determinePitEligibility(invalidPeriodContract, '2025-05-21T00:00:00Z'), PIT_STATES.INVALID,
  'PIT evaluation must respect an invalid outer contract state');

const fy2026 = createFinancialEvidence({ ...baseInput, reportingPeriodStart: '2025-04-01T00:00:00Z', reportingPeriodEnd: '2026-03-31T00:00:00Z', sourceDocumentId: 'DOC-2026-01' });
assert.equal(isPeriodCompatible(base, fy2026), false);
const q1 = createFinancialEvidence({ ...baseInput, periodType: 'QUARTERLY', reportingPeriodStart: '2025-04-01T00:00:00Z', reportingPeriodEnd: '2025-06-30T00:00:00Z' });
const q2 = createFinancialEvidence({ ...baseInput, periodType: 'QUARTERLY', reportingPeriodStart: '2025-07-01T00:00:00Z', reportingPeriodEnd: '2025-09-30T00:00:00Z' });
assert.equal(isPeriodCompatible(q1, q2), false);
assert.equal(isPeriodCompatible(base, q1), false);
assert.equal(isPeriodCompatible(createFinancialEvidence({ ...baseInput, periodType: 'TTM' }), base), false);
assert.equal(isPeriodCompatible(createFinancialEvidence({ ...baseInput, accountingBasis: null }), base), false,
  'period compatibility requires an explicit accounting basis');
assert.equal(isPeriodCompatible(createFinancialEvidence({ ...baseInput, statementScope: null }), base), false,
  'period compatibility requires an explicit statement scope');
assert.equal(isPeriodCompatible(createFinancialEvidence({ ...baseInput, metricScope: null }), base), false,
  'period compatibility requires an explicit metric scope');

const revised = createFinancialEvidence({ ...baseInput, sourceDocumentId: 'DOC-2025-02', sourceDocumentVersion: 'v2', providerRecordId: 'REC-2', publicationTimestamp: '2025-06-01T10:00:00Z', availabilityTimestamp: '2025-06-01T10:05:00Z', revisionStatus: REVISION_STATES.REVISED, supersedes: { documentId: 'DOC-2025-01', documentVersion: 'v1' } });
assert.equal(isSupersessionCandidate(revised, base), true);
assert.equal(determinePitEligibility(revised, '2025-06-02T00:00:00Z'), PIT_STATES.PIT_VERIFIED,
  'a revised filing with explicit prior document lineage may be PIT-verified');
const revisedWithoutLineage = createFinancialEvidence({ ...baseInput, revisionStatus: REVISION_STATES.REVISED, supersedes: null });
assert.equal(determinePitEligibility(revisedWithoutLineage, '2025-06-02T00:00:00Z'), PIT_STATES.PIT_UNKNOWN,
  'a revised filing without a prior document/version pointer must remain PIT_UNKNOWN');
const selfReferentialRevision = createFinancialEvidence({ ...baseInput, revisionStatus: REVISION_STATES.REVISED,
  supersedes: { documentId: baseInput.sourceDocumentId, documentVersion: baseInput.sourceDocumentVersion } });
assert.equal(determinePitEligibility(selfReferentialRevision, '2025-06-02T00:00:00Z'), PIT_STATES.PIT_UNKNOWN,
  'a revision cannot supersede its own source document/version');
const supersededWithoutTimestamp = createFinancialEvidence({ ...baseInput, revisionStatus: REVISION_STATES.SUPERSEDED });
assert.equal(determinePitEligibility(supersededWithoutTimestamp, '2025-06-02T00:00:00Z'), PIT_STATES.PIT_UNKNOWN,
  'a superseded filing without a supersededAt timestamp must remain PIT_UNKNOWN');
const supersededBeforeEvaluation = createFinancialEvidence({ ...baseInput, revisionStatus: REVISION_STATES.SUPERSEDED,
  supersededAt: '2025-05-20T00:00:00Z' });
assert.equal(determinePitEligibility(supersededBeforeEvaluation, '2025-06-02T00:00:00Z'), PIT_STATES.SUPERSEDED);
const supersededAfterEvaluation = createFinancialEvidence({ ...baseInput, revisionStatus: REVISION_STATES.SUPERSEDED,
  supersededAt: '2025-06-03T00:00:00Z' });
assert.equal(determinePitEligibility(supersededAfterEvaluation, '2025-06-02T00:00:00Z'), PIT_STATES.PIT_VERIFIED,
  'a document superseded after the evaluation time remains valid for that earlier point in time');
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
