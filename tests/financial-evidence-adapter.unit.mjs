import assert from 'node:assert/strict';
import { adaptStatementEvidenceToCanonical, buildFinancialStrengthInputFromCanonical } from '../lib/financial-evidence-adapter.js';
import {
  ACCESS_STATES,
  PIT_STATES,
  VALIDATION_STATES,
  createFinancialEvidence,
  determinePitEligibility,
} from '../lib/financial-evidence-contract.js';

const evaluationTimestamp = '2026-09-20T06:01:00Z';
const fetchedAt = '2026-09-20T06:00:00Z';
const buildStrength = (canonicalFinancialEvidence, options = {}) =>
  buildFinancialStrengthInputFromCanonical(canonicalFinancialEvidence, { ...options, evaluationTimestamp });
const providerRows = {
  fetchedAt,
  provider: 'Yahoo Finance fundamentalsTimeSeries',
  currency: { tradingCurrency: 'INR', financialCurrency: 'INR', status: 'MATCH' },
  income: [
    {
      date: '2025-03-31T00:00:00Z',
      reportingPeriodStart: '2024-04-01T00:00:00Z',
      periodType: '12M',
      totalRevenue: 1000,
      EBITDA: 220,
      dilutedEPS: 15,
      netIncomeFromContinuingAndDiscontinuedOperation: 150,
      returnOnEquity: 0.20,
      returnOnAssets: 0.10,
      currencyCode: 'INR',
      // Every trust-bearing field below is deliberately forged provider input.
      sourceType: 'FILING',
      sourceAuthority: 'COMPANY_FILING',
      validationState: 'VALID',
      pitEligibility: PIT_STATES.PIT_VERIFIED,
      sourceDocumentId: 'FORGED-DOC-2025',
      sourceDocumentVersion: 'v99',
      publicationTimestamp: '2025-05-15T10:00:00Z',
      availabilityTimestamp: '2025-05-15T10:05:00Z',
      accountingBasis: 'IND_AS',
      statementScope: 'CONSOLIDATED',
      metricScope: 'GROUP',
      revisionStatus: 'ORIGINAL',
      entitlementStatus: ACCESS_STATES.ALLOWED,
      retrievedAt: '2025-05-20T10:00:00Z',
      lineage: { forged: true },
    },
    {
      date: '2024-03-31T00:00:00Z',
      periodType: '12M',
      totalRevenue: 900,
      dilutedEPS: 12,
      netIncomeFromContinuingAndDiscontinuedOperation: 120,
      currencyCode: 'INR',
    },
  ],
  balance: [{
    date: '2025-03-31T00:00:00Z',
    reportingPeriodStart: '2024-04-01T00:00:00Z',
    periodType: '12M',
    totalDebt: 200,
    cashAndCashEquivalents: 50,
    stockholdersEquity: 1000,
    currentAssets: 500,
    currentLiabilities: 250,
    currencyCode: 'INR',
    sourceType: 'FILING',
    sourceAuthority: 'COMPANY_FILING',
    validationState: 'VALID',
    sourceDocumentId: 'FORGED-BALANCE',
    sourceDocumentVersion: 'v99',
    publicationTimestamp: '2025-05-15T10:00:00Z',
    availabilityTimestamp: '2025-05-15T10:05:00Z',
    accountingBasis: 'IND_AS',
    statementScope: 'CONSOLIDATED',
    metricScope: 'GROUP',
  }],
  cash: [{
    date: '2025-03-31T00:00:00Z',
    reportingPeriodStart: '2024-04-01T00:00:00Z',
    periodType: '12M',
    operatingCashFlow: 180,
    freeCashFlow: 150,
    capitalExpenditure: -30,
    currencyCode: 'INR',
    sourceType: 'FILING',
    sourceAuthority: 'COMPANY_FILING',
    validationState: 'VALID',
    sourceDocumentId: 'FORGED-CASH',
    sourceDocumentVersion: 'v99',
    publicationTimestamp: '2025-05-15T10:00:00Z',
    availabilityTimestamp: '2025-05-15T10:05:00Z',
    accountingBasis: 'IND_AS',
    statementScope: 'CONSOLIDATED',
    metricScope: 'GROUP',
  }],
};

