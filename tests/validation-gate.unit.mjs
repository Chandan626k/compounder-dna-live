import assert from 'node:assert/strict';
import {
  PROMOTION_CRITERIA,
  stableHash,
  parameterHash,
  artifactIdentityHash,
  buildEvidenceProvenance,
  verifyEvidenceProvenance,
  buildValidationGate,
} from '../lib/validation-gate.js';
import { RESEARCH_CANDIDATES } from '../lib/predictive-research.js';

const candidateParameters = Object.freeze({ ...RESEARCH_CANDIDATES[0] });
const candidateFamily = RESEARCH_CANDIDATES;
const artifact = {
  protocolId: 'predictive-validity-v1', protocolVersion: 1,
  symbol: 'TCS', candidateFamilyHash: stableHash(candidateFamily), candidateFamilySize: candidateFamily.length,
  horizon: 20, costs: { buyTransactionPct: 0.15, sellTransactionPct: 0.15, slippagePct: 0.10 },
  holdoutFraction: 0.20, totalBars: 1000, researchBars: 800, holdoutStart: 800, holdoutBars: 200,
  historyFingerprint: stableHash({ dataset: 'synthetic-pre-holdout' }),
  modelSelection: {
    method: 'FINAL_RESEARCH_WALK_FORWARD_WINDOW', window: 5,
    trainStart: 300, trainEnd: 799, testStart: 800, testEnd: 924,
    chosenCandidateId: candidateParameters.id, candidateParameters,
  },
  selectionTrace: [],
  finalHoldout: { status: 'UNTOUCHED', evaluated: false, selectionUsed: false },
};
artifact.artifactHash = artifactIdentityHash(artifact);
const researchRows = Array.from({ length: 800 }, (_, i) => ({ c: 100 + i }));

function evidence(evidenceType) {
  return buildEvidenceProvenance({
    artifact,
    candidateId: artifact.modelSelection.chosenCandidateId,
    candidateParameters: artifact.modelSelection.candidateParameters,
    evidenceType,
    researchRows,
    trainBars: 500,
    testBars: 125,
    windowIdentity: stableHash({ evidenceType, window: artifact.modelSelection.window }),
    aggregationMethod: stableHash({ evidenceType, method: 'frozen-aggregate' }),
    metricCalculationVersion: stableHash('runValidationBacktest:v1'),
    selectionMethod: evidenceType === 'MODEL_SELECTION_EVIDENCE' ? 'WALK_FORWARD_MODEL_SELECTION' : artifact.modelSelection.method,
    selectionRuleVersion: stableHash('training-only:frozen-candidate-family'),
  });
}

const modelSelectionEvidence = evidence('MODEL_SELECTION_EVIDENCE');
const finalCandidateEvidence = evidence('FINAL_CANDIDATE_VALIDATION_EVIDENCE');
assert.equal(modelSelectionEvidence.status, 'VERIFIABLE');
assert.equal(finalCandidateEvidence.status, 'VERIFIABLE');
assert.equal(verifyEvidenceProvenance(artifact, modelSelectionEvidence).valid, true);
assert.equal(verifyEvidenceProvenance(artifact, finalCandidateEvidence).valid, true);

const passingMetrics = {
  finalCandidateValidation: {
    costComparison: { conservative: { outOfSample: { winRate: 65, profitFactor: 1.5, expectancyPct: 0.4 } } },
    rollingOutOfSample: { summary: { positiveWindowRate: 75, worstWindowDrawdownPct: 18 } },
    provenance: finalCandidateEvidence,
  },
  modelSelectionEvidence: { provenance: modelSelectionEvidence },
  frozenResearchArtifact: artifact,
  universeIntegrity: { status: 'PASS', eligible: true },
  liquidity: { status: 'PASS' },
  decision: 'PRODUCTION-VALIDATE',
};
const eligible = buildValidationGate(passingMetrics);
assert.equal(eligible.productionEligible, true);
assert.deepEqual(eligible.blockers, []);
assert.equal(eligible.strategyQuality.pass, true);
assert.deepEqual(eligible.promotionCriteria, PROMOTION_CRITERIA);

function assertBlocked(mutator, expectedCheck) {
  const mutated = structuredClone(passingMetrics);
  mutator(mutated);
  const gate = buildValidationGate(mutated);
  assert.equal(gate.productionEligible, false);
  assert.equal(gate.provenance.valid, false);
  if (expectedCheck) assert.equal(gate.provenance.finalCandidateProvenance.checks[expectedCheck], false);
}

