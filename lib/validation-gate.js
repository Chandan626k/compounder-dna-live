import { createHash } from 'node:crypto';

const BLOCKED_DECISION = 'DO NOT PRODUCTION-VALIDATE';

export const PROMOTION_CRITERIA = Object.freeze({
  minOutOfSampleWinRatePct: 60,
  minOutOfSampleProfitFactor: 1.25,
  minOutOfSampleExpectancyPct: 0,
  minPositiveRollingWindowRatePct: 60,
  maxRollingWorstDrawdownPct: 20,
  targetAccuracyPct: 95,
});

export function stableHash(value) { return createHash('sha256').update(JSON.stringify(value)).digest('hex'); }
export function parameterHash(parameters) { return stableHash(parameters); }
export function artifactIdentityHash(artifact) {
  if (!artifact || typeof artifact !== 'object') return null;
  const { artifactHash: _ignored, ...identity } = artifact;
  return stableHash(identity);
}

export function buildEvidenceProvenance({ artifact, candidateId, candidateParameters, evidenceType, researchRows, trainBars, testBars, windowIdentity, aggregationMethod, metricCalculationVersion, selectionMethod, selectionRuleVersion }) {
  if (!artifact || !artifact.modelSelection) return { status: 'UNVERIFIABLE', reason: 'MISSING_FROZEN_ARTIFACT' };
  if (!Array.isArray(researchRows)) return { status: 'UNVERIFIABLE', reason: 'MISSING_RESEARCH_ROWS' };
  const selected = artifact.modelSelection;
  const finalTrainBars = selected.trainEnd - selected.trainStart + 1;
  const finalTestBars = selected.testEnd - selected.testStart + 1;
  const params = candidateParameters || selected.candidateParameters;
  const provenance = {
    evidenceType,
    protocolId: artifact.protocolId,
    protocolVersion: artifact.protocolVersion,
    artifactHash: artifact.artifactHash,
    candidateId: candidateId || selected.chosenCandidateId,
    parameterHash: parameterHash(params),
    candidateFamilyHash: artifact.candidateFamilyHash,
    candidateFamilySize: artifact.candidateFamilySize,
    historyFingerprint: artifact.historyFingerprint,
    datasetIdentity: artifact.historyFingerprint,
    researchBoundary: { researchBars: artifact.researchBars, holdoutStart: artifact.holdoutStart },
    holdoutBoundary: { holdoutStart: artifact.holdoutStart, holdoutBars: artifact.holdoutBars },
    trainingWindowDefinition: { trainBars: trainBars ?? finalTrainBars },
    OOSWindowDefinition: { testBars: testBars ?? finalTestBars },
    windowIdentity: windowIdentity || stableHash({ trainBars: trainBars ?? finalTrainBars, testBars: testBars ?? finalTestBars, researchBars: artifact.researchBars }),
    horizon: artifact.horizon,
    costModel: artifact.costs,
    slippage: artifact.costs?.slippagePct,
    selectionMethod: selectionMethod || selected.method,
    selectionRuleVersion: selectionRuleVersion || null,
    metricCalculationVersion: metricCalculationVersion || null,
    aggregationMethod: aggregationMethod || null,
    researchBarCount: researchRows.length,
    finalSelectedWindowIndex: selected.window,
  };
  const required = ['protocolId','protocolVersion','artifactHash','candidateId','parameterHash','candidateFamilyHash','candidateFamilySize','historyFingerprint','datasetIdentity','researchBoundary','holdoutBoundary','trainingWindowDefinition','OOSWindowDefinition','windowIdentity','horizon','costModel','slippage','selectionMethod','selectionRuleVersion','metricCalculationVersion','aggregationMethod'];
  const missing = required.filter(key => provenance[key] == null);
  return missing.length ? { ...provenance, status: 'UNVERIFIABLE', missing } : { ...provenance, status: 'VERIFIABLE' };
}

