import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { MARKET_DATA_ACCESS_POLICY } from '../lib/market-data-access-policy.js';
import { createAnalyzeHandler } from '../api/analyze.js';
import analyzeGated from '../api/analyze-gated.js';
import investmentReadiness from '../api/investment-readiness.js';
import trading from '../api/trading.js';
import actionability from '../api/actionability.js';
import dataFoundation from '../api/data-foundation.js';
import data from '../api/data.js';
import backtest from '../api/backtest.js';
import validateStrategy from '../api/validate-strategy.js';
import finalHoldout from '../api/final-holdout.js';
import health from '../api/health.js';

function response() {
  return {
    headers: {},
    statusCode: null,
    body: null,
    setHeader(name, value) { this.headers[name] = value; return this; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    end() { this.ended = true; return this; },
  };
}
const neverAnalyze = async () => { throw new Error('analysis must not run while source access is blocked'); };
const analyze = createAnalyzeHandler({ analyzeStockFn: neverAnalyze });
const cases = [
  ['analyze GET', analyze, { method: 'GET', query: { symbol: 'TCS.NS' }, headers: {} }],
  ['analyze POST', analyze, { method: 'POST', body: { symbol: 'TCS.NS' }, headers: {} }],
  ['analyze-gated', analyzeGated, { method: 'GET', query: { symbol: 'TCS.NS' } }],
  ['investment-readiness', investmentReadiness, { method: 'GET', query: { symbol: 'TCS.NS' } }],
  ['trading', trading, { method: 'GET', query: { symbol: 'TCS.NS' } }],
  ['actionability', actionability, { method: 'GET', query: { symbol: 'TCS.NS' } }],
  ['data-foundation', dataFoundation, { method: 'GET', query: { symbol: 'TCS.NS' } }],
  ['data chart', data, { method: 'POST', body: { type: 'chart', ticker: 'TCS' }, headers: {} }],
  ['backtest', backtest, { method: 'GET', query: { symbol: 'TCS.NS' } }],
  ['validate-strategy', validateStrategy, { method: 'GET', query: { symbol: 'TCS.NS' } }],
  ['final-holdout prepare', finalHoldout, { method: 'GET', query: { mode: 'prepare' } }],
  ['final-holdout execute', finalHoldout, { method: 'GET', query: { mode: 'execute' } }],
];

for (const [name, handler, req] of cases) {
  const res = response();
  await handler(req, res);
  assert.equal(res.statusCode, 503, name);
  assert.equal(res.body?.code, MARKET_DATA_ACCESS_POLICY.code, name);
  assert.equal(res.body?.policy?.sourceAccess, 'NOT_CONFIGURED', name);
  assert.equal(res.body?.policy?.providerRequestMade, false, name);
  assert.equal(res.body?.policy?.fabricatedData, false, name);
}

const healthRes = response();
health({ method: 'GET' }, healthRes);
assert.equal(healthRes.statusCode, 200);
assert.equal(healthRes.body.marketDataAccess, 'NOT_CONFIGURED');
assert.equal(healthRes.body.yahooFinance.routeAccess, 'BLOCKED');

const serverSource = await readFile(new URL('../server.js', import.meta.url), 'utf8');
assert.match(serverSource, /app\.get\('\/api\/analyze', \(req, res\) => sendMarketDataUnavailable\(res\)\)/);

console.log('Market-data access guard regressions passed.');
