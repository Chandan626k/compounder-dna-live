import { areEvidenceCompatible } from './financial-evidence.js';

const FINITE = (value) => typeof value === 'number' && Number.isFinite(value);
const text = (value) => value == null ? null : String(value);

const normalizePeriod = (value) => {
  const raw = String(value ?? '').trim().toUpperCase();
  if (raw === '12M' || raw === 'FY' || raw === 'ANNUAL') return 'ANNUAL';
  if (raw === 'TTM' || raw === 'TRAILING') return 'TTM';
  if (raw === 'FORWARD' || raw === 'ESTIMATE' || raw === 'FORWARD_ESTIMATE') return 'FORWARD';
  if (raw === '3M' || raw === 'QUARTERLY' || /^Q[1-4]$/.test(raw)) return 'QUARTERLY';
  if (raw === 'CURRENT' || raw === 'SPOT' || raw === 'MARKET') return 'CURRENT';
  return raw || null;
};

const semanticPeriod = (metric, qualification, periodSemantics) => {
  const explicit = normalizePeriod(periodSemantics?.periodType || periodSemantics?.period || periodSemantics?.semanticPeriod || qualification?.periodType || qualification?.period);
  if (explicit) return explicit;
  const q = String(qualification || '').toUpperCase();
  if (/FORWARD/.test(q)) return 'FORWARD';
  if (/TTM|TRAILING/.test(q)) return 'TTM';
  if (/CURRENT|SPOT|MARKET/.test(q)) return 'CURRENT';
  return null;
};

const methodAllows = (method, metric, period, qualification, contract) => {
  const rule = contract?.[method]?.inputs?.[metric] || contract?.[method]?.[metric];
  if (!rule) return false;
  const periods = Array.isArray(rule) ? rule : rule.periods;
  if (periods && !periods.map(normalizePeriod).includes(normalizePeriod(period))) return false;
  if (typeof rule === 'object' && Array.isArray(rule.qualifications) && qualification && !rule.qualifications.includes(qualification)) return false;
  return true;
};

export const DEFAULT_VALUATION_METHOD_CONTRACT = Object.freeze({
  DEFAULT: {
    inputs: {
      forwardEPS: { periods: ['FORWARD'] },
      trailingEPS: { periods: ['TTM'] },
      roe: { periods: ['CURRENT', 'TTM', 'ANNUAL'] },
      growthSignal: { periods: ['CURRENT', 'TTM', 'ANNUAL', 'FORWARD'] },
      currentPrice: { periods: ['CURRENT'] },
    },
    allowMixedPeriods: true,
  },
});

function canonicalRegistry(financials, valuationMetricLineage, currentPriceEvidence) {
  const byId = {};
  const merge = (value) => {
    if (!value) return;
    if (Array.isArray(value)) for (const record of value) if (record?.evidenceId) byId[record.evidenceId] = record;
    else if (value.byId) for (const [id, record] of Object.entries(value.byId)) if (record?.evidenceId || id) byId[id] = record;
    else if (value.evidenceId) byId[value.evidenceId] = value;
  };
  merge(financials?.canonicalEvidence);
  merge(financials?.statementEvidence?.canonicalEvidence);
  merge(financials?.evidence);
  merge(financials?.canonicalEvidence?.byId);
  for (const metric of Object.values(valuationMetricLineage || {})) {
    if (metric?.evidence?.evidenceId) merge(metric.evidence);
    for (const id of metric?.evidenceIds || []) {
      if (metric.evidence?.evidenceId === id) merge(metric.evidence);
    }
  }
  merge(currentPriceEvidence);
  return byId;
}

function inputEvidenceIds(input, metricLineage) {
  const ids = [...new Set([...(input?.evidenceIds || []), ...(metricLineage?.evidenceIds || [])].filter(Boolean))];
  return ids;
}

function validateIdentity(record, expectedTicker, expectedIssuer) {
  if (!record?.source || !record?.sourceKey || !record?.ticker) return false;
  if (expectedTicker && record.ticker !== expectedTicker) return false;
  if (expectedIssuer && record.issuer && record.issuer !== expectedIssuer) return false;
  return true;
}

function validateRecord(record, input, expectedTicker, expectedIssuer) {
  if (!record) return { ok: false, reason: 'EVIDENCE_ID_UNRESOLVED' };
  if (!FINITE(record.value) || !FINITE(input?.value) || record.value !== input.value) return { ok: false, reason: 'EVIDENCE_VALUE_MISMATCH' };
  if (!validateIdentity(record, expectedTicker, expectedIssuer)) return { ok: false, reason: 'EVIDENCE_IDENTITY_INVALID' };
  if (!record.status || !['PROVIDER_RETURNED', 'VERIFIED', 'VERIFIED_COMPATIBLE_STATEMENT_INPUTS', 'PRIMARY'].includes(record.status)) return { ok: false, reason: 'EVIDENCE_STATUS_INVALID' };
  if (!record.reportedOrDerived) return { ok: false, reason: 'EVIDENCE_PROVENANCE_MISSING' };
  if (!record.retrievedAt) return { ok: false, reason: 'EVIDENCE_RETRIEVAL_METADATA_MISSING' };
  if (record.periodType == null && !input?.periodSemantics) return { ok: false, reason: 'EVIDENCE_PERIOD_SEMANTICS_MISSING' };
  if (record.statementScope == null && input?.statementScopeRequired) return { ok: false, reason: 'EVIDENCE_STATEMENT_SCOPE_MISSING' };
  if (record.unit == null && input?.unitRequired) return { ok: false, reason: 'EVIDENCE_UNIT_MISSING' };
  if (record.currency == null && input?.currencyRequired) return { ok: false, reason: 'EVIDENCE_CURRENCY_MISSING' };
  const expectedPeriod = semanticPeriod(input.metric, input.qualification, input.periodSemantics);
  if (expectedPeriod && normalizePeriod(record.periodType) !== expectedPeriod && normalizePeriod(input.periodSemantics?.periodType) !== expectedPeriod) return { ok: false, reason: 'EVIDENCE_PERIOD_SEMANTICS_MISMATCH' };
  return { ok: true };
}

