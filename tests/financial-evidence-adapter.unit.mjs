import assert from 'node:assert/strict';
import { adaptStatementEvidenceToCanonical, buildFinancialStrengthInputFromCanonical } from '../lib/financial-evidence-adapter.js';
import { PIT_STATES, VALIDATION_STATES } from '../lib/financial-evidence-contract.js';

const fixture = {
  fetchedAt: '2026-09-20T06:00:00Z',
  fixtureStatus: 'DEVELOPMENT_FIXTURE', provider: 'Yahoo Finance fundamentalsTimeSeries',
  validationState: 'VALID',
  currency: { tradingCurrency: 'INR', financialCurrency: 'INR', status: 'MATCH' },
  income: [
    { date: '2025-03-31T00:00:00Z', periodType: '12M', totalRevenue: 1000, EBITDA: 220, dilutedEPS: 15, netIncomeFromContinuingAndDiscontinuedOperation: 150, returnOnEquity: 0.20, returnOnAssets: 0.10, currencyCode: 'INR', validationState: 'VALID' },
    { date: '2024-03-31T00:00:00Z', periodType: '12M', totalRevenue: 900, dilutedEPS: 12, netIncomeFromContinuingAndDiscontinuedOperation: 120, currencyCode: 'INR', validationState: 'VALID' },
  ],
  balance: [{ date: '2025-03-31T00:00:00Z', periodType: '12M', totalDebt: 200, cashAndCashEquivalents: 50, stockholdersEquity: 1000, currentAssets: 500, currentLiabilities: 250, currencyCode: 'INR', validationState: 'VALID' }],
  cash: [{ date: '2025-03-31T00:00:00Z', periodType: '12M', operatingCashFlow: 180, freeCashFlow: 150, capitalExpenditure: -30, currencyCode: 'INR', validationState: 'VALID' }],
};
const mapped = adaptStatementEvidenceToCanonical(fixture, { evaluationTimestamp: '2026-09-20T06:01:00Z' });
assert.equal(mapped.status, 'MAPPED');
assert.equal(mapped.provider, fixture.provider);
assert.equal(mapped.currencyStatus, 'MATCH');
assert.ok(mapped.records.length >= 8);
const revenue = mapped.records.find((r) => r.evidence.metric === 'revenue' && r.evidence.reportingPeriodEnd.startsWith('2025-03-31'));
assert.ok(revenue);
assert.equal(revenue.evidence.value, 1000);
assert.equal(revenue.evidence.periodType, 'ANNUAL');
assert.equal(revenue.evidence.fixtureStatus, 'DEVELOPMENT_FIXTURE');
assert.equal(revenue.evidence.sourceAuthority, 'SECONDARY_PROVIDER');
const roe = mapped.records.find((r) => r.evidence.metric === 'roe' && r.evidence.reportingPeriodEnd.startsWith('2025-03-31'));
assert.equal(roe.evidence.value, 20, 'ROE canonical percent semantics must match the existing scoring input');
assert.equal(revenue.pitEligibility, PIT_STATES.PIT_UNKNOWN);
const retrievalOnly = adaptStatementEvidenceToCanonical({ ...fixture, income: fixture.income.map((r) => ({ ...r, retrievedAt: '2026-09-20T06:00:00Z' })) }, { evaluationTimestamp: '2026-09-20T06:01:00Z' });
const rr = retrievalOnly.records.find((r) => r.evidence.metric === 'revenue' && r.evidence.reportingPeriodEnd.startsWith('2025-03-31'));
assert.equal(rr.evidence.publicationTimestamp, null);
assert.equal(rr.evidence.retrievedAt, '2026-09-20T06:00:00.000Z');
assert.equal(rr.pitEligibility, PIT_STATES.PIT_UNKNOWN);
const documented = { ...fixture, income: [{ ...fixture.income[0], reportingPeriodStart: '2024-04-01T00:00:00Z', publicationTimestamp: '2025-05-15T10:00:00Z', availabilityTimestamp: '2025-05-15T10:05:00Z', sourceDocumentId: 'DOC-2025', sourceDocumentVersion: 'v1', providerRecordId: 'REC-2025', retrievedAt: '2025-05-20T10:00:00Z', revisionStatus: 'ORIGINAL' }] };
const providerDocumented = adaptStatementEvidenceToCanonical(documented, { evaluationTimestamp: '2025-05-21T00:00:00Z' });
const providerDocumentedRevenue = providerDocumented.records.find((r) => r.evidence.metric === 'revenue');
assert.equal(providerDocumentedRevenue.pitEligibility, PIT_STATES.PIT_UNKNOWN);
assert.equal(providerDocumentedRevenue.evidence.sourceDocumentId, null);
assert.equal(providerDocumentedRevenue.evidence.publicationTimestamp, null);
const quarterly = adaptStatementEvidenceToCanonical({ ...fixture, income: [{ ...fixture.income[0], periodType: '3M' }] });
assert.equal(quarterly.records.find((r) => r.evidence.metric === 'revenue').evidence.periodType, 'QUARTERLY');
const ttm = adaptStatementEvidenceToCanonical({ ...fixture, income: [{ ...fixture.income[0], periodType: 'TTM' }] });
assert.equal(ttm.records.find((r) => r.evidence.metric === 'revenue').evidence.periodType, 'TTM');
const ambiguous = adaptStatementEvidenceToCanonical({ ...fixture, income: [{ ...fixture.income[0], periodType: 'WEIRD' }] });
assert.equal(ambiguous.records.find((r) => r.evidence.metric === 'revenue').evidence.periodType, null);
const mismatch = adaptStatementEvidenceToCanonical({ ...fixture, currency: { tradingCurrency: 'USD', financialCurrency: 'INR', status: 'MISMATCH' } });
assert.equal(mismatch.currencyStatus, 'MISMATCH');
assert.equal(mismatch.records.find((r) => r.evidence.metric === 'revenue').evidence.currency, 'INR');
const identity = adaptStatementEvidenceToCanonical(fixture, { issuerIdentity: 'ISS:INFOSYS', securityIdentity: 'SEC:INFY:NSE' });
const ir = identity.records.find((r) => r.evidence.metric === 'revenue');
assert.equal(ir.evidence.issuerIdentity, 'ISS:INFOSYS');
assert.equal(ir.evidence.securityIdentity, 'SEC:INFY:NSE');
const duplicate = adaptStatementEvidenceToCanonical({ ...fixture, income: [fixture.income[0], { ...fixture.income[0], providerRecordId: 'DUPLICATE' }] });
assert.equal(duplicate.records.filter((r) => r.evidence.metric === 'revenue' && r.evidence.reportingPeriodEnd.startsWith('2025-03-31')).length, 2);
console.log('financial-evidence-adapter.unit: PASS');


