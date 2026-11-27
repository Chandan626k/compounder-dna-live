import assert from 'node:assert/strict';
import { buildActionability } from '../lib/actionability.js';

const analysis = {
  stock: { symbol: 'ICICIBANK', price: 1412, dataLimited: true },
  dataLimited: true,
  dataQuality: {
    confidence: 65,
    warnings: ['Critical data unavailable'],
    sectorFramework: { available: 2, total: 8 },
  },
  score: {
    financialStrengthCoverage: 'CURRENT_FIELDS_ONLY',
    sectorFramework: { available: 2, total: 8 },
    overall: 82,
  },
  valuation: {
    verdict: 'UNDERVALUED',
    fairValue: 2135.62,
    marginOfSafety: 33.88,
    conservativeFairValue: 1829.20,
    baseFairValue: 2135.62,
    optimisticFairValue: 2339.90,
  },
  decision: { blockers: ['Critical data missing: Debt/Equity'] },
};

const trading = {
  technical: {
    last: 1412,
    e20: 1425.36,
    e50: 1399.35,
    e200: 1358.91,
    rsi: 46.66,
    relativeVolume: 0.759,
    macd: { histogram: -6.848 },
    support: 1401,
    resistance: 1466.4,
    atr: 21.93,
    vwap: 1434.07,
    trend: 'UPTREND',
  },
};

const out = buildActionability(analysis, trading);
assert.equal(out.overallStance, 'WAIT — EVIDENCE FIRST');
assert.equal(out.horizons.longTerm.action, 'WATCH / WAIT FOR EVIDENCE');
assert.equal(out.horizons.swing.action, 'WAIT — DATA / VALIDATION');
assert.equal(out.horizons.shortTerm.action, 'WAIT / NO FRESH LONG');
assert.equal(out.sectorCoverage, 25);
assert.equal(out.technical.triggers.reclaim, 1425.36);
assert.equal(out.technical.triggers.breakdown, 1401);
assert.ok(out.technical.triggers.stop < 1401);
assert.equal(out.productionTradingEnabled, false);

const readyAnalysis = {
  ...analysis,
  dataLimited: false,
  stock: { ...analysis.stock, dataLimited: false },
  valuation: { ...analysis.valuation, verdict: 'FAIRLY VALUED' },
  dataQuality: { confidence: 82, warnings: [], sectorFramework: { available: 7, total: 8 } },
  score: { financialStrengthCoverage: 'FULL', sectorFramework: { available: 7, total: 8 }, overall: 84 },
};
const readyTrading = {
  technical: {
    ...trading.technical,
    last: 1435,
    rsi: 60,
    relativeVolume: 1.35,
    macd: { histogram: 4.2 },
  },
};
const ready = buildActionability(readyAnalysis, readyTrading);
assert.equal(ready.horizons.longTerm.action, 'STAGED ACCUMULATION CANDIDATE');
assert.equal(ready.horizons.swing.action, 'CONDITIONAL BUY SETUP');

const technicalOnlyAnalysis = {
  ...readyAnalysis,
  fundamentals: undefined,
  valuation: { verdict: 'FAIRLY VALUED', fairValue: null },
};
const technicalOnly = buildActionability(technicalOnlyAnalysis, readyTrading);
assert.equal(technicalOnly.horizons.swing.action, 'CONDITIONAL BUY SETUP', 'missing fundamentals do not automatically block Swing');
assert.equal(technicalOnly.horizons.shortTerm.action, 'WAIT', 'missing fundamentals do not automatically block Short-Term');

const evidenceLimited = buildActionability({
  ...technicalOnlyAnalysis,
  dataLimited: true,
  stock: { ...technicalOnlyAnalysis.stock, dataLimited: true },
}, readyTrading);
assert.equal(evidenceLimited.horizons.longTerm.action, 'WATCH / WAIT FOR EVIDENCE', 'Long-Term remains evidence-limited');

