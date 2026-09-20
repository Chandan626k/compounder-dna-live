import assert from 'node:assert/strict';
import { evaluateRecommendationReadiness, STATES } from '../lib/recommendation-readiness.js';

const baseCanonical = (overrides = {}) => ({
  currencyStatus: 'MATCH',
  records: [
    'revenue','ebitda','netIncome','eps','cash','debt','equity','currentAssets','currentLiabilities','operatingCashFlow','capitalExpenditure','freeCashFlow','roe','roa'
  ].map((metric) => ({
    evidence: {
      metric,
      value: 100,
      unit: metric === 'roe' || metric === 'roa' ? 'PERCENT' : 'PROVIDER_NATIVE_MONETARY',
      issuerIdentity: 'ISS:TEST',
      securityIdentity: 'SEC:TEST:NSE',
      periodType: 'ANNUAL',
      reportingPeriodEnd: '2025-03-31T00:00:00.000Z',
      reportingPeriodStart: '2024-04-01T00:00:00.000Z',
      sourceAuthority: 'SECONDARY_PROVIDER',
      provider: 'fixture-provider',
      retrievedAt: '2026-09-20T06:00:00.000Z',
      validationState: 'VALID',
      pitEligibility: 'PIT_VERIFIED',
      currency: 'INR',
    }
  })),
  ...overrides,
});

const validAnalysis = {
  asOf: '2026-09-20T06:01:00.000Z',
  fundamentals: {
    current: { revenue: 100, ebitda: 20, netIncome: 10, cash: 10, totalDebt: 20, equity: 100, currentAssets: 50, currentLiabilities: 25, operatingCashFlow: 15, freeCashFlow: 12 },
    ratios: { roe: 10, roa: 5, debtToEquity: 0.2, currentRatio: 2, earningsGrowth: 10 },
    derived: { netDebtToEbitda: 0.5, fcfGrowth: 10, fcfMargin: 12, fcfConversion: 120 },
    growth: { latestEPSGrowth: 10 },
    canonicalFinancialEvidence: baseCanonical(),
  },
  valuation: { marketCap: 1000, trailingPE: 20, fairValue: 120, fairValueMethod: 'EARNINGS_MULTIPLE', observationAt: '2026-09-20T06:00:00.000Z' },
};

const validTechnical = {
  last: 120, s20: 115, s50: 110, s200: 100, e20: 116, e50: 111, e100: 106, e200: 101,
  rsi: 60, atr: 3, adx: 30, macd: { histogram: 1 }, bollinger: { upper: 125 },
  relativeVolume: 1.5, support: 110, resistance: 130, high52Week: 140, low52Week: 80,
  provenance: { timeframe: '1d', dataQuality: 'VERIFIED', source: 'fixture', observationTimestamp: '2026-09-19T00:00:00.000Z' },
  canonicalEvidence: {
    e100: 106,
    historyBars: 300,
    structure: { state: 'UPTREND_STRUCTURE' },
    breakoutLifecycle: {
      status: 'SUCCESSFUL_RETEST',
      evidenceAvailability: 'SUFFICIENT',
      confirmationEvidence: { volumeStatus: 'CONFIRMED' },
      overextended: false,
      riskEvidence: {
        status: 'VERIFIED',
        entryZone: { lower: 118, upper: 122 },
        invalidationLevel: 112,
        targetZones: [130, 138],
        riskReward: 2,
        basis: { atrAtBreakout: 3 },
      },
      noLookAhead: { historicalEventsUseOnlyBarsAvailableAtEvent: true },
      provenance: { timeframe: '1d', dataQuality: 'VERIFIED' },
    },
  },
};

const ready = evaluateRecommendationReadiness({
  analysis: validAnalysis,
  trading: { technical: validTechnical },
});
assert.equal(ready.horizons.LONG_TERM.state, STATES.PARTIALLY_READY);
assert.ok(ready.horizons.LONG_TERM.blockers.some((b) => b.key === 'missing_evidence' || b.key === 'unverified_evidence'));
console.log('DEBUG_SWING', JSON.stringify({state: ready.horizons.SWING.state, blockers: ready.horizons.SWING.blockers, req: ready.horizons.SWING.requirements}));
assert.equal(ready.horizons.SWING.state, STATES.READY);
assert.equal(ready.horizons.SWING.recommendationEligible, false);
assert.equal(ready.policy.noBuySellGenerated, true);

