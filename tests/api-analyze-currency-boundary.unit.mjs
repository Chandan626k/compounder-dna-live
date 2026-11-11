import assert from 'node:assert/strict';
import { createAnalyzeHandler } from '../api/analyze.js';
import { deriveFinancialCurrency, mergeStatementEvidence } from '../lib/statement-evidence.js';

const statementRows = [
  { date: '2025-03-31', currencyCode: 'USD', totalDebt: 300, totalRevenue: 1000 },
  { date: '2024-03-31', totalDebt: 250, totalRevenue: 900 },
];
const financialCurrency = deriveFinancialCurrency(statementRows);
assert.equal(financialCurrency, null, 'mixed known/missing provider currency metadata must remain UNKNOWN');

const statementEvidence = {
  provider: 'Yahoo Finance fundamentalsTimeSeries fixture',
  currency: {
    tradingCurrency: 'USD',
    financialCurrency,
    status: financialCurrency ? 'MATCH' : 'UNKNOWN',
  },
  coverage: { income: true, balanceSheet: true, cashFlow: true },
  evidence: {
    balance: {
      totalDebt: { value: 300, key: 'totalDebt', date: '2025-03-31T00:00:00.000Z' },
      cash: { value: 100, key: 'cashAndCashEquivalents', date: '2025-03-31T00:00:00.000Z' },
      equity: { value: 1000, key: 'stockholdersEquity', date: '2025-03-31T00:00:00.000Z' },
      currentAssets: { value: 800, key: 'currentAssets', date: '2025-03-31T00:00:00.000Z' },
      currentLiabilities: { value: 400, key: 'currentLiabilities', date: '2025-03-31T00:00:00.000Z' },
    },
    cash: {
      freeCashFlow: { value: 120, key: 'freeCashFlow', date: '2025-03-31T00:00:00.000Z' },
      operatingCashFlow: { value: 200, key: 'operatingCashFlow', date: '2025-03-31T00:00:00.000Z' },
    },
  },
};
const financials = mergeStatementEvidence({
  current: {
    revenue: 1000, ebitda: 500, netIncome: 200, freeCashFlow: 120, operatingCashFlow: 200,
    totalDebt: 300, netDebt: 200, cash: 100, equity: 1000, currentAssets: 800, currentLiabilities: 400,
  },
  derived: {
    netDebtToEbitda: 0.4, fcfMargin: 12, fcfConversion: 60,
    currentRatioFromStatements: 2, workingCapital: 400, debtToEquityFromStatements: 0.3,
  },
  rawAvailability: { annualStatements: true, annualBalanceSheet: true, annualCashFlow: true },
}, statementEvidence);

const analysis = {
  stock: { symbol: 'MIXEDCURRBOUNDARY', price: 100, currency: 'USD' },
  fundamentals: financials,
  valuation: { enterpriseValue: null, evToEbitda: null, evToRevenue: null },
};
let analyzeCalls = 0;
const handler = createAnalyzeHandler({
  analyzeStockFn: async (symbol) => {
    analyzeCalls += 1;
    assert.equal(symbol, 'MIXEDCURRBOUNDARY');
    return analysis;
  },
});

const response = {
  headers: {},
  statusCode: null,
  setHeader(name, value) { this.headers[name] = value; },
  status(code) { this.statusCode = code; return this; },
  json(payload) { this.body = JSON.parse(JSON.stringify(payload)); return this; },
  end() { this.ended = true; return this; },
};
await handler({
  method: 'GET',
  query: { symbol: 'MIXEDCURRBOUNDARY' },
  headers: { 'x-request-id': 'currency-boundary-regression' },
}, response);

assert.equal(response.statusCode, 200);
assert.equal(analyzeCalls, 1);
assert.equal(response.body.meta.cached, false);
assert.equal(response.body.fundamentals.statementEvidence.currency.status, 'UNKNOWN');
assert.equal(response.body.fundamentals.statementEvidence.currency.financialCurrency, null);
for (const key of ['revenue', 'ebitda', 'netIncome', 'freeCashFlow', 'operatingCashFlow', 'totalDebt', 'netDebt', 'cash', 'equity', 'currentAssets', 'currentLiabilities']) {
  assert.equal(response.body.fundamentals.current[key], null, `API response must not expose ${key} when currency is UNKNOWN`);
}
for (const key of ['netDebtToEbitda', 'fcfMargin', 'fcfConversion', 'currentRatioFromStatements', 'workingCapital', 'debtToEquityFromStatements']) {
  assert.equal(response.body.fundamentals.derived[key], null, `API response must not expose ${key} when currency is UNKNOWN`);
}
assert.equal(response.body.fundamentals.rawAvailability.annualStatements, false);
assert.equal(response.body.fundamentals.rawAvailability.annualBalanceSheet, false);
assert.equal(response.body.fundamentals.rawAvailability.annualCashFlow, false);
assert.equal(response.headers['Cache-Control'], 'no-store');

console.log('api-analyze-currency-boundary.unit: PASS');