const actionabilitySource = await import('node:fs/promises');
const actionabilitySourceText = await actionabilitySource.readFile(new URL('../api/actionability.js', import.meta.url), 'utf8');
assert.equal((actionabilitySourceText.match(/fetchStatementEvidence/g) || []).length, 0, 'actionability must not fetch statement evidence independently');
assert.equal((actionabilitySourceText.match(/mergeStatementEvidence/g) || []).length, 0, 'actionability must not merge statement evidence independently');
assert.match(actionabilitySourceText, /analysis\.fundamentals\?\.statementEvidence/);

// Every public provider-backed route must fail closed before making a provider request.
const policyCode = 'AUTHORIZED_MARKET_DATA_SOURCE_NOT_CONFIGURED';
const previousFetch = globalThis.fetch;
let providerCalls = 0;
globalThis.fetch = async () => {
  providerCalls += 1;
  throw new Error('Provider fetch must not occur while access is blocked');
};
try {
  const routeCases = [
    ['actionability', (await import('../api/actionability.js')).default, { method: 'GET', query: { symbol: 'TCS.NS' }, headers: {} }],
    ['analyze GET', (await import('../api/analyze.js')).default, { method: 'GET', query: { symbol: 'TCS.NS' }, headers: {} }],
    ['analyze POST', (await import('../api/analyze.js')).default, { method: 'POST', body: { symbol: 'TCS.NS' }, query: {}, headers: {} }],
    ['analyze-gated', (await import('../api/analyze-gated.js')).default, { method: 'GET', query: { symbol: 'TCS.NS' }, headers: {} }],
    ['backtest', (await import('../api/backtest.js')).default, { method: 'GET', query: { symbol: 'TCS.NS' }, headers: {} }],
    ['data-foundation', (await import('../api/data-foundation.js')).default, { method: 'GET', query: { symbol: 'TCS.NS' }, headers: {} }],
    ['data', (await import('../api/data.js')).default, { method: 'POST', body: { type: 'quote', symbol: 'TCS.NS' }, query: {}, headers: {} }],
    ['investment-readiness', (await import('../api/investment-readiness.js')).default, { method: 'GET', query: { symbol: 'TCS.NS' }, headers: {} }],
    ['scan GET', (await import('../api/scan.js')).default, { method: 'GET', query: { symbols: 'TCS.NS' }, headers: {} }],
    ['scan POST', (await import('../api/scan.js')).default, { method: 'POST', body: { symbols: ['TCS.NS'] }, query: {}, headers: {} }],
    ['trading', (await import('../api/trading.js')).default, { method: 'GET', query: { symbol: 'TCS.NS' }, headers: {} }],
    ['validate-strategy', (await import('../api/validate-strategy.js')).default, { method: 'GET', query: { symbol: 'TCS.NS' }, headers: {} }],
    ['holdout prepare', (await import('../api/final-holdout.js')).default, { method: 'GET', query: { mode: 'prepare' }, headers: {} }],
    ['holdout execute', (await import('../api/final-holdout.js')).default, { method: 'GET', query: { mode: 'execute' }, headers: {} }],
  ];
  for (const [name, handler, req] of routeCases) {
    const res = {
      statusCode: null, headers: {}, body: null,
      setHeader(key, value) { this.headers[key] = value; return this; },
      status(code) { this.statusCode = code; return this; },
      json(body) { this.body = body; return this; },
      end() { this.ended = true; return this; },
    };
    await handler(req, res);
    assert.equal(res.statusCode, 503, name + ' must return HTTP 503');
    assert.equal(res.body?.code, policyCode, name + ' must return the shared access-policy code');
    assert.equal(res.body?.policy?.providerRequestMade, false, name + ' must not call a provider');
  }
  assert.equal(providerCalls, 0, 'blocked routes must not call fetch');
} finally {
  globalThis.fetch = previousFetch;
}
const finalHoldoutSource = await actionabilitySource.readFile(new URL('../api/final-holdout.js', import.meta.url), 'utf8');
assert.ok(finalHoldoutSource.includes("if (mode === 'status')"), 'read-only final-holdout status mode must remain available');
const serverSource = await actionabilitySource.readFile(new URL('../server.js', import.meta.url), 'utf8');
assert.ok(serverSource.includes("app.get('/api/analyze', (req, res) => sendMarketDataUnavailable(res))"), 'local Express analyze route must use the same guard');

console.log('actionability unit tests passed');
console.log('market-data access guard regressions passed');
