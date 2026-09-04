import assert from 'node:assert/strict';
import { parseAIResponse, renderAIHtml } from '../lib/ai-schema.js';
import {
  atr,
  rsi,
  normalizeDebtToEquity,
  technical,
  buildFinancials,
  buildValuation,
  buildDataQuality,
  scoreStock,
  decision,
  SCORE_MODEL,
} from '../lib/market-engine.js';
import { mergeStatementEvidence } from '../lib/statement-evidence.js';

const aiParsed = parseAIResponse(JSON.stringify({
  businessQuality: 'Quality evidence is constructive.',
  numbersValuation: 'Valuation should be reviewed against the framework.',
  risks: 'Debt and valuation should be monitored.',
  thesis: 'The thesis depends on sustained earnings and cash flow.',
  whatToMonitor: 'Monitor margins, debt and valuation.',
}));
assert.match(renderAIHtml(aiParsed), /Business \& Moat/);
assert.throws(() => parseAIResponse('{}'), /missing section/);

const approx = (actual, expected, tolerance = 1e-9) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `expected ${actual} ≈ ${expected}`);
};

approx(normalizeDebtToEquity(79.548), 0.79548, 1e-10);
assert.equal(normalizeDebtToEquity(-1), null);
assert.equal(normalizeDebtToEquity(null), null);

const atrRows = [
  { high: 11, low: 9, close: 10 },
  { high: 13, low: 10, close: 12 },
  { high: 15, low: 11, close: 14 },
  { high: 18, low: 14, close: 17 },
  { high: 22, low: 17, close: 20 },
];
approx(atr(atrRows, 3), 37 / 9, 1e-12);

const closes = Array.from({ length: 30 }, (_, i) => 100 + i);
const r = rsi(closes, 14);
assert.ok(r >= 0 && r <= 100);
approx(r, 100, 1e-12);

const techRows = Array.from({ length: 260 }, (_, i) => {
  const close = 100 + i * 0.5;
  return { date: new Date(Date.UTC(2025, 0, 1 + i)).toISOString(), open: close - 0.5, high: close + 1, low: close - 1, close, volume: 1000 + i };
});
const tech = technical(techRows);
assert.equal(tech.has52WeekHistory, true);
assert.ok(tech.high52Week >= tech.low52Week);
assert.ok(tech.relativeVolume > 0);
assert.equal(tech.trend, 'STRONG UPTREND');

const raw = {
  summary: {
    financialData: {
      totalRevenue: 1000,
      ebitda: 220,
      totalCash: 100,
      totalDebt: 200,
      operatingCashflow: 180,
      freeCashflow: 150,
      returnOnEquity: 0.20,
      returnOnAssets: 0.10,
      debtToEquity: 20,
      currentRatio: 1.5,
      quickRatio: 1.1,
      grossMargins: 0.40,
      operatingMargins: 0.20,
      profitMargins: 0.15,
      ebitdaMargins: 0.22,
      revenueGrowth: 0.12,
      earningsGrowth: 0.15,
      operatingIncome: 200,
      interestExpense: 20,
    },
    defaultKeyStatistics: {
      sharesOutstanding: 10,
      netIncomeToCommon: 150,
      trailingEps: 15,
      forwardEps: 17,
      priceToBook: 3,
      bookValue: 50,
      enterpriseValue: 2100,
      enterpriseToEbitda: 9.5,
      enterpriseToRevenue: 2.1,
      pegRatio: 1.4,
    },
    summaryDetail: {
      marketCap: 2000,
      trailingPE: 13.3,
      forwardPE: 11.8,
    },
    price: { regularMarketTime: Math.floor(Date.now() / 1000) },
  },
  annual: [
    { date: '2022-03-31T00:00:00Z', periodType: '12M', TYPE: 'FINANCIALS', totalRevenue: 700, dilutedEPS: 8, netIncomeFromContinuingAndDiscontinuedOperation: 80, freeCashFlow: 70, operatingIncome: 100, interestExpense: 20 },
    { date: '2023-03-31T00:00:00Z', periodType: '12M', TYPE: 'FINANCIALS', totalRevenue: 800, dilutedEPS: 10, netIncomeFromContinuingAndDiscontinuedOperation: 100, freeCashFlow: 90, operatingIncome: 130, interestExpense: 20 },
    { date: '2024-03-31T00:00:00Z', periodType: '12M', TYPE: 'FINANCIALS', totalRevenue: 900, dilutedEPS: 12, netIncomeFromContinuingAndDiscontinuedOperation: 120, freeCashFlow: 120, operatingIncome: 160, interestExpense: 20 },
    { date: '2025-03-31T00:00:00Z', periodType: '12M', TYPE: 'FINANCIALS', totalRevenue: 1000, dilutedEPS: 15, netIncomeFromContinuingAndDiscontinuedOperation: 150, freeCashFlow: 150, operatingIncome: 200, interestExpense: 20 },
    { date: '2025-03-31T00:00:00Z', periodType: '12M', TYPE: 'BALANCE_SHEET', currentAssets: 500, currentLiabilities: 333, totalAssets: 1500, stockholdersEquity: 1000, totalDebt: 200 },
    { date: '2025-03-31T00:00:00Z', periodType: '12M', TYPE: 'CASH_FLOW', freeCashFlow: 150, operatingCashFlow: 180 },
  ],
  trailing: [],
  errors: { summary: null, annual: null, trailing: null },
  rawAvailability: undefined,
};

