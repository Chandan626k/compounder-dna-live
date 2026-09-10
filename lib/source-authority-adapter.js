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

export const REPORTING_RELATIONSHIPS = Object.freeze([
  'REVISED',
  'AMENDED',
  'CORRECTED',
  'RESTATED',
  'SUPERSEDES',
]);

const SUPERSEDING_RELATIONSHIPS = new Set(REPORTING_RELATIONSHIPS);

const asIso = (value) => {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const clean = (value) => value == null ? null : String(value);
const finiteDateMs = (value) => {
  const iso = asIso(value);
  return iso ? new Date(iso).getTime() : NaN;
};

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
  const snapshot = Object.freeze({
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
  });
  if (!snapshot.source || !snapshot.sourceDocumentId || !snapshot.retrievedAt) throw new Error('SOURCE_SNAPSHOT_IDENTITY_INCOMPLETE');
  if (!snapshot.contentHash) throw new Error('SOURCE_SNAPSHOT_HASH_MISSING');
  return snapshot;
}

export function assessHistoricalValidity(snapshot, evaluationAsOf) {
  const cutoff = asIso(evaluationAsOf);
  if (!cutoff) return { status: 'UNKNOWN', reason: 'Evaluation timestamp is unavailable.' };
  const cutoffMs = new Date(cutoff).getTime();
  const publishedMs = finiteDateMs(snapshot?.publishedAt);
  const effectiveMs = finiteDateMs(snapshot?.effectiveAt);
  if (Number.isFinite(publishedMs) && publishedMs > cutoffMs) return { status: 'INVALID', reason: 'Source publication is after the historical evaluation boundary.' };
  if (Number.isFinite(effectiveMs) && effectiveMs > cutoffMs) return { status: 'INVALID', reason: 'Source effective time is after the historical evaluation boundary.' };
  if (!snapshot?.publishedAt && !snapshot?.effectiveAt) return { status: 'UNKNOWN', reason: 'No source publication/effective timestamp is available.' };
  return { status: 'VALID', reason: 'Source timing is available at or before the historical evaluation boundary.' };
}

export function isProductionAuthoritative(snapshot) {
  return snapshot?.accessMode === SOURCE_ACCESS_MODES.AUTHORITATIVE &&
    Boolean(snapshot?.authorityClass) &&
    snapshot?.entitlementVerified === true &&
    snapshot?.historicalReproducibilityVerified === true;
}

