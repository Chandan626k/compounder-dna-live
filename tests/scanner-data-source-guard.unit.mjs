import assert from 'node:assert/strict';
import { scanSymbols, SCANNER_DATA_ACCESS } from '../lib/scanner-engine-v2.js';
import handler from '../api/scan.js';
import { cacheSet } from '../lib/cache.js';

assert.equal(SCANNER_DATA_ACCESS.status, 'NOT_CONFIGURED');
assert.equal(SCANNER_DATA_ACCESS.reason, 'AUTHORIZED_MARKET_DATA_SOURCE_NOT_CONFIGURED');

let fetchCalls = 0;
const originalFetch = globalThis.fetch;
globalThis.fetch = async () => {
  fetchCalls += 1;
  throw new Error('Unexpected market-data request');
};

try {
  const direct = await scanSymbols(['RELIANCE']);
  assert.equal(direct.dataStatus, 'UNAVAILABLE');
  assert.equal(direct.universeRequested, 1);
  assert.equal(direct.scanned, 0);
  assert.equal(direct.readyCount, 0);
  assert.deepEqual(direct.readyList, []);
  assert.deepEqual(direct.results, []);
  assert.equal(direct.errors[0].error, 'AUTHORIZED_MARKET_DATA_SOURCE_NOT_CONFIGURED');
  assert.equal(fetchCalls, 0);

  cacheSet('tomorrow-scan-v5:deep:RELIANCE', {
    success: true,
    readyCount: 1,
    readyList: [{ symbol: 'STALE_CACHED_SIGNAL' }],
  }, 60_000);

  const response = {
    headers: {},
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
  await handler({
    method: 'GET',
    query: { symbols: 'RELIANCE', deep: 'true' },
  }, response);

  assert.equal(response.statusCode, 503);
  assert.equal(response.body.success, false);
  assert.equal(response.body.mode, 'DATA_SOURCE_BLOCKED');
  assert.equal(response.body.dataStatus, 'UNAVAILABLE');
  assert.equal(response.body.cached, false);
  assert.equal(response.body.errors[0].error, 'AUTHORIZED_MARKET_DATA_SOURCE_NOT_CONFIGURED');
  assert.deepEqual(response.body.readyList, []);
  assert.equal(fetchCalls, 0);
} finally {
  globalThis.fetch = originalFetch;
}

console.log('scanner-data-source-guard.unit: PASS');
