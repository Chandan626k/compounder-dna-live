import assert from 'node:assert/strict';
import { mergeStatementEvidence } from '../lib/statement-evidence.js';
import { createCanonicalEvidence } from '../lib/financial-evidence.js';

const annualDate = '2025-03-31T00:00:00.000Z';
const canonical = (sourceKey, value, overrides = {}) => createCanonicalEvidence({
  source: 'YAHOO_FINANCE',
  sourceKey,
  issuer: 'Test Issuer',
  ticker: 'TEST.NS',
  value,
  reportingDate: annualDate,
  reportingPeriod: '2025-03-31',
  periodType: 'ANNUAL',
  statementScope: 'CONSOLIDATED',
  unit: 'INR_CRORE',
  currency: 'INR',
  reportedOrDerived: 'REPORTED',
  status: 'PROVIDER_RETURNED',
  ...overrides,
});

const revenue = canonical('totalRevenue', 1000);
const fcf = canonical('freeCashFlow', 175);
const baseEvidence = {
  ticker: 'TEST.NS',
  fetchedAt: '2026-09-05T03:30:00.000Z',
  evidence: {
    income: { revenue: { status: 'PROVIDER_RETURNED', value: 1000, key: 'totalRevenue', date: annualDate } },
    cash: { freeCashFlow: { status: 'PROVIDER_RETURNED', value: 175, key: 'freeCashFlow', date: annualDate } },
    balance: {},
  },
  canonicalEvidence: {
    byId: { [revenue.evidenceId]: revenue, [fcf.evidenceId]: fcf },
    fields: { revenue: revenue.evidenceId, freeCashFlow: fcf.evidenceId },
    observations: { revenue: revenue.evidenceId, freeCashFlow: fcf.evidenceId },
    history: {},
  },
  coverage: { income: true, balanceSheet: false, cashFlow: true },
  history: { incomeYears: 1, balanceYears: 0, cashFlowYears: 1 },
};

// Critical regression: an existing provider current/TTM revenue must not be mixed with annual FCF.
const mixed = mergeStatementEvidence({
  current: { revenue: 1200 },
  derived: {},
}, baseEvidence);
assert.equal(mixed.current.revenue, 1200);
assert.equal(mixed.current.freeCashFlow, 175);
assert.equal(mixed.derived.fcfMargin, 17.5);
assert.deepEqual(mixed.derivedEvidence.fcfMargin.inputEvidenceIds, [fcf.evidenceId, revenue.evidenceId]);

// Same numeric value is not enough: different observation identity must fail closed.
const differentObservationRevenue = canonical('totalRevenue', 1000, { reportingDate: '2024-03-31T00:00:00.000Z', reportingPeriod: '2024-03-31' });
const incompatible = mergeStatementEvidence({ current: {}, derived: {} }, {
  ...baseEvidence,
  canonicalEvidence: {
    byId: { [differentObservationRevenue.evidenceId]: differentObservationRevenue, [fcf.evidenceId]: fcf },
    fields: { revenue: differentObservationRevenue.evidenceId, freeCashFlow: fcf.evidenceId },
  },
});
assert.equal(incompatible.derived.fcfMargin, null);
assert.equal(incompatible.derivedEvidence.fcfMargin, undefined);

// Missing required metadata must also fail closed for protected same-period calculations.
const missingCurrency = canonical('totalRevenue', 1000, { currency: null });
const missingMetadata = mergeStatementEvidence({ current: {}, derived: {} }, {
  ...baseEvidence,
  canonicalEvidence: {
    byId: { [missingCurrency.evidenceId]: missingCurrency, [fcf.evidenceId]: fcf },
    fields: { revenue: missingCurrency.evidenceId, freeCashFlow: fcf.evidenceId },
  },
});
assert.equal(missingMetadata.derived.fcfMargin, null);

console.log('statement-period-lineage.unit: PASS');
