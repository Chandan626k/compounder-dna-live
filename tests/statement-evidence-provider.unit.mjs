import assert from 'node:assert/strict';
import { createAnalyzeHandler } from '../api/analyze.js';
import { deriveFinancialCurrency, fetchStatementEvidence, mergeStatementEvidence } from '../lib/statement-evidence.js';

const rows = {
  financials: [{ date: '2025-03-31', totalRevenue: 1000, netIncome: 100 }],
  'balance-sheet': [{
    date: '2025-03-31',
    totalDebt: 200,
    cashAndCashEquivalents: 50,
    stockholdersEquity: 500,
    currentAssets: 600,
    currentLiabilities: 300
  }],
  'cash-flow': [{ date: '2025-03-31', freeCashFlow: 75, operatingCashFlow: 100 }]
};

function providerFixture({ quote = {}, rowCurrencyByModule = {}, rejectModules = [] } = {}) {
  return {
    async fundamentalsTimeSeries(symbol, options) {
      assert.ok(symbol.endsWith('.NS') || symbol.endsWith('.BO'));
      assert.equal(options.type, 'annual');
      if (rejectModules.includes(options.module)) throw new Error('Yahoo Finance HTTP 429');
      const moduleRows = structuredClone(rows[options.module] || []);
      const currency = rowCurrencyByModule[options.module];
      return currency ? moduleRows.map((row) => ({ ...row, currencyCode: currency })) : moduleRows;
    },
    async quote(symbol) {
      return { symbol, ...quote };
    }
  };
}

function baseFinancials() {
  return {
    current: {
      revenue: null, ebitda: null, netIncome: null, freeCashFlow: null,
      operatingCashFlow: null, totalDebt: null, netDebt: null, cash: null,
      equity: null, currentAssets: null, currentLiabilities: null
    },
    derived: {},
    rawAvailability: {},
    sourceNote: 'fixture'
  };
}

function makeResponse() {
  return {
    headers: {},
    statusCode: null,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = JSON.parse(JSON.stringify(payload)); return this; },
    end() { this.ended = true; return this; }
  };
}

async function runApi(symbol, provider) {
  const handler = createAnalyzeHandler({
    analyzeStockFn: async (requestedSymbol) => {
      const evidence = await fetchStatementEvidence(requestedSymbol, provider);
      return {
        stock: { symbol: requestedSymbol.toUpperCase().replace(/\\.(?:NS|BO)$/i, ''), price: 100, currency: 'INR' },
        fundamentals: mergeStatementEvidence(baseFinancials(), evidence),
        valuation: { enterpriseValue: null, evToEbitda: null, evToRevenue: null }
      };
    }
  });
  const response = makeResponse();
  await handler({
    method: 'GET',
    query: { symbol },
    headers: { 'x-request-id': 'statement-currency-provider-regression' }
  }, response);
  return response;
}

assert.equal(deriveFinancialCurrency([
  { currencyCode: 'USD' },
  { currencyCode: 'USD' }
]), 'USD');
assert.equal(deriveFinancialCurrency([
  { currencyCode: 'USD' },
  { currencyCode: 'INR' }
]), null);
assert.equal(deriveFinancialCurrency([
  { currencyCode: 'USD' },
  { totalRevenue: 100 }
]), null);

const matchedProvider = providerFixture({ quote: { currency: 'INR', financialCurrency: 'INR' } });
const matchedEvidence = await fetchStatementEvidence('INFY.NS', matchedProvider);
assert.equal(matchedEvidence.currency.tradingCurrency, 'INR');
assert.equal(matchedEvidence.currency.financialCurrency, 'INR');
assert.equal(matchedEvidence.currency.source, 'quote.financialCurrency');
assert.equal(matchedEvidence.currency.status, 'MATCH');
assert.equal(matchedEvidence.currency.rowCurrencyConflict, false);
assert.deepEqual(matchedEvidence.history, { incomeYears: 1, balanceYears: 1, cashFlowYears: 1 });
assert.deepEqual(matchedEvidence.coverage, { income: true, balanceSheet: true, cashFlow: true });
assert.deepEqual(matchedEvidence.errors, { income: null, balance: null, cash: null, quote: null });