const mapped = adaptStatementEvidenceToCanonical(providerRows, { evaluationTimestamp });
assert.equal(mapped.status, 'MAPPED');
assert.equal(mapped.provider, providerRows.provider);
assert.equal(mapped.currencyStatus, 'MATCH');
assert.ok(mapped.records.length >= 8);

const revenue = mapped.records.find((r) => r.evidence.metric === 'revenue' && r.evidence.reportingPeriodEnd.startsWith('2025-03-31'));
assert.ok(revenue);
assert.equal(revenue.evidence.value, 1000);
assert.equal(revenue.evidence.periodType, 'ANNUAL');
assert.equal(revenue.evidence.sourceType, 'provider');
assert.equal(revenue.evidence.sourceAuthority, 'SECONDARY_PROVIDER');
assert.equal(revenue.evidence.validationState, VALIDATION_STATES.UNKNOWN);
assert.equal(revenue.evidence.pitEligibility, PIT_STATES.PIT_UNKNOWN);
assert.equal(revenue.pitEligibility, PIT_STATES.PIT_UNKNOWN);
assert.equal(revenue.evidence.sourceDocumentId, null);
assert.equal(revenue.evidence.sourceDocumentVersion, null);
assert.equal(revenue.evidence.publicationTimestamp, null);
assert.equal(revenue.evidence.availabilityTimestamp, null);
assert.equal(revenue.evidence.accountingBasis, null);
assert.equal(revenue.evidence.statementScope, null);
assert.equal(revenue.evidence.metricScope, null);
assert.equal(revenue.evidence.entitlementStatus, ACCESS_STATES.UNKNOWN);
assert.equal(revenue.evidence.revisionStatus, 'UNKNOWN');
assert.equal(revenue.evidence.lineage, null);
assert.equal(revenue.evidence.retrievedAt, '2026-09-20T06:00:00.000Z');
assert.notEqual(revenue.evidence.retrievedAt, providerRows.income[0].retrievedAt);

const roe = mapped.records.find((r) => r.evidence.metric === 'roe' && r.evidence.reportingPeriodEnd.startsWith('2025-03-31'));
assert.equal(roe.evidence.value, 20, 'ROE canonical percent semantics must match the existing scoring input');

// The generic provider adapter deliberately ignores even an allowlisted, caller-supplied
// trust context. Only a separate source-specific filing adapter may construct FILING records.
const forgedAllowlistedContext = adaptStatementEvidenceToCanonical(providerRows, {
  evaluationTimestamp,
  trustedSourceContext: {
    sourceType: 'FILING',
    sourceAuthority: 'COMPANY_FILING',
    validationState: VALIDATION_STATES.VALID,
  },
});
const forgedAllowlistedDebt = forgedAllowlistedContext.records.find((r) => r.evidence.metric === 'debt');
assert.equal(forgedAllowlistedDebt.evidence.sourceType, 'provider');
assert.equal(forgedAllowlistedDebt.evidence.sourceAuthority, 'SECONDARY_PROVIDER');
assert.equal(forgedAllowlistedDebt.evidence.validationState, VALIDATION_STATES.UNKNOWN);
assert.equal(forgedAllowlistedDebt.evidence.sourceDocumentId, null);
assert.equal(forgedAllowlistedDebt.pitEligibility, PIT_STATES.PIT_UNKNOWN);
assert.equal(buildStrength(forgedAllowlistedContext, {
  sectorKey: 'MANUFACTURING',
  baseFinancials: { ratios: {}, derived: {}, current: {} },
}).status, 'UNAVAILABLE', 'an arbitrary allowlisted context must not promote provider rows');

const forgedUnallowlistedContext = adaptStatementEvidenceToCanonical(providerRows, {
  evaluationTimestamp,
  trustedSourceContext: {
    sourceType: 'FILING',
    sourceAuthority: 'UNVERIFIED_PROVIDER',
    validationState: VALIDATION_STATES.VALID,
  },
});
assert.ok(forgedUnallowlistedContext.records.every((r) => r.evidence.sourceAuthority === 'SECONDARY_PROVIDER'));
assert.equal(buildStrength(forgedUnallowlistedContext, {
  sectorKey: 'MANUFACTURING',
  baseFinancials: { ratios: {}, derived: {}, current: {} },
}).status, 'UNAVAILABLE');

