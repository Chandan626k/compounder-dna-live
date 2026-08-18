// Final evidence gate for research decisions.
// This layer is intentionally fail-closed: a high composite score cannot
// override missing critical financial or sector evidence.

const n = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

function sectorCoverage(analysis) {
  const s = analysis?.dataQuality?.sectorFramework || analysis?.score?.sectorFramework || {};
  const available = n(s.available);
  const total = n(s.total);
  return available != null && total > 0 ? (available / total) * 100 : null;
}

export function applyDecisionEvidenceGate(analysis) {
  const result = structuredClone(analysis || {});
  const dq = result.dataQuality || {};
  const score = result.score || {};
  const decision = result.decision || {};
  const coverage = sectorCoverage(result);
  const blockers = Array.isArray(decision.blockers) ? [...decision.blockers] : [];

  const confidence = n(dq.confidence);
  const criticalMissing = Array.isArray(dq.criticalMissingFields) ? dq.criticalMissingFields : [];
  const statementCoverage = score.financialStrengthCoverage || dq.financialStrengthCoverage || null;

  if (confidence != null && confidence < 70) blockers.push(`Evidence confidence is ${confidence}/100; high-confidence capital allocation is blocked.`);
  if (criticalMissing.length) blockers.push(`Critical evidence is missing: ${criticalMissing.join(', ')}.`);
  if (statementCoverage && statementCoverage !== 'FULL') blockers.push(`Financial statements are ${statementCoverage}; full statement evidence is required for a strong fundamental decision.`);
  if (coverage != null && coverage < 50) blockers.push(`Sector KPI coverage is only ${Math.round(coverage)}%; sector-specific evidence is insufficient for a high-confidence decision.`);

  const hardBlock =
    (confidence != null && confidence < 70) ||
    criticalMissing.length > 0 ||
    (statementCoverage != null && statementCoverage !== 'FULL') ||
    (coverage != null && coverage < 50);

  const isBuyLike = /BUY|ACCUMULATE/i.test(String(decision.action || ''));
  if (hardBlock && isBuyLike) {
    result.decision = {
      ...decision,
      action: 'WAIT — EVIDENCE INCOMPLETE',
      reason: [
        'The stock may score well, but critical evidence gates are not satisfied.',
        ...blockers,
        'Do not treat the composite score or valuation verdict as a standalone buy signal.',
      ].slice(0, 6),
      blockers: [...new Set(blockers)],
      gate: {
        status: 'BLOCKED',
        reason: 'Critical financial/sector evidence is incomplete.',
        confidence,
        sectorCoverage: coverage,
        financialStatementCoverage: statementCoverage,
        criticalMissingFields: criticalMissing,
      },
    };
  } else {
    result.decision = {
      ...decision,
      blockers: [...new Set(blockers)],
      gate: {
        status: hardBlock ? 'BLOCKED_FOR_HIGH_CONFIDENCE' : 'PASSED',
        confidence,
        sectorCoverage: coverage,
        financialStatementCoverage: statementCoverage,
        criticalMissingFields: criticalMissing,
      },
    };
  }

  return result;
}
