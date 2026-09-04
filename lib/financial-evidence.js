import { createHash } from 'node:crypto';

export const EVIDENCE_PERIOD_TYPES = Object.freeze({
  ANNUAL: 'ANNUAL',
  QUARTERLY: 'QUARTERLY',
  TTM: 'TTM',
});

const clean = (value) => value == null ? null : String(value);

export function normalizeEvidencePeriodType(value, fallback = null) {
  const raw = String(value ?? fallback ?? '').trim().toUpperCase();
  if (raw === '12M' || raw === 'FY' || raw === 'ANNUAL') return EVIDENCE_PERIOD_TYPES.ANNUAL;
  if (raw === '3M' || raw === 'QUARTERLY' || raw === 'Q1' || raw === 'Q2' || raw === 'Q3' || raw === 'Q4') return EVIDENCE_PERIOD_TYPES.QUARTERLY;
  if (raw === 'TTM' || raw === 'TRAILING') return EVIDENCE_PERIOD_TYPES.TTM;
  return null;
}

export function buildEvidenceId({
  source,
  ticker,
  sourceKey,
  issuer = null,
  reportingDate,
  reportingPeriod = null,
  periodType,
  statementScope,
  unit = null,
  currency = null,
  reportedOrDerived = null,
  documentVersion = null,
  value = null,
}) {
  const identity = [
    source,
    issuer,
    ticker,
    sourceKey,
    reportingDate,
    reportingPeriod,
    periodType,
    statementScope,
    unit,
    currency,
    reportedOrDerived,
    documentVersion,
    value,
  ].map(clean).join('|');
  return `ev_${createHash('sha256').update(identity).digest('hex').slice(0, 24)}`;
}

export function createCanonicalEvidence({
  source,
  sourceKey,
  issuer = null,
  ticker = null,
  value = null,
  reportingDate = null,
  reportingPeriod = null,
  periodType = null,
  statementScope = null,
  unit = null,
  currency = null,
  reportedOrDerived = 'REPORTED',
  status = null,
  documentType = null,
  documentTitle = null,
  sourceUrl = null,
  retrievedAt = null,
  page = null,
  table = null,
  documentVersion = null,
  extractionMethod = null,
} = {}) {
  const normalizedPeriodType = normalizeEvidencePeriodType(periodType);
  return {
    evidenceId: buildEvidenceId({
      source,
      ticker,
      sourceKey,
      issuer,
      value,
      reportingDate,
      reportingPeriod,
      periodType: normalizedPeriodType || periodType,
      statementScope,
      unit,
      currency,
      reportedOrDerived,
      documentVersion,
    }),
    source: clean(source),
    sourceKey: clean(sourceKey),
    issuer: clean(issuer),
    ticker: clean(ticker),
    value: value ?? null,
    reportingDate: clean(reportingDate),
    reportingPeriod: clean(reportingPeriod),
    periodType: normalizedPeriodType,
    statementScope: clean(statementScope),
    unit: clean(unit),
    currency: clean(currency),
    reportedOrDerived: clean(reportedOrDerived),
    status: clean(status),
    documentType: clean(documentType),
    documentTitle: clean(documentTitle),
    sourceUrl: clean(sourceUrl),
    retrievedAt: clean(retrievedAt),
    page: page ?? null,
    table: clean(table),
    documentVersion: clean(documentVersion),
    extractionMethod: clean(extractionMethod),
  };
}

export function areEvidenceCompatible(a, b) {
  if (!a || !b) return false;

  if (!a.issuer || !b.issuer || a.issuer !== b.issuer) return false;
  if (!a.ticker || !b.ticker || a.ticker !== b.ticker) return false;

  const periodA = normalizeEvidencePeriodType(a.periodType);
  const periodB = normalizeEvidencePeriodType(b.periodType);
  if (!periodA || !periodB || periodA !== periodB) return false;
  if (!a.reportingDate || !b.reportingDate || a.reportingDate !== b.reportingDate) return false;
  if (!a.reportingPeriod || !b.reportingPeriod || a.reportingPeriod !== b.reportingPeriod) return false;

  if (!a.statementScope || !b.statementScope || a.statementScope !== b.statementScope) return false;
  if (!a.unit || !b.unit || a.unit !== b.unit) return false;
  if (!a.currency || !b.currency || a.currency !== b.currency) return false;

  return true;
}

export function evidenceReference(evidence) {
  return evidence?.evidenceId || null;
}