const incompleteRisk = structuredClone(validTechnical);
incompleteRisk.canonicalEvidence.breakoutLifecycle.riskEvidence = { status: 'UNAVAILABLE', entryZone: null, invalidationLevel: null, targetZones: null, riskReward: null };
const swingBlocked = evaluateRecommendationReadiness({ analysis: validAnalysis, trading: { technical: incompleteRisk } });
assert.equal(swingBlocked.horizons.SWING.state, STATES.NOT_READY);
assert.ok(swingBlocked.horizons.SWING.blockers.some((b) => b.key === 'risk_reward'));

const shortTerm = evaluateRecommendationReadiness({ analysis: validAnalysis, trading: { technical: validTechnical } });
assert.equal(shortTerm.horizons.SHORT_TERM.state, STATES.NOT_READY);
assert.equal(shortTerm.horizons.SHORT_TERM.blockers[0].reason, 'SHORT_TERM_DATA_SOURCE_NOT_PRODUCTION_QUALIFIED');

const intraday = shortTerm.horizons.INTRADAY;
assert.equal(intraday.state, STATES.NOT_AVAILABLE);

const dailyDoesNotInherit = evaluateRecommendationReadiness({ analysis: validAnalysis, trading: null });
assert.equal(dailyDoesNotInherit.horizons.SWING.state, STATES.UNKNOWN);
assert.equal(dailyDoesNotInherit.horizons.SHORT_TERM.state, STATES.NOT_READY);

const unknownCurrency = structuredClone(validAnalysis);
unknownCurrency.fundamentals.canonicalFinancialEvidence.currencyStatus = 'UNKNOWN';
const currencyBlocked = evaluateRecommendationReadiness({ analysis: unknownCurrency, trading: { technical: validTechnical } });
assert.notEqual(currencyBlocked.horizons.LONG_TERM.state, STATES.READY);
assert.equal(currencyBlocked.horizons.LONG_TERM.evidenceStatus.currency, 'UNKNOWN');

const pitUnknown = structuredClone(validAnalysis);
pitUnknown.fundamentals.canonicalFinancialEvidence.records[0].evidence.pitEligibility = 'PIT_UNKNOWN';
const pitBlocked = evaluateRecommendationReadiness({ analysis: pitUnknown, trading: { technical: validTechnical } });
assert.notEqual(pitBlocked.horizons.LONG_TERM.state, STATES.READY);
assert.equal(pitBlocked.horizons.LONG_TERM.evidenceStatus.pit, 'UNKNOWN');

const future = structuredClone(validAnalysis);
future.fundamentals.canonicalFinancialEvidence.records[0].evidence.pitEligibility = 'PIT_INELIGIBLE';
const futureBlocked = evaluateRecommendationReadiness({ analysis: future, trading: { technical: validTechnical } });
assert.notEqual(futureBlocked.horizons.LONG_TERM.state, STATES.READY);
assert.ok(futureBlocked.horizons.LONG_TERM.blockers.some((b) => b.key === 'missing_evidence' || b.key === 'pit'));

const secondary = structuredClone(validAnalysis);
secondary.fundamentals.canonicalFinancialEvidence.records[0].evidence.sourceAuthority = 'SECONDARY_PROVIDER';
const secondaryResult = evaluateRecommendationReadiness({ analysis: secondary, trading: { technical: validTechnical } });
assert.notEqual(secondaryResult.horizons.LONG_TERM.state, STATES.NOT_READY);
assert.equal(secondaryResult.horizons.LONG_TERM.availableEvidence.find((x) => x.key === 'revenue').source, 'SECONDARY_PROVIDER');

const infy = structuredClone(validAnalysis);
infy.fundamentals.canonicalFinancialEvidence.currencyStatus = 'UNKNOWN';
const infyResult = evaluateRecommendationReadiness({ analysis: infy, trading: { technical: validTechnical } });
assert.notEqual(infyResult.horizons.LONG_TERM.state, STATES.READY);
assert.ok(infyResult.horizons.LONG_TERM.nextRequiredEvidence.includes('verified_financial_currency_match'));

const noLookahead = evaluateRecommendationReadiness({ analysis: validAnalysis, trading: { technical: validTechnical } });
assert.equal(noLookahead.horizons.SWING.requirements.find((r) => r.key === 'breakout_lifecycle').status, 'VERIFIED');
assert.equal(noLookahead.horizons.SWING.evidenceStatus.breakout, 'SUCCESSFUL_RETEST');

console.log('recommendation-readiness.unit: PASS');