const filingRow = (row, documentPrefix) => {
  const endYear = Number(String(row.date).slice(0, 4));
  return {
    ...row,
    reportingPeriodStart: (endYear - 1) + '-04-01T00:00:00.000Z',
    publicationTimestamp: (endYear + 1) + '-05-15T10:00:00.000Z',
    availabilityTimestamp: (endYear + 1) + '-05-15T10:05:00.000Z',
    sourceDocumentId: documentPrefix + '-' + String(row.date).slice(0, 10),
    sourceDocumentVersion: 'v1',
    retrievedAt: (endYear + 1) + '-05-20T10:00:00.000Z',
    revisionStatus: 'ORIGINAL',
    validationState: VALIDATION_STATES.VALID,
    sourceType: 'FILING',
    sourceAuthority: 'COMPANY_FILING',
    accountingBasis: 'IND_AS',
    statementScope: 'CONSOLIDATED',
    metricScope: 'GROUP',
  };
};

const verifiedFixture = {
  ...fixture,
  fixtureStatus: null,
  provider: 'Company filing adapter',
  income: fixture.income.map((row) => filingRow(row, 'INCOME')),
  balance: fixture.balance.map((row) => filingRow(row, 'BALANCE')),
  cash: fixture.cash.map((row) => filingRow(row, 'CASH')),
};
const trustedFilingSourceContext = Object.freeze({
  sourceType: 'FILING',
  sourceAuthority: 'COMPANY_FILING',
  validationState: VALIDATION_STATES.VALID,
});
const verifiedCanonical = adaptStatementEvidenceToCanonical(verifiedFixture, {
  issuerIdentity: 'ISS:INFOSYS',
  securityIdentity: 'SEC:INFY:NSE',
  evaluationTimestamp: '2026-09-20T06:01:00Z',
  trustedSourceContext: trustedFilingSourceContext,
});
const providerForgeryCanonical = adaptStatementEvidenceToCanonical({
  ...verifiedFixture,
  provider: 'Yahoo Finance fundamentalsTimeSeries',
}, {
  issuerIdentity: 'ISS:INFOSYS',
  securityIdentity: 'SEC:INFY:NSE',
  evaluationTimestamp: '2026-09-20T06:01:00Z',
});
const providerForgeryDebt = providerForgeryCanonical.records.find((r) => r.evidence.metric === 'debt');
assert.equal(providerForgeryDebt.evidence.sourceType, 'provider');
assert.equal(providerForgeryDebt.evidence.sourceAuthority, 'SECONDARY_PROVIDER');
assert.equal(providerForgeryDebt.evidence.validationState, VALIDATION_STATES.UNKNOWN);
assert.equal(providerForgeryDebt.evidence.sourceDocumentId, null);
assert.equal(providerForgeryDebt.evidence.sourceDocumentVersion, null);
assert.equal(providerForgeryDebt.evidence.publicationTimestamp, null);
assert.equal(providerForgeryDebt.evidence.availabilityTimestamp, null);
assert.equal(providerForgeryDebt.pitEligibility, PIT_STATES.PIT_UNKNOWN);
assert.equal(buildFinancialStrengthInputFromCanonical(providerForgeryCanonical, {
  sectorKey: 'MANUFACTURING',
  baseFinancials: { ratios: {}, derived: {}, current: {} },
}).status, 'UNAVAILABLE', 'provider-controlled filing metadata must never establish authoritative evidence');
const verifiedStrength = buildFinancialStrengthInputFromCanonical(verifiedCanonical, {
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

const unknownPitRows = (row) => {
  const { publicationTimestamp, availabilityTimestamp, sourceDocumentId, sourceDocumentVersion, ...rest } = row;
  return rest;
};
const unknownPitFixture = {
  ...verifiedFixture,
  income: verifiedFixture.income.map(unknownPitRows),
  balance: verifiedFixture.balance.map(unknownPitRows),
  cash: verifiedFixture.cash.map(unknownPitRows),
};
const unknownPitCanonical = adaptStatementEvidenceToCanonical(unknownPitFixture, {
  issuerIdentity: 'ISS:INFOSYS',
  securityIdentity: 'SEC:INFY:NSE',
  evaluationTimestamp: '2026-09-20T06:01:00Z',
  trustedSourceContext: trustedFilingSourceContext,
});
assert.equal(unknownPitCanonical.records.find((r) => r.evidence.metric === 'debt').pitEligibility, PIT_STATES.PIT_UNKNOWN);
assert.equal(buildFinancialStrengthInputFromCanonical(unknownPitCanonical, {
  sectorKey: 'MANUFACTURING',
  baseFinancials: { ratios: {}, derived: {}, current: {} },
}).status, 'UNAVAILABLE', 'PIT_UNKNOWN must never be promoted into financial strength');

const forgedPitFixture = {
  ...verifiedFixture,
  income: verifiedFixture.income.map((row) => ({ ...unknownPitRows(row), pitEligibility: PIT_STATES.PIT_VERIFIED })),
  balance: verifiedFixture.balance.map((row) => ({ ...unknownPitRows(row), pitEligibility: PIT_STATES.PIT_VERIFIED })),
  cash: verifiedFixture.cash.map((row) => ({ ...unknownPitRows(row), pitEligibility: PIT_STATES.PIT_VERIFIED })),
};
const forgedPitCanonical = adaptStatementEvidenceToCanonical(forgedPitFixture, {
  issuerIdentity: 'ISS:INFOSYS',
  securityIdentity: 'SEC:INFY:NSE',
  evaluationTimestamp: '2026-09-20T06:01:00Z',
  trustedSourceContext: trustedFilingSourceContext,
});
const forgedPitDebt = forgedPitCanonical.records.find((record) => record.evidence.metric === 'debt');
assert.equal(forgedPitDebt.pitEligibility, PIT_STATES.PIT_UNKNOWN);
assert.equal(forgedPitDebt.evidence.pitEligibility, PIT_STATES.PIT_UNKNOWN);
assert.equal(buildFinancialStrengthInputFromCanonical(forgedPitCanonical, {
  sectorKey: 'MANUFACTURING',
  baseFinancials: { ratios: {}, derived: {}, current: {} },
}).status, 'UNAVAILABLE', 'provider-supplied PIT_VERIFIED cannot replace required source timestamps and document identity');

const fixtureBlocked = adaptStatementEvidenceToCanonical({
  ...verifiedFixture,
  fixtureStatus: 'DEVELOPMENT_FIXTURE',
}, {
  issuerIdentity: 'ISS:INFOSYS',
  securityIdentity: 'SEC:INFY:NSE',
  evaluationTimestamp: '2026-09-20T06:01:00Z',
  trustedSourceContext: trustedFilingSourceContext,
});
assert.equal(buildFinancialStrengthInputFromCanonical(fixtureBlocked, {
  sectorKey: 'MANUFACTURING',
  baseFinancials: { ratios: {}, derived: {}, current: {} },
}).status, 'UNAVAILABLE', 'development fixtures must not be used as production financial-strength evidence');

const secondaryProvider = adaptStatementEvidenceToCanonical({
  ...verifiedFixture,
  income: verifiedFixture.income.map((row) => ({ ...row, sourceType: 'provider', sourceAuthority: 'SECONDARY_PROVIDER' })),
  balance: verifiedFixture.balance.map((row) => ({ ...row, sourceType: 'provider', sourceAuthority: 'SECONDARY_PROVIDER' })),
  cash: verifiedFixture.cash.map((row) => ({ ...row, sourceType: 'provider', sourceAuthority: 'SECONDARY_PROVIDER' })),
}, {
  issuerIdentity: 'ISS:INFOSYS',
  securityIdentity: 'SEC:INFY:NSE',
  evaluationTimestamp: '2026-09-20T06:01:00Z',
});
assert.equal(buildFinancialStrengthInputFromCanonical(secondaryProvider, {
  sectorKey: 'MANUFACTURING',
  baseFinancials: { ratios: {}, derived: {}, current: {} },
}).status, 'UNAVAILABLE', 'secondary provider rows cannot satisfy the authoritative filing gate');

const unknownValidation = adaptStatementEvidenceToCanonical({
  ...verifiedFixture,
  income: verifiedFixture.income.map((row) => ({ ...row, validationState: VALIDATION_STATES.UNKNOWN })),
  balance: verifiedFixture.balance.map((row) => ({ ...row, validationState: VALIDATION_STATES.UNKNOWN })),
  cash: verifiedFixture.cash.map((row) => ({ ...row, validationState: VALIDATION_STATES.UNKNOWN })),
}, {
  issuerIdentity: 'ISS:INFOSYS',
  securityIdentity: 'SEC:INFY:NSE',
  evaluationTimestamp: '2026-09-20T06:01:00Z',
});
assert.equal(buildFinancialStrengthInputFromCanonical(unknownValidation, {
  sectorKey: 'MANUFACTURING',
  baseFinancials: { ratios: {}, derived: {}, current: {} },
}).status, 'UNAVAILABLE');

const invalidPeriod = adaptStatementEvidenceToCanonical({
  ...verifiedFixture,
  income: verifiedFixture.income.map((row) => ({ ...row, reportingPeriodStart: '2026-04-01T00:00:00.000Z' })),
  balance: verifiedFixture.balance.map((row) => ({ ...row, reportingPeriodStart: '2026-04-01T00:00:00.000Z' })),
  cash: verifiedFixture.cash.map((row) => ({ ...row, reportingPeriodStart: '2026-04-01T00:00:00.000Z' })),
}, {
  issuerIdentity: 'ISS:INFOSYS',
  securityIdentity: 'SEC:INFY:NSE',
  evaluationTimestamp: '2026-09-20T06:01:00Z',
  trustedSourceContext: trustedFilingSourceContext,
});
assert.ok(invalidPeriod.records.some((record) => record.validationState === VALIDATION_STATES.INVALID));
assert.equal(buildFinancialStrengthInputFromCanonical(invalidPeriod, {
  sectorKey: 'MANUFACTURING',
  baseFinancials: { ratios: {}, derived: {}, current: {} },
}).status, 'UNAVAILABLE', 'invalid outer contract state must not be hidden by nested evidence');

const missingCanonical = buildFinancialStrengthInputFromCanonical(
  { ...verifiedCanonical, records: verifiedCanonical.records.filter((r) => r.evidence.metric !== 'ebitda') },
  { sectorKey: 'MANUFACTURING', baseFinancials: { ratios: { debtToEquity: 99 }, derived: { netDebtToEbitda: 99 }, current: { totalDebt: 99 } } },
);
assert.equal(missingCanonical.status, 'UNAVAILABLE');
assert.equal(missingCanonical.financials.ratios.debtToEquity, null);
assert.equal(missingCanonical.financials.derived.netDebtToEbitda, null);
assert.equal(missingCanonical.financials.current.totalDebt, null);

const unknownCurrency = buildFinancialStrengthInputFromCanonical(
  adaptStatementEvidenceToCanonical({ ...verifiedFixture, currency: { tradingCurrency: 'INR', financialCurrency: null, status: 'UNKNOWN' } }, {
    issuerIdentity: 'ISS:INFOSYS', securityIdentity: 'SEC:INFY:NSE', evaluationTimestamp: '2026-09-20T06:01:00Z', trustedSourceContext: trustedFilingSourceContext,
  }),
  { sectorKey: 'MANUFACTURING', baseFinancials: { ratios: {}, derived: {}, current: {} } },
);
assert.equal(unknownCurrency.status, 'UNAVAILABLE');

const mismatchedCurrency = buildFinancialStrengthInputFromCanonical(
  adaptStatementEvidenceToCanonical({ ...verifiedFixture, currency: { tradingCurrency: 'INR', financialCurrency: 'USD', status: 'MISMATCH' } }, {
    issuerIdentity: 'ISS:INFOSYS', securityIdentity: 'SEC:INFY:NSE', evaluationTimestamp: '2026-09-20T06:01:00Z', trustedSourceContext: trustedFilingSourceContext,
  }),
  { sectorKey: 'MANUFACTURING', baseFinancials: { ratios: {}, derived: {}, current: {} } },
);
assert.equal(mismatchedCurrency.status, 'UNAVAILABLE');

const ttmFixture = {
  ...verifiedFixture,
  income: verifiedFixture.income.map((row) => ({ ...row, periodType: 'TTM' })),
  balance: verifiedFixture.balance.map((row) => ({ ...row, periodType: 'TTM' })),
};
const ttmCanonical = adaptStatementEvidenceToCanonical(ttmFixture, {
  issuerIdentity: 'ISS:INFOSYS',
  securityIdentity: 'SEC:INFY:NSE',
  evaluationTimestamp: '2026-09-20T06:01:00Z',
  trustedSourceContext: trustedFilingSourceContext,
});
const ttmStrength = buildFinancialStrengthInputFromCanonical(ttmCanonical, {
  sectorKey: 'MANUFACTURING',
  baseFinancials: { ratios: {}, derived: {}, current: {} },
});
assert.equal(ttmStrength.status, 'READY');
assert.equal(ttmStrength.evidence.selected[0].periodType, 'TTM');

const incompatibleIdentity = buildFinancialStrengthInputFromCanonical({
  ...verifiedCanonical,
  records: verifiedCanonical.records.map((r) => r.evidence.metric === 'equity'
    ? { ...r, evidence: { ...r.evidence, securityIdentity: 'SEC:OTHER:NSE' } }
    : r),
}, { sectorKey: 'MANUFACTURING', baseFinancials: { ratios: {}, derived: {}, current: {} } });
assert.equal(incompatibleIdentity.status, 'UNAVAILABLE');

const incompatibleScope = buildFinancialStrengthInputFromCanonical({
  ...verifiedCanonical,
  records: verifiedCanonical.records.map((r) => r.evidence.metric === 'equity'
    ? { ...r, evidence: { ...r.evidence, statementScope: 'STANDALONE' } }
    : r),
}, { sectorKey: 'MANUFACTURING', baseFinancials: { ratios: {}, derived: {}, current: {} } });
assert.equal(incompatibleScope.status, 'UNAVAILABLE');

const incompatibleAccountingBasis = buildFinancialStrengthInputFromCanonical({
  ...verifiedCanonical,
  records: verifiedCanonical.records.map((r) => r.evidence.metric === 'equity'
    ? { ...r, evidence: { ...r.evidence, accountingBasis: 'US_GAAP' } }
    : r),
}, { sectorKey: 'MANUFACTURING', baseFinancials: { ratios: {}, derived: {}, current: {} } });
assert.equal(incompatibleAccountingBasis.status, 'UNAVAILABLE');

console.log('financial-strength strict evidence gates: PASS');
