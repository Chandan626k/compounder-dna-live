import { createHash } from 'node:crypto';
import { walkForwardCandidateSearch, RESEARCH_CANDIDATES } from './predictive-research.js';

export const FROZEN_PROTOCOL_ID = 'predictive-validity-v1';
export const FROZEN_HOLDOUT_FRACTION = 0.20;
export const FROZEN_HORIZON = 20;
export const FROZEN_COSTS = Object.freeze({ buyTransactionPct: 0.15, sellTransactionPct: 0.15, slippagePct: 0.10 });

export function stableHash(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

export function freezeResearchArtifact({ symbol, rows, candidateSearch }) {
  if (!candidateSearch || candidateSearch.status !== 'COMPLETED') throw new Error('CANDIDATE_SEARCH_NOT_COMPLETE');
  const windows = candidateSearch.windows || [];
  if (!windows.length) throw new Error('NO_RESEARCH_WINDOWS');
  const holdoutStart = Math.floor(rows.length * (1 - FROZEN_HOLDOUT_FRACTION));
  const selectedWindow = windows[windows.length - 1];
  if (!selectedWindow?.chosen) throw new Error('FINAL_RESEARCH_WINDOW_HAS_NO_CHOSEN_CANDIDATE');
  const candidate = RESEARCH_CANDIDATES.find(c => c.id === selectedWindow.chosen);
  if (!candidate) throw new Error(`UNKNOWN_FROZEN_CANDIDATE:${selectedWindow.chosen}`);

  // This is not a new selection rule: it freezes the candidate already chosen by the
  // final training-only walk-forward window. No holdout observation is consulted.
  const artifact = {
    protocolId: FROZEN_PROTOCOL_ID,
    protocolVersion: 1,
    symbol: String(symbol).toUpperCase().replace(/\.NS$|\.BO$/,''),
    candidateFamilyHash: stableHash(RESEARCH_CANDIDATES),
    candidateFamilySize: RESEARCH_CANDIDATES.length,
    horizon: FROZEN_HORIZON,
    costs: FROZEN_COSTS,
    holdoutFraction: FROZEN_HOLDOUT_FRACTION,
    totalBars: rows.length,
    researchBars: holdoutStart,
    holdoutStart,
    holdoutBars: rows.length - holdoutStart,
    modelSelection: {
      method: 'FINAL_RESEARCH_WALK_FORWARD_WINDOW',
      window: selectedWindow.window,
      trainStart: selectedWindow.trainStart,
      trainEnd: selectedWindow.trainEnd,
      testStart: selectedWindow.testStart,
      testEnd: selectedWindow.testEnd,
      chosenCandidateId: candidate.id,
      candidateParameters: candidate,
    },
    selectionTrace: windows.map(w => ({
      window: w.window, trainStart: w.trainStart, trainEnd: w.trainEnd,
      testStart: w.testStart, testEnd: w.testEnd, chosen: w.chosen,
    })),
    finalHoldout: { status: 'UNTOUCHED', evaluated: false, selectionUsed: false },
  };
  artifact.artifactHash = stableHash(artifact);
  return Object.freeze(artifact);
}

export function buildResearchArtifact(symbol, rows, options = {}) {
  const candidateSearch = walkForwardCandidateSearch(rows, {
    horizon: FROZEN_HORIZON,
    costs: FROZEN_COSTS,
    ...options,
  });
  return freezeResearchArtifact({ symbol, rows, candidateSearch });
}
