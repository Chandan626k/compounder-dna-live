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
const raceHarness = scripts.at(-1) + '\nglobalThis.__testRendered=[]; globalThis.render=(analysis)=>globalThis.__testRendered.push(analysis.stock.symbol); globalThis.__testAnalyse=analyse;';
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
const responseFor = (url, symbol) => ({ ok: true, json: () => Promise.resolve(url.startsWith('/api/analyze') ? { stock: { symbol } } : { technical: {}, trade: {}, longTerm: {} }) });
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
if (testContext.__testRendered.length !== 1 || testContext.__testRendered[0] !== 'RELIANCE') throw new Error('An older successful response overwrote the latest stock analysis.');
if (statusElement.textContent !== '● LIVE DATA OK') throw new Error('Latest successful analysis status was not retained.');
resolveHealth({ ok: true });
await Promise.resolve();
if (statusElement.textContent !== '● LIVE DATA OK') throw new Error('Late health response overwrote the analysis status.');
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
if (statusElement.textContent !== '● LIVE DATA OK' || !errorElement.classList.contains('hidden')) throw new Error('An older failed response overwrote the latest analysis state.');
symbolInput.value = 'HDFCBANK';
const pendingWhenCleared = testContext.__testAnalyse();
symbolInput.value = '';
symbolInput.dispatch('input');
resolvePair('HDFCBANK');
await pendingWhenCleared;
if (testContext.__testRendered.length !== 2 || statusElement.textContent !== '● READY' || emptyElement.textContent !== 'Enter a symbol to load verified market, fundamental and trading data.' || !appElement.classList.contains('hidden')) throw new Error('Clearing the symbol did not invalidate the pending analysis.');
console.log('frontend stale-request race checks: PASS');

console.log('frontend provider-blocked-state checks: PASS');
console.log('frontend syntax: PASS (public/terminal.html)');