const matchedApi = await runApi('CURRENCYMETADATAMATCH', matchedProvider);
assert.equal(matchedApi.statusCode, 200);
assert.equal(matchedApi.headers['Cache-Control'], 'no-store');
assert.equal(matchedApi.body.meta.cached, false);
assert.equal(matchedApi.body.fundamentals.statementEvidence.currency.status, 'MATCH');
assert.equal(matchedApi.body.fundamentals.statementEvidence.currency.source, 'quote.financialCurrency');
assert.equal(matchedApi.body.fundamentals.current.totalDebt, 200);
assert.equal(matchedApi.body.fundamentals.current.cash, 50);
assert.equal(matchedApi.body.fundamentals.current.equity, 500);
assert.equal(matchedApi.body.fundamentals.current.freeCashFlow, 75);
assert.equal(matchedApi.body.fundamentals.rawAvailability.annualStatements, true);
assert.equal(matchedApi.body.fundamentals.rawAvailability.annualBalanceSheet, true);
assert.equal(matchedApi.body.fundamentals.rawAvailability.annualCashFlow, true);

const unknownApi = await runApi(
  'CURRENCYMETADATAUNKNOWN',
  providerFixture({ quote: { currency: 'INR' } })
);
assert.equal(unknownApi.statusCode, 200);
assert.equal(unknownApi.body.fundamentals.statementEvidence.currency.status, 'UNKNOWN');
assert.equal(unknownApi.body.fundamentals.current.totalDebt, null);
assert.equal(unknownApi.body.fundamentals.current.freeCashFlow, null);
assert.equal(unknownApi.body.fundamentals.rawAvailability.annualStatements, false);
assert.equal(unknownApi.body.fundamentals.rawAvailability.annualBalanceSheet, false);
assert.equal(unknownApi.body.fundamentals.rawAvailability.annualCashFlow, false);

const mismatch = await fetchStatementEvidence(
  'MISMATCH.NS',
  providerFixture({ quote: { currency: 'INR', financialCurrency: 'USD' } })
);
assert.equal(mismatch.currency.status, 'MISMATCH');
const mismatchFinancials = mergeStatementEvidence(baseFinancials(), mismatch);
assert.equal(mismatchFinancials.current.totalDebt, null);
assert.equal(mismatchFinancials.rawAvailability.annualBalanceSheet, false);

const conflict = await fetchStatementEvidence(
  'CONFLICT.NS',
  providerFixture({
    quote: { currency: 'INR', financialCurrency: 'INR' },
    rowCurrencyByModule: { financials: 'USD' }
  })
);
assert.equal(conflict.currency.status, 'UNKNOWN');
assert.equal(conflict.currency.financialCurrency, null);
assert.equal(conflict.currency.rowCurrencyConflict, true);
assert.equal(mergeStatementEvidence(baseFinancials(), conflict).current.totalDebt, null);

const completeRowFallback = await fetchStatementEvidence(
  'ROWFALLBACK.NS',
  providerFixture({
    quote: { currency: 'INR' },
    rowCurrencyByModule: { financials: 'INR', 'balance-sheet': 'INR', 'cash-flow': 'INR' }
  })
);
assert.equal(completeRowFallback.currency.status, 'MATCH');
assert.equal(completeRowFallback.currency.financialCurrency, 'INR');
assert.equal(completeRowFallback.currency.source, 'statement_rows');

const partialRowFallback = await fetchStatementEvidence(
  'PARTIALROW.NS',
  providerFixture({
    quote: { currency: 'INR' },
    rowCurrencyByModule: { financials: 'INR' }
  })
);
assert.equal(partialRowFallback.currency.status, 'UNKNOWN');
assert.equal(partialRowFallback.currency.financialCurrency, null);

const providerFailure = await fetchStatementEvidence(
  'PROVIDERFAIL.NS',
  providerFixture({
    quote: { currency: 'INR', financialCurrency: 'INR' },
    rejectModules: ['financials']
  })
);
assert.equal(providerFailure.currency.status, 'MATCH');
assert.match(providerFailure.errors.income, /HTTP 429/);
assert.equal(providerFailure.history.incomeYears, 0);
assert.equal(providerFailure.coverage.income, false);

console.log('statement-evidence-provider.unit: PASS');
