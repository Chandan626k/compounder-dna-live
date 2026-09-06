import assert from 'node:assert/strict';
import { buildActionability } from '../lib/actionability.js';

const analysis = {
  stock: { symbol: 'ICICIBANK', price: 1412, dataLimited: true },
  dataLimited: true,
  dataQuality: {
    confidence: 65,
    warnings: ['Critical data unavailable'],
    sectorFramework: { available: 2, total: 8 },
  },
  score: {
    financialStrengthCoverage: 'CURRENT_FIELDS_ONLY',
    sectorFramework: { available: 2, total: 8 },
    overall: 82,
  },
  valuation: {
    verdict: 'UNDERVALUED',
    fairValue: 2135.62,
    marginOfSafety: 33.88,
    conservativeFairValue: 1829.20,
    baseFairValue: 2135.62,
    optimisticFairValue: 2339.90,
  },
  decision: { blockers: ['Critical data missing: Debt/Equity'] },
};

const riskEvidence = {
  invalidationLevel: 102,
  targetZones: [119],
  targetEvidence: [{ price: 119, type: 'RESISTANCE', touches: 2, strength: 70, lastDate: '2026-08-20T00:00:00.000Z' }],
  invalidationEvidence: { available: true, breakoutLevel: 103, retestExtreme: 102, directionalCheck: true },
  status: 'VERIFIED',
  timeframe: '1d',
  provenance: { symbol: 'ICICIBANK.NS', source: 'verified', retrievedAt: '2026-09-06T00:00:00.000Z', timeframe: '1d', dataQuality: 'VERIFIED' },
};

const canonicalTechnical = {
  status: 'VERIFIED',
  last: 1412,
  e20: 1425.36,
  e50: 1399.35,
  e200: 1358.91,
  rsi: 46.66,
  relativeVolume: 0.759,
  macd: { histogram: -6.848 },
  support: 1401,
  resistance: 1466.4,
  atr: 21.93,
  periodVwap: 1434.07,
  trend: 'UPTREND',
  setup: 'BREAKOUT_RETEST',
  breakout: { direction: 'UP', level: 103, volumeConfirmed: true },
  structure: { state: 'UPTREND_STRUCTURE' },
  breakoutLifecycle: { status: 'CONTINUATION', riskEvidence },
  supportResistance: { status: 'VERIFIED_REACTION_ZONES' },
  technicalConfidence: 87,
  confidenceBasis: { missingEvidenceDoesNotCreateDirectionalBias: true },
  provenance: { symbol: 'ICICIBANK.NS', source: 'verified', retrievedAt: '2026-09-06T00:00:00.000Z', observationTimestamp: '2026-09-05T00:00:00.000Z', timeframe: '1d', dataQuality: 'VERIFIED' },
};

const trading = { technical: { ...canonicalTechnical } };

const out = buildActionability({ ...analysis, technical: canonicalTechnical }, trading);
assert.equal(out.overallStance, 'WAIT — EVIDENCE FIRST');
assert.equal(out.horizons.longTerm.action, 'WATCH / WAIT FOR EVIDENCE');
assert.equal(out.horizons.swing.action, 'WAIT — DATA / VALIDATION');
assert.equal(out.horizons.shortTerm.action, 'WAIT / NO FRESH LONG');
assert.equal(out.sectorCoverage, 25);
assert.equal(out.technical.triggers.reclaim, 1425.36);
assert.equal(out.technical.triggers.breakdown, 1401);
assert.ok(out.technical.triggers.stop < 1401);
assert.equal(out.technical.canonicalEvidence.breakoutLifecycle.riskEvidence, riskEvidence);
assert.equal(out.technical.canonicalEvidence.riskEvidence.targetEvidence[0].type, 'RESISTANCE');
assert.equal(out.technical.canonicalEvidence.provenance.observationTimestamp, '2026-09-05T00:00:00.000Z');
assert.equal(out.evidence.technicalRiskEvidence, riskEvidence);
assert.equal(out.evidence.technicalProvenance.timeframe, '1d');
assert.equal(out.productionTradingEnabled, false);

const readyAnalysis = {
  ...analysis,
  dataLimited: false,
  stock: { ...analysis.stock, dataLimited: false },
  valuation: { ...analysis.valuation, verdict: 'FAIRLY VALUED' },
  dataQuality: { confidence: 82, warnings: [], sectorFramework: { available: 7, total: 8 } },
  score: { financialStrengthCoverage: 'FULL', sectorFramework: { available: 7, total: 8 }, overall: 84 },
  technical: canonicalTechnical,
};
const readyTrading = { technical: { ...canonicalTechnical, last: 1435, rsi: 60, relativeVolume: 1.35, macd: { histogram: 4.2 } } };
const ready = buildActionability(readyAnalysis, readyTrading);
assert.equal(ready.horizons.longTerm.action, 'STAGED ACCUMULATION CANDIDATE');
assert.equal(ready.horizons.swing.action, 'CONDITIONAL BUY SETUP');

const technicalOnlyAnalysis = {
  ...readyAnalysis,
  fundamentals: undefined,
  valuation: { verdict: 'FAIRLY VALUED', fairValue: null },
};
const technicalOnly = buildActionability(technicalOnlyAnalysis, readyTrading);
assert.equal(technicalOnly.horizons.swing.action, 'CONDITIONAL BUY SETUP', 'missing fundamentals do not automatically block Swing');
assert.equal(technicalOnly.horizons.shortTerm.action, 'WAIT', 'missing fundamentals do not automatically block Short-Term');

const evidenceLimited = buildActionability({
  ...technicalOnlyAnalysis,
  dataLimited: true,
  stock: { ...technicalOnlyAnalysis.stock, dataLimited: true },
}, readyTrading);
assert.equal(evidenceLimited.horizons.longTerm.action, 'WATCH / WAIT FOR EVIDENCE', 'Long-Term remains evidence-limited');

const actionabilitySource = await import('node:fs/promises');
const actionabilitySourceText = await actionabilitySource.readFile(new URL('../api/actionability.js', import.meta.url), 'utf8');
assert.equal((actionabilitySourceText.match(/fetchStatementEvidence/g) || []).length, 0, 'actionability must not fetch statement evidence independently');
assert.equal((actionabilitySourceText.match(/mergeStatementEvidence/g) || []).length, 0, 'actionability must not merge statement evidence independently');
assert.equal((actionabilitySourceText.match(/buildTrading/g) || []).length, 0, 'actionability API must not invoke the legacy duplicate technical engine');
assert.match(actionabilitySourceText, /analysis\.fundamentals\?\.statementEvidence/);
assert.match(actionabilitySourceText, /analysis\.technical/);

console.log('actionability unit tests passed');
