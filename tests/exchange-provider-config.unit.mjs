import assert from 'node:assert/strict';
import { createExchangeProviderConfig } from '../lib/exchange-provider-config.js';

const nse = createExchangeProviderConfig('NSE', {
  NSE_ENDPOINT: 'https://provider.example/nse',
  NSE_AUTHENTICATION_MODE: 'API_KEY',
  NSE_CREDENTIAL_REFERENCE: 'NSE_PROD_CREDENTIAL',
  NSE_REQUEST_TIMEOUT_MS: '7000',
  NSE_RETRY_MAX_ATTEMPTS: '3',
  NSE_RETRY_BASE_DELAY_MS: '100',
  NSE_RETRY_MAX_DELAY_MS: '500',
  NSE_RETENTION_POLICY: 'EXTERNAL',
  NSE_HISTORICAL_ACCESS: 'true',
  NSE_ENVIRONMENT: 'production',
});
assert.deepEqual(nse, {
  endpoint: 'https://provider.example/nse',
  authenticationMode: 'API_KEY',
  credentialReference: 'NSE_PROD_CREDENTIAL',
  requestTimeoutMs: 7000,
  retryPolicy: { maxAttempts: 3, baseDelayMs: 100, maxDelayMs: 500 },
  retentionPolicy: 'EXTERNAL',
  historicalAccess: true,
  environment: 'production',
});

const bse = createExchangeProviderConfig('BSE', {});
assert.equal(bse.endpoint, null);
assert.equal(bse.credentialReference, null);
assert.equal(bse.environment, 'disabled');
assert.equal(bse.historicalAccess, false);

assert.throws(() => createExchangeProviderConfig('NSE', { NSE_REQUEST_TIMEOUT_MS: '0' }), /EXCHANGE_PROVIDER_CONFIG_INTEGER_INVALID/);
assert.throws(() => createExchangeProviderConfig('BSE', { BSE_HISTORICAL_ACCESS: 'yes' }), /EXCHANGE_PROVIDER_CONFIG_BOOLEAN_INVALID/);
assert.throws(() => createExchangeProviderConfig('OTHER', {}), /EXCHANGE_PROVIDER_CONFIG_EXCHANGE_INVALID/);

console.log('exchange-provider-config.unit: PASS');
