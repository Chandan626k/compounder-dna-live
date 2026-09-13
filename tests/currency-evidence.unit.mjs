import assert from 'node:assert/strict';
import { mergeStatementEvidence } from '../lib/statement-evidence.js';

const baseFinancials = {
  current: {
    revenue: 20000000000,
    ebitda: 4000000000,
    netIncome: 3000000000,
    freeCashFlow: 3000000000,
    operatingCashFlow: 4000000000,
    totalDebt: 1000000000,
    netDebt: 500000000,
    cash: 500000000,
    equity: 10000000000,
    currentAssets: 12000000000,
    currentLiabilities: 7000000000,
  },
  derived: {
    netDebtToEbitda: 0.125,
    fcfMargin: 15,
    fcfConversion: 100,
    currentRatioFromStatements: 1.7,
    workingCapital: 5000000000,
    debtToEquityFromStatements: 0.1,
  },
  rawAvailability: {
    quoteSummary: true,
    annualStatements: true,
    annualBalanceSheet: true,
    annualCashFlow: true,
  },
  sourceNote: 'base',
};

const mismatched = mergeStatementEvidence(baseFinancials, {
  provider: 'Yahoo Finance fundamentalsTimeSeries',
  currency: {
    tradingCurrency: 'INR',
    financialCurrency: 'USD',
    status: 'MISMATCH',
  },
  coverage: { income: true, balanceSheet: true, cashFlow: true },
  evidence: {
    balance: {
      totalDebt: { value: 999, key: 'totalDebt', date: '2026-03-31T00:00:00.000Z' },
      cash: { value: 888, key: 'cashAndCashEquivalents', date: '2026-03-31T00:00:00.000Z' },
    },
    cash: { freeCashFlow: { value: 777, key: 'freeCashFlow', date: '2026-03-31T00:00:00.000Z' } },
  },
});

for (const key of ['revenue', 'ebitda', 'netIncome', 'freeCashFlow', 'operatingCashFlow', 'totalDebt', 'netDebt', 'cash', 'equity', 'currentAssets', 'currentLiabilities']) {
  assert.equal(mismatched.current[key], null, `${key} must not cross a USD→INR boundary`);
}
for (const key of ['netDebtToEbitda', 'fcfMargin', 'fcfConversion', 'currentRatioFromStatements', 'workingCapital', 'debtToEquityFromStatements']) {
  assert.equal(mismatched.derived[key], null, `${key} must not rely on blocked currency-mismatched amounts`);
}
assert.equal(mismatched.rawAvailability.annualStatements, false);
assert.equal(mismatched.rawAvailability.annualBalanceSheet, false);
assert.equal(mismatched.rawAvailability.annualCashFlow, false);
assert.equal(mismatched.statementEvidence.currency.status, 'MISMATCH');
assert.match(mismatched.sourceNote, /not promoted.*canonical/i);

const matched = mergeStatementEvidence(
  { current: { totalDebt: null, cash: null, freeCashFlow: null }, derived: {}, rawAvailability: {} },
  {
    provider: 'Yahoo Finance fundamentalsTimeSeries',
    currency: { tradingCurrency: 'INR', financialCurrency: 'INR', status: 'MATCH' },
    coverage: { income: true, balanceSheet: true, cashFlow: true },
    evidence: {
      balance: {
        totalDebt: { value: 250, key: 'totalDebt', date: '2026-03-31T00:00:00.000Z' },
        cash: { value: 75, key: 'cashAndCashEquivalents', date: '2026-03-31T00:00:00.000Z' },
        equity: { value: 1250, key: 'stockholdersEquity', date: '2026-03-31T00:00:00.000Z' },
      },
      cash: { freeCashFlow: { value: 175, key: 'freeCashFlow', date: '2026-03-31T00:00:00.000Z' } },
    },
  },
);
assert.equal(matched.current.totalDebt, 250);
assert.equal(matched.current.cash, 75);
assert.equal(matched.current.freeCashFlow, 175);
assert.equal(matched.derived.debtToEquityFromStatements, 0.2);
assert.equal(matched.rawAvailability.annualStatements, true);

console.log('currency-evidence.unit: PASS');
