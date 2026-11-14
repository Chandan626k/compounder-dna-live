import assert from 'node:assert/strict';
import data from '../api/data.js';
import scan from '../api/scan.js';
import dataFoundation from '../api/data-foundation.js';
import analyze from '../api/analyze.js';
import analyzeGated from '../api/analyze-gated.js';
import investmentReadiness from '../api/investment-readiness.js';
import backtest from '../api/backtest.js';
import trading from '../api/trading.js';
import actionability from '../api/actionability.js';
import validateStrategy from '../api/validate-strategy.js';


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

let providerRequests = 0;
const { default: finalHoldout } = await import('../api/final-holdout.js');
const originalFetch = globalThis.fetch;
globalThis.fetch = async () => {
  providerRequests += 1;
  throw new Error('A provider request escaped the access gate');
};

async function check(name, handler, req) {
  const res = response();
  await handler(req, res);
  assert.equal(res.statusCode, 503, name + ' must fail closed with HTTP 503');
  assert.equal(res.body?.status, 'UNAVAILABLE', name + ' must report unavailable');
  assert.equal(res.body?.policy?.sourceAccess, 'NOT_CONFIGURED', name + ' must expose the access state');
  assert.equal(res.body?.policy?.providerRequestMade, false, name + ' must state that no provider request was made');
  assert.equal(providerRequests, 0, name + ' must not call a provider');
}

try {
  await check('api/data', data, { method: 'POST', body: { type: 'summary', ticker: 'TCS' }, headers: {} });
  await check('api/scan', scan, { method: 'GET', query: { symbols: 'TCS' }, headers: {} });
  await check('api/data-foundation', dataFoundation, { method: 'GET', query: { symbol: 'TCS' }, headers: {} });
  await check('api/analyze GET', analyze, { method: 'GET', query: { symbol: 'TCS' }, headers: {} });
  await check('api/analyze POST', analyze, { method: 'POST', body: { symbol: 'TCS' }, headers: {} });
  await check('api/analyze-gated', analyzeGated, { method: 'GET', query: { symbol: 'TCS' }, headers: {} });
  await check('api/investment-readiness', investmentReadiness, { method: 'GET', query: { symbol: 'TCS' }, headers: {} });
  await check('api/backtest', backtest, { method: 'GET', query: { symbol: 'TCS' }, headers: {} });
  await check('api/trading', trading, { method: 'GET', query: { symbol: 'TCS' }, headers: {} });
  await check('api/actionability', actionability, { method: 'GET', query: { symbol: 'TCS' }, headers: {} });
  await check('api/validate-strategy', validateStrategy, { method: 'GET', query: { symbol: 'TCS' }, headers: {} });
  await check('api/final-holdout prepare', finalHoldout, { method: 'GET', query: { mode: 'prepare' }, headers: {} });
  await check('api/final-holdout execute', finalHoldout, { method: 'GET', query: { mode: 'execute' }, headers: {} });
} finally {
  globalThis.fetch = originalFetch;
}

console.log('market-data-access-route-guard.unit: PASS');
