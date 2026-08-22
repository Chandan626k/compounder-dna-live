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
import {
  metricCalculationVersion,
  modelSelectionAggregationMethod,
  finalCandidateAggregationMethod,
  modelSelectionWindowIdentity,
  finalCandidateWindowIdentity,
  trainingWindowDefinition,
  OOSWindowDefinition,
  selectionRuleVersion,
} from '../lib/canonical-provenance.js';
import { RESEARCH_CANDIDATES } from '../lib/predictive-research.js';

const candidateParameters = Object.freeze({ ...RESEARCH_CANDIDATES[0] });
const candidateFamily = RESEARCH_CANDIDATES;
const selectionRule = 'training-only: >=8 trades, positive expectancy, PF>1, maxDD<=25%; otherwise highest training expectancy';
const selectionTrace = [
  { window: 1, trainStart: 0, trainEnd: 499, testStart: 500, testEnd: 624, chosen: candidateParameters.id },
  { window: 2, trainStart: 125, trainEnd: 624, testStart: 625, testEnd: 749, chosen: RESEARCH_CANDIDATES[1].id },
  { window: 3, trainStart: 250, trainEnd: 749, testStart: 750, testEnd: 874, chosen: RESEARCH_CANDIDATES[2].id },
  { window: 4, trainStart: 375, trainEnd: 874, testStart: 875, testEnd: 999, chosen: RESEARCH_CANDIDATES[3].id },
];
const modelSelection = {
  method: 'FINAL_RESEARCH_WALK_FORWARD_WINDOW', window: 4,
  trainStart: 375, trainEnd: 874, testStart: 875, testEnd: 999,
  chosenCandidateId: candidateParameters.id, candidateParameters,
};
const modelSelectionSummaryKeys = ['windows', 'usableWindows', 'positiveWindowRatePct', 'aggregateReturnPct', 'meanTestExpectancyPct', 'testExpectancyBonferroniCI', 'worstTestDrawdownPct'];
const baseArtifact = {
  protocolId: 'predictive-validity-v1', protocolVersion: 1,
  symbol: 'TCS', candidateFamilyHash: stableHash(candidateFamily), candidateFamilySize: candidateFamily.length,
  horizon: 20, costs: { buyTransactionPct: 0.15, sellTransactionPct: 0.15, slippagePct: 0.10 },
  holdoutFraction: 0.20, totalBars: 1250, researchBars: 1000, holdoutStart: 1000, holdoutBars: 250,
  historyFingerprint: stableHash({ dataset: 'synthetic-pre-holdout' }),
  modelSelection,
  selectionTrace,
  provenance: {
    trainingWindowDefinition: trainingWindowDefinition(modelSelection),
    OOSWindowDefinition: OOSWindowDefinition(modelSelection),
    windowIdentity: {
      modelSelection: modelSelectionWindowIdentity(selectionTrace),
      finalCandidate: finalCandidateWindowIdentity(modelSelection),
    },
    selectionMethod: {
      modelSelection: 'WALK_FORWARD_MODEL_SELECTION',
      finalCandidate: modelSelection.method,
    },
    selectionRuleVersion: selectionRuleVersion(selectionRule),
    metricCalculationVersion: metricCalculationVersion('runValidationBacktest:v1'),
    aggregationMethod: {
      modelSelection: modelSelectionAggregationMethod({ method: 'WALK_FORWARD_MODEL_SELECTION', summaryKeys: modelSelectionSummaryKeys }),
      finalCandidate: finalCandidateAggregationMethod(),
    },
  },
  finalHoldout: { status: 'UNTOUCHED', evaluated: false, selectionUsed: false },
};
const artifact = { ...baseArtifact, artifactHash: artifactIdentityHash(baseArtifact) };
const researchRows = Array.from({ length: 1000 }, (_, i) => ({ c: 100 + i }));

function evidence(artifactInput, evidenceType) {
  return buildEvidenceProvenance({
    artifact: artifactInput,
    candidateId: artifactInput.modelSelection.chosenCandidateId,
    candidateParameters: artifactInput.modelSelection.candidateParameters,
    evidenceType,
    researchRows,
  });
}

const modelSelectionEvidence = evidence(artifact, 'MODEL_SELECTION_EVIDENCE');
assert.equal(modelSelectionEvidence.status, 'VERIFIABLE');
assert.equal(modelSelectionEvidence.independenceStatus, 'VERIFIED');
assert.equal(verifyEvidenceProvenance(artifact, modelSelectionEvidence).valid, true);

// The current frozen artifact has no independent pre-holdout evaluation partition.
const unavailableFinalCandidateEvidence = evidence(artifact, 'FINAL_CANDIDATE_VALIDATION_EVIDENCE');
assert.equal(unavailableFinalCandidateEvidence.status, 'UNVERIFIABLE');
assert.equal(unavailableFinalCandidateEvidence.reason, 'INDEPENDENT_FINAL_CANDIDATE_VALIDATION_UNAVAILABLE');
assert.equal(verifyEvidenceProvenance(artifact, unavailableFinalCandidateEvidence).valid, false);

// Future/approved independent-evidence fixture: only used to prove the gate's positive wiring.
// It is not present in the current frozen artifact and does not authorize holdout use.
const independentArtifactBase = structuredClone(artifact);
independentArtifactBase.independentValidation = { status: 'VERIFIED' };
independentArtifactBase.artifactHash = undefined;
const independentArtifact = { ...independentArtifactBase, artifactHash: artifactIdentityHash(independentArtifactBase) };
const finalCandidateEvidence = evidence(independentArtifact, 'FINAL_CANDIDATE_VALIDATION_EVIDENCE');
assert.equal(finalCandidateEvidence.status, 'VERIFIABLE');
assert.equal(finalCandidateEvidence.independenceStatus, 'VERIFIED');
assert.equal(verifyEvidenceProvenance(independentArtifact, finalCandidateEvidence).valid, true);

