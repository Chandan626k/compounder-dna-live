import assert from 'node:assert/strict';
import { mergeStatementEvidence } from '../lib/statement-evidence.js';

const base = {
  current: { totalAssets: null, totalDebt: null, cash: null, equity: null, freeCashFlow: null },
  derived: {},
  rawAvailability: {},
};

const evidence = {
  provider: 'Yahoo Finance fundamentalsTimeSeries',
  period: 'annual / 12M',
  coverage: { income: true, balanceSheet: true, cashFlow: true },
  evidence: {
    income: {
      ebitda: { status: 'PROVIDER_RETURNED', value: 220, key: 'EBITDA', date: '2025-03-31T00:00:00.000Z' },
      ebit: { status: 'PROVIDER_RETURNED', value: 200, key: 'EBIT', date: '2025-03-31T00:00:00.000Z' },
      eps: { status: 'PROVIDER_RETURNED', value: 15, key: 'dilutedEPS', date: '2025-03-31T00:00:00.000Z' },
    },
    balance: {
      totalAssets: { status: 'PROVIDER_RETURNED', value: 1500, key: 'totalAssets', date: '2025-03-31T00:00:00.000Z' },
      totalDebt: { status: 'PROVIDER_RETURNED', value: 250, key: 'totalDebt', date: '2025-03-31T00:00:00.000Z' },
      cash: { status: 'PROVIDER_RETURNED', value: 75, key: 'cashCashEquivalentsAndShortTermInvestments', date: '2025-03-31T00:00:00.000Z' },
      equity: { status: 'PROVIDER_RETURNED', value: 1250, key: 'stockholdersEquity', date: '2025-03-31T00:00:00.000Z' },
      workingCapital: { status: 'PROVIDER_RETURNED', value: 167, key: 'workingCapital', date: '2025-03-31T00:00:00.000Z' },
      ordinaryShares: { status: 'PROVIDER_RETURNED', value: 100, key: 'ordinarySharesNumber', date: '2025-03-31T00:00:00.000Z' },
    },
    cash: {
      operatingCashFlow: { status: 'PROVIDER_RETURNED', value: 180, key: 'operatingCashFlow', date: '2025-03-31T00:00:00.000Z' },
      investingCashFlow: { status: 'PROVIDER_RETURNED', value: -120, key: 'investingCashFlow', date: '2025-03-31T00:00:00.000Z' },
      financingCashFlow: { status: 'PROVIDER_RETURNED', value: -80, key: 'financingCashFlow', date: '2025-03-31T00:00:00.000Z' },
      changeInCash: { status: 'PROVIDER_RETURNED', value: -20, key: 'changesInCash', date: '2025-03-31T00:00:00.000Z' },
      freeCashFlow: { status: 'PROVIDER_RETURNED', value: 175, key: 'freeCashFlow', date: '2025-03-31T00:00:00.000Z' },
      capitalExpenditure: { status: 'PROVIDER_RETURNED', value: -55, key: 'capitalExpenditure', date: '2025-03-31T00:00:00.000Z' },
      dividends: { status: 'PROVIDER_RETURNED', value: -40, key: 'commonStockDividendPaid', date: '2025-03-31T00:00:00.000Z' },
      stockBasedCompensation: { status: 'PROVIDER_RETURNED', value: 12, key: 'stockBasedCompensation', date: '2025-03-31T00:00:00.000Z' },
    },
  },
  history: { incomeYears: 4, balanceYears: 4, cashFlowYears: 4 },
  errors: { income: null, balance: null, cash: null },
};

const merged = mergeStatementEvidence(base, evidence);
assert.equal(merged.current.totalAssets, 1500);
assert.equal(merged.current.totalDebt, 250);
assert.equal(merged.current.cash, 75);
assert.equal(merged.current.equity, 1250);
assert.equal(merged.current.workingCapital, 167);
assert.equal(merged.current.ordinaryShares, 100);
assert.equal(merged.current.ebitda, 220);
assert.equal(merged.current.ebit, 200);
assert.equal(merged.current.eps, 15);
assert.equal(merged.current.operatingCashFlow, 180);
assert.equal(merged.current.investingCashFlow, -120);
assert.equal(merged.current.financingCashFlow, -80);
assert.equal(merged.current.changeInCash, -20);
assert.equal(merged.current.freeCashFlow, 175);
assert.equal(merged.current.capitalExpenditure, -55);
assert.equal(merged.current.dividends, -40);
assert.equal(merged.current.stockBasedCompensation, 12);
assert.equal(merged.derived.debtToEquityFromStatements, 0.2);
assert.equal(merged.statementEvidence, evidence);

const unavailable = mergeStatementEvidence(
  { current: {}, derived: {}, rawAvailability: {} },
  {
    coverage: { income: true, balanceSheet: true, cashFlow: true },
    evidence: {
      balance: { totalAssets: { status: 'PROVIDER_DID_NOT_RETURN', value: null, key: null, date: null } },
      cash: { investingCashFlow: { status: 'PROVIDER_DID_NOT_RETURN', value: null, key: null, date: null } },
    },
  },
);
assert.equal(unavailable.current.totalAssets, null);
assert.equal(unavailable.current.investingCashFlow, null);
assert.notEqual(unavailable.current.totalAssets, 0);
assert.equal(unavailable.statementEvidence.evidence.balance.totalAssets.status, 'PROVIDER_DID_NOT_RETURN');

console.log('statement-evidence.unit: PASS');
