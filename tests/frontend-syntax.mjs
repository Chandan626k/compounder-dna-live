import fs from 'node:fs';
import os from 'node:os';
import vm from 'node:vm';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const html = fs.readFileSync(new URL('../public/terminal.html', import.meta.url), 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
if (!scripts.length) throw new Error('No inline frontend script found in public/terminal.html');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'stocksamjho-ui-'));
const file = path.join(dir, 'frontend.mjs');
fs.writeFileSync(file, scripts.at(-1));
const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
fs.rmSync(dir, { recursive: true, force: true });
if (result.status !== 0) {
  process.stderr.write(result.stderr || result.stdout || 'Frontend syntax check failed.');
  process.exit(result.status || 1);
}
const providerBlockedMarkers = [
  'async function requestJson(url,fallback)',
  'error.code=data.code||null',
  'AUTHORIZED_MARKET_DATA_SOURCE_NOT_CONFIGURED',
  'No stock analysis was generated.',
  "$('app').classList.add('hidden')",
  'Any previous result has been cleared'
];
for (const marker of providerBlockedMarkers) {
  if (!html.includes(marker)) throw new Error('Missing provider-blocked UI safety state: ' + marker);
}
for (const marker of ['● APP ONLINE', '● ANALYSIS READY', 'MARKET DATA TIME NOT PROVIDED', 'MARKET DATA AS OF ', 'd?.provenance?.marketData?.asOf', 'marketDataSource:marketProvenance.source']) {
  if (!html.includes(marker)) throw new Error('Missing truthful health/data provenance UI marker: ' + marker);
}
const raceHarness = scripts.at(-1) + '\nglobalThis.__testRendered=[]; const originalRender=render; globalThis.render=(analysis,trading)=>{globalThis.__testRendered.push(analysis.stock.symbol); return originalRender(analysis,trading)}; globalThis.__testRender=originalRender; globalThis.__testAnalyse=analyse;';
const elements = new Map();
function testElement() {
  const classes = new Set();
  return {
    classList: {
      add(...names) { names.forEach((name) => classes.add(name)); },
      remove(...names) { names.forEach((name) => classes.delete(name)); },
      contains(name) { return classes.has(name); },
      toggle(name) { if (classes.has(name)) classes.delete(name); else classes.add(name); }
    },
    style: {}, dataset: {}, value: '', textContent: '', innerHTML: '', className: '', onclick: null, listeners: {},
    addEventListener(type, handler) { this.listeners[type] = handler; },
    dispatch(type, event = {}) { this.listeners[type]?.(event); }
  };
}
const testDocument = {
  getElementById(id) { if (!elements.has(id)) elements.set(id, testElement()); return elements.get(id); },
  querySelectorAll() { return []; }
};
let resolveHealth;
const healthPromise = new Promise((resolve) => { resolveHealth = resolve; });
const pendingRequests = new Map();
const testFetch = (url) => url === '/api/health' ? healthPromise : new Promise((resolve, reject) => pendingRequests.set(url, { resolve, reject }));
const testContext = { document: testDocument, fetch: testFetch, console };
vm.createContext(testContext);
vm.runInContext(raceHarness, testContext);
const symbolInput = testDocument.getElementById('symbol');
const statusElement = testDocument.getElementById('status');
const errorElement = testDocument.getElementById('err');
const emptyElement = testDocument.getElementById('empty');
const appElement = testDocument.getElementById('app');
const marketAsOfFixture = '2026-11-18T09:15:00.000Z';
const validChartFixture = [
  { date: marketAsOfFixture, open: 99, close: 100, high: 101, low: 98, volume: 1000 },
  { date: '2026-11-18T09:16:00.000Z', open: 100, close: 101, high: 102, low: 99, volume: 1100 }
];
const responseFor = (url, symbol) => ({ ok: true, json: () => Promise.resolve(url.startsWith('/api/analyze') ? { stock: { symbol }, dataQuality: { confidence: 0 }, provenance: { marketData: { source: 'Fixture market source', interval: '1d', asOf: marketAsOfFixture, currency: 'INR' } } } : { symbol, price: 100, currency: 'INR', asOf: marketAsOfFixture, chart: validChartFixture, technical: { trend: 'MIXED', score: 50, why: [] }, trade: { action: 'NO TRADE', reason: 'fixture' }, longTerm: { action: 'NO TRADE', reason: 'fixture' } }) });
function resolvePair(symbol) {
  for (const url of ['/api/analyze?symbol=' + symbol, '/api/trading?symbol=' + symbol]) {
    const request = pendingRequests.get(url);
    if (!request) throw new Error('Missing deferred request: ' + url);
    request.resolve(responseFor(url, symbol));
  }
}
symbolInput.value = 'TCS';
const olderSuccess = testContext.__testAnalyse();
symbolInput.value = 'RELIANCE';
const latestSuccess = testContext.__testAnalyse();
resolvePair('RELIANCE');
await latestSuccess;
resolvePair('TCS');
await olderSuccess;
if (testContext.__testRendered.length < 1 || testContext.__testRendered.some((symbol) => symbol !== 'RELIANCE')) throw new Error('An older successful response overwrote the latest stock analysis.');
if (statusElement.textContent !== '● ANALYSIS READY') throw new Error('Latest successful analysis status was not retained.');
const expectedMarketAsOf = 'MARKET DATA AS OF ' + new Date(marketAsOfFixture).toLocaleString('en-IN');
if (testDocument.getElementById('asof').textContent !== expectedMarketAsOf) throw new Error('Market data as-of must come from provenance, not a fabricated LIVE fallback.');
if (!testDocument.getElementById('prov').innerHTML.includes('Fixture market source')) throw new Error('Market data provenance source is not displayed.');
resolveHealth({ ok: true });
await Promise.resolve();
if (statusElement.textContent !== '● ANALYSIS READY') throw new Error('A late liveness response overwrote the analysis status.');
symbolInput.value = 'INFY';
const olderFailure = testContext.__testAnalyse();
symbolInput.value = 'ITC';
const latestAfterFailure = testContext.__testAnalyse();
resolvePair('ITC');
await latestAfterFailure;
const oldAnalyze = pendingRequests.get('/api/analyze?symbol=INFY');
const oldTrading = pendingRequests.get('/api/trading?symbol=INFY');
oldAnalyze.reject(new Error('late old failure'));
oldTrading.resolve(responseFor('/api/trading?symbol=INFY', 'INFY'));
await olderFailure;
if (statusElement.textContent !== '● ANALYSIS READY' || !errorElement.classList.contains('hidden')) throw new Error('An older failed response overwrote the latest analysis state.');
const renderedBeforeClearing = testContext.__testRendered.length;
symbolInput.value = 'HDFCBANK';
const pendingWhenCleared = testContext.__testAnalyse();
symbolInput.value = '';
symbolInput.dispatch('input');
resolvePair('HDFCBANK');
await pendingWhenCleared;
if (testContext.__testRendered.length !== renderedBeforeClearing || statusElement.textContent !== '● READY' || emptyElement.textContent !== 'Enter a symbol to request stock analysis. Data is shown only when authorized source access is available.' || !appElement.classList.contains('hidden')) throw new Error('Clearing the symbol did not invalidate the pending analysis.');
symbolInput.value = 'SBIN';
const partialTradingFailure = testContext.__testAnalyse();
const partialAnalysisRequest = pendingRequests.get('/api/analyze?symbol=SBIN');
const partialTradingRequest = pendingRequests.get('/api/trading?symbol=SBIN');
if (!partialAnalysisRequest || !partialTradingRequest) throw new Error('Missing deferred requests for the partial-rendering regression.');
partialAnalysisRequest.resolve(responseFor('/api/analyze?symbol=SBIN', 'SBIN'));
await new Promise((resolve) => setImmediate(resolve));
if (testContext.__testRendered.at(-1) !== 'SBIN' || appElement.classList.contains('hidden')) throw new Error('Successful stock analysis must render while the trading request is still pending.');
if (statusElement.textContent !== '● ANALYSIS READY') throw new Error('Successful analysis did not retain its ready state while trading data was pending.');
if (errorElement.classList.contains('hidden') || !errorElement.textContent.includes('still loading') || !errorElement.textContent.includes('NO TRADE')) throw new Error('Pending trading data must be shown explicitly while all actions remain blocked.');
if ((testDocument.getElementById('actions').innerHTML.match(/NO TRADE/g) || []).length !== 3) throw new Error('Pending trading data must force every trade horizon to NO TRADE.');
if (!testDocument.getElementById('tradePlan').innerHTML.includes('No production trade plan is enabled while the decision gate is blocked.')) throw new Error('Pending trading data must not expose a production trade plan.');
partialTradingRequest.reject(new Error('Trading endpoint unavailable fixture'));
await partialTradingFailure;
if (statusElement.textContent !== '● ANALYSIS READY' || testContext.__testRendered.at(-1) !== 'SBIN') throw new Error('Trading failure must not hide successful analysis.');
if (errorElement.classList.contains('hidden') || !errorElement.textContent.includes('Trading endpoint unavailable fixture') || !errorElement.textContent.includes('All trade actions remain NO TRADE')) throw new Error('Trading failure was not shown explicitly beside the successful analysis.');
const validTradingPayload = (symbol) => ({ symbol, price: 100, currency: 'INR', asOf: marketAsOfFixture, chart: validChartFixture, technical: { trend: 'MIXED', score: 50, why: [] }, trade: { action: 'BUY', reason: 'fixture' }, longTerm: { action: 'SELL', reason: 'fixture' } });
for (const [symbol, payload] of [
  ['NULL_TRADING', null],
  ['ARRAY_TRADING', []],
  ['STRING_TRADING', 'untrusted trading response'],
  ['EMPTY_OBJECT_TRADING', {}],
  ['WRONG_SYMBOL_TRADING', validTradingPayload('OTHER')],
  ['ARRAY_TECHNICAL_TRADING', { ...validTradingPayload('ARRAY_TECHNICAL_TRADING'), technical: [] }],
  ['MISSING_CHART_TRADING', { ...validTradingPayload('MISSING_CHART_TRADING'), chart: null }],
  ['EMPTY_CHART_TRADING', { ...validTradingPayload('EMPTY_CHART_TRADING'), chart: [] }],
  ['SINGLE_ROW_CHART_TRADING', { ...validTradingPayload('SINGLE_ROW_CHART_TRADING'), chart: [validChartFixture[0]] }],
  ['NULL_CHART_ROW_TRADING', { ...validTradingPayload('NULL_CHART_ROW_TRADING'), chart: [null, validChartFixture[1]] }],
  ['MISSING_CHART_VOLUME_TRADING', { ...validTradingPayload('MISSING_CHART_VOLUME_TRADING'), chart: [{ ...validChartFixture[0], volume: null }, validChartFixture[1]] }],
  ['NEGATIVE_CHART_VOLUME_TRADING', { ...validTradingPayload('NEGATIVE_CHART_VOLUME_TRADING'), chart: [{ ...validChartFixture[0], volume: -1 }, validChartFixture[1]] }],
  ['INVERTED_CHART_RANGE_TRADING', { ...validTradingPayload('INVERTED_CHART_RANGE_TRADING'), chart: [{ ...validChartFixture[0], high: 97 }, validChartFixture[1]] }],
  ['CLOSE_OUTSIDE_CHART_RANGE_TRADING', { ...validTradingPayload('CLOSE_OUTSIDE_CHART_RANGE_TRADING'), chart: [{ ...validChartFixture[0], close: 103 }, validChartFixture[1]] }],
  ['OPEN_OUTSIDE_CHART_RANGE_TRADING', { ...validTradingPayload('OPEN_OUTSIDE_CHART_RANGE_TRADING'), chart: [{ ...validChartFixture[0], open: 97 }, validChartFixture[1]] }],
  ['NONPOSITIVE_CHART_PRICE_TRADING', { ...validTradingPayload('NONPOSITIVE_CHART_PRICE_TRADING'), chart: [{ ...validChartFixture[0], low: 0 }, validChartFixture[1]] }],
  ['MISSING_ACTION_TRADING', { ...validTradingPayload('MISSING_ACTION_TRADING'), trade: { reason: 'missing action' } }]
]) {
  symbolInput.value = symbol;
  const malformedTrading = testContext.__testAnalyse();
  const analyzeRequest = pendingRequests.get('/api/analyze?symbol=' + symbol);
  const tradingRequest = pendingRequests.get('/api/trading?symbol=' + symbol);
  if (!analyzeRequest || !tradingRequest) throw new Error('Missing deferred requests for malformed trading payload: ' + symbol);
  analyzeRequest.resolve(responseFor('/api/analyze?symbol=' + symbol, symbol));
  await new Promise((resolve) => setImmediate(resolve));
  if (testContext.__testRendered.at(-1) !== symbol || appElement.classList.contains('hidden')) throw new Error('Successful analysis must render before malformed trading data settles: ' + symbol);
  tradingRequest.resolve({ ok: true, json: () => Promise.resolve(payload) });
  await malformedTrading;
  if (statusElement.textContent !== '● ANALYSIS READY' || appElement.classList.contains('hidden')) throw new Error('Malformed trading JSON must not hide successful analysis: ' + symbol);
  if (errorElement.classList.contains('hidden') || !errorElement.textContent.includes('invalid response shape or symbol') || !errorElement.textContent.includes('All trade actions remain NO TRADE')) throw new Error('Malformed trading JSON must be surfaced as unavailable: ' + symbol);
  const malformedActions = testDocument.getElementById('actions').innerHTML;
  if ((malformedActions.match(/NO TRADE/g) || []).length !== 3 || /\b(BUY|SELL)\b/.test(malformedActions)) throw new Error('Malformed trading JSON must keep every action blocked: ' + symbol);
  if (!testDocument.getElementById('tradePlan').innerHTML.includes('No production trade plan is enabled while the decision gate is blocked.')) throw new Error('Malformed trading JSON must not expose a production trade plan: ' + symbol);
}

