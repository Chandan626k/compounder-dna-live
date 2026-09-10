import {
  SOURCE_ACCESS_MODES,
  createImmutableSourceSnapshot,
  createReportingEvent,
  createExchangeSession,
} from './source-authority-adapter.js';
import {
  assertReportingEventProvider,
  assertCalendarSessionProvider,
} from './source-provider-contract.js';

export const PROVIDER_ERROR_CODES = Object.freeze([
  'AUTHENTICATION_FAILURE',
  'ENTITLEMENT_FAILURE',
  'TRANSPORT_FAILURE',
  'TIMEOUT',
  'RATE_LIMIT',
  'SOURCE_UNAVAILABLE',
  'MALFORMED_SOURCE',
  'IDENTITY_FAILURE',
  'SEMANTIC_FAILURE',
  'PROVENANCE_FAILURE',
  'HISTORICAL_INVALID',
  'VALIDATION_FAILURE',
]);

export const EXCHANGE_SOURCE_CONFIG_KEYS = Object.freeze([
  'endpoint', 'authenticationMode', 'credentialReference', 'requestTimeoutMs',
  'retryPolicy', 'retentionPolicy', 'historicalAccess', 'environment',
]);

export class SourceProviderError extends Error {
  constructor(code, message, options = {}) {
    if (!PROVIDER_ERROR_CODES.includes(code)) throw new Error(`SOURCE_PROVIDER_ERROR_CODE_INVALID:${code}`);
    super(message);
    this.name = 'SourceProviderError';
    this.code = code;
    this.cause = options.cause;
  }
}

function normalizeProviderError(error) {
  if (error instanceof SourceProviderError) return error;
  const code = String(error?.code || '').toUpperCase();
  const mapped = code.includes('AUTH') || code === '401' ? 'AUTHENTICATION_FAILURE'
    : code.includes('ENTITLE') || code === '403' ? 'ENTITLEMENT_FAILURE'
    : code.includes('TIMEOUT') || code === 'ETIMEDOUT' ? 'TIMEOUT'
    : code.includes('RATE') || code === '429' ? 'RATE_LIMIT'
    : code.includes('UNAVAILABLE') || code === '503' ? 'SOURCE_UNAVAILABLE'
    : 'TRANSPORT_FAILURE';
  return new SourceProviderError(mapped, error?.message || 'Provider request failed', { cause: error });
}

function requireTransport(transport) {
  if (!transport || typeof transport.request !== 'function') {
    throw new SourceProviderError('SOURCE_UNAVAILABLE', 'Real provider transport is not configured. Inject an authenticated transport at integration time.');
  }
}

function createAdapter({ exchange, source, authorityClass, transport = null, normalizeReporting, normalizeCalendar, config = {}, accessMode = SOURCE_ACCESS_MODES.DEVELOPMENT_FIXTURE }) {
  const safeConfig = Object.freeze({
    endpoint: config.endpoint ?? null,
    authenticationMode: config.authenticationMode ?? null,
    credentialReference: config.credentialReference ?? null,
    requestTimeoutMs: config.requestTimeoutMs ?? null,
    retryPolicy: config.retryPolicy ?? null,
    retentionPolicy: config.retentionPolicy ?? null,
    historicalAccess: config.historicalAccess ?? false,
    environment: config.environment ?? 'disabled',
  });

  return Object.freeze({
    exchange, source, authorityClass, accessMode, config: safeConfig,
    async fetchReportingArtifacts(request = {}) {
      requireTransport(transport);
      try { return await transport.request({ kind: 'REPORTING', exchange, ...request, config: safeConfig }); }
      catch (error) { throw normalizeProviderError(error); }
    },
    async fetchCalendarArtifacts(request = {}) {
      requireTransport(transport);
      try { return await transport.request({ kind: 'CALENDAR_SESSION', exchange, ...request, config: safeConfig }); }
      catch (error) { throw normalizeProviderError(error); }
    },
    normalizeReportingArtifact(artifact, metadata = {}) {
      if (typeof normalizeReporting !== 'function') throw new SourceProviderError('MALFORMED_SOURCE', `${exchange} reporting normalizer is not configured.`);
      try { return normalizeReporting(artifact, { exchange, source, authorityClass, ...metadata }); }
      catch (error) {
        if (error instanceof SourceProviderError) throw error;
        throw new SourceProviderError('MALFORMED_SOURCE', `${exchange} reporting artifact could not be normalized.`, { cause: error });
      }
    },
    normalizeCalendarArtifact(artifact, metadata = {}) {
      if (typeof normalizeCalendar !== 'function') throw new SourceProviderError('MALFORMED_SOURCE', `${exchange} calendar normalizer is not configured.`);
      try { return normalizeCalendar(artifact, { exchange, source, authorityClass, ...metadata }); }
      catch (error) {
        if (error instanceof SourceProviderError) throw error;
        throw new SourceProviderError('MALFORMED_SOURCE', `${exchange} calendar artifact could not be normalized.`, { cause: error });
      }
    },
    snapshot(payload, metadata = {}) {
      return createImmutableSourceSnapshot({ source, authorityClass, accessMode, payload, ...metadata });
    },
    toReportingEvent(input = {}) {
      return createReportingEvent({ source, authorityClass, exchange, accessMode, ...input });
    },
    toCalendarSession(input = {}) {
      return createExchangeSession({ exchange, accessMode, ...input });
    },
  });
}

export function createNseReportingAdapter(options = {}) {
  return createAdapter({ exchange: 'NSE', source: 'NSE', authorityClass: 'NSE_EXCHANGE_FILING', ...options });
}

export function createBseReportingAdapter(options = {}) {
  return createAdapter({ exchange: 'BSE', source: 'BSE', authorityClass: 'BSE_EXCHANGE_FILING', ...options });
}

export function createNseCalendarAdapter(options = {}) { return createNseReportingAdapter(options); }
export function createBseCalendarAdapter(options = {}) { return createBseReportingAdapter(options); }

export function assertExchangeAdapter(adapter) {
  assertReportingEventProvider(adapter);
  assertCalendarSessionProvider(adapter);
  return true;
}
