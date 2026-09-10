import { createHash } from 'node:crypto';

export const SOURCE_QUALIFICATION_STAGES = Object.freeze([
  'SOURCE_RECEIVED',
  'NORMALIZED',
  'IDENTITY_VALIDATED',
  'SEMANTICALLY_VALIDATED',
  'PROVENANCE_VERIFIED',
  'FRESHNESS_ELIGIBLE',
  'USABLE_FOR_HORIZON',
]);

export const SOURCE_ACCESS_MODES = Object.freeze({
  AUTHORITATIVE: 'AUTHORITATIVE',
  DEVELOPMENT_FIXTURE: 'DEVELOPMENT_FIXTURE',
  SECONDARY: 'SECONDARY',
});

const asIso = (value) => {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const clean = (value) => value == null ? null : String(value);

function canonicalize(value) {
  if (value == null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`).join(',')}}`;
}

export function hashSourceContent(payload) {
  return createHash('sha256').update(canonicalize(payload)).digest('hex');
}

export function createImmutableSourceSnapshot({
  source,
  sourceDocumentId,
  sourceVersion = null,
  publishedAt = null,
  effectiveAt = null,
  retrievedAt = new Date().toISOString(),
  payload,
  authorityClass = null,
  accessMode = SOURCE_ACCESS_MODES.DEVELOPMENT_FIXTURE,
  entitlementVerified = false,
  historicalReproducibilityVerified = false,
} = {}) {
  const snapshot = {
    source: clean(source),
    sourceDocumentId: clean(sourceDocumentId),
    sourceVersion: clean(sourceVersion),
    publishedAt: asIso(publishedAt),
    effectiveAt: asIso(effectiveAt),
    retrievedAt: asIso(retrievedAt),
    contentHash: hashSourceContent(payload),
    authorityClass: clean(authorityClass),
    accessMode: clean(accessMode),
    entitlementVerified: entitlementVerified === true,
    historicalReproducibilityVerified: historicalReproducibilityVerified === true,
  };

  if (!snapshot.source || !snapshot.sourceDocumentId || !snapshot.retrievedAt) {
    throw new Error('SOURCE_SNAPSHOT_IDENTITY_INCOMPLETE');
  }
  if (!snapshot.contentHash) throw new Error('SOURCE_SNAPSHOT_HASH_MISSING');
  return Object.freeze(snapshot);
}

export function assessHistoricalValidity(snapshot, evaluationAsOf) {
  const cutoff = asIso(evaluationAsOf);
  if (!cutoff) return { status: 'UNKNOWN', reason: 'Evaluation timestamp is unavailable.' };

  const cutoffMs = new Date(cutoff).getTime();
  const publishedMs = snapshot?.publishedAt ? new Date(snapshot.publishedAt).getTime() : NaN;
  const effectiveMs = snapshot?.effectiveAt ? new Date(snapshot.effectiveAt).getTime() : NaN;

  if (Number.isFinite(publishedMs) && publishedMs > cutoffMs) {
    return { status: 'INVALID', reason: 'Source publication is after the historical evaluation boundary.' };
  }
  if (Number.isFinite(effectiveMs) && effectiveMs > cutoffMs) {
    return { status: 'INVALID', reason: 'Source effective time is after the historical evaluation boundary.' };
  }
  if (!snapshot?.publishedAt && !snapshot?.effectiveAt) {
    return { status: 'UNKNOWN', reason: 'No source publication/effective timestamp is available.' };
  }
  return { status: 'VALID', reason: 'Source timing is available at or before the historical evaluation boundary.' };
}

export function qualifySourceArtifact({
  snapshot,
  normalized = false,
  identityValid = false,
  semanticValid = false,
  provenanceVerified = false,
  freshnessEligible = false,
  horizonUsable = false,
  evaluationAsOf = null,
} = {}) {
  const historical = assessHistoricalValidity(snapshot, evaluationAsOf);
  if (historical.status === 'INVALID') {
    return { stage: 'SOURCE_RECEIVED', status: 'BLOCKED', historicalValidity: historical.status, reason: historical.reason };
  }

  const productionAuthority = isProductionAuthoritative(snapshot) && provenanceVerified === true;

  if (!normalized) return { stage: 'SOURCE_RECEIVED', status: 'NOT_READY', historicalValidity: historical.status, reason: 'Artifact has not been normalized.' };
  if (!identityValid) return { stage: 'NORMALIZED', status: 'NOT_READY', historicalValidity: historical.status, reason: 'Issuer/source identity has not been validated.' };
  if (!semanticValid) return { stage: 'IDENTITY_VALIDATED', status: 'NOT_READY', historicalValidity: historical.status, reason: 'Source semantics have not been validated.' };
  if (!provenanceVerified || !productionAuthority) return { stage: 'SEMANTICALLY_VALIDATED', status: 'NOT_READY', historicalValidity: historical.status, reason: 'Production provenance, entitlement, or historical reproducibility is not established.' };
  if (!freshnessEligible) return { stage: 'PROVENANCE_VERIFIED', status: 'NOT_READY', historicalValidity: historical.status, reason: 'Freshness eligibility has not been established.' };
  if (!horizonUsable) return { stage: 'FRESHNESS_ELIGIBLE', status: 'NOT_READY', historicalValidity: historical.status, reason: 'Horizon usability has not been established.' };
  return { stage: 'USABLE_FOR_HORIZON', status: 'READY', historicalValidity: historical.status, reason: 'All supplied qualification gates passed.' };
}

export function isProductionAuthoritative(snapshot) {
  return snapshot?.accessMode === SOURCE_ACCESS_MODES.AUTHORITATIVE &&
    Boolean(snapshot?.authorityClass) &&
    snapshot?.entitlementVerified === true &&
    snapshot?.historicalReproducibilityVerified === true;
}
