/**
 * Keeps provider symbols separate from durable issuer/security identities.
 * A verified security master is required before canonical identity fields are populated.
 */
const textValue = (value) => typeof value === 'string' && value.trim() ? value.trim() : null;

export function buildCanonicalIdentityContext({ provider = 'other', providerIdentifier = null } = {}) {
  const normalizedProvider = textValue(provider)?.toLowerCase() || 'other';
  const identifier = textValue(providerIdentifier);
  return Object.freeze({
    issuerIdentity: null,
    securityIdentity: null,
    identityResolution: Object.freeze({
      status: 'UNRESOLVED',
      reason: 'VERIFIED_SECURITY_MASTER_NOT_CONNECTED',
      providerReference: identifier
        ? Object.freeze({ provider: normalizedProvider, identifier })
        : null,
    }),
  });
}