assertBlocked(x => { x.finalCandidateValidation.provenance.candidateId = 'wrong'; }, 'candidateId');
assertBlocked(x => { x.finalCandidateValidation.provenance.parameterHash = parameterHash({ ...candidateParameters, fast: 99 }); }, 'parameterHash');
assertBlocked(x => { x.finalCandidateValidation.provenance.artifactHash = 'wrong'; }, 'artifactHash');
assertBlocked(x => { x.finalCandidateValidation.provenance.protocolVersion = 99; }, 'protocolVersion');
assertBlocked(x => { x.finalCandidateValidation.provenance.candidateFamilyHash = 'wrong'; }, 'candidateFamilyHash');
assertBlocked(x => { x.finalCandidateValidation.provenance.historyFingerprint = 'wrong'; }, 'historyFingerprint');
assertBlocked(x => { x.finalCandidateValidation.provenance.researchBoundary.researchBars = 799; }, 'researchBoundary');
assertBlocked(x => { x.finalCandidateValidation.provenance.holdoutBoundary.holdoutBars = 201; }, 'holdoutBoundary');
assertBlocked(x => { x.finalCandidateValidation.provenance.horizon = 21; }, 'horizon');
assertBlocked(x => { x.finalCandidateValidation.provenance.trainingWindowDefinition.trainBars = 499; }, 'trainingWindowDefinition');
assertBlocked(x => { x.finalCandidateValidation.provenance.OOSWindowDefinition.testBars = 124; }, 'OOSWindowDefinition');
assertBlocked(x => { x.finalCandidateValidation.provenance.costModel = { ...x.finalCandidateValidation.provenance.costModel, slippagePct: 0.20 }; }, 'costModel');
assertBlocked(x => { x.finalCandidateValidation.provenance.slippage = 0.20; }, 'slippage');

for (const field of ['protocolId','protocolVersion','artifactHash','candidateId','parameterHash','candidateFamilyHash','historyFingerprint','researchBoundary','holdoutBoundary','horizon','costModel','slippage','trainingWindowDefinition','OOSWindowDefinition','selectionMethod','selectionRuleVersion','metricCalculationVersion','aggregationMethod']) {
  const x = structuredClone(passingMetrics);
  delete x.finalCandidateValidation.provenance[field];
  const gate = buildValidationGate(x);
  assert.equal(gate.productionEligible, false, `missing ${field} must block`);
}

for (const missing of ['modelSelectionEvidence','finalCandidateValidation','frozenResearchArtifact']) {
  const x = structuredClone(passingMetrics);
  delete x[missing];
  const gate = buildValidationGate(x);
  assert.equal(gate.productionEligible, false, `${missing} must block`);
}

const defaultParamsOnly = structuredClone(passingMetrics);
defaultParamsOnly.modelSelectionEvidence = undefined;
defaultParamsOnly.finalCandidateValidation = undefined;
defaultParamsOnly.frozenResearchArtifact = undefined;
defaultParamsOnly.costComparison = { conservative: { outOfSample: { winRate: 99, profitFactor: 9, expectancyPct: 9 } } };
defaultParamsOnly.rollingOutOfSample = { summary: { positiveWindowRate: 99, worstWindowDrawdownPct: 1 } };
const legacyOnlyGate = buildValidationGate(defaultParamsOnly);
assert.equal(legacyOnlyGate.productionEligible, false);
assert.ok(legacyOnlyGate.blockers.includes('MODEL_SELECTION_EVIDENCE_UNVERIFIED'));
assert.ok(legacyOnlyGate.blockers.includes('FINAL_CANDIDATE_EVIDENCE_UNVERIFIED'));

assert.equal(candidateFamily.length, 12);
assert.equal(candidateFamily.length, RESEARCH_CANDIDATES.length);
assert.equal(stableHash(candidateFamily), artifact.candidateFamilyHash);
assert.deepEqual(candidateParameters, artifact.modelSelection.candidateParameters);
assert.equal(PROMOTION_CRITERIA.minOutOfSampleWinRatePct, 60);
assert.equal(PROMOTION_CRITERIA.minOutOfSampleProfitFactor, 1.25);
assert.equal(PROMOTION_CRITERIA.minOutOfSampleExpectancyPct, 0);
assert.equal(PROMOTION_CRITERIA.minPositiveRollingWindowRatePct, 60);
assert.equal(PROMOTION_CRITERIA.maxRollingWorstDrawdownPct, 20);
assert.equal(artifact.modelSelection.trainEnd - artifact.modelSelection.trainStart + 1, 500);
assert.equal(artifact.modelSelection.testEnd - artifact.modelSelection.testStart + 1, 125);
assert.equal(artifact.researchBars / artifact.totalBars, 0.8);
assert.equal(artifact.holdoutBars / artifact.totalBars, 0.2);
assert.deepEqual(artifact.finalHoldout, { status: 'UNTOUCHED', evaluated: false, selectionUsed: false });

console.log('Validation gate provenance tests: PASS');
