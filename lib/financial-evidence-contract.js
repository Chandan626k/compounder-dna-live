/**
 * Provider-neutral point-in-time financial evidence contract.
 * No provider is granted authority by this module.
 */
export const PIT_STATES = Object.freeze({
  PIT_VERIFIED: 'PIT_VERIFIED',
  PIT_UNKNOWN: 'PIT_UNKNOWN',
  PIT_INELIGIBLE: 'PIT_INELIGIBLE',
  SUPERSEDED: 'SUPERSEDED',
  INVALID: 'INVALID',
});

export const VALIDATION_STATES = Object.freeze({
  VALID: 'VALID',
  UNKNOWN: 'UNKNOWN',
  INVALID: 'INVALID',
});

export const ACCESS_STATES = Object.freeze({
  ALLOWED: 'ALLOWED',
  RESTRICTED: 'RESTRICTED',
  NOT_ALLOWED: 'NOT_ALLOWED',
  UNKNOWN: 'UNKNOWN',
});

export const REVISION_STATES = Object.freeze({
  ORIGINAL: 'ORIGINAL',
  REVISED: 'REVISED',
  SUPERSEDED: 'SUPERSEDED',
  CALCULATED: 'CALCULATED',
  UNKNOWN: 'UNKNOWN',
});

const PERIOD_TYPES = new Set(['ANNUAL', 'QUARTERLY', 'YTD', 'TTM', 'CURRENT_SNAPSHOT']);

function iso(value) {
  if (value == null || value === '') return null;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}
function finite(value) { return typeof value === 'number' && Number.isFinite(value); }
function text(value) { return typeof value === 'string' && value.trim() ? value.trim() : null; }

function periodKey(e) {
  return [
    e?.periodType || null,
    e?.accountingBasis || null,
    e?.reportingPeriodStart || null,
    e?.reportingPeriodEnd || null,
    e?.statementScope || null,
    e?.metricScope || null,
  ].join('|');
}

export function createFinancialEvidence(input = {}) {
  const evidence = Object.freeze({
    contract: 'STOCKSAMJHO_FINANCIAL_EVIDENCE_V1',
    issuerIdentity: input.issuerIdentity || null,
    securityIdentity: input.securityIdentity || null,
    metric: text(input.metric),
    value: input.value ?? null,
    unit: text(input.unit),
    currency: text(input.currency)?.toUpperCase() || null,
    accountingBasis: text(input.accountingBasis),
    reportingPeriodStart: iso(input.reportingPeriodStart),
    reportingPeriodEnd: iso(input.reportingPeriodEnd),
    periodType: text(input.periodType)?.toUpperCase() || null,
    statementScope: text(input.statementScope),
    metricScope: text(input.metricScope),
    publicationTimestamp: iso(input.publicationTimestamp),
    availabilityTimestamp: iso(input.availabilityTimestamp),
    effectiveTimestamp: iso(input.effectiveTimestamp),
    sourceType: text(input.sourceType),
    sourceAuthority: text(input.sourceAuthority),
    sourceDocumentId: text(input.sourceDocumentId),
    sourceDocumentVersion: text(input.sourceDocumentVersion),
    provider: text(input.provider),
    providerRecordId: text(input.providerRecordId),
    retrievedAt: iso(input.retrievedAt),
    revisionStatus: text(input.revisionStatus)?.toUpperCase() || REVISION_STATES.UNKNOWN,
    supersedes: input.supersedes || null,
    supersededAt: iso(input.supersededAt),
    lineage: input.lineage || null,
    validationState: text(input.validationState)?.toUpperCase() || VALIDATION_STATES.UNKNOWN,
    pitEligibility: input.pitEligibility || PIT_STATES.PIT_UNKNOWN,
    accessMode: text(input.accessMode),
    entitlementStatus: text(input.entitlementStatus)?.toUpperCase() || ACCESS_STATES.UNKNOWN,
    storagePolicy: text(input.storagePolicy),
    displayPolicy: text(input.displayPolicy),
    redistributionPolicy: text(input.redistributionPolicy),
    fixtureStatus: input.fixtureStatus || null,
  });

  const errors = [];
  if (!evidence.metric) errors.push('metric is required');
  if (!evidence.unit) errors.push('unit is required');
  if (!evidence.periodType || !PERIOD_TYPES.has(evidence.periodType)) errors.push('unsupported or missing periodType');
  if (evidence.reportingPeriodStart && evidence.reportingPeriodEnd
    && new Date(evidence.reportingPeriodEnd) < new Date(evidence.reportingPeriodStart)) errors.push('reporting period is inverted');
  if (!evidence.retrievedAt) errors.push('retrievedAt is required for provenance');
  if (evidence.value != null && !finite(evidence.value)) errors.push('numeric financial evidence value must be finite');
  if (evidence.validationState === VALIDATION_STATES.INVALID) errors.push('validationState is INVALID');
  if (evidence.pitEligibility === PIT_STATES.PIT_VERIFIED
    && (!evidence.publicationTimestamp || !evidence.availabilityTimestamp)) errors.push('PIT_VERIFIED requires publication and availability timestamps');

  return Object.freeze({
    evidence,
    validationState: errors.length ? VALIDATION_STATES.INVALID : evidence.validationState,
    periodKey: periodKey(evidence),
    errors: Object.freeze(errors),
  });
}

