/**
 * Provider-neutral security identity contract.
 * Provider identifiers are mappings only; securityId/issuerId are durable identities.
 */
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
  if (value == null || value === '') return null;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
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

  return Object.freeze({
    identity,
    validationState: errors.length ? IDENTITY_VALIDATION.INVALID : IDENTITY_VALIDATION.VALID,
    errors: Object.freeze(errors),
  });
}

export function resolveProviderMapping(identity, provider, asOf = null) {
  const target = text(provider)?.toLowerCase();
  const time = asOf == null ? null : new Date(asOf).getTime();
  return (identity?.providerMappings || []).find((mapping) => {
    if (mapping.provider !== target) return false;
    if (!Number.isFinite(time)) return true;
    const from = mapping.validFrom ? new Date(mapping.validFrom).getTime() : -Infinity;
    const to = mapping.validTo ? new Date(mapping.validTo).getTime() : Infinity;
    return time >= from && time <= to;
  }) || null;
}

export function sameSecurityIdentity(left, right) {
  return Boolean(left?.securityId && right?.securityId && left.securityId === right.securityId);
}

export function symbolWasValid(identity, symbol, at) {
  const wanted = text(symbol)?.toUpperCase();
  const time = new Date(at).getTime();
  if (!wanted || wanted !== identity?.canonicalSymbol || !Number.isFinite(time)) return false;
  const from = identity.symbolValidityFrom ? new Date(identity.symbolValidityFrom).getTime() : -Infinity;
  const to = identity.symbolValidityTo ? new Date(identity.symbolValidityTo).getTime() : Infinity;
  return time >= from && time <= to;
}
