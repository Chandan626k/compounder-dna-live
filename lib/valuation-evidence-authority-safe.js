import { resolveValuationEvidence as resolveBaseValuationEvidence } from './valuation-evidence-authority.js';

export function resolveValuationEvidence(input = {}) {
  const result = resolveBaseValuationEvidence(input);
  const providerReturned = result.inputs?.some((metric) => metric.evidenceRecords?.some((record) => String(record?.status || '').toUpperCase() === 'PROVIDER_RETURNED'));
  if (!providerReturned) return result;
  return {
    ...result,
    valuationEvidenceStatus: 'INSUFFICIENT_EVIDENCE',
    fairValueProvenance: 'INSUFFICIENT_EVIDENCE',
    eligibleForInvestmentReadiness: false,
    blockingReason: 'PROVIDER_RETURNED evidence cannot be promoted to VERIFIED valuation evidence.',
  };
}
