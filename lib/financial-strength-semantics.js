const finite = (value) => typeof value === 'number' && Number.isFinite(value);

/**
 * Add explicit semantic state to the existing financial-strength research metric.
 * This helper does not change the score mathematics or become a Long-Term authority.
 */
export function applyFinancialStrengthSemantics(score = {}) {
  const coverage = String(score.financialStrengthCoverage || '').toUpperCase();
  const hasUsableScore = finite(score.financialStrength) &&
    Array.isArray(score.financialStrengthEvidence) &&
    score.financialStrengthEvidence.length > 0;

  if (!hasUsableScore) {
    return {
      ...score,
      financialStrength: null,
      financialStrengthRaw: null,
      financialStrengthStatus: 'UNAVAILABLE',
      financialStrengthUsableForLongTerm: false,
    };
  }

  if (coverage === 'FULL') {
    return {
      ...score,
      financialStrengthStatus: 'VERIFIED_FULL_COVERAGE',
      financialStrengthUsableForLongTerm: true,
    };
  }

  if (coverage === 'PARTIAL') {
    return {
      ...score,
      financialStrengthStatus: 'PARTIAL_RESEARCH_SCORE',
      financialStrengthUsableForLongTerm: false,
    };
  }

  return {
    ...score,
    financialStrengthCoverage: 'CURRENT_FIELDS_ONLY',
    financialStrengthStatus: 'CURRENT_SNAPSHOT_ONLY',
    financialStrengthUsableForLongTerm: false,
  };
}