export function qualifySourceArtifact({ snapshot, normalized = false, identityValid = false, semanticValid = false, provenanceVerified = false, freshnessEligible = false, horizonUsable = false, evaluationAsOf = null } = {}) {
  const historical = assessHistoricalValidity(snapshot, evaluationAsOf);
  if (historical.status !== 'VALID') {
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

const sameScope = (a, b) => ['issuer', 'ticker', 'exchange', 'reportingPeriod', 'periodType', 'statementScope', 'metricScope']
  .every((field) => (a?.[field] ?? null) === (b?.[field] ?? null));

export function resolveReportingSupersession(records = []) {
  const normalized = records.map((record) => ({ ...record, supersessionStatus: 'ACTIVE', supersededByDocumentId: null }));
  const byId = new Map(normalized.filter((record) => record.documentId || record.sourceDocumentId).map((record) => [record.documentId || record.sourceDocumentId, record]));
  for (const record of normalized) {
    const relation = String(record.relationship || record.supersedesRelation || '').toUpperCase();
    const targetId = record.supersedesDocumentId;
    if (!SUPERSEDING_RELATIONSHIPS.has(relation) || !targetId) continue;
    const target = byId.get(targetId);
    if (!target || !sameScope(record, target) || (record.documentId || record.sourceDocumentId) === targetId) continue;
    record.supersessionStatus = 'SUPERSEDES';
    record.supersedesDocumentId = targetId;
    target.supersededByDocumentId = record.documentId || record.sourceDocumentId;
  }
  return normalized;
}

export function selectHistoricalRecords(records = [], evaluationAsOf) {
  const cutoffMs = finiteDateMs(evaluationAsOf);
  if (!Number.isFinite(cutoffMs)) return [];
  return records.filter((record) => {
    const publishedMs = finiteDateMs(record?.publishedAt);
    const effectiveMs = record?.effectiveAt == null ? -Infinity : finiteDateMs(record.effectiveAt);
    return Number.isFinite(publishedMs) && publishedMs <= cutoffMs && effectiveMs <= cutoffMs;
  });
}

export function createReportingEvent({
  authorityClass,
  issuer,
  ticker = null,
  exchange,
  source,
  sourceDocumentId,
  sourceVersion = null,
  documentVersion = null,
  contentHash = null,
  reportingPeriod,
  periodType,
  statementScope = null,
  metricScope = null,
  eventType,
  eventTimestamp = null,
  exchangeReceivedAt = null,
  disseminatedAt = null,
  publishedAt,
  effectiveAt = null,
  retrievedAt,
  supersedesDocumentId = null,
  relationship = null,
  historicalValidity = 'UNASSESSED',
  accessMode = SOURCE_ACCESS_MODES.DEVELOPMENT_FIXTURE,
  entitlementVerified = false,
  historicalReproducibilityVerified = false,
} = {}) {
  if (!issuer || !exchange || !source || !sourceDocumentId || !reportingPeriod || !periodType || !eventType || !publishedAt || !retrievedAt) throw new Error('REPORTING_EVENT_IDENTITY_INCOMPLETE');
  const relation = relationship == null ? null : String(relationship).toUpperCase();
  if (relation && !REPORTING_RELATIONSHIPS.includes(relation)) throw new Error('REPORTING_EVENT_RELATIONSHIP_INVALID');
  return Object.freeze({
    authorityClass: clean(authorityClass), issuer: clean(issuer), ticker: clean(ticker), exchange: clean(exchange), source: clean(source),
    sourceDocumentId: clean(sourceDocumentId), sourceVersion: clean(sourceVersion), documentVersion: clean(documentVersion), contentHash: clean(contentHash),
    reportingPeriod: clean(reportingPeriod), periodType: clean(periodType), statementScope: clean(statementScope), metricScope: clean(metricScope),
    eventType: clean(eventType), eventTimestamp: asIso(eventTimestamp), exchangeReceivedAt: asIso(exchangeReceivedAt), disseminatedAt: asIso(disseminatedAt),
    publishedAt: asIso(publishedAt), effectiveAt: asIso(effectiveAt), retrievedAt: asIso(retrievedAt), supersedesDocumentId: clean(supersedesDocumentId),
    relationship: relation, historicalValidity: clean(historicalValidity), accessMode: clean(accessMode), entitlementVerified: entitlementVerified === true,
    historicalReproducibilityVerified: historicalReproducibilityVerified === true,
  });
}

export function createExchangeSession({
  exchange,
  timezone,
  tradingDate,
  tradingDay = null,
  holidayState = null,
  specialSession = null,
  session = null,
  sessionOpen = null,
  sessionClose = null,
  observationBoundary = null,
  calendarDocumentId,
  calendarVersion,
  publishedAt = null,
  effectiveFrom = null,
  effectiveTo = null,
  supersededAt = null,
  retrievedAt,
  contentHash = null,
  historicalValidity = 'UNASSESSED',
  accessMode = SOURCE_ACCESS_MODES.DEVELOPMENT_FIXTURE,
} = {}) {
  if (!exchange || !timezone || !tradingDate || !calendarDocumentId || !calendarVersion || !retrievedAt) throw new Error('EXCHANGE_SESSION_IDENTITY_INCOMPLETE');
  return Object.freeze({
    exchange: clean(exchange), timezone: clean(timezone), tradingDate: clean(tradingDate), tradingDay: tradingDay == null ? null : Boolean(tradingDay),
    holidayState: clean(holidayState), specialSession: clean(specialSession), session: clean(session), sessionOpen: asIso(sessionOpen), sessionClose: asIso(sessionClose),
    observationBoundary: clean(observationBoundary), calendarDocumentId: clean(calendarDocumentId), calendarVersion: clean(calendarVersion), publishedAt: asIso(publishedAt),
    effectiveFrom: asIso(effectiveFrom), effectiveTo: asIso(effectiveTo), supersededAt: asIso(supersededAt), retrievedAt: asIso(retrievedAt), contentHash: clean(contentHash),
    historicalValidity: clean(historicalValidity), accessMode: clean(accessMode),
  });
}

export function selectCalendarVersion(versions = [], evaluationAsOf) {
  const cutoffMs = finiteDateMs(evaluationAsOf);
  if (!Number.isFinite(cutoffMs)) return null;
  return versions
    .filter((version) => {
      const publishedMs = finiteDateMs(version?.publishedAt);
      const effectiveFromMs = version?.effectiveFrom == null ? -Infinity : finiteDateMs(version.effectiveFrom);
      const effectiveToMs = version?.effectiveTo == null ? Infinity : finiteDateMs(version.effectiveTo);
      const supersededMs = version?.supersededAt == null ? Infinity : finiteDateMs(version.supersededAt);
      return Number.isFinite(publishedMs) && publishedMs <= cutoffMs && effectiveFromMs <= cutoffMs && cutoffMs < effectiveToMs && cutoffMs < supersededMs;
    })
    .sort((a, b) => finiteDateMs(b.publishedAt) - finiteDateMs(a.publishedAt))[0] || null;
}

export function replayAuthorityAt({ records = [], calendars = [], evaluationAsOf } = {}) {
  const historicalRecords = selectHistoricalRecords(records, evaluationAsOf);
  const resolved = resolveReportingSupersession(historicalRecords);
  return { evaluationAsOf: asIso(evaluationAsOf), reportingEvents: resolved, calendar: selectCalendarVersion(calendars, evaluationAsOf) };
}
