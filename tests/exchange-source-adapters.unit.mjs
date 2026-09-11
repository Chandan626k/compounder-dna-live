import assert from 'node:assert/strict';
import {
  SOURCE_ACCESS_MODES,
  assessHistoricalValidity,
  createImmutableSourceSnapshot,
  isProductionAuthoritative,
  qualifySourceArtifact,
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

// Provider identity is fixed by the factory and cannot be overridden through options.
assert.equal(createNseReportingAdapter({ exchange: 'BSE', source: 'BSE', authorityClass: 'BSE_EXCHANGE_CALENDAR' }).exchange, 'NSE');
assert.equal(createNseReportingAdapter({ exchange: 'BSE', source: 'BSE', authorityClass: 'BSE_EXCHANGE_CALENDAR' }).source, 'NSE');
assert.equal(createNseReportingAdapter({ exchange: 'BSE', source: 'BSE', authorityClass: 'BSE_EXCHANGE_CALENDAR' }).authorityClass, 'NSE_EXCHANGE_FILING');
assert.equal(createBseReportingAdapter({ exchange: 'NSE', source: 'NSE', authorityClass: 'NSE_EXCHANGE_CALENDAR' }).exchange, 'BSE');
assert.equal(createBseReportingAdapter({ exchange: 'NSE', source: 'NSE', authorityClass: 'NSE_EXCHANGE_CALENDAR' }).source, 'BSE');
assert.equal(createBseReportingAdapter({ exchange: 'NSE', source: 'NSE', authorityClass: 'NSE_EXCHANGE_CALENDAR' }).authorityClass, 'BSE_EXCHANGE_FILING');
assert.equal(createNseCalendarAdapter({ exchange: 'BSE', source: 'BSE', authorityClass: 'BSE_EXCHANGE_FILING' }).exchange, 'NSE');
assert.equal(createNseCalendarAdapter({ exchange: 'BSE', source: 'BSE', authorityClass: 'BSE_EXCHANGE_FILING' }).source, 'NSE');
assert.equal(createNseCalendarAdapter({ exchange: 'BSE', source: 'BSE', authorityClass: 'BSE_EXCHANGE_FILING' }).authorityClass, 'NSE_EXCHANGE_CALENDAR');
assert.equal(createBseCalendarAdapter({ exchange: 'NSE', source: 'NSE', authorityClass: 'NSE_EXCHANGE_FILING' }).exchange, 'BSE');
assert.equal(createBseCalendarAdapter({ exchange: 'NSE', source: 'NSE', authorityClass: 'NSE_EXCHANGE_FILING' }).source, 'BSE');
assert.equal(createBseCalendarAdapter({ exchange: 'NSE', source: 'NSE', authorityClass: 'NSE_EXCHANGE_FILING' }).authorityClass, 'BSE_EXCHANGE_CALENDAR');

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
assert.deepEqual(await nse.fetchReportingArtifacts({ symbol: 'TEST' }), { kind: 'REPORTING', exchange: 'NSE', raw: true });
assert.deepEqual(await nse.fetchCalendarArtifacts({ tradingDate: '2026-09-10' }), { kind: 'CALENDAR_SESSION', exchange: 'NSE', raw: true });

const snapshot = nse.snapshot({ a: 1 }, { sourceDocumentId: 'doc-1', publishedAt: '2026-09-10T00:00:00Z', retrievedAt: '2026-09-10T01:00:00Z' });
assert.equal(snapshot.accessMode, SOURCE_ACCESS_MODES.DEVELOPMENT_FIXTURE);
assert.equal(isProductionAuthoritative(snapshot), false);
assert.equal(assessHistoricalValidity(snapshot, '2026-09-10T02:00:00Z').status, 'VALID');
assert.equal(qualifySourceArtifact({ snapshot, normalized: true, identityValid: true, semanticValid: true, provenanceVerified: true, freshnessEligible: true, horizonUsable: true, evaluationAsOf: '2026-09-10T02:00:00Z' }).status, 'NOT_READY');
assert.equal(qualifySourceArtifact({ snapshot, normalized: true, identityValid: true, semanticValid: true, provenanceVerified: true, freshnessEligible: true, horizonUsable: true, evaluationAsOf: null }).status, 'BLOCKED');

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

const explicit = createNseReportingAdapter({ transport: { async request() { throw new SourceProviderError('ENTITLEMENT_FAILURE', 'license missing'); } } });
await assert.rejects(() => explicit.fetchReportingArtifacts(), (error) => error.code === 'ENTITLEMENT_FAILURE' && error.message === 'license missing');

const malformed = createNseReportingAdapter();
assert.throws(() => malformed.normalizeReportingArtifact({}), (error) => error.code === 'MALFORMED_SOURCE');
assert.throws(() => new SourceProviderError('NOT_A_REAL_CODE', 'invalid'), /SOURCE_PROVIDER_ERROR_CODE_INVALID/);
for (const code of [
  'AUTHENTICATION_FAILURE', 'ENTITLEMENT_FAILURE', 'TRANSPORT_FAILURE', 'TIMEOUT', 'RATE_LIMIT', 'SOURCE_UNAVAILABLE',
  'MALFORMED_SOURCE', 'IDENTITY_FAILURE', 'SEMANTIC_FAILURE', 'PROVENANCE_FAILURE', 'HISTORICAL_INVALID', 'VALIDATION_FAILURE',
]) assert.ok(PROVIDER_ERROR_CODES.includes(code));

console.log('exchange-source-adapters.unit: PASS');
