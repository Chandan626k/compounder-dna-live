import assert from 'node:assert/strict';
import { buildInvestmentReadiness } from '../lib/investment-readiness.js';

const fundamentals = {
  ratios: { roe: 22, operatingMargin: 18, revenueGrowth: 10 },
  growth: { revenue3yCagr: 12, eps3yCagr: 14, latestRevenueGrowth: 8 },
  derived: { fcfConversion: 82, netDebtToEbitda: 1.2 },
};

const base = {
  fundamentals,
  dataQuality: { confidence: 88, completeness: 82 },
  valuation: { marginOfSafety: 18, verdict: 'ATTRACTIVE' },
  technical: { last: 500 },
  score: { overall: 84, dataLimited: false },
};

const ready = buildInvestmentReadiness(base);
assert.equal(ready.success, true);
assert.equal(ready.evidenceBand, 'HIGH');
assert.equal(ready.verifiedEvidence.coverage, 82);
assert.equal(ready.verifiedEvidence.fundamentalScore, 100);
assert.equal(ready.classification, 'INVESTMENT CANDIDATE — HIGH EVIDENCE');
assert.equal(ready.action, 'ACCUMULATE CANDIDATE');
assert.equal(ready.blockers.length, 0);

const legacyShape = buildInvestmentReadiness({
  financials: fundamentals,
  dataQuality: { confidence: 88, coverage: 82 },
  valuation: base.valuation,
  technical: base.technical,
  score: base.score,
});
assert.equal(legacyShape.verifiedEvidence.coverage, 82);
assert.equal(legacyShape.verifiedEvidence.fundamentalScore, 100);
assert.equal(legacyShape.classification, 'INVESTMENT CANDIDATE — HIGH EVIDENCE');

const dataLimited = buildInvestmentReadiness({
  ...base,
  score: { overall: 84, dataLimited: true },
});
assert.equal(dataLimited.classification, 'WATCHLIST — EVIDENCE INCOMPLETE');
assert.ok(dataLimited.blockers.includes('Analysis is explicitly data-limited'));

const missingFundamentals = buildInvestmentReadiness({
  dataQuality: { confidence: 88, completeness: 82 },
  valuation: base.valuation,
  technical: base.technical,
  score: { overall: 84, dataLimited: false },
});
assert.equal(missingFundamentals.verifiedEvidence.fundamentalScore, null);
assert.ok(missingFundamentals.blockers.includes('Insufficient verified financial history for a fundamental score'));
assert.equal(missingFundamentals.classification, 'WATCHLIST — EVIDENCE INCOMPLETE');

const missingCoverage = buildInvestmentReadiness({
  ...base,
  dataQuality: { confidence: 88 },
});
assert.equal(missingCoverage.verifiedEvidence.coverage, null);
assert.ok(missingCoverage.blockers.includes('Fundamental/sector evidence coverage below investment threshold'));

console.log('investment-readiness.unit: PASS');
