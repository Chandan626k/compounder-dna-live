import assert from 'node:assert/strict';
import {
  MARKET_DATA_STATUS,
  MARKET_DATA_USES,
  validateProviderCapabilityManifest,
  validateMarketDataEnvelope,
  validateEntitlementRecord,
  evaluateMarketDataEntitlement,
  evaluateMarketDataFreshness,
} from '../lib/stock-data-api-contract.js';

const AS_OF = '2026-11-14T10:29:00.000Z';
const FETCHED_AT = '2026-11-14T10:29:10.000Z';
const NOW = '2026-11-14T10:30:00.000Z';
const clone = (value) => JSON.parse(JSON.stringify(value));

function quoteEnvelope(overrides = {}) {
  const base = {
    apiVersion: 'v1',
    dataType: 'QUOTE',
    status: MARKET_DATA_STATUS.AVAILABLE,
    instrument: {
      exchange: 'NSE',
      symbol: 'FIXTURE',
      series: 'EQ',
      isin: null,
      segment: 'CM',
      instrumentType: 'EQUITY',
    },
    source: {
      provider: 'fixture-provider',
      product: 'fixture-product',
      sourceRecordId: 'FIXTURE-QUOTE-1',
      entitlementStatus: 'ACTIVE',
      entitlementRecordId: 'FIXTURE-ENTITLEMENT-1',
    },
    time: {
      asOf: AS_OF,
      publishedAt: null,
      fetchedAt: FETCHED_AT,
      timezone: 'Asia/Kolkata',
    },
    measurement: {
      currency: 'INR',
      priceUnit: 'PER_SHARE',
      volumeUnit: null,
      interval: null,
      adjustmentBasis: 'UNKNOWN',
    },
    coverage: { expected: 1, received: 1, missing: 0 },
    revision: { sourceRevision: null, contentHash: null },
    data: [{ price: 100, currency: 'INR', asOf: AS_OF }],
    warnings: [],
  };
  return {
    ...base,
    ...overrides,
    instrument: { ...base.instrument, ...overrides.instrument },
    source: { ...base.source, ...overrides.source },
    time: { ...base.time, ...overrides.time },
    measurement: { ...base.measurement, ...overrides.measurement },
    coverage: { ...base.coverage, ...overrides.coverage },
    revision: { ...base.revision, ...overrides.revision },
    data: overrides.data ?? base.data,
    warnings: overrides.warnings ?? base.warnings,
  };
}

const validQuote = quoteEnvelope();
assert.equal(validateMarketDataEnvelope(validQuote).valid, true, 'explicit synthetic quote contract is valid');

// Unknown or malformed metadata is rejected instead of being defaulted.
assert.equal(validateMarketDataEnvelope(quoteEnvelope({ apiVersion: 'v2' })).valid, false);
assert.equal(validateMarketDataEnvelope(quoteEnvelope({ time: { fetchedAt: '14/11/2026 10:29' } })).valid, false);
assert.equal(validateMarketDataEnvelope(quoteEnvelope({ measurement: { currency: null } })).valid, false);
assert.equal(validateMarketDataEnvelope(quoteEnvelope({ measurement: { priceUnit: 'PER_LOT' } })).valid, false);
assert.equal(validateMarketDataEnvelope(quoteEnvelope({ data: [{ price: 100, currency: 'USD', asOf: AS_OF }] })).valid, false,
  'row currency must exactly match the envelope currency');
assert.equal(validateMarketDataEnvelope(quoteEnvelope({ coverage: { expected: 2, received: 2, missing: 0 } })).valid, false,
  'returned rows must reconcile with declared coverage');
assert.equal(validateMarketDataEnvelope(quoteEnvelope({ coverage: { expected: 2, received: 1, missing: 1 } })).valid, false,
  'AVAILABLE cannot hide missing coverage');
