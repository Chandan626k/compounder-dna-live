import assert from 'node:assert/strict';
import {
  SOURCE_ACCESS_MODES,
  assessHistoricalValidity,
  createImmutableSourceSnapshot,
  isProductionAuthoritative,
  qualifySourceArtifact,
} from '../lib/source-authority-adapter.js';
import {
  DEFAULT_RETRY_POLICY,
  PROVIDER_ERROR_CODES,
  SourceProviderError,
  assertExchangeAdapter,
  createBseCalendarAdapter,
  createBseReportingAdapter,
  createNseCalendarAdapter,
  createNseReportingAdapter,
} from '../lib/exchange-source-adapters.js';

const normalizeReporting = (artifact, meta) => ({ ...artifact, exchange: meta.exchange, source: meta.source, authorityClass: meta.authorityClass });
const normalizeCalendar = (artifact, meta) => ({ ...artifact, exchange: meta.exchange, source: meta.source, authorityClass: meta.authorityClass });

const nseReporting = createNseReportingAdapter({ normalizeReporting, normalizeCalendar });
const bseReporting = createBseReportingAdapter({ normalizeReporting, normalizeCalendar });
const nseCalendar = createNseCalendarAdapter({ normalizeReporting, normalizeCalendar });
const bseCalendar = createBseCalendarAdapter({ normalizeReporting, normalizeCalendar });

for (const adapter of [nseReporting, bseReporting, nseCalendar, bseCalendar]) {
  assert.equal(assertExchangeAdapter(adapter), true);
  assert.equal(adapter.accessMode, SOURCE_ACCESS_MODES.DEVELOPMENT_FIXTURE);
  assert.equal(isProductionAuthoritative(adapter), false);
  assert.equal(adapter.normalizeReportingArtifact({ documentId: 'd1' }).exchange, adapter.exchange);
  assert.equal(adapter.normalizeCalendarArtifact({ version: 'v1' }).exchange, adapter.exchange);
  await assert.rejects(() => adapter.fetchReportingArtifacts(), (error) => error.code === 'SOURCE_UNAVAILABLE');
  await assert.rejects(() => adapter.fetchCalendarArtifacts(), (error) => error.code === 'SOURCE_UNAVAILABLE');
}

assert.equal(nseReporting.authorityClass, 'NSE_EXCHANGE_FILING');
assert.equal(bseReporting.authorityClass, 'BSE_EXCHANGE_FILING');
assert.equal(nseCalendar.authorityClass, 'NSE_EXCHANGE_CALENDAR');
assert.equal(bseCalendar.authorityClass, 'BSE_EXCHANGE_CALENDAR');
assert.notEqual(nseCalendar.authorityClass, nseReporting.authorityClass);
assert.notEqual(bseCalendar.authorityClass, bseReporting.authorityClass);

// Factory-controlled identity and access mode cannot be overridden through caller options.
assert.equal(createNseReportingAdapter({ exchange: 'BSE', source: 'BSE', authorityClass: 'BSE_EXCHANGE_CALENDAR', accessMode: SOURCE_ACCESS_MODES.AUTHORITATIVE }).exchange, 'NSE');
assert.equal(createNseReportingAdapter({ exchange: 'BSE', source: 'BSE', authorityClass: 'BSE_EXCHANGE_CALENDAR', accessMode: SOURCE_ACCESS_MODES.AUTHORITATIVE }).source, 'NSE');
assert.equal(createNseReportingAdapter({ exchange: 'BSE', source: 'BSE', authorityClass: 'BSE_EXCHANGE_CALENDAR', accessMode: SOURCE_ACCESS_MODES.AUTHORITATIVE }).authorityClass, 'NSE_EXCHANGE_FILING');
assert.equal(createNseReportingAdapter({ accessMode: SOURCE_ACCESS_MODES.AUTHORITATIVE }).accessMode, SOURCE_ACCESS_MODES.DEVELOPMENT_FIXTURE);
assert.equal(createBseReportingAdapter({ exchange: 'NSE', source: 'NSE', authorityClass: 'NSE_EXCHANGE_CALENDAR' }).exchange, 'BSE');
assert.equal(createBseReportingAdapter({ exchange: 'NSE', source: 'NSE', authorityClass: 'NSE_EXCHANGE_CALENDAR' }).source, 'BSE');
assert.equal(createBseReportingAdapter({ exchange: 'NSE', source: 'NSE', authorityClass: 'NSE_EXCHANGE_CALENDAR' }).authorityClass, 'BSE_EXCHANGE_FILING');
assert.equal(createNseCalendarAdapter({ exchange: 'BSE', source: 'BSE', authorityClass: 'BSE_EXCHANGE_FILING' }).exchange, 'NSE');
assert.equal(createNseCalendarAdapter({ exchange: 'BSE', source: 'BSE', authorityClass: 'BSE_EXCHANGE_FILING' }).source, 'NSE');
assert.equal(createNseCalendarAdapter({ exchange: 'BSE', source: 'BSE', authorityClass: 'BSE_EXCHANGE_FILING' }).authorityClass, 'NSE_EXCHANGE_CALENDAR');
assert.equal(createBseCalendarAdapter({ exchange: 'NSE', source: 'NSE', authorityClass: 'NSE_EXCHANGE_FILING' }).exchange, 'BSE');
assert.equal(createBseCalendarAdapter({ exchange: 'NSE', source: 'NSE', authorityClass: 'NSE_EXCHANGE_FILING' }).source, 'BSE');
assert.equal(createBseCalendarAdapter({ exchange: 'NSE', source: 'NSE', authorityClass: 'NSE_EXCHANGE_FILING' }).authorityClass, 'BSE_EXCHANGE_CALENDAR');

