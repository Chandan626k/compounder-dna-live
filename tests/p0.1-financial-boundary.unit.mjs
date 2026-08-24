import assert from 'node:assert/strict';
import { buildFinancials } from '../lib/market-engine.js';
import { mergeStatementEvidence } from '../lib/statement-evidence.js';
import { createCanonicalEvidence, areEvidenceCompatible } from '../lib/financial-evidence.js';

const baseRow = (value, key) => ({
  value,
  key,
  date: '2025-03-31T00:00:00.000Z',
  row: {
    issuer: 'Example Issuer',
    companyName: 'Example Issuer',
    reportingPeriod: 'FY2025',
    periodType: '12M',
    statementScope: 'CONSOLIDATED',
    unit: 'INR',
    currency: 'INR',
  },
  status: 'PROVIDER_RETURNED',
});

const statementEvidence = {
  ticker: 'EXAMPLE.NS',
  fetchedAt: '2026-08-24T00:00:00.000Z',
  evidence: {
    balance: {
      totalDebt: baseRow(200, 'totalDebt'),
      cash: baseRow(50, 'cashCashEquivalentsAndShortTermInvestments'),
      equity: baseRow(1000, 'stockholdersEquity'),
      totalAssets: baseRow(1500, 'totalAssets'),
      currentAssets: baseRow(600, 'currentAssets'),
      currentLiabilities: baseRow(300, 'currentLiabilities'),
    },
    income: {
      revenue: baseRow(1000, 'totalRevenue'),
      ebitda: baseRow(250, 'EBITDA'),
      ebit: baseRow(200, 'EBIT'),
      netIncome: baseRow(150, 'netIncome'),
      interestExpense: baseRow(20, 'interestExpense'),
    },
    cash: {
      freeCashFlow: baseRow(120, 'freeCashFlow'),
      operatingCashFlow: baseRow(180, 'operatingCashFlow'),
      changeInCash: baseRow(30, 'changesInCash'),
      capitalExpenditure: baseRow(60, 'capitalExpenditure'),
    },
  },
  coverage: { income: true, balanceSheet: true, cashFlow: true },
};

const emptyFinancials = buildFinancials({ summary: {}, annual: [], trailing: [] });
const merged = mergeStatementEvidence(emptyFinancials, statementEvidence);

// The numeric API remains backward compatible, while provenance is parallel.
assert.equal(typeof merged.current.totalDebt, 'number');
const debtEvidenceId = merged.evidence.fields.totalDebt;
assert.ok(debtEvidenceId);
assert.equal(merged.evidence.byId[debtEvidenceId].value, merged.current.totalDebt);
assert.equal(merged.evidence.byId[debtEvidenceId].sourceKey, 'totalDebt');
assert.equal(merged.evidence.byId[debtEvidenceId].reportingDate, '2025-03-31T00:00:00.000Z');
assert.equal(merged.evidence.byId[debtEvidenceId].periodType, 'ANNUAL');
assert.equal(merged.evidence.byId[debtEvidenceId].statementScope, 'CONSOLIDATED');
assert.equal(merged.evidence.byId[debtEvidenceId].unit, 'INR');
assert.equal(merged.evidence.byId[debtEvidenceId].currency, 'INR');
assert.equal(merged.evidence.byId[debtEvidenceId].reportedOrDerived, 'REPORTED');

// All statement-derived calculations are eligible only after exact evidence binding.
assert.equal(merged.derived.debtToEquityFromStatements, 0.2);
assert.equal(merged.derived.currentRatioFromStatements, 2);
assert.equal(merged.derived.fcfConversion, 80);
assert.equal(merged.derived.fcfMargin, 12);
assert.equal(merged.derived.netDebtToEbitda, 0.6);
assert.equal(merged.derived.interestCoverage, 10);
assert.equal(merged.derived.roeFromStatements, 15);
assert.equal(merged.derived.roaFromStatements, 10);
assert.equal(merged.derived.roceFromStatements, 200 / 1200 * 100);
assert.equal(merged.derived.workingCapital, 300);

// A pre-existing Path-A value must never receive Path-B provenance.
const pathAMismatch = buildFinancials({
  summary: { financialData: { totalDebt: 999 }, defaultKeyStatistics: {}, summaryDetail: {} },
  annual: [],
  trailing: [],
});
const mismatch = mergeStatementEvidence(pathAMismatch, statementEvidence);
assert.equal(mismatch.current.totalDebt, 999);
assert.equal(mismatch.evidence.fields.totalDebt, undefined);
assert.equal(mismatch.derived.debtToEquityFromStatements, null);
assert.equal(mismatch.derived.netDebtToEbitda, null);

// Same numeric value but different/unproven observation identity is still not provenance-equivalent.
const sameValueDifferentObservation = buildFinancials({
  summary: { financialData: { totalDebt: 200 }, defaultKeyStatistics: {}, summaryDetail: {} },
  annual: [],
  trailing: [],
});
const sameValue = mergeStatementEvidence(sameValueDifferentObservation, statementEvidence);
assert.equal(sameValue.current.totalDebt, 200);
assert.equal(sameValue.evidence.fields.totalDebt, undefined);
assert.equal(sameValue.derived.debtToEquityFromStatements, null);

const evidence = merged.evidence;
const debt = evidence.byId[evidence.fields.totalDebt];
const equity = evidence.byId[evidence.fields.equity];
assert.equal(areEvidenceCompatible(debt, equity), true);

const incompatibleDate = { ...equity, reportingDate: '2026-03-31T00:00:00.000Z' };
assert.equal(areEvidenceCompatible(debt, incompatibleDate), false);
assert.equal(areEvidenceCompatible(debt, { ...equity, periodType: 'TTM' }), false);
assert.equal(areEvidenceCompatible(debt, { ...equity, periodType: 'QUARTERLY' }), false);
assert.equal(areEvidenceCompatible(debt, { ...equity, statementScope: 'STANDALONE' }), false);
assert.equal(areEvidenceCompatible(debt, { ...equity, statementScope: null }), false);
assert.equal(areEvidenceCompatible(debt, { ...equity, unit: null }), false);
assert.equal(areEvidenceCompatible(debt, { ...equity, currency: null }), false);
assert.equal(areEvidenceCompatible(debt, { ...equity, currency: 'USD' }), false);
assert.equal(areEvidenceCompatible(debt, { ...equity, ticker: 'OTHER.NS' }), false);
assert.equal(areEvidenceCompatible(debt, { ...equity, issuer: 'Other Issuer' }), false);

// Missing evidence remains null and never becomes zero.
const missing = mergeStatementEvidence(
  buildFinancials({ summary: {}, annual: [], trailing: [] }),
  { ticker: 'EXAMPLE.NS', evidence: {}, coverage: { income: false, balanceSheet: false, cashFlow: false } },
);
assert.equal(missing.current.totalDebt, null);
assert.equal(missing.derived.debtToEquityFromStatements, null);
assert.notEqual(missing.current.totalDebt, 0);

// Cash-flow semantics remain strict: endCashPosition is not changeInCash.
const endCashOnly = mergeStatementEvidence(
  buildFinancials({ summary: {}, annual: [], trailing: [] }),
  {
    ticker: 'EXAMPLE.NS',
    evidence: { cash: { endCashPosition: baseRow(999, 'endCashPosition') } },
    coverage: { income: false, balanceSheet: false, cashFlow: true },
  },
);
assert.equal(endCashOnly.current.changeInCash, null);
assert.equal(endCashOnly.evidence.fields.changeInCash, undefined);

console.log('p0.1-financial-boundary.unit: PASS');