testContext.__testRender({ stock: { symbol: 'NO_TIMESTAMP' }, dataQuality: {}, provenance: { marketData: { source: 'Fixture market source' } } }, { technical: {}, trade: {}, longTerm: {} });
if (testDocument.getElementById('asof').textContent !== 'MARKET DATA TIME NOT PROVIDED') throw new Error('Missing market-data timestamps must remain explicitly unavailable.');
for (const [label, trading] of [
  ['contradictory gate payload', { productionDecisionBlocked: false, decisionPolicy: { productionActionsEnabled: true }, technical: {}, trade: { action: 'BUY', reason: 'fixture' }, longTerm: { action: 'SELL', reason: 'fixture' } }],
  ['missing gate payload', { technical: {}, trade: { action: 'BUY', reason: 'fixture' }, longTerm: { action: 'SELL', reason: 'fixture' } }]
]) {
  testContext.__testRender({ stock: { symbol: 'GATE_PAYLOAD' }, dataQuality: {}, provenance: { marketData: { source: 'Fixture market source' } } }, trading);
  const actionsHtml = testDocument.getElementById('actions').innerHTML;
  if ((actionsHtml.match(/NO TRADE/g) || []).length !== 3 || /\b(BUY|SELL)\b/.test(actionsHtml)) throw new Error('Terminal must fail closed for ' + label + '.');
  if (testDocument.getElementById('tradeAction').textContent !== 'NO TRADE' || testDocument.getElementById('longAction').textContent !== 'NO TRADE') throw new Error('Terminal action badges must remain NO TRADE for ' + label + '.');
  if (!testDocument.getElementById('tradePlan').innerHTML.includes('No production trade plan is enabled while the decision gate is blocked.')) throw new Error('Terminal must not expose a production trade plan for ' + label + '.');
}
const healthElements = new Map();
const healthDocument = {
  getElementById(id) { if (!healthElements.has(id)) healthElements.set(id, testElement()); return healthElements.get(id); },
  querySelectorAll() { return []; }
};
const healthContext = { document: healthDocument, fetch: () => Promise.resolve({ ok: true }), console };
vm.createContext(healthContext);
vm.runInContext(scripts.at(-1), healthContext);
await Promise.resolve();
if (healthDocument.getElementById('status').textContent !== '● APP ONLINE') throw new Error('A successful liveness check must report app availability only.');
for (const marker of ['● ENGINE OK', '● LIVE DATA OK', ":'LIVE'"]) {
  if (html.includes(marker)) throw new Error('Misleading app/data status remains: ' + marker);
}
console.log('frontend stale-request race checks: PASS');
console.log('frontend health/data-freshness status checks: PASS');

