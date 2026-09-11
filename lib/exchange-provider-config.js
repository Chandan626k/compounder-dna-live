const EXCHANGES = Object.freeze({ NSE: 'NSE', BSE: 'BSE' });

function requireExchange(exchange) {
  const value = String(exchange || '').toUpperCase();
  if (!EXCHANGES[value]) throw new Error(`EXCHANGE_PROVIDER_CONFIG_EXCHANGE_INVALID:${exchange}`);
  return value;
}

function readString(env, key, fallback = null) {
  const value = env?.[key];
  return value == null || String(value).trim() === '' ? fallback : String(value).trim();
}

function readPositiveInteger(env, key, fallback) {
  const value = readString(env, key, null);
  if (value == null) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`EXCHANGE_PROVIDER_CONFIG_INTEGER_INVALID:${key}`);
  return parsed;
}

function readNonNegativeInteger(env, key, fallback) {
  const value = readString(env, key, null);
  if (value == null) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) throw new Error(`EXCHANGE_PROVIDER_CONFIG_INTEGER_INVALID:${key}`);
  return parsed;
}

function readBoolean(env, key, fallback) {
  const value = readString(env, key, null);
  if (value == null) return fallback;
  if (value.toLowerCase() === 'true') return true;
  if (value.toLowerCase() === 'false') return false;
  throw new Error(`EXCHANGE_PROVIDER_CONFIG_BOOLEAN_INVALID:${key}`);
}

export function createExchangeProviderConfig(exchange, env = process.env) {
  const normalizedExchange = requireExchange(exchange);
  const prefix = normalizedExchange;
  return Object.freeze({
    endpoint: readString(env, `${prefix}_ENDPOINT`),
    authenticationMode: readString(env, `${prefix}_AUTHENTICATION_MODE`),
    credentialReference: readString(env, `${prefix}_CREDENTIAL_REFERENCE`),
    requestTimeoutMs: readPositiveInteger(env, `${prefix}_REQUEST_TIMEOUT_MS`, 5000),
    retryPolicy: Object.freeze({
      maxAttempts: readPositiveInteger(env, `${prefix}_RETRY_MAX_ATTEMPTS`, 1),
      baseDelayMs: readNonNegativeInteger(env, `${prefix}_RETRY_BASE_DELAY_MS`, 0),
      maxDelayMs: readNonNegativeInteger(env, `${prefix}_RETRY_MAX_DELAY_MS`, 0),
    }),
    retentionPolicy: readString(env, `${prefix}_RETENTION_POLICY`, 'EXTERNAL'),
    historicalAccess: readBoolean(env, `${prefix}_HISTORICAL_ACCESS`, false),
    environment: readString(env, `${prefix}_ENVIRONMENT`, 'disabled'),
  });
}