export function resolveValuationEvidence({
  valuation,
  valuationMetricLineage,
  financials,
  ticker,
  issuer = null,
  valuationMethod = 'DEFAULT',
  currentPriceEvidence = null,
  methodContract = DEFAULT_VALUATION_METHOD_CONTRACT,
} = {}) {
  const fairValue = valuationMetricLineage?.fairValue;
  const registry = canonicalRegistry(financials, valuationMetricLineage, currentPriceEvidence);
  const inputMetrics = fairValue?.inputMetrics || [];
  const lineageInputs = fairValue?.inputLineage || {};
  const inputs = inputMetrics.map((metric) => {
    const lineage = lineageInputs[metric] || valuationMetricLineage?.[metric] || {};
    const value = FINITE(lineage.value) ? lineage.value : valuation?.[metric];
    const evidenceIds = inputEvidenceIds(lineage, lineage);
    const records = evidenceIds.map((id) => registry[id] || null);
    const semantic = lineage.periodSemantics || lineage.qualification || null;
    const methodAllowedForMetric = methodAllows(valuationMethod, metric, semanticPeriod(metric, lineage.qualification, semantic), lineage.qualification, methodContract);
    const validations = records.map((record) => validateRecord(record, { value, metric, periodSemantics: semantic, statementScopeRequired: false, unitRequired: false, currencyRequired: false }, ticker, issuer));
    const compatible = records.length > 0 && records.every((record) => record && record.ticker === ticker) && records.slice(1).every((record) => areEvidenceCompatible(records[0], record));
    return { metric, value, evidenceIds, evidenceRecords: records, semanticRole: lineage.semanticRole || metric, qualification: lineage.qualification || null, periodSemantics: semantic, methodAllowedForMetric, validations, compatible };
  });

  const allIdsResolvable = inputs.every((input) => input.evidenceIds.length > 0 && input.evidenceRecords.every(Boolean));
  const allValuesMatch = inputs.every((input) => input.validations.every((validation) => validation.ok));
  const identityValid = inputs.every((input) => input.validations.every((validation) => validation.ok || validation.reason !== 'EVIDENCE_IDENTITY_INVALID')) && inputs.every((input) => input.evidenceRecords.length > 0 && input.evidenceRecords.every((record) => validateIdentity(record, ticker, issuer)));
  const compatibilityValid = inputs.every((input) => input.methodAllowedForMetric && input.compatible);
  const historicalValidity = inputs.every((input) => input.evidenceRecords.every((record) => record && record.reportingDate ? new Date(record.reportingDate).getTime() <= new Date(record.retrievedAt || 0).getTime() : true));
  const requiredInputsPresent = inputMetrics.length > 0 && inputs.length === inputMetrics.length;
  const fairValueProduced = FINITE(fairValue?.value) && fairValue?.value > 0;
  const verified = fairValueProduced && requiredInputsPresent && allIdsResolvable && allValuesMatch && identityValid && compatibilityValid && historicalValidity;
  const currentPrice = currentPriceEvidence || valuationMetricLineage?.currentPrice?.evidence || null;
  const currentPriceValid = !!currentPrice && FINITE(currentPrice.value) && currentPrice.value > 0 && validateIdentity(currentPrice, ticker, issuer) && !!currentPrice.source && !!currentPrice.sourceKey && !!currentPrice.retrievedAt;
  const status = !fairValueProduced ? 'UNAVAILABLE' : verified ? 'VERIFIED' : 'INSUFFICIENT_EVIDENCE';
  return {
    valuationMethod,
    fairValue: { value: fairValue?.value ?? null, status: fairValue?.status || null, classification: fairValue?.classification || null, calculation: fairValue?.calculation || null },
    inputs,
    evidenceResolution: { allIdsResolvable, allValuesMatch, identityValid, compatibilityValid, historicalValidity },
    valuationEvidenceStatus: status,
    fairValueProvenance: verified ? 'VERIFIED' : status,
    valuationEvidenceReferences: inputs.flatMap((input) => input.evidenceIds).filter(Boolean),
    valuationVerdict: valuation?.verdict || null,
    currentPriceEvidence: { evidence: currentPrice, valid: currentPriceValid },
    eligibleForInvestmentReadiness: verified && currentPriceValid,
    reasons: inputs.flatMap((input) => input.validations.filter((validation) => !validation.ok).map((validation) => validation.reason)),
  };
}