let lastRequest = null;
const transport = {
  async request(request) { lastRequest = request; return { kind: request.kind, exchange: request.exchange, raw: true }; },
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
assert.deepEqual(await nse.fetchReportingArtifacts({ symbol: 'TEST', kind: 'ATTACK', exchange: 'BSE' }), { kind: 'REPORTING', exchange: 'NSE', raw: true });
assert.equal(lastRequest.kind, 'REPORTING');
assert.equal(lastRequest.exchange, 'NSE');
assert.equal(lastRequest.config.credentialReference, 'NSE_CREDENTIAL_REF');
assert.equal(lastRequest.config.retryPolicy.maxAttempts, 2);
assert.deepEqual(await nse.fetchCalendarArtifacts({ tradingDate: '2026-09-10', kind: 'ATTACK', exchange: 'BSE' }), { kind: 'CALENDAR_SESSION', exchange: 'NSE', raw: true });
assert.equal(lastRequest.kind, 'CALENDAR_SESSION');
assert.equal(lastRequest.exchange, 'NSE');
assert.deepEqual(DEFAULT_RETRY_POLICY, { maxAttempts: 1, baseDelayMs: 0, maxDelayMs: 0 });

// Normalizer metadata is controlled by the factory, not caller metadata.
assert.equal(nse.normalizeReportingArtifact({}, { exchange: 'BSE', source: 'BSE', authorityClass: 'BSE_EXCHANGE_FILING' }).exchange, 'NSE');
assert.equal(nse.normalizeReportingArtifact({}, { exchange: 'BSE', source: 'BSE', authorityClass: 'BSE_EXCHANGE_FILING' }).source, 'NSE');
assert.equal(nse.normalizeReportingArtifact({}, { exchange: 'BSE', source: 'BSE', authorityClass: 'BSE_EXCHANGE_FILING' }).authorityClass, 'NSE_EXCHANGE_FILING');

const snapshot = nse.snapshot({ a: 1 }, { source: 'BSE', authorityClass: 'BSE_EXCHANGE_FILING', accessMode: SOURCE_ACCESS_MODES.AUTHORITATIVE, sourceDocumentId: 'doc-1', publishedAt: '2026-09-10T00:00:00Z', retrievedAt: '2026-09-10T01:00:00Z' });
assert.equal(snapshot.source, 'NSE');
assert.equal(snapshot.authorityClass, 'NSE_EXCHANGE_FILING');
assert.equal(snapshot.accessMode, SOURCE_ACCESS_MODES.DEVELOPMENT_FIXTURE);
assert.equal(isProductionAuthoritative(snapshot), false);
assert.equal(assessHistoricalValidity(snapshot, '2026-09-10T02:00:00Z').status, 'VALID');
assert.equal(qualifySourceArtifact({ snapshot, normalized: true, identityValid: true, semanticValid: true, provenanceVerified: true, freshnessEligible: true, horizonUsable: true, evaluationAsOf: '2026-09-10T02:00:00Z' }).status, 'NOT_READY');
assert.equal(qualifySourceArtifact({ snapshot, normalized: true, identityValid: true, semanticValid: true, provenanceVerified: true, freshnessEligible: true, horizonUsable: true, evaluationAsOf: null }).status, 'BLOCKED');

// Reporting/calendar constructors retain factory-controlled identity and access mode.
const event = nse.toReportingEvent({ exchange: 'BSE', source: 'BSE', authorityClass: 'BSE_EXCHANGE_FILING', accessMode: SOURCE_ACCESS_MODES.AUTHORITATIVE, issuer: 'TEST', reportingPeriod: '2026-Q2', periodType: 'QUARTER', eventType: 'ORIGINAL', publishedAt: '2026-09-10T00:00:00Z', retrievedAt: '2026-09-10T01:00:00Z', sourceDocumentId: 'doc-event' });
assert.equal(event.exchange, 'NSE');
assert.equal(event.source, 'NSE');
assert.equal(event.authorityClass, 'NSE_EXCHANGE_FILING');
assert.equal(event.accessMode, SOURCE_ACCESS_MODES.DEVELOPMENT_FIXTURE);
const session = nse.toCalendarSession({ exchange: 'BSE', accessMode: SOURCE_ACCESS_MODES.AUTHORITATIVE, timezone: 'Asia/Kolkata', tradingDate: '2026-09-10', calendarDocumentId: 'cal-1', calendarVersion: 'v1', retrievedAt: '2026-09-10T01:00:00Z' });
assert.equal(session.exchange, 'NSE');
assert.equal(session.accessMode, SOURCE_ACCESS_MODES.DEVELOPMENT_FIXTURE);

const historicalUnknown = createImmutableSourceSnapshot({ source: 'NSE', sourceDocumentId: 'doc-no-time', retrievedAt: '2026-09-10T01:00:00Z', payload: { ok: true }, accessMode: SOURCE_ACCESS_MODES.AUTHORITATIVE, authorityClass: 'NSE_EXCHANGE_FILING', entitlementVerified: true, historicalReproducibilityVerified: true });
assert.equal(assessHistoricalValidity(historicalUnknown, '2026-09-10T02:00:00Z').status, 'UNKNOWN');
assert.equal(qualifySourceArtifact({ snapshot: historicalUnknown, normalized: true, identityValid: true, semanticValid: true, provenanceVerified: true, freshnessEligible: true, horizonUsable: true, evaluationAsOf: '2026-09-10T02:00:00Z' }).status, 'BLOCKED');

const authorityBase = { source: 'NSE', sourceDocumentId: 'authority-doc', publishedAt: '2026-09-10T00:00:00Z', retrievedAt: '2026-09-10T01:00:00Z', payload: { ok: true }, accessMode: SOURCE_ACCESS_MODES.AUTHORITATIVE, authorityClass: 'NSE_EXCHANGE_FILING', entitlementVerified: true, historicalReproducibilityVerified: true };
assert.equal(isProductionAuthoritative(createImmutableSourceSnapshot(authorityBase)), true);
assert.equal(isProductionAuthoritative(createImmutableSourceSnapshot({ ...authorityBase, entitlementVerified: false })), false);
assert.equal(isProductionAuthoritative(createImmutableSourceSnapshot({ ...authorityBase, historicalReproducibilityVerified: false })), false);
assert.equal(isProductionAuthoritative(createImmutableSourceSnapshot({ ...authorityBase, authorityClass: null })), false);
assert.equal(isProductionAuthoritative(createImmutableSourceSnapshot({ ...authorityBase, accessMode: SOURCE_ACCESS_MODES.DEVELOPMENT_FIXTURE })), false);
assert.equal(qualifySourceArtifact({ snapshot: createImmutableSourceSnapshot(authorityBase), normalized: true, identityValid: true, semanticValid: true, provenanceVerified: false, freshnessEligible: true, horizonUsable: true, evaluationAsOf: '2026-09-10T02:00:00Z' }).status, 'NOT_READY');

const makeProviderErrorAdapter = (exchange, code, message) => {
  const transport = { async request() { const error = new Error(message); error.code = code; throw error; } };
  return exchange === 'NSE'
    ? createNseReportingAdapter({ transport })
    : createBseReportingAdapter({ transport });
};

for (const exchange of ['NSE', 'BSE']) {
  const cases = [
    ['401', 'bad token', 'AUTHENTICATION_FAILURE'],
    ['403', 'not entitled', 'ENTITLEMENT_FAILURE'],
    ['ETIMEDOUT', 'timed out', 'TIMEOUT'],
    ['429', 'rate limited', 'RATE_LIMIT'],
    ['503', 'source unavailable', 'SOURCE_UNAVAILABLE'],
    ['ECONNRESET', 'connection reset', 'TRANSPORT_FAILURE'],
  ];
  for (const [code, message, expected] of cases) {
    const adapter = makeProviderErrorAdapter(exchange, code, message);
    await assert.rejects(() => adapter.fetchReportingArtifacts(), (error) => error.code === expected);
  }
}

// Retry only transient failures; authentication/entitlement failures are never retried.
let attempts = 0;
const retrying = createNseReportingAdapter({
  transport: { async request() { attempts += 1; if (attempts < 3) { const error = new Error('temporary'); error.code = '503'; throw error; } return { ok: true }; } },
  config: { retryPolicy: { maxAttempts: 3, baseDelayMs: 0, maxDelayMs: 0 } },
});
assert.deepEqual(await retrying.fetchReportingArtifacts(), { ok: true });
assert.equal(attempts, 3);

attempts = 0;
const noRetryAuth = createNseReportingAdapter({
  transport: { async request() { attempts += 1; const error = new Error('bad token'); error.code = '401'; throw error; } },
  config: { retryPolicy: { maxAttempts: 3, baseDelayMs: 0, maxDelayMs: 0 } },
});
await assert.rejects(() => noRetryAuth.fetchReportingArtifacts(), (error) => error.code === 'AUTHENTICATION_FAILURE');
assert.equal(attempts, 1);

let slowAttempts = 0;
const timeoutAdapter = createNseReportingAdapter({
  transport: { async request() { slowAttempts += 1; return new Promise(() => {}); } },
  config: { requestTimeoutMs: 5 },
});
await assert.rejects(() => timeoutAdapter.fetchReportingArtifacts(), (error) => error.code === 'TIMEOUT');
assert.equal(slowAttempts, 1);

const emptyResponse = createNseReportingAdapter({ transport: { async request() { return null; } } });
await assert.rejects(() => emptyResponse.fetchReportingArtifacts(), (error) => error.code === 'MALFORMED_SOURCE');

const explicit = createNseReportingAdapter({ transport: { async request() { throw new SourceProviderError('ENTITLEMENT_FAILURE', 'license missing'); } } });
await assert.rejects(() => explicit.fetchReportingArtifacts(), (error) => error.code === 'ENTITLEMENT_FAILURE' && error.message === 'license missing');

const malformed = createNseReportingAdapter();
assert.throws(() => malformed.normalizeReportingArtifact({}), (error) => error.code === 'MALFORMED_SOURCE');
assert.throws(() => new SourceProviderError('NOT_A_REAL_CODE', 'invalid'), /SOURCE_PROVIDER_ERROR_CODE_INVALID/);
assert.throws(() => createNseReportingAdapter({ config: { retryPolicy: { maxAttempts: 0 } } }), /SOURCE_RETRY_POLICY_INVALID_MAX_ATTEMPTS/);
assert.throws(() => createNseReportingAdapter({ config: { requestTimeoutMs: 0 } }), /SOURCE_REQUEST_TIMEOUT_INVALID/);
for (const code of [
  'AUTHENTICATION_FAILURE', 'ENTITLEMENT_FAILURE', 'TRANSPORT_FAILURE', 'TIMEOUT', 'RATE_LIMIT', 'SOURCE_UNAVAILABLE',
  'MALFORMED_SOURCE', 'IDENTITY_FAILURE', 'SEMANTIC_FAILURE', 'PROVENANCE_FAILURE', 'HISTORICAL_INVALID', 'VALIDATION_FAILURE',
]) assert.ok(PROVIDER_ERROR_CODES.includes(code));

console.log('exchange-source-adapters.unit: PASS');