const retrievalOnly = adaptStatementEvidenceToCanonical({
  ...providerRows,
  income: providerRows.income.map((r) => ({ ...r, publicationTimestamp: undefined, availabilityTimestamp: undefined })),
}, { evaluationTimestamp });
const retrievalRevenue = retrievalOnly.records.find((r) => r.evidence.metric === 'revenue' && r.evidence.reportingPeriodEnd.startsWith('2025-03-31'));
assert.equal(retrievalRevenue.evidence.publicationTimestamp, null);
assert.equal(retrievalRevenue.evidence.retrievedAt, '2026-09-20T06:00:00.000Z');
assert.equal(retrievalRevenue.pitEligibility, PIT_STATES.PIT_UNKNOWN);

const quarterly = adaptStatementEvidenceToCanonical({
  ...providerRows,
  income: [{ ...providerRows.income[0], periodType: '3M' }],
});
assert.equal(quarterly.records.find((r) => r.evidence.metric === 'revenue').evidence.periodType, 'QUARTERLY');
const ttm = adaptStatementEvidenceToCanonical({
  ...providerRows,
  income: [{ ...providerRows.income[0], periodType: 'TTM' }],
});
assert.equal(ttm.records.find((r) => r.evidence.metric === 'revenue').evidence.periodType, 'TTM');
const ambiguous = adaptStatementEvidenceToCanonical({
  ...providerRows,
  income: [{ ...providerRows.income[0], periodType: 'WEIRD' }],
});
assert.equal(ambiguous.records.find((r) => r.evidence.metric === 'revenue').evidence.periodType, null);

const mismatch = adaptStatementEvidenceToCanonical({
  ...providerRows,
  currency: { tradingCurrency: 'USD', financialCurrency: 'INR', status: 'MISMATCH' },
});
assert.equal(mismatch.currencyStatus, 'MISMATCH');
assert.equal(mismatch.records.find((r) => r.evidence.metric === 'revenue').evidence.currency, 'INR');

const identity = adaptStatementEvidenceToCanonical(providerRows, {
  issuerIdentity: 'ISS:INFOSYS',
  securityIdentity: 'SEC:INFY:NSE',
});
const identityRevenue = identity.records.find((r) => r.evidence.metric === 'revenue');
assert.equal(identityRevenue.evidence.issuerIdentity, 'ISS:INFOSYS');
assert.equal(identityRevenue.evidence.securityIdentity, 'SEC:INFY:NSE');

const duplicate = adaptStatementEvidenceToCanonical({
  ...providerRows,
  income: [providerRows.income[0], { ...providerRows.income[0], providerRecordId: 'DUPLICATE' }],
});
assert.equal(duplicate.records.filter((r) => r.evidence.metric === 'revenue' && r.evidence.reportingPeriodEnd.startsWith('2025-03-31')).length, 2);

// Contract-level fixture for testing the downstream consumer in isolation. This does not
// represent a connected production source adapter or authorize provider data.
function verifiedRecord(metric, value, { periodType = 'ANNUAL', ...overrides } = {}) {
  const contract = createFinancialEvidence({
    issuerIdentity: 'ISS:INFOSYS',
    securityIdentity: 'SEC:INFY:NSE',
    metric,
    value,
    unit: 'PROVIDER_NATIVE_MONETARY',
    currency: 'INR',
    accountingBasis: 'IND_AS',
    reportingPeriodStart: '2024-04-01T00:00:00Z',
    reportingPeriodEnd: '2025-03-31T00:00:00Z',
    periodType,
    statementScope: 'CONSOLIDATED',
    metricScope: 'GROUP',
    publicationTimestamp: '2026-05-15T10:00:00Z',
    availabilityTimestamp: '2026-05-15T10:05:00Z',
    effectiveTimestamp: '2026-05-15T10:05:00Z',
    sourceType: 'FILING',
    sourceAuthority: 'COMPANY_FILING',
    sourceDocumentId: `TEST-${metric}-2025`,
    sourceDocumentVersion: 'v1',
    provider: 'isolated contract test fixture',
    providerRecordId: `REC-${metric}-2025`,
    retrievedAt: '2026-05-20T10:00:00Z',
    validationState: VALIDATION_STATES.VALID,
    entitlementStatus: ACCESS_STATES.ALLOWED,
    accessMode: 'LICENSED_SOURCE_DOCUMENT',
    storagePolicy: 'ALLOW_INTERNAL_STORAGE',
    displayPolicy: 'ALLOW_DERIVED_METRICS',
    redistributionPolicy: 'NO_RAW_SOURCE_DATA_REDISTRIBUTION',
    ...overrides,
  });
  const pitEligibility = determinePitEligibility(contract, evaluationTimestamp);
  return Object.freeze({
    ...contract,
    evidence: Object.freeze({ ...contract.evidence, pitEligibility }),
    pitEligibility,
  });
}