const passingMetrics = {
  finalCandidateValidation: {
    costComparison: { conservative: { outOfSample: { winRate: 65, profitFactor: 1.5, expectancyPct: 0.4 } } },
    rollingOutOfSample: { summary: { positiveWindowRate: 75, worstWindowDrawdownPct: 18 } },
    provenance: finalCandidateEvidence,
  },
  modelSelectionEvidence: { provenance: evidence(independentArtifact, 'MODEL_SELECTION_EVIDENCE') },
  frozenResearchArtifact: independentArtifact,
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
assertBlocked(x => { x.finalCandidateValidation.provenance.protocolId = 'wrong'; }, 'protocolId');
assertBlocked(x => { x.finalCandidateValidation.provenance.protocolVersion = 99; }, 'protocolVersion');
assertBlocked(x => { x.finalCandidateValidation.provenance.candidateFamilyHash = 'wrong'; }, 'candidateFamilyHash');
assertBlocked(x => { x.finalCandidateValidation.provenance.candidateFamilySize = 11; }, 'candidateFamilySize');
assertBlocked(x => { x.finalCandidateValidation.provenance.historyFingerprint = 'wrong'; }, 'historyFingerprint');
assertBlocked(x => { x.finalCandidateValidation.provenance.datasetIdentity = 'wrong'; }, 'datasetIdentity');
assertBlocked(x => { x.finalCandidateValidation.provenance.researchBoundary.researchBars = 999; }, 'researchBoundary');
assertBlocked(x => { x.finalCandidateValidation.provenance.holdoutBoundary.holdoutBars = 251; }, 'holdoutBoundary');
assertBlocked(x => { x.finalCandidateValidation.provenance.horizon = 21; }, 'horizon');
assertBlocked(x => { x.finalCandidateValidation.provenance.trainingWindowDefinition.trainStart = 376; }, 'trainingWindowDefinition');
assertBlocked(x => { x.finalCandidateValidation.provenance.OOSWindowDefinition.testEnd = 998; }, 'OOSWindowDefinition');
assertBlocked(x => { x.finalCandidateValidation.provenance.windowIdentity = 'wrong'; }, 'windowIdentity');
assertBlocked(x => { x.finalCandidateValidation.provenance.selectionMethod = 'wrong'; }, 'selectionMethod');
assertBlocked(x => { x.finalCandidateValidation.provenance.selectionRuleVersion = 'wrong'; }, 'selectionRuleVersion');
assertBlocked(x => { x.finalCandidateValidation.provenance.metricCalculationVersion = 'wrong'; }, 'metricCalculationVersion');
assertBlocked(x => { x.finalCandidateValidation.provenance.aggregationMethod = 'wrong'; }, 'aggregationMethod');
assertBlocked(x => { x.finalCandidateValidation.provenance.costModel = { ...x.finalCandidateValidation.provenance.costModel, slippagePct: 0.20 }; }, 'costModel');
assertBlocked(x => { x.finalCandidateValidation.provenance.slippage = 0.20; }, 'slippage');

for (const field of ['protocolId','protocolVersion','artifactHash','candidateId','parameterHash','candidateFamilyHash','candidateFamilySize','historyFingerprint','datasetIdentity','researchBoundary','holdoutBoundary','trainingWindowDefinition','OOSWindowDefinition','windowIdentity','horizon','costModel','slippage','selectionMethod','selectionRuleVersion','metricCalculationVersion','aggregationMethod']) {
  const x = structuredClone(passingMetrics);
  delete x.finalCandidateValidation.provenance[field];
  const gate = buildValidationGate(x);
  assert.equal(gate.productionEligible, false, `missing ${field} must block`);
}

for (const field of ['trainingWindowDefinition','OOSWindowDefinition','windowIdentity','selectionRuleVersion','metricCalculationVersion','aggregationMethod']) {
  const x = structuredClone(passingMetrics);
  x.finalCandidateValidation.provenance[field] = null;
  const gate = buildValidationGate(x);
  assert.equal(gate.productionEligible, false, `null ${field} must block`);
}

for (const missing of ['modelSelectionEvidence','finalCandidateValidation','frozenResearchArtifact']) {
  const x = structuredClone(passingMetrics);
  delete x[missing];
  const gate = buildValidationGate(x);
  assert.equal(gate.productionEligible, false, `${missing} must block`);
}

const currentArtifactGate = buildValidationGate({
  ...passingMetrics,
  frozenResearchArtifact: artifact,
  modelSelectionEvidence: { provenance: modelSelectionEvidence },
  finalCandidateValidation: { ...passingMetrics.finalCandidateValidation, provenance: unavailableFinalCandidateEvidence },
});
assert.equal(currentArtifactGate.productionEligible, false);
assert.ok(currentArtifactGate.blockers.includes('FINAL_CANDIDATE_INDEPENDENCE_UNVERIFIED'));

const wrongArtifact = structuredClone(passingMetrics);
wrongArtifact.frozenResearchArtifact.protocolVersion = 2;
const wrongArtifactGate = buildValidationGate(wrongArtifact);
assert.equal(wrongArtifactGate.productionEligible, false);

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
assert.equal(artifact.independentValidation, undefined);

console.log('Validation gate provenance tests: PASS');
