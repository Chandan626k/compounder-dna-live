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

export const DEFAULT_RETRY_POLICY = Object.freeze({
  maxAttempts: 1,
  baseDelayMs: 0,
  maxDelayMs: 0,
});

const RETRYABLE_PROVIDER_ERRORS = new Set([
  'TRANSPORT_FAILURE',
  'TIMEOUT',
  'RATE_LIMIT',
  'SOURCE_UNAVAILABLE',
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
  const code = String(error?.code || error?.status || '').toUpperCase();
  const mapped = code.includes('AUTH') || code === '401' ? 'AUTHENTICATION_FAILURE'
    : code.includes('ENTITLE') || code === '403' ? 'ENTITLEMENT_FAILURE'
    : code.includes('TIMEOUT') || code === 'ETIMEDOUT' ? 'TIMEOUT'
    : code.includes('RATE') || code === '429' ? 'RATE_LIMIT'
    : code.includes('UNAVAILABLE') || code === '503' ? 'SOURCE_UNAVAILABLE'
    : 'TRANSPORT_FAILURE';
  return new SourceProviderError(mapped, error?.message || 'Provider request failed', { cause: error });
}

function normalizeRetryPolicy(policy = {}) {
  const value = policy ?? {};
  const maxAttempts = value.maxAttempts == null ? DEFAULT_RETRY_POLICY.maxAttempts : Number(value.maxAttempts);
  const baseDelayMs = value.baseDelayMs == null ? DEFAULT_RETRY_POLICY.baseDelayMs : Number(value.baseDelayMs);
  const maxDelayMs = value.maxDelayMs == null ? Math.max(baseDelayMs, DEFAULT_RETRY_POLICY.maxDelayMs) : Number(value.maxDelayMs);
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 10) throw new Error('SOURCE_RETRY_POLICY_INVALID_MAX_ATTEMPTS');
  if (!Number.isFinite(baseDelayMs) || baseDelayMs < 0) throw new Error('SOURCE_RETRY_POLICY_INVALID_BASE_DELAY');
  if (!Number.isFinite(maxDelayMs) || maxDelayMs < baseDelayMs) throw new Error('SOURCE_RETRY_POLICY_INVALID_MAX_DELAY');
  return Object.freeze({ maxAttempts, baseDelayMs, maxDelayMs });
}

function normalizeConfig(config = {}) {
  const safeConfig = Object.freeze({
    endpoint: config.endpoint ?? null,
    authenticationMode: config.authenticationMode ?? null,
    credentialReference: config.credentialReference ?? null,
    requestTimeoutMs: config.requestTimeoutMs ?? null,
    retryPolicy: normalizeRetryPolicy(config.retryPolicy),
    retentionPolicy: config.retentionPolicy ?? null,
    historicalAccess: config.historicalAccess ?? false,
    environment: config.environment ?? 'disabled',
  });
  if (safeConfig.requestTimeoutMs != null && (!Number.isFinite(Number(safeConfig.requestTimeoutMs)) || Number(safeConfig.requestTimeoutMs) <= 0)) {
    throw new Error('SOURCE_REQUEST_TIMEOUT_INVALID');
  }
  return safeConfig;
}

function requireTransport(transport) {
  if (!transport || typeof transport.request !== 'function') {
    throw new SourceProviderError('SOURCE_UNAVAILABLE', 'Real provider transport is not configured. Inject an authenticated transport at integration time.');
  }
}

const sleep = (ms) => ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();