assert.equal(validateMarketDataEnvelope(quoteEnvelope({
  status: MARKET_DATA_STATUS.PARTIAL,
  coverage: { expected: 2, received: 1, missing: 1 },
})).valid, true, 'PARTIAL explicitly reports missing records');
assert.equal(validateMarketDataEnvelope(quoteEnvelope({
  status: MARKET_DATA_STATUS.PARTIAL,
  coverage: { expected: 1, received: 1, missing: 0 },
})).valid, false, 'PARTIAL cannot claim complete coverage');
assert.equal(validateMarketDataEnvelope(quoteEnvelope({
  status: MARKET_DATA_STATUS.PARTIAL,
  coverage: { expected: null, received: null, missing: null },
})).valid, false, 'PARTIAL requires known coverage and an explicit missing-record count');

const unavailable = {
  apiVersion: 'v1',
  dataType: 'QUOTE',
  status: MARKET_DATA_STATUS.UNAVAILABLE,
  instrument: { exchange: null, symbol: null, series: null, isin: null, segment: null, instrumentType: null },
  source: { provider: null, product: null, sourceRecordId: null, entitlementStatus: 'NOT_CONFIGURED', entitlementRecordId: null },
  time: { asOf: null, publishedAt: null, fetchedAt: NOW, timezone: null },
  measurement: { currency: null, priceUnit: null, volumeUnit: null, interval: null, adjustmentBasis: 'UNKNOWN' },
  coverage: { expected: null, received: null, missing: null },
  revision: { sourceRevision: null, contentHash: null },
  data: [],
  warnings: ['AUTHORIZED_MARKET_DATA_SOURCE_NOT_CONFIGURED'],
};
assert.equal(validateMarketDataEnvelope(unavailable).valid, true, 'unavailable response preserves unknown fields and contains no data');

// Candle validation checks OHLC consistency, unit declarations and strict ordering.
const candleEnvelope = quoteEnvelope({
  dataType: 'CANDLE',
  time: { asOf: '2026-11-14T10:29:00.000Z' },
  measurement: {
    currency: 'INR',
    priceUnit: 'PER_SHARE',
    volumeUnit: 'SHARES',
    interval: '1d',
    adjustmentBasis: 'UNADJUSTED',
  },
  coverage: { expected: 2, received: 2, missing: 0 },
  data: [
    { timestamp: '2026-11-13T10:29:00.000Z', open: 98, high: 101, low: 97, close: 100, volume: 1000 },
    { timestamp: '2026-11-14T10:29:00.000Z', open: 100, high: 103, low: 99, close: 102, volume: 1200 },
  ],
});
assert.equal(validateMarketDataEnvelope(candleEnvelope).valid, true);
const badRange = clone(candleEnvelope);
badRange.data[1].high = 99;
assert.equal(validateMarketDataEnvelope(badRange).valid, false);
const duplicateTime = clone(candleEnvelope);
duplicateTime.data[1].timestamp = duplicateTime.data[0].timestamp;
duplicateTime.time.asOf = duplicateTime.data[1].timestamp;
assert.equal(validateMarketDataEnvelope(duplicateTime).valid, false);
assert.equal(validateMarketDataEnvelope(quoteEnvelope({
  revision: { contentHash: 'not-a-sha256-hash' },
})).valid, false);

// Adapter capabilities describe documented limits and field semantics, not entitlement.
const manifest = {
  contract: 'STOCKSAMJHO_PROVIDER_CAPABILITIES_V1',
  provider: 'fixture-provider',
  product: 'fixture-product',
  documentationUrl: 'https://example.invalid/provider-docs',
  capabilities: ['QUOTE', 'CANDLE'],
  coverage: {
    exchanges: ['NSE'],
    segments: ['CM'],
    instrumentTypes: ['EQUITY'],
    intervals: ['1d'],
  },
  latencyClass: 'DELAYED',
  time: {
    marketTimestampSemantics: 'provider market timestamp field',
    publishedTimestampSemantics: null,
    timezone: 'Asia/Kolkata',
  },
  measurement: {
    currencyField: 'currency',
    priceUnit: 'PER_SHARE',
    volumeUnit: 'SHARES',
    adjustmentBasis: 'UNADJUSTED',
  },
  limits: {
    requestsPerSecond: 1,
    maxSymbolsPerRequest: 50,
    maxConcurrentConnections: 1,
  },
  entitlementRecordId: null,
};
assert.equal(validateProviderCapabilityManifest(manifest).valid, true);
const incompleteManifest = clone(manifest);
incompleteManifest.coverage.intervals = [];
incompleteManifest.measurement.volumeUnit = null;
assert.equal(validateProviderCapabilityManifest(incompleteManifest).valid, false,
  'CANDLE capability requires explicit interval and volume semantics');