const financials = buildFinancials(raw);
assert.equal(financials.current.revenue, 1000);
assert.equal(financials.ratios.debtToEquity, 0.2);
assert.equal(financials.derived.interestCoverage, 10);
assert.ok(financials.derived.roceFromStatements > 0);
assert.ok(financials.derived.fcfConversion > 0);

const provenanceMeta = {
  issuer: 'Fixture Corp',
  ticker: 'TEST.NS',
  periodType: '12M',
  reportingPeriod: 'FY2025',
  statementScope: 'consolidated',
  unit: 'INR',
  currency: 'INR',
};
const statementEvidence = {
  provider: 'fixture provider',
  ticker: 'TEST.NS',
  fetchedAt: new Date().toISOString(),
  coverage: { income: true, balanceSheet: true, cashFlow: true },
  evidence: {
    balance: {
      totalDebt: { value: 250, key: 'totalDebt', date: '2025-03-31T00:00:00.000Z', row: provenanceMeta },
      cash: { value: 75, key: 'cashCashEquivalentsAndShortTermInvestments', date: '2025-03-31T00:00:00.000Z', row: provenanceMeta },
      equity: { value: 1250, key: 'stockholdersEquity', date: '2025-03-31T00:00:00.000Z', row: provenanceMeta },
    },
    cash: { freeCashFlow: { value: 175, key: 'freeCashFlow', date: '2025-03-31T00:00:00.000Z', row: provenanceMeta } },
  },
};
const mergedFinancials = mergeStatementEvidence(
  buildFinancials({ summary: {}, annual: [], trailing: [] }),
  statementEvidence,
);
assert.equal(mergedFinancials.current.totalDebt, 250, 'canonical analysis should propagate qualified statement evidence');
assert.equal(mergedFinancials.current.cash, 75);
assert.equal(mergedFinancials.current.freeCashFlow, 175);
assert.equal(mergedFinancials.derived.debtToEquityFromStatements, 0.2, 'derived D/E should use compatible qualified statement provenance');
assert.equal(mergedFinancials.statementEvidence, statementEvidence, 'statement provenance should be preserved');

const missingFinancials = mergeStatementEvidence(
  buildFinancials({ summary: {}, annual: [], trailing: [] }),
  { coverage: { income: false, balanceSheet: false, cashFlow: false }, evidence: {} },
);
assert.equal(missingFinancials.current.totalDebt, null, 'missing financial values remain null');
assert.equal(missingFinancials.current.cash, null);
assert.equal(missingFinancials.current.freeCashFlow, null);
assert.notEqual(missingFinancials.current.totalDebt, 0, 'missing values must not become zero');

const valuation = buildValuation(raw, 200);
assert.equal(valuation.marketCap, 2000);
assert.ok(valuation.fairValue > 0);

const quality = buildDataQuality(financials, valuation, {}, tech);
assert.ok(quality.completeness >= 0 && quality.completeness <= 100);
assert.ok(Array.isArray(quality.validationFlags));

const score = scoreStock(financials, valuation, tech, quality);
const weightSum = Object.values(SCORE_MODEL.weights).reduce((a, b) => a + b, 0);
approx(weightSum, 1, 1e-12);
assert.ok(score.overall >= 0 && score.overall <= 100);
assert.equal(score.model.id, 'compounder-v1.0-heuristic');