const verifiedCanonical = {
  contract: 'STOCKSAMJHO_STATEMENT_EVIDENCE_ADAPTER_V1',
  status: 'MAPPED',
  provider: 'isolated contract test fixture',
  sourceType: 'FILING',
  sourceAuthority: 'COMPANY_FILING',
  currencyStatus: 'MATCH',
  identityResolution: Object.freeze({
    status: 'RESOLVED',
    issuerIdentity: 'ISS:INFOSYS',
    securityIdentity: 'SEC:INFY:NSE',
  }),
  records: Object.freeze([
    verifiedRecord('debt', 200),
    verifiedRecord('equity', 1000),
    verifiedRecord('cash', 50),
    verifiedRecord('ebitda', 220),
    verifiedRecord('currentAssets', 500),
    verifiedRecord('currentLiabilities', 250),
  ]),
};
const verifiedStrength = buildStrength(verifiedCanonical, {
  sectorKey: 'MANUFACTURING',
  baseFinancials: { ratios: {}, derived: {}, current: {} },
});
assert.equal(verifiedStrength.status, 'READY');
assert.equal(verifiedStrength.financials.ratios.debtToEquity, 0.2);
assert.equal(verifiedStrength.financials.ratios.currentRatio, 2);
assert.equal(verifiedStrength.financials.derived.netDebtToEbitda, 150 / 220);
assert.equal(verifiedStrength.evidence.source, 'canonicalFinancialEvidence');
assert.ok(verifiedStrength.evidence.selected.every((e) => e.issuerIdentity === 'ISS:INFOSYS' && e.securityIdentity === 'SEC:INFY:NSE'));
assert.ok(verifiedStrength.evidence.selected.every((e) => e.pitEligibility === PIT_STATES.PIT_VERIFIED));
assert.deepEqual(verifiedStrength.evidence.pitStates, [PIT_STATES.PIT_VERIFIED]);

const missingEnvelopeContract = { ...verifiedCanonical, contract: null };
assert.equal(buildStrength(missingEnvelopeContract, {
  sectorKey: 'MANUFACTURING',
  baseFinancials: { ratios: {}, derived: {}, current: {} },
}).status, 'UNAVAILABLE', 'canonical records without the expected outer envelope must be rejected');

const unresolvedIdentity = {
  ...verifiedCanonical,
  identityResolution: { ...verifiedCanonical.identityResolution, status: 'UNRESOLVED' },
};
assert.equal(buildStrength(unresolvedIdentity, {
  sectorKey: 'MANUFACTURING',
  baseFinancials: { ratios: {}, derived: {}, current: {} },
}).status, 'UNAVAILABLE', 'record IDs cannot override unresolved canonical identity');

const mismatchedResolvedIdentity = {
  ...verifiedCanonical,
  identityResolution: {
    ...verifiedCanonical.identityResolution,
    issuerIdentity: 'ISS:OTHER',
  },
};
assert.equal(buildStrength(mismatchedResolvedIdentity, {
  sectorKey: 'MANUFACTURING',
  baseFinancials: { ratios: {}, derived: {}, current: {} },
}).status, 'UNAVAILABLE', 'record identities must match the resolved envelope identity');

for (const entitlementStatus of [ACCESS_STATES.UNKNOWN, ACCESS_STATES.RESTRICTED, ACCESS_STATES.NOT_ALLOWED]) {
  const nonEntitled = {
    ...verifiedCanonical,
    records: verifiedCanonical.records.map((record, index) => index === 0
      ? { ...record, evidence: { ...record.evidence, entitlementStatus } }
      : record),
  };
  assert.equal(buildStrength(nonEntitled, {
    sectorKey: 'MANUFACTURING',
    baseFinancials: { ratios: {}, derived: {}, current: {} },
  }).status, 'UNAVAILABLE', `entitlement ${entitlementStatus} must block financial-strength use`);
}