// Only a trusted, separately resolved entitlement record can authorize a use.
const entitlement = {
  contract: 'STOCKSAMJHO_ENTITLEMENT_RECORD_V1',
  recordId: 'FIXTURE-ENTITLEMENT-1',
  provider: 'fixture-provider',
  product: 'fixture-product',
  status: 'ACTIVE',
  validFrom: '2026-11-01T00:00:00.000Z',
  validUntil: '2026-12-01T00:00:00.000Z',
  permittedUses: [MARKET_DATA_USES.INTERNAL_USE],
  permittedExchanges: ['NSE'],
  permittedSegments: ['CM'],
  permittedInstrumentTypes: ['EQUITY'],
  permittedDataTypes: ['QUOTE'],
  permittedIntervals: [],
};
assert.equal(validateEntitlementRecord(entitlement).valid, true);
assert.equal(evaluateMarketDataEntitlement(validQuote, entitlement, {
  use: MARKET_DATA_USES.INTERNAL_USE,
  now: NOW,
}).allowed, true);
assert.equal(evaluateMarketDataEntitlement(validQuote, null, {
  use: MARKET_DATA_USES.INTERNAL_USE,
  now: NOW,
}).allowed, false, 'missing registry record fails closed');
assert.equal(evaluateMarketDataEntitlement(validQuote, entitlement, {
  use: MARKET_DATA_USES.REDISTRIBUTION,
  now: NOW,
}).allowed, false, 'internal-use rights do not imply redistribution rights');
assert.equal(evaluateMarketDataEntitlement(validQuote, {
  ...entitlement,
  recordId: 'FIXTURE-DIFFERENT-RECORD',
}, {
  use: MARKET_DATA_USES.INTERNAL_USE,
  now: NOW,
}).allowed, false, 'envelope entitlement reference must match the resolved record');
assert.equal(evaluateMarketDataEntitlement(validQuote, {
  ...entitlement,
  status: 'EXPIRED',
}, {
  use: MARKET_DATA_USES.INTERNAL_USE,
  now: NOW,
}).allowed, false);
assert.equal(evaluateMarketDataEntitlement(unavailable, entitlement, {
  use: MARKET_DATA_USES.INTERNAL_USE,
  now: NOW,
}).allowed, false);

// Freshness is based on market asOf and requires an explicit caller policy.
assert.equal(evaluateMarketDataFreshness(validQuote, { maxAgeMs: 60_000, now: NOW }).fresh, true);
assert.equal(evaluateMarketDataFreshness(validQuote, { maxAgeMs: 59_999, now: NOW }).code, 'MARKET_DATA_STALE');
assert.equal(evaluateMarketDataFreshness(quoteEnvelope({
  time: { asOf: '2026-11-14T10:31:00.000Z' },
  data: [{ price: 100, currency: 'INR', asOf: '2026-11-14T10:31:00.000Z' }],
}), { maxAgeMs: 60_000, now: NOW }).code, 'MARKET_TIMESTAMP_IN_FUTURE');
assert.equal(evaluateMarketDataFreshness(validQuote, { now: NOW }).code, 'FRESHNESS_POLICY_OR_TIME_UNKNOWN');
assert.equal(evaluateMarketDataFreshness(unavailable, { maxAgeMs: 60_000, now: NOW }).fresh, false);

console.log('stock-data-api-contract.unit: PASS');