export function verifyEvidenceProvenance(artifact, evidence) {
  if (!artifact || !evidence || evidence.status !== 'VERIFIABLE') return { valid: false, reason: 'MISSING_REQUIRED_PROVENANCE' };
  const expectedArtifactHash = artifactIdentityHash(artifact);
  const expectedParameterHash = parameterHash(artifact.modelSelection?.candidateParameters);
  const finalTrainBars = artifact.modelSelection?.trainEnd - artifact.modelSelection?.trainStart + 1;
  const finalTestBars = artifact.modelSelection?.testEnd - artifact.modelSelection?.testStart + 1;
  const checks = {
    evidenceType: evidence.evidenceType === 'MODEL_SELECTION_EVIDENCE' || evidence.evidenceType === 'FINAL_CANDIDATE_VALIDATION_EVIDENCE',
    protocolId: evidence.protocolId === artifact.protocolId,
    protocolVersion: evidence.protocolVersion === artifact.protocolVersion,
    artifactHash: evidence.artifactHash === artifact.artifactHash && artifact.artifactHash === expectedArtifactHash,
    candidateId: evidence.candidateId === artifact.modelSelection?.chosenCandidateId,
    parameterHash: evidence.parameterHash === expectedParameterHash,
    candidateFamilyHash: evidence.candidateFamilyHash === artifact.candidateFamilyHash,
    candidateFamilySize: evidence.candidateFamilySize === artifact.candidateFamilySize,
    historyFingerprint: evidence.historyFingerprint === artifact.historyFingerprint,
    datasetIdentity: evidence.datasetIdentity === artifact.historyFingerprint,
    researchBoundary: JSON.stringify(evidence.researchBoundary) === JSON.stringify({ researchBars: artifact.researchBars, holdoutStart: artifact.holdoutStart }),
    holdoutBoundary: JSON.stringify(evidence.holdoutBoundary) === JSON.stringify({ holdoutStart: artifact.holdoutStart, holdoutBars: artifact.holdoutBars }),
    trainingWindowDefinition: evidence.trainingWindowDefinition?.trainBars === finalTrainBars,
    OOSWindowDefinition: evidence.OOSWindowDefinition?.testBars === finalTestBars,
    horizon: evidence.horizon === artifact.horizon,
    costModel: JSON.stringify(evidence.costModel) === JSON.stringify(artifact.costs),
    slippage: evidence.slippage === artifact.costs?.slippagePct,
    selectionMethod: evidence.evidenceType === 'MODEL_SELECTION_EVIDENCE'
      ? evidence.selectionMethod === 'WALK_FORWARD_MODEL_SELECTION'
      : evidence.selectionMethod === artifact.modelSelection?.method,
    selectionRuleVersion: evidence.selectionRuleVersion != null,
    metricCalculationVersion: evidence.metricCalculationVersion != null,
    aggregationMethod: evidence.aggregationMethod != null,
  };
  const valid = Object.values(checks).every(Boolean);
  return { valid, checks, reason: valid ? null : 'PROVENANCE_IDENTITY_MISMATCH' };
}

function strategyQuality(result) {
  const oos = result?.finalCandidateValidation?.costComparison?.conservative?.outOfSample || {};
  const rolling = result?.finalCandidateValidation?.rollingOutOfSample?.summary || {};
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

function provenanceState(result) {
  const artifact = result?.frozenResearchArtifact;
  const modelSelection = result?.modelSelectionEvidence;
  const finalCandidate = result?.finalCandidateValidation;
  const modelSelectionIdentity = verifyEvidenceProvenance(artifact, modelSelection?.provenance);
  const finalCandidateIdentity = verifyEvidenceProvenance(artifact, finalCandidate?.provenance);
  return {
    modelSelectionEvidencePresent: Boolean(modelSelection),
    finalCandidateEvidencePresent: Boolean(finalCandidate),
    modelSelectionProvenance: modelSelectionIdentity,
    finalCandidateProvenance: finalCandidateIdentity,
    valid: Boolean(modelSelection && finalCandidate && modelSelectionIdentity.valid && finalCandidateIdentity.valid),
  };
}

export function buildValidationGate(result = {}) {
  const blockers = [];
  const universe = result.universeIntegrity || {};
  const liquidity = result.liquidity || {};
  const provenance = provenanceState(result);
  const quality = strategyQuality(result);

  if (!provenance.modelSelectionEvidencePresent) blockers.push('MODEL_SELECTION_EVIDENCE_UNVERIFIED');
  if (!provenance.finalCandidateEvidencePresent) blockers.push('FINAL_CANDIDATE_EVIDENCE_UNVERIFIED');
  if (!provenance.valid) blockers.push('PROVENANCE_IDENTITY_UNVERIFIED');
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
    provenance,
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