export function determinePitEligibility(evidence, evaluationTimestamp) {
  const e = evidence?.evidence || evidence || {};
  const evaluationMs = new Date(evaluationTimestamp).getTime();
  if (!Number.isFinite(evaluationMs)) return PIT_STATES.PIT_UNKNOWN;
  if (evidence?.validationState === VALIDATION_STATES.INVALID || e.validationState === VALIDATION_STATES.INVALID) return PIT_STATES.INVALID;

  // Revision lineage is part of point-in-time provenance. Missing or unknown revision
  // state must never default to an original filing or become PIT_VERIFIED.
  const revisionStatus = text(e.revisionStatus)?.toUpperCase() || REVISION_STATES.UNKNOWN;
  let supersededMs = null;
  if (revisionStatus === REVISION_STATES.SUPERSEDED) {
    if (!text(e.supersededAt)) return PIT_STATES.PIT_UNKNOWN;
    supersededMs = new Date(e.supersededAt).getTime();
    if (!Number.isFinite(supersededMs)) return PIT_STATES.PIT_UNKNOWN;
    if (supersededMs <= evaluationMs) return PIT_STATES.SUPERSEDED;
  } else if (revisionStatus === REVISION_STATES.REVISED) {
    const supersededDocumentId = text(e.supersedes?.documentId);
    const supersededDocumentVersion = text(e.supersedes?.documentVersion);
    if (!supersededDocumentId || !supersededDocumentVersion
      || (supersededDocumentId === e.sourceDocumentId && supersededDocumentVersion === e.sourceDocumentVersion)) {
      return PIT_STATES.PIT_UNKNOWN;
    }
  } else if (revisionStatus !== REVISION_STATES.ORIGINAL) {
    return PIT_STATES.PIT_UNKNOWN;
  }

  if (!e.publicationTimestamp || !e.availabilityTimestamp) return PIT_STATES.PIT_UNKNOWN;
  if (!e.sourceDocumentId || !e.sourceDocumentVersion) return PIT_STATES.PIT_UNKNOWN;

  const publicationMs = new Date(e.publicationTimestamp).getTime();
  const availabilityMs = new Date(e.availabilityTimestamp).getTime();
  if (!Number.isFinite(publicationMs) || !Number.isFinite(availabilityMs)) return PIT_STATES.PIT_UNKNOWN;
  if (publicationMs > evaluationMs || availabilityMs > evaluationMs) return PIT_STATES.PIT_INELIGIBLE;
  if (publicationMs > availabilityMs) return PIT_STATES.PIT_UNKNOWN;
  if (revisionStatus === REVISION_STATES.SUPERSEDED && supersededMs < availabilityMs) return PIT_STATES.PIT_UNKNOWN;
  if (e.pitEligibility === PIT_STATES.PIT_INELIGIBLE) return PIT_STATES.PIT_INELIGIBLE;
  return PIT_STATES.PIT_VERIFIED;
}

export function isPeriodCompatible(left, right) {
  const a = left?.evidence || left || {};
  const b = right?.evidence || right || {};
  return Boolean(a.periodType && b.periodType
    && a.reportingPeriodStart && b.reportingPeriodStart
    && a.reportingPeriodEnd && b.reportingPeriodEnd
    && a.accountingBasis && b.accountingBasis
    && a.statementScope && b.statementScope
    && a.metricScope && b.metricScope
    && periodKey(a) === periodKey(b));
}

export function isEconomicallyCompatible(left, right) {
  const a = left?.evidence || left || {};
  const b = right?.evidence || right || {};
  return Boolean(a.issuerIdentity && b.issuerIdentity
    && a.securityIdentity && b.securityIdentity
    && a.issuerIdentity === b.issuerIdentity
    && a.securityIdentity === b.securityIdentity
    && isPeriodCompatible(a, b)
    && a.currency && b.currency
    && a.currency === b.currency);
}

export function isSupersessionCandidate(next, prior) {
  const n = next?.evidence || next || {};
  const p = prior?.evidence || prior || {};
  return n.revisionStatus === 'REVISED'
    && Boolean(n.supersedes)
    && isEconomicallyCompatible(n, p)
    && n.supersedes.documentId === p.sourceDocumentId
    && n.supersedes.documentVersion === p.sourceDocumentVersion;
}

export function buildDerivedFinancialEvidence({ metric, value, unit, inputs, formula, formulaVersion, retrievedAt, sourceAuthority = 'STOCKSAMJHO_CALCULATION' }) {
  const evidenceInputs = Array.isArray(inputs) ? inputs : [];
  if (!evidenceInputs.length) throw new Error('Derived financial evidence requires input evidence');
  const first = evidenceInputs[0]?.evidence || evidenceInputs[0];
  for (const input of evidenceInputs) {
    if (!isEconomicallyCompatible(first, input)) throw new Error('Derived financial evidence inputs are incompatible');
  }
  return createFinancialEvidence({
    issuerIdentity: first.issuerIdentity,
    securityIdentity: first.securityIdentity,
    metric,
    value,
    unit,
    currency: first.currency,
    accountingBasis: first.accountingBasis,
    reportingPeriodStart: first.reportingPeriodStart,
    reportingPeriodEnd: first.reportingPeriodEnd,
    periodType: first.periodType,
    statementScope: first.statementScope,
    metricScope: first.metricScope,
    effectiveTimestamp: first.effectiveTimestamp,
    sourceType: 'calculated',
    sourceAuthority,
    retrievedAt,
    revisionStatus: 'CALCULATED',
    lineage: {
      formula,
      formulaVersion,
      inputs: evidenceInputs.map((input) => {
        const e = input?.evidence || input;
        return {
          metric: e.metric,
          sourceDocumentId: e.sourceDocumentId,
          sourceDocumentVersion: e.sourceDocumentVersion,
          provider: e.provider,
          providerRecordId: e.providerRecordId,
        };
      }),
    },
    validationState: VALIDATION_STATES.VALID,
    pitEligibility: PIT_STATES.PIT_UNKNOWN,
  });
}