console.log('frontend provider-blocked-state checks: PASS');
console.log('frontend syntax: PASS (public/terminal.html)');

// The trading payload contract intentionally permits a missing/null open.
// A missing open must not be coerced to an up/down direction in the candle UI.
const optionalOpenChart = [
  { date: marketAsOfFixture, close: 100, high: 101, low: 98, volume: 1000 },
  { date: '2026-11-18T09:17:00.000Z', open: null, close: 101, high: 102, low: 99, volume: 1100 },
  { date: '2026-11-18T09:18:00.000Z', open: 100, close: 101, high: 102, low: 99, volume: 1200 },
  { date: '2026-11-18T09:19:00.000Z', open: 102, close: 101, high: 103, low: 100, volume: 1300 }
];
testContext.__testRender(
  { stock: { symbol: 'OPTIONAL_OPEN' }, dataQuality: {}, provenance: { marketData: { source: 'Fixture market source' } } },
  { technical: {}, trade: { action: 'NO TRADE', reason: 'fixture' }, longTerm: { action: 'NO TRADE', reason: 'fixture' }, chart: optionalOpenChart }
);
const optionalOpenCandleClasses = [...testDocument.getElementById('svg').innerHTML.matchAll(/<rect\\b[^>]*class="([^"]+)"/g)].map((match) => match[1]);
if (optionalOpenCandleClasses.join(',') !== 'neutral,neutral,up,down') {
  throw new Error('Missing/null open candles must render neutral, while known opens retain their up/down direction.');
}
console.log('frontend optional-open candle direction checks: PASS');
