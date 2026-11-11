/**
 * Provider-neutral security identity contract.
 * Provider identifiers are mappings only; securityId/issuerId are durable identities.
 */
import { timestampMs } from './strict-timestamp.js';
export const IDENTITY_VALIDATION = Object.freeze({
  VALID: 'VALID',
  INVALID: 'INVALID',
  UNRESOLVED: 'UNRESOLVED',
});

const PROVIDERS = new Set(['upstox', 'zerodha', 'dhan', 'angel', 'yahoo', 'nse', 'bse', 'company_filing', 'other']);

function text(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function timestamp(value) {
  const ms = timestampMs(value);
  return ms == null ? null : new Date(ms).toISOString();
}

function hasTimestampValue(value) {
  return value !== undefined && value !== null && value !== '';
}

export function createSecurityIdentity(input = {}) {
  const providerMappings = Array.isArray(input.providerMappings)
    ? input.providerMappings.map((mapping) => ({
      provider: text(mapping?.provider)?.toLowerCase() || null,
      identifier: text(mapping?.identifier),
      validFrom: timestamp(mapping?.validFrom),
      validTo: timestamp(mapping?.validTo),
    }))
    : [];

  const identity = Object.freeze({
    contract: 'STOCKSAMJHO_SECURITY_IDENTITY_V1',
    securityId: text(input.securityId),
    issuerId: text(input.issuerId),
    ISIN: text(input.ISIN)?.toUpperCase() || null,
    exchange: text(input.exchange)?.toUpperCase() || null,
    instrumentType: text(input.instrumentType)?.toUpperCase() || null,
    canonicalSymbol: text(input.canonicalSymbol)?.toUpperCase() || null,
    symbolValidityFrom: timestamp(input.symbolValidityFrom),
    symbolValidityTo: timestamp(input.symbolValidityTo),
    providerMappings: Object.freeze(providerMappings),
    identityStatus: input.identityStatus || 'UNRESOLVED',
    fixtureStatus: input.fixtureStatus || null,
  });

  const errors = [];
  if (hasTimestampValue(input.symbolValidityFrom) && !identity.symbolValidityFrom) errors.push('symbolValidityFrom must be a valid timestamp');
  if (hasTimestampValue(input.symbolValidityTo) && !identity.symbolValidityTo) errors.push('symbolValidityTo must be a valid timestamp');
  for (const [index, mapping] of (Array.isArray(input.providerMappings) ? input.providerMappings : []).entries()) {
    const normalized = identity.providerMappings[index];
    if (hasTimestampValue(mapping?.validFrom) && !normalized?.validFrom) errors.push(`provider mapping validFrom must be a valid timestamp: ${mapping?.provider || index}`);
    if (hasTimestampValue(mapping?.validTo) && !normalized?.validTo) errors.push(`provider mapping validTo must be a valid timestamp: ${mapping?.provider || index}`);
  }
  if (!identity.securityId) errors.push('securityId is required');
  if (!identity.issuerId) errors.push('issuerId is required');
  if (!identity.instrumentType) errors.push('instrumentType is required');
  if (!identity.exchange) errors.push('exchange is required');
  if (identity.symbolValidityFrom && identity.symbolValidityTo
    && new Date(identity.symbolValidityTo) < new Date(identity.symbolValidityFrom)) {
    errors.push('symbol validity window is inverted');
  }
  for (const mapping of identity.providerMappings) {
    if (!mapping.provider || !mapping.identifier) errors.push('provider mapping is incomplete');
    if (mapping.provider && !PROVIDERS.has(mapping.provider)) errors.push(`unsupported provider mapping: ${mapping.provider}`);
    if (mapping.validFrom && mapping.validTo && new Date(mapping.validTo) < new Date(mapping.validFrom)) {
      errors.push(`provider mapping validity window is inverted: ${mapping.provider}`);
    }
  }

  const validationState = errors.length ? IDENTITY_VALIDATION.INVALID : IDENTITY_VALIDATION.VALID;
  // Carry the validation result with the identity object because downstream helpers
  // receive the inner identity, not the outer constructor result.
  const validatedIdentity = Object.freeze({ ...identity, validationState });
  return Object.freeze({
    identity: validatedIdentity,
    validationState,
    errors: Object.freeze(errors),
  });
}

export function resolveProviderMapping(identity, provider, asOf = null) {
  if (identity?.contract !== 'STOCKSAMJHO_SECURITY_IDENTITY_V1'
    || identity.validationState !== IDENTITY_VALIDATION.VALID) return null;
  const target = text(provider)?.toLowerCase();
  const hasAsOf = asOf !== null && asOf !== undefined;
  const time = hasAsOf ? timestampMs(asOf) : null;
  if (hasAsOf && time == null) return null;
  return (identity?.providerMappings || []).find((mapping) => {
    if (mapping.provider !== target) return false;
    if (!hasAsOf) return true;
    const hasFrom = hasTimestampValue(mapping.validFrom);
    const hasTo = hasTimestampValue(mapping.validTo);
    const from = hasFrom ? timestampMs(mapping.validFrom) : -Infinity;
    const to = hasTo ? timestampMs(mapping.validTo) : Infinity;
    if ((hasFrom && from == null) || (hasTo && to == null)) return false;
    return time >= from && time <= to;
  }) || null;
}

export function sameSecurityIdentity(left, right) {
  return Boolean(left?.securityId && right?.securityId && left.securityId === right.securityId);
}

export function symbolWasValid(identity, symbol, at) {
  if (identity?.contract !== 'STOCKSAMJHO_SECURITY_IDENTITY_V1'
    || identity.validationState !== IDENTITY_VALIDATION.VALID) return false;
  const wanted = text(symbol)?.toUpperCase();
  const time = timestampMs(at);
  if (!wanted || wanted !== identity?.canonicalSymbol || time == null) return false;
  const hasFrom = hasTimestampValue(identity.symbolValidityFrom);
  const hasTo = hasTimestampValue(identity.symbolValidityTo);
  const from = hasFrom ? timestampMs(identity.symbolValidityFrom) : -Infinity;
  const to = hasTo ? timestampMs(identity.symbolValidityTo) : Infinity;
  if ((hasFrom && from == null) || (hasTo && to == null)) return false;
  return time >= from && time <= to;
}
