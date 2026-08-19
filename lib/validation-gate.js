const BLOCKED_DECISION = 'DO NOT PRODUCTION-VALIDATE';

export const PROMOTION_CRITERIA = Object.freeze({
  minOutOfSampleWinRatePct: 60,
  minOutOfSampleProfitFactor: 1.25,
  minOutOfSampleExpectancyPct: 0,
  minPositiveRollingWindowRatePct: 60,
  maxRollingWorstDrawdownPct: 20,
  targetAccuracyPct: 95,
});

function strategyQuality(result) {
  const oos = result?.costComparison?.conservative?.outOfSample || {};
  const rolling = result?.rollingOutOfSample?.summary || {};
  const metrics = {
    winRatePct: Number.isFinite(oos.winRate) ? oos.winRate : null,
    profitFactor: Number.isFinite(oos.profitFactor) ? oos.profitFactor : null,
    expectancyPct: Number.isFinite(oos.expectancyPct) ? oos.expectancyPct : null,
    positiveRollingWindowRatePct: Number.isFinite(rolling.positiveWindowRate) ? rolling.positiveWindowRate : null,
    worstRollingDrawdownPct: Number.isFinite(rolling.worstWindowDrawdownPct) ? rolling.worstWindowDrawdownPct : null,
  };
  const checks = {
    winRate: metrics.winRatePct != null && metrics.winRatePct >= PROMOTION_CRITERIA.minOutOfSampleWinRatePct,
    profitFactor: metrics.profitFactor != null && metrics.profitFactor >= PROMOTION_CRITERIA.minOutOfSampleProfitFactor,
    expectancy: metrics.expectancyPct != null && metrics.expectancyPct > PROMOTION_CRITERIA.minOutOfSampleExpectancyPct,
    rollingStability: metrics.positiveRollingWindowRatePct != null && metrics.positiveRollingWindowRatePct >= PROMOTION_CRITERIA.minPositiveRollingWindowRatePct,
    drawdown: metrics.worstRollingDrawdownPct != null && metrics.worstRollingDrawdownPct <= PROMOTION_CRITERIA.maxRollingWorstDrawdownPct,
  };
  return { metrics, checks, pass: Object.values(checks).every(Boolean) };
}

export function buildValidationGate(result = {}) {
  const blockers = [];
  const universe = result.universeIntegrity || {};
  const liquidity = result.liquidity || {};
  const quality = strategyQuality(result);

  if (universe.status !== 'PASS' || universe.eligible !== true) blockers.push('SURVIVORSHIP_UNVALIDATED');
  if (liquidity.status !== 'PASS') blockers.push('LIQUIDITY_MARKET_IMPACT_UNVALIDATED');
  if (result.decision === BLOCKED_DECISION) blockers.push('STRATEGY_NOT_PRODUCTION_VALIDATED');
  if (!quality.pass) blockers.push('ROBUSTNESS_CRITERIA_NOT_MET');

  const uniqueBlockers = [...new Set(blockers)];
  const productionEligible = uniqueBlockers.length === 0;

  return {
    productionEligible,
    decision: productionEligible ? 'PRODUCTION-ELIGIBLE' : BLOCKED_DECISION,
    blockers: uniqueBlockers,
    promotionCriteria: PROMOTION_CRITERIA,
    strategyQuality: quality,
    metricValidity: {
      historicalBacktest: productionEligible ? 'PRODUCTION_VALID' : 'RESEARCH_ONLY',
      rollingOutOfSample: productionEligible ? 'PRODUCTION_VALID' : 'RESEARCH_ONLY',
      regimeAnalysis: productionEligible ? 'PRODUCTION_VALID' : 'RESEARCH_ONLY',
      parameterSensitivity: 'DIAGNOSTIC_ONLY',
    },
    nextEvidence: productionEligible ? [] : [
      'Achieve fixed out-of-sample robustness criteria without retuning on the test period.',
      'Provide point-in-time historical universe snapshots covering the complete test range.',
      'Provide portfolio notional/order-size and market-impact evidence or a licensed impact model.',
      '95% is a research target; never relabel win-rate/precision as accuracy without a predefined test protocol.',
    ],
  };
}