const missingDisplayPolicy = {
  ...verifiedCanonical,
  records: verifiedCanonical.records.map((record, index) => index === 0
    ? { ...record, evidence: { ...record.evidence, displayPolicy: null } }
    : record),
};
assert.equal(buildStrength(missingDisplayPolicy, {
  sectorKey: 'MANUFACTURING',
  baseFinancials: { ratios: {}, derived: {}, current: {} },
}).status, 'UNAVAILABLE', 'missing source-use policy must block financial-strength use');

const mixedUnits = {
  ...verifiedCanonical,
  records: verifiedCanonical.records.map((record) => record.evidence.metric === 'cash'
    ? { ...record, evidence: { ...record.evidence, unit: 'INR_LAKH' } }
    : record),
};
assert.equal(buildStrength(mixedUnits, {
  sectorKey: 'MANUFACTURING',
  baseFinancials: { ratios: {}, derived: {}, current: {} },
}).status, 'UNAVAILABLE', 'monetary metrics with different units cannot be combined');

const bankingCanonical = {
  ...verifiedCanonical,
  records: [
    verifiedRecord('roe', 18, { unit: 'PERCENT' }),
    verifiedRecord('roa', 9, { unit: 'PERCENT' }),
  ],
};
assert.equal(buildStrength(bankingCanonical, {
  sectorKey: 'BANKING',
  baseFinancials: { ratios: {}, derived: {}, current: {} },
}).status, 'READY', 'banking strength inputs require compatible percentage units');

const bankingWrongUnit = {
  ...bankingCanonical,
  records: bankingCanonical.records.map((record) => record.evidence.metric === 'roa'
    ? { ...record, evidence: { ...record.evidence, unit: 'BASIS_POINTS' } }
    : record),
};
assert.equal(buildStrength(bankingWrongUnit, {
  sectorKey: 'BANKING',
  baseFinancials: { ratios: {}, derived: {}, current: {} },
}).status, 'UNAVAILABLE', 'banking metrics with incompatible units cannot be combined');


const missingOuterEnvelope = {
  ...verifiedCanonical,
  records: verifiedCanonical.records.map((record) => ({
    evidence: { ...record.evidence },
    pitEligibility: PIT_STATES.PIT_VERIFIED,
  })),
};
assert.equal(buildStrength(missingOuterEnvelope, {
  sectorKey: 'MANUFACTURING',
  baseFinancials: { ratios: {}, derived: {}, current: {} },
}).status, 'UNAVAILABLE', 'nested VALID evidence cannot replace a missing outer contract');

const nestedUnknownPit = {
  ...verifiedCanonical,
  records: verifiedCanonical.records.map((record) => ({
    ...record,
    evidence: { ...record.evidence, pitEligibility: PIT_STATES.PIT_UNKNOWN },
  })),
};
assert.equal(buildStrength(nestedUnknownPit, {
  sectorKey: 'MANUFACTURING',
  baseFinancials: { ratios: {}, derived: {}, current: {} },
}).status, 'UNAVAILABLE', 'outer PIT_VERIFIED cannot override nested PIT_UNKNOWN');

const outerUnknownPit = {
  ...verifiedCanonical,
  records: verifiedCanonical.records.map((record) => ({
    ...record,
    pitEligibility: PIT_STATES.PIT_UNKNOWN,
  })),
};
assert.equal(buildStrength(outerUnknownPit, {
  sectorKey: 'MANUFACTURING',
  baseFinancials: { ratios: {}, derived: {}, current: {} },
}).status, 'UNAVAILABLE', 'nested PIT_VERIFIED cannot override outer PIT_UNKNOWN');

const futurePublication = verifiedRecord('debt', 200, {
  publicationTimestamp: '2026-09-21T00:00:00Z',
});
const forgedFuturePublication = {
  ...futurePublication,
  pitEligibility: PIT_STATES.PIT_VERIFIED,
  evidence: { ...futurePublication.evidence, pitEligibility: PIT_STATES.PIT_VERIFIED },
};
const futurePublicationCanonical = {
  ...verifiedCanonical,
  records: verifiedCanonical.records.map((record) => record.evidence.metric === 'debt'
    ? forgedFuturePublication
    : record),
};
assert.equal(buildStrength(futurePublicationCanonical, {
  sectorKey: 'MANUFACTURING',
  baseFinancials: { ratios: {}, derived: {}, current: {} },
}).status, 'UNAVAILABLE', 'consumer must recompute PIT against the evaluation timestamp');

