import assert from 'node:assert/strict';
import {
  SOURCE_ACCESS_MODES,
  isProductionAuthoritative,
} from '../lib/source-authority-adapter.js';
import {
  PROVIDER_ERROR_CODES,
  SourceProviderError,
  assertExchangeAdapter,
  createBseCalendarAdapter,
  createBseReportingAdapter,
  createNseCalendarAdapter,
  createNseReportingAdapter,
} from '../lib/exchange-source-adapters.js';

const normalizeReporting = (artifact, meta) => ({ ...artifact, exchange: meta.exchange, source: meta.source });
const normalizeCalendar = (artifact, meta) => ({ ...artifact, exchange: meta.exchange, source: meta.source });

for (const adapter of [
  createNseReportingAdapter({ normalizeReporting, normalizeCalendar }),
  createBseReportingAdapter({ normalizeReporting, normalizeCalendar }),
  createNseCalendarAdapter({ normalizeReporting, normalizeCalendar }),
  createBseCalendarAdapter({ normalizeReporting, normalizeCalendar }),
]) {
  assert.equal(assertExchangeAdapter(adapter), true);
  assert.equal(adapter.accessMode, SOURCE_ACCESS_MODES.DEVELOPMENT_FIXTURE);
  assert.equal(isProductionAuthoritative(adapter), false);
  assert.deepEqual(adapter.normalizeReportingArtifact({ documentId: 'd1' }).exchange, adapter.exchange);
  assert.deepEqual(adapter.normalizeCalendarArtifact({ version: 'v1' }).exchange, adapter.exchange);
  await assert.rejects(() => adapter.fetchReportingArtifacts(), (error) => error.code === 'SOURCE_UNAVAILABLE');
  await assert.rejects(() => adapter.fetchCalendarArtifacts(), (error) => error.code === 'SOURCE_UNAVAILABLE');
}

const transport = {
  async request(request) { return { kind: request.kind, exchange: request.exchange, raw: true }; },
};
const nse = createNseReportingAdapter({ transport, normalizeReporting, normalizeCalendar, config: {
  endpoint: null,
  authenticationMode: 'INJECTED_TRANSPORT',
  credentialReference: 'NSE_CREDENTIAL_REF',
  requestTimeoutMs: 5000,
  retryPolicy: { maxAttempts: 2 },
  retentionPolicy: 'EXTERNAL',
  historicalAccess: true,
  environment: 'test',
} });
assert.deepEqual(await nse.fetchReportingArtifacts({ symbol: 'TEST' }), { kind: 'REPORTING', exchange: 'NSE', symbol: 'TEST', config: nse.config, raw: true });
assert.deepEqual(await nse.fetchCalendarArtifacts({ tradingDate: '2026-09-10' }), { kind: 'CALENDAR_SESSION', exchange: 'NSE', tradingDate: '2026-09-10', config: nse.config, raw: true });

const snapshot = nse.snapshot({ a: 1 }, { sourceDocumentId: 'doc-1', publishedAt: '2026-09-10T00:00:00Z', retrievedAt: '2026-09-10T01:00:00Z' });
assert.equal(snapshot.accessMode, SOURCE_ACCESS_MODES.DEVELOPMENT_FIXTURE);
assert.equal(isProductionAuthoritative(snapshot), false);

const authError = createNseReportingAdapter({ transport: { async request() { const error = new Error('bad token'); error.code = '401'; throw error; } } });
await assert.rejects(() => authError.fetchReportingArtifacts(), (error) => error.code === 'AUTHENTICATION_FAILURE');
const entitlementError = createNseReportingAdapter({ transport: { async request() { const error = new Error('not entitled'); error.code = '403'; throw error; } } });
await assert.rejects(() => entitlementError.fetchReportingArtifacts(), (error) => error.code === 'ENTITLEMENT_FAILURE');
const timeoutError = createNseReportingAdapter({ transport: { async request() { const error = new Error('timed out'); error.code = 'ETIMEDOUT'; throw error; } } });
await assert.rejects(() => timeoutError.fetchReportingArtifacts(), (error) => error.code === 'TIMEOUT');
const rateError = createNseReportingAdapter({ transport: { async request() { const error = new Error('rate limited'); error.code = '429'; throw error; } } });
await assert.rejects(() => rateError.fetchReportingArtifacts(), (error) => error.code === 'RATE_LIMIT');
const malformed = createNseReportingAdapter();
assert.throws(() => malformed.normalizeReportingArtifact({}), (error) => error.code === 'MALFORMED_SOURCE');
assert.throws(() => new SourceProviderError('NOT_A_REAL_CODE', 'invalid'), /SOURCE_PROVIDER_ERROR_CODE_INVALID/);
assert.ok(PROVIDER_ERROR_CODES.includes('AUTHENTICATION_FAILURE'));

console.log('exchange-source-adapters.unit: PASS');
