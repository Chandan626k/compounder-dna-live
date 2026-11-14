import assert from 'node:assert/strict';
import { createServer, request as httpRequest } from 'node:http';
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

function httpGet(server, pathname) {
  const address = server.address();
  return new Promise((resolve, reject) => {
    const request = httpRequest({ hostname: '127.0.0.1', port: address.port, path: pathname, method: 'GET' }, (res) => {
      let raw = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { raw += chunk; });
      res.on('end', () => resolve({ statusCode: res.statusCode, body: JSON.parse(raw) }));
    });
    request.on('error', reject);
    request.end();
  });
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

  const originalVercel = process.env.VERCEL;
  process.env.VERCEL = '1';
  let expressServer;
  try {
    const { default: expressApp } = await import('../server.js');
    expressServer = createServer(expressApp);
    await new Promise((resolve, reject) => {
      expressServer.once('error', reject);
      expressServer.listen(0, '127.0.0.1', resolve);
    });
    const expressAnalyze = await httpGet(expressServer, '/api/analyze?symbol=TCS');
    assert.equal(expressAnalyze.statusCode, 503, 'Express /api/analyze must fail closed');
    assert.equal(expressAnalyze.body?.policy?.sourceAccess, 'NOT_CONFIGURED', 'Express route must expose the access state');
    assert.equal(expressAnalyze.body?.policy?.providerRequestMade, false, 'Express route must not call a provider');
    const expressHealth = await httpGet(expressServer, '/api/health');
    assert.equal(expressHealth.statusCode, 200, 'Express health must remain a liveness response');
    assert.equal(expressHealth.body?.marketDataAccess?.status, 'NOT_CONFIGURED', 'Express health must distinguish liveness from data access');
    assert.equal(expressHealth.body?.marketDataAccess?.providerProbe, 'not_performed', 'Express health must not claim a provider health probe');
    assert.equal(providerRequests, 0, 'Express route must not call a provider');
  } finally {
    if (expressServer?.listening) await new Promise((resolve) => expressServer.close(resolve));
    if (originalVercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = originalVercel;
  }
} finally {
  globalThis.fetch = originalFetch;
}

console.log('market-data-access-route-guard.unit: PASS');