async function requestWithPolicy(transport, request, config) {
  const maxAttempts = config.retryPolicy.maxAttempts;
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const timeoutMs = config.requestTimeoutMs == null ? null : Number(config.requestTimeoutMs);
      const requestPromise = Promise.resolve(transport.request(request));
      const result = timeoutMs == null
        ? await requestPromise
        : await Promise.race([
          requestPromise,
          new Promise((_, reject) => setTimeout(() => reject(Object.assign(new Error('Provider request timed out'), { code: 'ETIMEDOUT' })), timeoutMs)),
        ]);
      if (result == null) throw new SourceProviderError('MALFORMED_SOURCE', 'Provider transport returned an empty response.');
      return result;
    } catch (error) {
      lastError = normalizeProviderError(error);
      if (!RETRYABLE_PROVIDER_ERRORS.has(lastError.code) || attempt >= maxAttempts) throw lastError;
      const delay = Math.min(config.retryPolicy.baseDelayMs * (2 ** (attempt - 1)), config.retryPolicy.maxDelayMs);
      await sleep(delay);
    }
  }
  throw lastError;
}

function createAdapter({ exchange, source, authorityClass, transport = null, normalizeReporting, normalizeCalendar, config = {} }) {
  const safeConfig = normalizeConfig(config);
  const accessMode = SOURCE_ACCESS_MODES.DEVELOPMENT_FIXTURE;

  return Object.freeze({
    exchange, source, authorityClass, accessMode, config: safeConfig,
    async fetchReportingArtifacts(request = {}) {
      requireTransport(transport);
      return requestWithPolicy(transport, { ...request, kind: 'REPORTING', exchange, config: safeConfig }, safeConfig);
    },
    async fetchCalendarArtifacts(request = {}) {
      requireTransport(transport);
      return requestWithPolicy(transport, { ...request, kind: 'CALENDAR_SESSION', exchange, config: safeConfig }, safeConfig);
    },
    normalizeReportingArtifact(artifact, metadata = {}) {
      if (typeof normalizeReporting !== 'function') throw new SourceProviderError('MALFORMED_SOURCE', `${exchange} reporting normalizer is not configured.`);
      try { return normalizeReporting(artifact, { ...metadata, exchange, source, authorityClass }); }
      catch (error) {
        if (error instanceof SourceProviderError) throw error;
        throw new SourceProviderError('MALFORMED_SOURCE', `${exchange} reporting artifact could not be normalized.`, { cause: error });
      }
    },
    normalizeCalendarArtifact(artifact, metadata = {}) {
      if (typeof normalizeCalendar !== 'function') throw new SourceProviderError('MALFORMED_SOURCE', `${exchange} calendar normalizer is not configured.`);
      try { return normalizeCalendar(artifact, { ...metadata, exchange, source, authorityClass }); }
      catch (error) {
        if (error instanceof SourceProviderError) throw error;
        throw new SourceProviderError('MALFORMED_SOURCE', `${exchange} calendar artifact could not be normalized.`, { cause: error });
      }
    },
    snapshot(payload, metadata = {}) {
      return createImmutableSourceSnapshot({ ...metadata, source, authorityClass, accessMode, payload });
    },
    toReportingEvent(input = {}) {
      return createReportingEvent({ ...input, source, authorityClass, exchange, accessMode });
    },
    toCalendarSession(input = {}) {
      return createExchangeSession({ ...input, exchange, accessMode });
    },
  });
}

export function createNseReportingAdapter(options = {}) {
  return createAdapter({ ...options, exchange: 'NSE', source: 'NSE', authorityClass: 'NSE_EXCHANGE_FILING' });
}

export function createBseReportingAdapter(options = {}) {
  return createAdapter({ ...options, exchange: 'BSE', source: 'BSE', authorityClass: 'BSE_EXCHANGE_FILING' });
}

export function createNseCalendarAdapter(options = {}) {
  return createAdapter({ ...options, exchange: 'NSE', source: 'NSE', authorityClass: 'NSE_EXCHANGE_CALENDAR' });
}

export function createBseCalendarAdapter(options = {}) {
  return createAdapter({ ...options, exchange: 'BSE', source: 'BSE', authorityClass: 'BSE_EXCHANGE_CALENDAR' });
}

export function assertExchangeAdapter(adapter) {
  assertReportingEventProvider(adapter);
  assertCalendarSessionProvider(adapter);
  return true;
}
