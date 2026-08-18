const BLOCKED_DECISION = 'DO NOT PRODUCTION-VALIDATE';

export function buildValidationGate(result = {}) {
  const blockers = [];
  const universe = result.universeIntegrity || {};
  const liquidity = result.liquidity || {};

  if (universe.status !== 'PASS' || universe.eligible !== true) {
    blockers.push('SURVIVORSHIP_UNVALIDATED');
  }
  if (liquidity.status !== 'PASS') {
    blockers.push('LIQUIDITY_MARKET_IMPACT_UNVALIDATED');
  }
  if (result.decision === BLOCKED_DECISION) {
    blockers.push('STRATEGY_NOT_PRODUCTION_VALIDATED');
  }

  const uniqueBlockers = [...new Set(blockers)];
  const productionEligible = uniqueBlockers.length === 0;

  return {
    productionEligible,
    decision: productionEligible ? 'PRODUCTION-ELIGIBLE' : BLOCKED_DECISION,
    blockers: uniqueBlockers,
    metricValidity: {
      historicalBacktest: productionEligible ? 'PRODUCTION_VALID' : 'RESEARCH_ONLY',
      rollingOutOfSample: productionEligible ? 'PRODUCTION_VALID' : 'RESEARCH_ONLY',
      regimeAnalysis: productionEligible ? 'PRODUCTION_VALID' : 'RESEARCH_ONLY',
      parameterSensitivity: 'DIAGNOSTIC_ONLY',
    },
    nextEvidence: productionEligible ? [] : [
      'Provide point-in-time historical universe snapshots covering the complete test range.',
      'Provide portfolio notional/order-size and market-impact evidence or a licensed impact model.',
      'Re-run validation without changing parameters or selecting favorable periods.',
    ],
  };
}
