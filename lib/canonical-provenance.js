import { createHash } from 'node:crypto';

export const FROZEN_TRAIN_BARS = 500;
export const FROZEN_OOS_BARS = 125;

export function stableHash(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function validWindow(window) {
  return Boolean(window)
    && Number.isInteger(window.trainStart)
    && Number.isInteger(window.trainEnd)
    && Number.isInteger(window.testStart)
    && Number.isInteger(window.testEnd)
    && window.trainEnd >= window.trainStart
    && window.testEnd >= window.testStart;
}

export function trainingWindowDefinition(modelSelection) {
  if (!modelSelection || !Number.isInteger(modelSelection.trainStart) || !Number.isInteger(modelSelection.trainEnd)) return null;
  return {
    trainBars: modelSelection.trainEnd - modelSelection.trainStart + 1,
    trainStart: modelSelection.trainStart,
    trainEnd: modelSelection.trainEnd,
  };
}

export function OOSWindowDefinition(modelSelection) {
  if (!modelSelection || !Number.isInteger(modelSelection.testStart) || !Number.isInteger(modelSelection.testEnd)) return null;
  return {
    testBars: modelSelection.testEnd - modelSelection.testStart + 1,
    testStart: modelSelection.testStart,
    testEnd: modelSelection.testEnd,
  };
}

export function modelSelectionTrainingWindowDefinition(selectionTrace) {
  if (!Array.isArray(selectionTrace) || !selectionTrace.length || !selectionTrace.every(validWindow)) return null;
  const lengths = selectionTrace.map(w => w.trainEnd - w.trainStart + 1);
  if (!lengths.every(v => v === FROZEN_TRAIN_BARS)) return null;
  return { trainBars: FROZEN_TRAIN_BARS, windowCount: selectionTrace.length };
}

export function modelSelectionOOSWindowDefinition(selectionTrace) {
  if (!Array.isArray(selectionTrace) || !selectionTrace.length || !selectionTrace.every(validWindow)) return null;
  const lengths = selectionTrace.map(w => w.testEnd - w.testStart + 1);
  if (!lengths.every(v => v === FROZEN_OOS_BARS)) return null;
  return { testBars: FROZEN_OOS_BARS, windowCount: selectionTrace.length };
}

export function finalCandidateWindowIdentity(modelSelection) {
  if (!modelSelection || !validWindow(modelSelection) || !modelSelection.chosenCandidateId) return null;
  return stableHash({
    window: modelSelection.window,
    trainStart: modelSelection.trainStart,
    trainEnd: modelSelection.trainEnd,
    testStart: modelSelection.testStart,
    testEnd: modelSelection.testEnd,
    chosen: modelSelection.chosenCandidateId,
  });
}

export function modelSelectionWindowIdentity(selectionTrace) {
  if (!Array.isArray(selectionTrace) || !selectionTrace.length || !selectionTrace.every(validWindow)) return null;
  return stableHash(selectionTrace.map(w => ({
    window: w.window,
    trainStart: w.trainStart,
    trainEnd: w.trainEnd,
    testStart: w.testStart,
    testEnd: w.testEnd,
    chosen: w.chosen,
  })));
}

export function finalCandidateRollingWindowIdentity(researchBars, horizon) {
  if (!Number.isInteger(researchBars) || !Number.isInteger(horizon)) return null;
  return stableHash({ type: 'FINAL_CANDIDATE_RESEARCH_ROLLING', researchBars, horizon });
}

export function selectionRuleVersion(selectionRule) {
  return typeof selectionRule === 'string' && selectionRule.length ? stableHash(selectionRule) : null;
}

export function metricCalculationVersion(metricCalculationSource) {
  return typeof metricCalculationSource === 'string' && metricCalculationSource.length ? stableHash(metricCalculationSource) : null;
}

export function modelSelectionAggregationMethod({ method, summaryKeys }) {
  if (typeof method !== 'string' || !Array.isArray(summaryKeys)) return null;
  return stableHash(JSON.stringify({ method, summaryKeys: [...summaryKeys].sort() }));
}

export function finalCandidateAggregationMethod() {
  return stableHash(JSON.stringify({ costEvidence: 'single-research-oos', rollingEvidence: 'fixed-candidate-rolling-oos' }));
}

export function expectedAggregationMethod(evidenceType, artifact) {
  if (evidenceType === 'MODEL_SELECTION_EVIDENCE') return artifact?.provenance?.aggregationMethod?.modelSelection ?? null;
  if (evidenceType === 'FINAL_CANDIDATE_VALIDATION_EVIDENCE') return artifact?.provenance?.aggregationMethod?.finalCandidate ?? null;
  return null;
}

export function expectedWindowIdentity(evidenceType, artifact) {
  if (evidenceType === 'MODEL_SELECTION_EVIDENCE') return modelSelectionWindowIdentity(artifact?.selectionTrace);
  if (evidenceType === 'FINAL_CANDIDATE_VALIDATION_EVIDENCE') return finalCandidateWindowIdentity(artifact?.modelSelection);
  return null;
}

export function expectedTrainingWindowDefinition(evidenceType, artifact) {
  if (evidenceType === 'MODEL_SELECTION_EVIDENCE') return modelSelectionTrainingWindowDefinition(artifact?.selectionTrace);
  if (evidenceType === 'FINAL_CANDIDATE_VALIDATION_EVIDENCE') return trainingWindowDefinition(artifact?.modelSelection);
  return null;
}

export function expectedOOSWindowDefinition(evidenceType, artifact) {
  if (evidenceType === 'MODEL_SELECTION_EVIDENCE') return modelSelectionOOSWindowDefinition(artifact?.selectionTrace);
  if (evidenceType === 'FINAL_CANDIDATE_VALIDATION_EVIDENCE') return OOSWindowDefinition(artifact?.modelSelection);
  return null;
}

export function finalCandidateIndependenceStatus(artifact) {
  return artifact?.independentValidation?.status === 'VERIFIED' ? 'VERIFIED' : 'UNAVAILABLE';
}
