import assert from 'node:assert/strict';
import { mergeStatementEvidence } from '../lib/statement-evidence.js';
import { createCanonicalEvidence } from '../lib/financial-evidence.js';

const annualDate = '2025-03-31T00:00:00.000Z';
const canonical = (sourceKey, value, overrides = {}) => createCanonicalEvidence({
  source: 'YAHOO_FINANCE', sourceKey, issuer: 'Test Issuer', ticker: 'TEST.NS', value,
  reportingDate: annualDate, reportingPeriod: '2025-03-31', periodType: 'ANNUAL',
  statementScope: 'CONSOLIDATED', unit: 'INR_CRORE', currency: 'INR',
  reportedOrDerived: 'REPORTED', status: 'PROVIDER_RETURNED', ...overrides,
});
const revenue = canonical('totalRevenue', 1000);
const fcf = canonical('freeCashFlow', 175);
const baseEvidence = {
  ticker: 'TEST.NS', fetchedAt: '2026-09-05T03:30:00.000Z',
  evidence: {
    income: { revenue: { status: 'PROVIDER_RETURNED', value: 1000, key: 'totalRevenue', date: annualDate } },
    cash: { freeCashFlow: { status: 'PROVIDER_RETURNED', value: 175, key: 'freeCashFlow', date: annualDate } }, balance: {},
  },
  canonicalEvidence: { byId: { [revenue.evidenceId]: revenue, [fcf.evidenceId]: fcf }, fields: { revenue: revenue.evidenceId, freeCashFlow: fcf.evidenceId }, observations: { revenue: revenue.evidenceId, freeCashFlow: fcf.evidenceId }, history: {} },
  coverage: { income: true, balanceSheet: false, cashFlow: true }, history: { incomeYears: 1, balanceYears: 0, cashFlowYears: 1 },
};

// Annual FCF + TTM/current revenue: the current value must not be used in the annual calculation.
const mixed = mergeStatementEvidence({ current: { revenue: 1200 }, derived: {} }, baseEvidence);
assert.equal(mixed.current.revenue, 1200);
assert.equal(mixed.current.freeCashFlow, 175);
assert.equal(mixed.derived.fcfMargin, 17.5);
assert.deepEqual(mixed.derivedEvidence.fcfMargin.inputEvidenceIds, [fcf.evidenceId, revenue.evidenceId]);

// Annual FCF without compatible annual revenue: fail closed even when current/TTM revenue exists.
const noAnnualRevenue = mergeStatementEvidence({ current: { revenue: 1200 }, derived: {} }, {
  ...baseEvidence,
  evidence: { ...baseEvidence.evidence, income: {} },
  canonicalEvidence: { byId: { [fcf.evidenceId]: fcf }, fields: { freeCashFlow: fcf.evidenceId }, observations: { freeCashFlow: fcf.evidenceId }, history: {} },
});
assert.equal(noAnnualRevenue.derived.fcfMargin, null);
assert.equal(noAnnualRevenue.derivedEvidence.fcfMargin, undefined);

// Same numeric value is not enough: a different annual observation identity must fail closed.
const differentObservationRevenue = canonical('totalRevenue', 1000, { reportingDate: '2024-03-31T00:00:00.000Z', reportingPeriod: '2024-03-31' });
const incompatibleEvidence = {
  ...baseEvidence,
  evidence: { ...baseEvidence.evidence, income: { revenue: { status: 'PROVIDER_RETURNED', value: 1000, key: 'totalRevenue', date: '2024-03-31T00:00:00.000Z', row: { periodType: '12M' } } } },
  canonicalEvidence: { byId: { [differentObservationRevenue.evidenceId]: differentObservationRevenue, [fcf.evidenceId]: fcf }, fields: { revenue: differentObservationRevenue.evidenceId, freeCashFlow: fcf.evidenceId }, observations: { revenue: differentObservationRevenue.evidenceId, freeCashFlow: fcf.evidenceId }, history: {} },
};
const incompatible = mergeStatementEvidence({ current: {}, derived: {} }, incompatibleEvidence);
assert.equal(incompatible.derived.fcfMargin, null);
assert.equal(incompatible.derivedEvidence.fcfMargin, undefined);

// Missing required metadata must also fail closed for protected same-period calculations.
const missingCurrency = canonical('totalRevenue', 1000, { currency: null });
const missingMetadata = mergeStatementEvidence({ current: {}, derived: {} }, {
  ...baseEvidence,
  evidence: { ...baseEvidence.evidence, income: { revenue: { status: 'PROVIDER_RETURNED', value: 1000, key: 'totalRevenue', date: annualDate, row: { periodType: '12M' } } } },
  canonicalEvidence: { byId: { [missingCurrency.evidenceId]: missingCurrency, [fcf.evidenceId]: fcf }, fields: { revenue: missingCurrency.evidenceId, freeCashFlow: fcf.evidenceId }, observations: { revenue: missingCurrency.evidenceId, freeCashFlow: fcf.evidenceId }, history: {} },
});
assert.equal(missingMetadata.derived.fcfMargin, null);

console.log('statement-period-lineage.unit: PASS');
