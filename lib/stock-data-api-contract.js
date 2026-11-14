/**
 * Provider-neutral StockSamjho market-data API contract v1.
 *
 * This module validates shapes and evaluates explicit entitlement/freshness
 * inputs. It does not connect to providers, resolve a license, or authorize
 * ingestion. Entitlement records must come from a trusted registry; never
 * construct them from provider payloads or caller-supplied request fields.
 */
import { timestampMs } from './strict-timestamp.js';

export const STOCK_DATA_API_VERSION = 'v1';

export const MARKET_DATA_STATUS = Object.freeze({
  AVAILABLE: 'AVAILABLE',
  PARTIAL: 'PARTIAL',
  UNAVAILABLE: 'UNAVAILABLE',
});

export const MARKET_DATA_TYPES = Object.freeze({
  QUOTE: 'QUOTE',
  CANDLE: 'CANDLE',
});

export const ENTITLEMENT_STATUS = Object.freeze({
  UNKNOWN: 'UNKNOWN',
  NOT_CONFIGURED: 'NOT_CONFIGURED',
  NOT_AUTHORIZED: 'NOT_AUTHORIZED',
  ACTIVE: 'ACTIVE',
  EXPIRED: 'EXPIRED',
  REVOKED: 'REVOKED',
});

export const MARKET_DATA_USES = Object.freeze({
  INTERNAL_USE: 'INTERNAL_USE',
  END_USER_DISPLAY: 'END_USER_DISPLAY',
  DERIVED_ANALYTICS: 'DERIVED_ANALYTICS',
  REDISTRIBUTION: 'REDISTRIBUTION',
  STORAGE: 'STORAGE',
  CACHE: 'CACHE',
});

export const MARKET_DATA_INTERVALS = Object.freeze([
  '1m', '5m', '15m', '30m', '1h', '1d', '1wk', '1mo',
]);

export const PRICE_UNITS = Object.freeze([
  'PER_SHARE', 'PER_UNIT', 'PER_CONTRACT',
]);

export const VOLUME_UNITS = Object.freeze([
  'SHARES', 'UNITS', 'CONTRACTS', 'LOTS',
]);

export const ADJUSTMENT_BASES = Object.freeze([
  'UNADJUSTED', 'SPLIT_ADJUSTED', 'TOTAL_RETURN_ADJUSTED', 'UNKNOWN',
]);

const statusSet = new Set(Object.values(MARKET_DATA_STATUS));
const dataTypeSet = new Set(Object.values(MARKET_DATA_TYPES));
const entitlementSet = new Set(Object.values(ENTITLEMENT_STATUS));
const useSet = new Set(Object.values(MARKET_DATA_USES));
const intervalSet = new Set(MARKET_DATA_INTERVALS);
const priceUnitSet = new Set(PRICE_UNITS);
const volumeUnitSet = new Set(VOLUME_UNITS);
const adjustmentSet = new Set(ADJUSTMENT_BASES);
const capabilitySet = new Set(['QUOTE', 'CANDLE']);
const latencySet = new Set(['REAL_TIME', 'DELAYED', 'HISTORICAL']);

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    && Object.getPrototypeOf(value) === Object.prototype;
}

function nonEmptyText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function nullableText(value) {
  return value === null || nonEmptyText(value);
}

function canonicalTimestamp(value) {
  if (typeof value !== 'string') return false;
  const ms = timestampMs(value);
  return ms !== null && new Date(ms).toISOString() === value;
}

function nullableTimestamp(value) {
  return value === null || canonicalTimestamp(value);
}

