import assert from 'node:assert/strict';
import { adaptStatementEvidenceToCanonical, buildFinancialStrengthInputFromCanonical } from '../lib/financial-evidence-adapter.js';
import { PIT_STATES } from '../lib/financial-evidence-contract.js';

const fixture = {
  fetchedAt: '2026-09-20T06:00:00Z',
  fixtureStatus: 'DEVELOPMENT_FIXTURE', provider: 'Yahoo Finance fundamentalsTimeSeries',
  validationState: 'VALID',
  currency: { tradingCurrency: 'INR', financialCurrency: 'INR', status: 'MATCH' },
  income: [
    { date: '2025-03-31T00:00:00Z', periodType: '12M', totalRevenue: 1000, EBITDA: 220, dilutedEPS: 15, netIncomeFromContinuingAndDiscontinuedOperation: 150, returnOnEquity: 0.20, returnOnAssets: 0.10, currencyCode: 'INR' },
    { date: '2024-03-31T00:00:00Z', periodType: '12M', totalRevenue: 900, dilutedEPS: 12, netIncomeFromContinuingAndDiscontinuedOperation: 120, currencyCode: 'INR' },
  ],
  balance: [{ date: '2025-03-31T00:00:00Z', periodType: '12M', totalDebt: 200, cashAndCashEquivalents: 50, stockholdersEquity: 1000, currentAssets: 500, currentLiabilities: 250, currencyCode: 'INR' }],
  cash: [{ date: '2025-03-31T00:00:00Z', periodType: '12M', operatingCashFlow: 180, freeCashFlow: 150, capitalExpenditure: -30, currencyCode: 'INR' }],
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
const verified = adaptStatementEvidenceToCanonical(documented, { evaluationTimestamp: '2025-05-21T00:00:00Z' });
assert.equal(verified.records.find((r) => r.evidence.metric === 'revenue').pitEligibility, PIT_STATES.PIT_VERIFIED);
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


const strengthCanonical = adaptStatementEvidenceToCanonical(fixture, {
  issuerIdentity: 'ISS:INFOSYS',
  securityIdentity: 'SEC:INFY:NSE',
});
const strengthReady = buildFinancialStrengthInputFromCanonical(strengthCanonical, {
  sectorKey: 'MANUFACTURING',
  baseFinancials: { ratios: {}, derived: {}, current: {} },
});
assert.equal(strengthReady.status, 'READY');
assert.equal(strengthReady.financials.ratios.debtToEquity, 0.2);
assert.equal(strengthReady.financials.ratios.currentRatio, 2);
assert.equal(strengthReady.financials.derived.netDebtToEbitda, 150 / 220);
assert.equal(strengthReady.evidence.source, 'canonicalFinancialEvidence');
assert.ok(strengthReady.evidence.selected.every((e) => e.issuerIdentity === 'ISS:INFOSYS' && e.securityIdentity === 'SEC:INFY:NSE'));
assert.ok(strengthReady.evidence.pitStates.includes(PIT_STATES.PIT_UNKNOWN));

const unknownValidation = buildFinancialStrengthInputFromCanonical(
  adaptStatementEvidenceToCanonical({ ...fixture, validationState: undefined, income: fixture.income.map(({ validationState, ...row }) => row), balance: fixture.balance.map(({ validationState, ...row }) => row), cash: fixture.cash.map(({ validationState, ...row }) => row) }, { issuerIdentity: 'ISS:INFOSYS', securityIdentity: 'SEC:INFY:NSE' }),
  { sectorKey: 'MANUFACTURING', baseFinancials: { ratios: {}, derived: {}, current: {} } },
);
assert.equal(unknownValidation.status, 'UNAVAILABLE');

const missingCanonical = buildFinancialStrengthInputFromCanonical(
  { ...strengthCanonical, records: strengthCanonical.records.filter((r) => r.evidence.metric !== 'ebitda') },
  { sectorKey: 'MANUFACTURING', baseFinancials: { ratios: { debtToEquity: 99 }, derived: { netDebtToEbitda: 99 }, current: { totalDebt: 99 } } },
);
assert.equal(missingCanonical.status, 'UNAVAILABLE');
assert.equal(missingCanonical.financials.ratios.debtToEquity, null);
assert.equal(missingCanonical.financials.derived.netDebtToEbitda, null);
assert.equal(missingCanonical.financials.current.totalDebt, null);

const unknownCurrency = buildFinancialStrengthInputFromCanonical(
  adaptStatementEvidenceToCanonical({ ...fixture, currency: { tradingCurrency: 'INR', financialCurrency: null, status: 'UNKNOWN' } }, { issuerIdentity: 'ISS:INFOSYS', securityIdentity: 'SEC:INFY:NSE' }),
  { sectorKey: 'MANUFACTURING', baseFinancials: { ratios: {}, derived: {}, current: {} } },
);
assert.equal(unknownCurrency.status, 'UNAVAILABLE');

const mismatchedCurrency = buildFinancialStrengthInputFromCanonical(
  adaptStatementEvidenceToCanonical({ ...fixture, currency: { tradingCurrency: 'INR', financialCurrency: 'USD', status: 'MISMATCH' } }, { issuerIdentity: 'ISS:INFOSYS', securityIdentity: 'SEC:INFY:NSE' }),
  { sectorKey: 'MANUFACTURING', baseFinancials: { ratios: {}, derived: {}, current: {} } },
);
assert.equal(mismatchedCurrency.status, 'UNAVAILABLE');

const ttmCanonical = adaptStatementEvidenceToCanonical({
  ...fixture,
  income: [{ ...fixture.income[0], periodType: 'TTM' }],
  balance: [{ ...fixture.balance[0], periodType: 'TTM' }],
}, { issuerIdentity: 'ISS:INFOSYS', securityIdentity: 'SEC:INFY:NSE' });
const ttmStrength = buildFinancialStrengthInputFromCanonical(ttmCanonical, { sectorKey: 'MANUFACTURING', baseFinancials: { ratios: {}, derived: {}, current: {} } });
assert.equal(ttmStrength.status, 'READY');
assert.equal(ttmStrength.evidence.selected[0].periodType, 'TTM');

const incompatibleIdentity = buildFinancialStrengthInputFromCanonical({
  ...strengthCanonical,
  records: strengthCanonical.records.map((r) => r.evidence.metric === 'equity'
    ? { ...r, evidence: { ...r.evidence, securityIdentity: 'SEC:OTHER:NSE' } }
    : r),
}, { sectorKey: 'MANUFACTURING', baseFinancials: { ratios: {}, derived: {}, current: {} } });
assert.equal(incompatibleIdentity.status, 'UNAVAILABLE');

console.log('financial-strength canonical consumer: PASS');
