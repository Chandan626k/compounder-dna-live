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

const trading = {
  technical: {
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
    vwap: 1434.07,
    trend: 'UPTREND',
  },
};

const out = buildActionability(analysis, trading);
assert.equal(out.overallStance, 'WAIT — EVIDENCE FIRST');
assert.equal(out.horizons.longTerm.action, 'WATCH / WAIT FOR EVIDENCE');
assert.equal(out.horizons.swing.action, 'WAIT — DATA / VALIDATION');
assert.equal(out.horizons.shortTerm.action, 'WAIT / NO FRESH LONG');
assert.equal(out.sectorCoverage, 25);
assert.equal(out.technical.triggers.reclaim, 1425.36);
assert.equal(out.technical.triggers.breakdown, 1401);
assert.ok(out.technical.triggers.stop < 1401);
assert.equal(out.productionTradingEnabled, false);

const readyAnalysis = {
  ...analysis,
  dataLimited: false,
  stock: { ...analysis.stock, dataLimited: false },
  dataQuality: { confidence: 82, warnings: [], sectorFramework: { available: 7, total: 8 } },
  score: { financialStrengthCoverage: 'FULL', sectorFramework: { available: 7, total: 8 }, overall: 84 },
};
const readyTrading = {
  technical: {
    ...trading.technical,
    last: 1435,
    rsi: 60,
    relativeVolume: 1.35,
    macd: { histogram: 4.2 },
  },
};
const ready = buildActionability(readyAnalysis, readyTrading);
assert.equal(ready.horizons.longTerm.action, 'STAGED ACCUMULATION CANDIDATE');
assert.equal(ready.horizons.swing.action, 'CONDITIONAL BUY SETUP');

console.log('actionability unit tests passed');