function nonNegativeInteger(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

function positiveNumberOrNull(value) {
  return value === null || (typeof value === 'number' && Number.isFinite(value) && value > 0);
}

function positiveIntegerOrNull(value) {
  return value === null || (Number.isSafeInteger(value) && value > 0);
}

function uniqueTextArray(value) {
  return Array.isArray(value) && value.length > 0
    && value.every(nonEmptyText)
    && new Set(value.map((item) => item.trim())).size === value.length;
}

function validateHttpsUrl(value) {
  if (!nonEmptyText(value)) return false;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

function result(errors) {
  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

/**
 * Validates an adapter capability declaration. A valid declaration is not
 * evidence of a license or of a connected provider.
 */
export function validateProviderCapabilityManifest(manifest) {
  const errors = [];
  if (!isRecord(manifest)) return result(['manifest must be a plain object']);
  if (manifest.contract !== 'STOCKSAMJHO_PROVIDER_CAPABILITIES_V1') errors.push('unsupported manifest contract');
  if (!nonEmptyText(manifest.provider)) errors.push('provider is required');
  if (!nonEmptyText(manifest.product)) errors.push('product is required');
  if (!validateHttpsUrl(manifest.documentationUrl)) errors.push('documentationUrl must be an HTTPS URL');

  if (!Array.isArray(manifest.capabilities) || manifest.capabilities.length === 0) {
    errors.push('at least one capability is required');
  } else {
    for (const capability of manifest.capabilities) {
      if (!capabilitySet.has(capability)) errors.push('unsupported capability: ' + String(capability));
    }
    if (new Set(manifest.capabilities).size !== manifest.capabilities.length) errors.push('capabilities must be unique');
  }

  const coverage = manifest.coverage;
  if (!isRecord(coverage)) {
    errors.push('coverage is required');
  } else {
    for (const field of ['exchanges', 'segments', 'instrumentTypes']) {
      if (!uniqueTextArray(coverage[field])) errors.push('coverage.' + field + ' must be a non-empty unique string array');
    }
    if (!Array.isArray(coverage.intervals)
      || !coverage.intervals.every((interval) => intervalSet.has(interval))
      || new Set(coverage.intervals).size !== coverage.intervals.length) {
      errors.push('coverage.intervals must contain unique supported intervals');
    }
    if (Array.isArray(manifest.capabilities) && manifest.capabilities.includes('CANDLE')
      && (!Array.isArray(coverage.intervals) || coverage.intervals.length === 0)) {
      errors.push('CANDLE capability requires explicit interval coverage');
    }
  }

  if (!latencySet.has(manifest.latencyClass)) errors.push('latencyClass is unsupported');

  const time = manifest.time;
  if (!isRecord(time)) {
    errors.push('time semantics are required');
  } else {
    if (!nonEmptyText(time.marketTimestampSemantics)) errors.push('time.marketTimestampSemantics is required');
    if (!nullableText(time.publishedTimestampSemantics)) errors.push('time.publishedTimestampSemantics must be text or null');
    if (!nullableText(time.timezone)) errors.push('time.timezone must be text or null');
  }

  const measurement = manifest.measurement;
  if (!isRecord(measurement)) {
    errors.push('measurement semantics are required');
  } else {
    if (!nonEmptyText(measurement.currencyField)) errors.push('measurement.currencyField is required');
    if (!priceUnitSet.has(measurement.priceUnit)) errors.push('measurement.priceUnit is unsupported');
    if (!nullableText(measurement.volumeUnit)) errors.push('measurement.volumeUnit must be text or null');
    if (measurement.volumeUnit !== null && !volumeUnitSet.has(measurement.volumeUnit)) errors.push('measurement.volumeUnit is unsupported');
    if (!adjustmentSet.has(measurement.adjustmentBasis)) errors.push('measurement.adjustmentBasis is unsupported');
    if (Array.isArray(manifest.capabilities) && manifest.capabilities.includes('CANDLE')
      && !volumeUnitSet.has(measurement.volumeUnit)) {
      errors.push('CANDLE capability requires an explicit supported volumeUnit');
    }
  }

  const limits = manifest.limits;
  if (!isRecord(limits)) {
    errors.push('limits are required; use null when a limit is not documented');
  } else {
    if (!positiveNumberOrNull(limits.requestsPerSecond)) errors.push('limits.requestsPerSecond must be positive or null');
    if (!positiveIntegerOrNull(limits.maxSymbolsPerRequest)) errors.push('limits.maxSymbolsPerRequest must be a positive integer or null');
    if (!positiveIntegerOrNull(limits.maxConcurrentConnections)) errors.push('limits.maxConcurrentConnections must be a positive integer or null');
  }

  if (!nullableText(manifest.entitlementRecordId)) errors.push('entitlementRecordId must be text or null');
  return result(errors);
}

/**
 * Validates one instrument's quote or candle envelope without normalizing,
 * defaulting, converting currency, or filling missing source metadata.
 */
export function validateMarketDataEnvelope(envelope) {
  const errors = [];
  if (!isRecord(envelope)) return result(['envelope must be a plain object']);
  if (envelope.apiVersion !== STOCK_DATA_API_VERSION) errors.push('apiVersion must be v1');
  if (!dataTypeSet.has(envelope.dataType)) errors.push('dataType is unsupported');
  if (!statusSet.has(envelope.status)) errors.push('status is unsupported');

  const instrument = envelope.instrument;
  if (!isRecord(instrument)) {
    errors.push('instrument is required');
  } else {
    for (const field of ['exchange', 'symbol', 'series', 'isin', 'segment', 'instrumentType']) {
      if (!nullableText(instrument[field])) errors.push('instrument.' + field + ' must be text or null');
    }
    if (instrument.isin !== null && !/^[A-Z]{2}[A-Z0-9]{10}$/.test(instrument.isin)) {
      errors.push('instrument.isin must be an explicit 12-character ISIN or null');
    }
  }

  const source = envelope.source;
  if (!isRecord(source)) {
    errors.push('source is required');
  } else {
    for (const field of ['provider', 'product', 'sourceRecordId', 'entitlementRecordId']) {
      if (!nullableText(source[field])) errors.push('source.' + field + ' must be text or null');
    }
    if (!entitlementSet.has(source.entitlementStatus)) errors.push('source.entitlementStatus is unsupported');
  }

  const time = envelope.time;
  if (!isRecord(time)) {
    errors.push('time is required');
  } else {
    if (!nullableTimestamp(time.asOf)) errors.push('time.asOf must be a canonical UTC timestamp or null');
    if (!nullableTimestamp(time.publishedAt)) errors.push('time.publishedAt must be a canonical UTC timestamp or null');
    if (!canonicalTimestamp(time.fetchedAt)) errors.push('time.fetchedAt must be a canonical UTC timestamp');
    if (!nullableText(time.timezone)) errors.push('time.timezone must be text or null');
  }

  const measurement = envelope.measurement;
  if (!isRecord(measurement)) {
    errors.push('measurement is required');
  } else {
    if (!nullableText(measurement.currency)) errors.push('measurement.currency must be text or null');
    if (!nullableText(measurement.priceUnit)) errors.push('measurement.priceUnit must be text or null');
    if (measurement.priceUnit !== null && !priceUnitSet.has(measurement.priceUnit)) errors.push('measurement.priceUnit is unsupported');
    if (!nullableText(measurement.volumeUnit)) errors.push('measurement.volumeUnit must be text or null');
    if (measurement.volumeUnit !== null && !volumeUnitSet.has(measurement.volumeUnit)) errors.push('measurement.volumeUnit is unsupported');
    if (!nullableText(measurement.interval)) errors.push('measurement.interval must be text or null');
    if (measurement.interval !== null && !intervalSet.has(measurement.interval)) errors.push('measurement.interval is unsupported');
    if (!adjustmentSet.has(measurement.adjustmentBasis)) errors.push('measurement.adjustmentBasis is unsupported');
    if (measurement.currency !== null && !/^[A-Za-z]{3,5}$/.test(measurement.currency)) errors.push('measurement.currency must be an explicit denomination code');
  }

  const coverage = envelope.coverage;
  let coverageKnown = false;
  if (!isRecord(coverage)) {
    errors.push('coverage is required');
  } else {
    const counts = [coverage.expected, coverage.received, coverage.missing];
    if (!counts.every((value) => value === null || nonNegativeInteger(value))) {
      errors.push('coverage counts must be non-negative integers or null');
    } else if (counts.some((value) => value !== null)) {
      coverageKnown = true;
      if (!counts.every((value) => nonNegativeInteger(value))) {
        errors.push('coverage counts must be all known or all null');
      } else if (coverage.expected < 1 || coverage.received + coverage.missing !== coverage.expected) {
        errors.push('coverage counts must reconcile exactly');
      }
    }
  }

  const revision = envelope.revision;
  if (!isRecord(revision)) {
    errors.push('revision is required');
  } else {
    if (!nullableText(revision.sourceRevision)) errors.push('revision.sourceRevision must be text or null');
    if (!nullableText(revision.contentHash)) errors.push('revision.contentHash must be text or null');
    if (revision.contentHash !== null && !/^[a-f0-9]{64}$/i.test(revision.contentHash)) {
      errors.push('revision.contentHash must be a SHA-256 hex digest or null');
    }
  }

  if (!Array.isArray(envelope.data)) errors.push('data must be an array');
  else if (!envelope.data.every(isRecord)) errors.push('data records must be plain objects');

  if (!Array.isArray(envelope.warnings) || !envelope.warnings.every(nonEmptyText)) {
    errors.push('warnings must be an array of non-empty strings');
  }

  const rows = Array.isArray(envelope.data) ? envelope.data : [];
  const hasData = rows.length > 0;
  const availableOrPartial = envelope.status === MARKET_DATA_STATUS.AVAILABLE
    || envelope.status === MARKET_DATA_STATUS.PARTIAL;
  if (availableOrPartial && coverageKnown && rows.length !== coverage.received) {
    errors.push('coverage.received must equal the number of returned data records');
  }

  if (availableOrPartial) {
    if (!isRecord(instrument) || !nonEmptyText(instrument.exchange) || !nonEmptyText(instrument.symbol)
      || !nonEmptyText(instrument.segment) || !nonEmptyText(instrument.instrumentType)) {
      errors.push('available data requires explicit exchange, symbol, segment and instrumentType');
    }
    if (!isRecord(source) || !nonEmptyText(source.provider) || !nonEmptyText(source.product)
      || source.entitlementStatus !== ENTITLEMENT_STATUS.ACTIVE || !nonEmptyText(source.entitlementRecordId)) {
      errors.push('available data requires an active entitlement record reference');
    }
    if (!isRecord(time) || !canonicalTimestamp(time.asOf)) errors.push('available data requires time.asOf');
    if (!isRecord(measurement) || !nonEmptyText(measurement.currency)
      || !priceUnitSet.has(measurement.priceUnit) || !adjustmentSet.has(measurement.adjustmentBasis)) {
      errors.push('available data requires explicit currency, price unit and adjustment basis');
    }
    if (!hasData) errors.push('available or partial data must contain at least one record');
  }

  if (envelope.status === MARKET_DATA_STATUS.AVAILABLE) {
    if (!coverageKnown || coverage.expected !== coverage.received || coverage.missing !== 0) {
      errors.push('AVAILABLE requires reconciled complete coverage');
    }
  } else if (envelope.status === MARKET_DATA_STATUS.PARTIAL) {
    if (coverageKnown && coverage.missing === 0) errors.push('PARTIAL cannot claim complete coverage');
  } else if (envelope.status === MARKET_DATA_STATUS.UNAVAILABLE) {
    if (hasData) errors.push('UNAVAILABLE must not contain data');
    if (coverageKnown && (coverage.received !== 0 || coverage.missing !== coverage.expected)) {
      errors.push('UNAVAILABLE coverage must show zero received records');
    }
  }

  if (envelope.dataType === MARKET_DATA_TYPES.QUOTE && availableOrPartial) {
    if (rows.length !== 1) errors.push('a single-instrument QUOTE envelope must contain exactly one quote record');
    if (measurement?.interval !== null) errors.push('QUOTE interval must be null');
    for (const [index, row] of rows.entries()) {
      if (typeof row.price !== 'number' || !Number.isFinite(row.price)) errors.push('quote price must be finite at index ' + index);
      if (!nonEmptyText(row.currency) || row.currency !== measurement?.currency) errors.push('quote currency must exactly match envelope currency at index ' + index);
      if (!canonicalTimestamp(row.asOf) || row.asOf !== time?.asOf) errors.push('quote asOf must match envelope time.asOf at index ' + index);
    }
  }

  if (envelope.dataType === MARKET_DATA_TYPES.CANDLE && availableOrPartial) {
    if (!intervalSet.has(measurement?.interval)) errors.push('CANDLE requires an explicit supported interval');
    if (!volumeUnitSet.has(measurement?.volumeUnit)) errors.push('CANDLE requires an explicit supported volume unit');
    let priorTimestamp = null;
    for (const [index, row] of rows.entries()) {
      if (!canonicalTimestamp(row.timestamp)) {
        errors.push('candle timestamp must be canonical UTC at index ' + index);
        continue;
      }
      const values = [row.open, row.high, row.low, row.close, row.volume];
      if (!values.every((value) => typeof value === 'number' && Number.isFinite(value))) {
        errors.push('candle OHLCV values must be finite at index ' + index);
        continue;
      }
      if (row.volume < 0 || row.high < row.low || row.high < Math.max(row.open, row.close)
        || row.low > Math.min(row.open, row.close)) {
        errors.push('candle OHLCV range is inconsistent at index ' + index);
      }
      const currentTimestamp = timestampMs(row.timestamp);
      if (priorTimestamp !== null && currentTimestamp <= priorTimestamp) {
        errors.push('candle timestamps must be strictly increasing');
      }
      priorTimestamp = currentTimestamp;
    }
    if (rows.length && rows.at(-1)?.timestamp !== time?.asOf) errors.push('time.asOf must equal the latest candle timestamp');
  }

  return result(errors);
}

/**
 * Validates a trusted-registry entitlement record. An ACTIVE record is
 * deliberately incomplete unless its validity window and data/use scopes
 * are explicit. This validator does not fetch or verify the record itself.
 */
export function validateEntitlementRecord(record) {
  const errors = [];
  if (!isRecord(record)) return result(['entitlement record must be a plain object']);
  if (record.contract !== 'STOCKSAMJHO_ENTITLEMENT_RECORD_V1') errors.push('unsupported entitlement record contract');
  if (!nonEmptyText(record.recordId)) errors.push('recordId is required');
  if (!nonEmptyText(record.provider)) errors.push('provider is required');
  if (!nonEmptyText(record.product)) errors.push('product is required');
  if (!entitlementSet.has(record.status)) errors.push('entitlement status is unsupported');

  if (record.status === ENTITLEMENT_STATUS.ACTIVE) {
    if (!canonicalTimestamp(record.validFrom)) errors.push('active entitlement requires canonical validFrom');
    if (!canonicalTimestamp(record.validUntil)) errors.push('active entitlement requires canonical validUntil');
    if (canonicalTimestamp(record.validFrom) && canonicalTimestamp(record.validUntil)
      && timestampMs(record.validUntil) <= timestampMs(record.validFrom)) {
      errors.push('entitlement validity window must be increasing');
    }
    for (const field of ['permittedUses', 'permittedExchanges', 'permittedSegments', 'permittedInstrumentTypes', 'permittedDataTypes']) {
      if (!uniqueTextArray(record[field])) errors.push(field + ' must be a non-empty unique string array');
    }
    if (!Array.isArray(record.permittedIntervals)
      || !record.permittedIntervals.every((interval) => intervalSet.has(interval))
      || new Set(record.permittedIntervals).size !== record.permittedIntervals.length) {
      errors.push('permittedIntervals must contain unique supported intervals');
    }
    if (Array.isArray(record.permittedUses) && record.permittedUses.some((use) => !useSet.has(use))) {
      errors.push('permittedUses contains an unsupported use');
    }
    if (Array.isArray(record.permittedDataTypes) && record.permittedDataTypes.some((type) => !dataTypeSet.has(type))) {
      errors.push('permittedDataTypes contains an unsupported data type');
    }
    if (Array.isArray(record.permittedDataTypes) && record.permittedDataTypes.includes('CANDLE')
      && (!Array.isArray(record.permittedIntervals) || record.permittedIntervals.length === 0)) {
      errors.push('CANDLE entitlement requires explicit interval scope');
    }
  }

  return result(errors);
}

/**
 * Evaluate a request against a record already resolved from a trusted,
 * access-controlled entitlement registry. Provider payloads are not records.
 */
export function evaluateMarketDataEntitlement(envelope, record, { use, now } = {}) {
  const envelopeValidation = validateMarketDataEnvelope(envelope);
  if (!envelopeValidation.valid) return Object.freeze({
    allowed: false, code: 'INVALID_MARKET_DATA_ENVELOPE', errors: envelopeValidation.errors,
  });
  if (![MARKET_DATA_STATUS.AVAILABLE, MARKET_DATA_STATUS.PARTIAL].includes(envelope.status)) {
    return Object.freeze({ allowed: false, code: 'MARKET_DATA_UNAVAILABLE', errors: Object.freeze([]) });
  }

  const recordValidation = validateEntitlementRecord(record);
  if (!recordValidation.valid) return Object.freeze({
    allowed: false, code: 'INVALID_ENTITLEMENT_RECORD', errors: recordValidation.errors,
  });
  if (record.status !== ENTITLEMENT_STATUS.ACTIVE
    || envelope.source.entitlementStatus !== ENTITLEMENT_STATUS.ACTIVE
    || record.recordId !== envelope.source.entitlementRecordId) {
    return Object.freeze({ allowed: false, code: 'ENTITLEMENT_NOT_ACTIVE_OR_MISMATCHED', errors: Object.freeze([]) });
  }
  if (record.provider !== envelope.source.provider || record.product !== envelope.source.product) {
    return Object.freeze({ allowed: false, code: 'ENTITLEMENT_SOURCE_MISMATCH', errors: Object.freeze([]) });
  }
  if (!useSet.has(use) || !record.permittedUses.includes(use)) {
    return Object.freeze({ allowed: false, code: 'USE_NOT_ENTITLED', errors: Object.freeze([]) });
  }
  if (!canonicalTimestamp(now)) {
    return Object.freeze({ allowed: false, code: 'ENTITLEMENT_EVALUATION_TIME_UNKNOWN', errors: Object.freeze([]) });
  }

  const nowMs = timestampMs(now);
  if (nowMs < timestampMs(record.validFrom) || nowMs >= timestampMs(record.validUntil)) {
    return Object.freeze({ allowed: false, code: 'ENTITLEMENT_OUTSIDE_VALIDITY_WINDOW', errors: Object.freeze([]) });
  }
  if (!record.permittedExchanges.includes(envelope.instrument.exchange)
    || !record.permittedSegments.includes(envelope.instrument.segment)
    || !record.permittedInstrumentTypes.includes(envelope.instrument.instrumentType)
    || !record.permittedDataTypes.includes(envelope.dataType)) {
    return Object.freeze({ allowed: false, code: 'DATA_SCOPE_NOT_ENTITLED', errors: Object.freeze([]) });
  }
  if (envelope.dataType === MARKET_DATA_TYPES.CANDLE
    && !record.permittedIntervals.includes(envelope.measurement.interval)) {
    return Object.freeze({ allowed: false, code: 'INTERVAL_NOT_ENTITLED', errors: Object.freeze([]) });
  }

  return Object.freeze({ allowed: true, code: 'ENTITLEMENT_MATCHED', errors: Object.freeze([]) });
}

/**
 * Freshness uses market asOf, never fetchedAt. Callers must provide a
 * dataset/session-specific maximum age; this module has no guessed default.
 */
export function evaluateMarketDataFreshness(envelope, { maxAgeMs, now } = {}) {
  const validation = validateMarketDataEnvelope(envelope);
  if (!validation.valid) return Object.freeze({
    fresh: false, code: 'INVALID_MARKET_DATA_ENVELOPE', ageMs: null, errors: validation.errors,
  });
  if (![MARKET_DATA_STATUS.AVAILABLE, MARKET_DATA_STATUS.PARTIAL].includes(envelope.status)) {
    return Object.freeze({ fresh: false, code: 'MARKET_DATA_UNAVAILABLE', ageMs: null, errors: Object.freeze([]) });
  }
  if (!Number.isSafeInteger(maxAgeMs) || maxAgeMs < 0 || !canonicalTimestamp(now)
    || !canonicalTimestamp(envelope.time.asOf)) {
    return Object.freeze({ fresh: false, code: 'FRESHNESS_POLICY_OR_TIME_UNKNOWN', ageMs: null, errors: Object.freeze([]) });
  }
  const ageMs = timestampMs(now) - timestampMs(envelope.time.asOf);
  if (ageMs < 0) return Object.freeze({ fresh: false, code: 'MARKET_TIMESTAMP_IN_FUTURE', ageMs, errors: Object.freeze([]) });
  if (ageMs > maxAgeMs) return Object.freeze({ fresh: false, code: 'MARKET_DATA_STALE', ageMs, errors: Object.freeze([]) });
  return Object.freeze({ fresh: true, code: 'MARKET_DATA_FRESH', ageMs, errors: Object.freeze([]) });
}