const forgedContractErrors = {
  ...verifiedCanonical,
  records: verifiedCanonical.records.map((record) => ({
    ...record,
    errors: ['contract validation error'],
  })),
};
assert.equal(buildStrength(forgedContractErrors, {
  sectorKey: 'MANUFACTURING',
  baseFinancials: { ratios: {}, derived: {}, current: {} },
}).status, 'UNAVAILABLE', 'non-empty outer contract errors must block financial strength');

assert.equal(buildFinancialStrengthInputFromCanonical(verifiedCanonical, {
  sectorKey: 'MANUFACTURING',
  baseFinancials: { ratios: {}, derived: {}, current: {} },
}).status, 'UNAVAILABLE', 'an explicit evaluation timestamp is required');

const unknownPitCanonical = {
  ...verifiedCanonical,
  records: verifiedCanonical.records.map((record) => ({
    ...record,
    evidence: {
      ...record.evidence,
      publicationTimestamp: null,
      availabilityTimestamp: null,
      sourceDocumentId: null,
      sourceDocumentVersion: null,
      pitEligibility: PIT_STATES.PIT_UNKNOWN,
    },
    pitEligibility: PIT_STATES.PIT_UNKNOWN,
  })),
};
assert.equal(buildStrength(unknownPitCanonical, {
  sectorKey: 'MANUFACTURING',
  baseFinancials: { ratios: {}, derived: {}, current: {} },
}).status, 'UNAVAILABLE', 'PIT_UNKNOWN must never be promoted into financial strength');

const forgedPit = adaptStatementEvidenceToCanonical({
  ...providerRows,
  income: providerRows.income.map((row) => ({ ...row, pitEligibility: PIT_STATES.PIT_VERIFIED })),
  balance: providerRows.balance.map((row) => ({ ...row, pitEligibility: PIT_STATES.PIT_VERIFIED })),
  cash: providerRows.cash.map((row) => ({ ...row, pitEligibility: PIT_STATES.PIT_VERIFIED })),
}, { evaluationTimestamp });
const forgedPitDebt = forgedPit.records.find((record) => record.evidence.metric === 'debt');
assert.equal(forgedPitDebt.pitEligibility, PIT_STATES.PIT_UNKNOWN);
assert.equal(forgedPitDebt.evidence.pitEligibility, PIT_STATES.PIT_UNKNOWN);
assert.equal(buildStrength(forgedPit, {
  sectorKey: 'MANUFACTURING',
  baseFinancials: { ratios: {}, derived: {}, current: {} },
}).status, 'UNAVAILABLE', 'provider-supplied PIT_VERIFIED cannot replace source timestamps and document identity');

const fixtureBlocked = {
  ...verifiedCanonical,
  records: verifiedCanonical.records.map((record) => ({
    ...record,
    evidence: { ...record.evidence, fixtureStatus: 'DEVELOPMENT_FIXTURE' },
  })),
};
assert.equal(buildStrength(fixtureBlocked, {
  sectorKey: 'MANUFACTURING',
  baseFinancials: { ratios: {}, derived: {}, current: {} },
}).status, 'UNAVAILABLE', 'development fixtures must not be used as production financial-strength evidence');

const secondaryProvider = adaptStatementEvidenceToCanonical(providerRows, { evaluationTimestamp });
assert.equal(buildStrength(secondaryProvider, {
  sectorKey: 'MANUFACTURING',
  baseFinancials: { ratios: {}, derived: {}, current: {} },
}).status, 'UNAVAILABLE', 'secondary provider rows cannot satisfy the authoritative filing gate');

const unknownValidation = {
  ...verifiedCanonical,
  records: verifiedCanonical.records.map((record) => ({
    ...record,
    validationState: VALIDATION_STATES.UNKNOWN,
    evidence: { ...record.evidence, validationState: VALIDATION_STATES.UNKNOWN },
  })),
};
assert.equal(buildStrength(unknownValidation, {
  sectorKey: 'MANUFACTURING',
  baseFinancials: { ratios: {}, derived: {}, current: {} },
}).status, 'UNAVAILABLE');