const dec = decision(score, valuation, tech, quality);
assert.ok(typeof dec.action === 'string');
assert.ok(Array.isArray(dec.reason));

console.log('market-engine.unit: PASS');

const valuationFixture = buildValuation({
  summary: {
    summaryDetail: { trailingPE: 16, forwardPE: 15 },
    defaultKeyStatistics: { trailingEps: 100, forwardEps: 100, returnOnEquity: 0.3, priceToBook: 5 },
    financialData: { earningsGrowth: 0.15, revenueGrowth: 0.12 },
  },
  annual: [],
  trailing: [],
}, 1000);
assert.equal(valuationFixture.verdict, 'DEEPLY UNDERVALUED', 'deeply undervalued requires >=35% framework gap');
assert.ok(valuationFixture.verdictThresholds.deeplyUndervaluedAt.includes('-35%'), 'valuation thresholds should be explicit');

const partialFinancials = {
  ratios: { debtToEquity: 0.1, currentRatio: 2 },
  growth: { revenue5yCagr: null, eps5yCagr: null, pat5yCagr: null },
  derived: { fcfConversion: null, netDebtToEbitda: 0 },
  rawAvailability: { annualBalanceSheet: false, annualCashFlow: false, annualStatements: false, quoteSummary: true },
  current: { netDebt: 0, freeCashFlow: null },
  errors: {},
  periods: { annualHistoryCount: 0 },
};
const partialScore = scoreStock(partialFinancials, { trailingPE: 16, forwardPE: 15, priceToBook: 5, fairValue: 3000, growthSignal: 12, evToEbitda: 10, marginOfSafety: 33 }, { trend: 'UPTREND', rsi: 55, distanceFrom200DMA: 5, drawdown: 10 }, { completeness: 60 });
assert.ok(partialScore.financialStrength <= 70, 'financial strength must be capped when balance sheet is unavailable');
assert.equal(partialScore.financialStrengthCoverage, 'CURRENT_FIELDS_ONLY');

const freshQuality = buildDataQuality(financials, valuation, {}, tech, {
  marketAsOf: new Date().toISOString(),
  fundamentalsAsOf: new Date().toISOString(),
});
assert.ok(freshQuality.confidenceModel, 'confidence model must be explicit');
assert.equal(freshQuality.confidenceModel.id, 'data-confidence-v1.0-heuristic');
assert.equal(Math.round(Object.values(freshQuality.confidenceModel.weights).reduce((a,b)=>a+b,0)), 1);
assert.ok(freshQuality.confidence >= 0 && freshQuality.confidence <= 100);
assert.ok(Number.isFinite(freshQuality.confidenceModel.components.coverage));
assert.ok(Number.isFinite(freshQuality.confidenceModel.components.freshness));
assert.ok(Number.isFinite(freshQuality.confidenceModel.components.consistency));
assert.ok(Number.isFinite(freshQuality.confidenceModel.components.historicalDepth));

const explainedScore = scoreStock(financials, valuation, tech, freshQuality);
assert.ok(Array.isArray(explainedScore.components));
assert.equal(explainedScore.components.length, Object.keys(SCORE_MODEL.weights).length);
const contributionSum = explainedScore.components.reduce((sum, x) => sum + x.contribution, 0);
approx(explainedScore.overall, Math.round(contributionSum), 1e-9);
assert.ok(['EXCEPTIONAL','STRONG','PROMISING / WATCH','MIXED','WEAK / HIGH RISK'].includes(explainedScore.classification));

const limitedQuality = {
  ...freshQuality,
  confidence: 62,
  completeness: 62,
  criticalMissingFields: ['ROE'],
};
const limitedScore = scoreStock(partialFinancials, valuation, tech, limitedQuality);
assert.equal(limitedScore.dataLimited, true);
assert.ok(limitedScore.confidence <= 62);

const limitedDecision = decision(limitedScore, valuation, tech, limitedQuality);
assert.ok(Array.isArray(limitedDecision.positives));
assert.ok(Array.isArray(limitedDecision.blockers));
assert.ok(limitedDecision.basis && Number.isFinite(limitedDecision.basis.score));
assert.ok(limitedDecision.reason.some((x) => /confidence|missing|evidence/i.test(x)));