const invalidPeriodRecord = verifiedRecord('equity', 1000, {
  reportingPeriodStart: '2026-04-01T00:00:00Z',
  reportingPeriodEnd: '2025-03-31T00:00:00Z',
});
assert.equal(invalidPeriodRecord.validationState, VALIDATION_STATES.INVALID);
const invalidPeriod = {
  ...verifiedCanonical,
  records: verifiedCanonical.records.map((record) => record.evidence.metric === 'equity' ? invalidPeriodRecord : record),
};
assert.equal(buildStrength(invalidPeriod, {
  sectorKey: 'MANUFACTURING',
  baseFinancials: { ratios: {}, derived: {}, current: {} },
}).status, 'UNAVAILABLE', 'invalid outer contract state must not be hidden by nested evidence');

const missingCanonical = buildStrength(
  { ...verifiedCanonical, records: verifiedCanonical.records.filter((r) => r.evidence.metric !== 'ebitda') },
  { sectorKey: 'MANUFACTURING', baseFinancials: { ratios: { debtToEquity: 99 }, derived: { netDebtToEbitda: 99 }, current: { totalDebt: 99 } } },
);
assert.equal(missingCanonical.status, 'UNAVAILABLE');
assert.equal(missingCanonical.financials.ratios.debtToEquity, null);
assert.equal(missingCanonical.financials.derived.netDebtToEbitda, null);
assert.equal(missingCanonical.financials.current.totalDebt, null);

assert.equal(buildStrength({ ...verifiedCanonical, currencyStatus: 'UNKNOWN' }, {
  sectorKey: 'MANUFACTURING',
  baseFinancials: { ratios: {}, derived: {}, current: {} },
}).status, 'UNAVAILABLE');
assert.equal(buildStrength({ ...verifiedCanonical, currencyStatus: 'MISMATCH' }, {
  sectorKey: 'MANUFACTURING',
  baseFinancials: { ratios: {}, derived: {}, current: {} },
}).status, 'UNAVAILABLE');

const ttmCanonical = {
  ...verifiedCanonical,
  records: verifiedCanonical.records.map((record) => ({
    ...record,
    evidence: { ...record.evidence, periodType: 'TTM' },
  })),
};
const ttmStrength = buildStrength(ttmCanonical, {
  sectorKey: 'MANUFACTURING',
  baseFinancials: { ratios: {}, derived: {}, current: {} },
});
assert.equal(ttmStrength.status, 'READY');
assert.equal(ttmStrength.evidence.selected[0].periodType, 'TTM');

const incompatibleIdentity = buildStrength({
  ...verifiedCanonical,
  records: verifiedCanonical.records.map((record) => record.evidence.metric === 'equity'
    ? { ...record, evidence: { ...record.evidence, securityIdentity: 'SEC:OTHER:NSE' } }
    : record),
}, { sectorKey: 'MANUFACTURING', baseFinancials: { ratios: {}, derived: {}, current: {} } });
assert.equal(incompatibleIdentity.status, 'UNAVAILABLE');

const incompatibleScope = buildStrength({
  ...verifiedCanonical,
  records: verifiedCanonical.records.map((record) => record.evidence.metric === 'equity'
    ? { ...record, evidence: { ...record.evidence, statementScope: 'STANDALONE' } }
    : record),
}, { sectorKey: 'MANUFACTURING', baseFinancials: { ratios: {}, derived: {}, current: {} } });
assert.equal(incompatibleScope.status, 'UNAVAILABLE');

const incompatibleAccountingBasis = buildStrength({
  ...verifiedCanonical,
  records: verifiedCanonical.records.map((record) => record.evidence.metric === 'equity'
    ? { ...record, evidence: { ...record.evidence, accountingBasis: 'US_GAAP' } }
    : record),
}, { sectorKey: 'MANUFACTURING', baseFinancials: { ratios: {}, derived: {}, current: {} } });
assert.equal(incompatibleAccountingBasis.status, 'UNAVAILABLE');

console.log('financial-evidence-adapter.unit: PASS');
console.log('financial-strength strict evidence gates: PASS');
