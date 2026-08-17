import assert from 'node:assert/strict';
import { buildSectorFramework, classifySector, buildDataQuality, scoreStock, technical } from '../lib/market-engine.js';

assert.equal(classifySector('Financial Services', 'Banks - Regional'), 'BANKING');
assert.equal(classifySector('Technology', 'Information Technology Services'), 'IT_SERVICES');
assert.equal(classifySector('Consumer Cyclical', 'Auto Manufacturers'), 'AUTO');
assert.equal(classifySector('Industrials', 'Specialty Chemicals'), 'MANUFACTURING');

const bankFinancials = {
  ratios: { roe: 12, roa: 1.1, revenueGrowth: 14, operatingMargin: 0, debtToEquity: 0.2, currentRatio: 2 },
  growth: { eps5yCagr: 10 },
  derived: { fcfConversion: null, netDebtToEbitda: null, roceFromStatements: null, workingCapital: null },
  sectorKpis: { nim: null, gnpa: null, nnpa: null, casa: null, creditGrowth: null, provisionCoverage: null },
};
const bankFramework = buildSectorFramework(bankFinancials, 'Financial Services', 'Banks - Regional');
assert.equal(bankFramework.key, 'BANKING');
assert.equal(bankFramework.coverage, 25);
assert.equal(bankFramework.status, 'LIMITED');
assert.ok(bankFramework.required.some(x => x.name === 'NIM' && x.value === null));

const rows = Array.from({ length: 260 }, (_, i) => {
  const close = 100 + i * 0.2;
  return { date: new Date(Date.UTC(2025, 0, 1 + i)).toISOString(), open: close - 0.2, high: close + 0.5, low: close - 0.5, close, volume: 1000 + i };
});
const tech = technical(rows);
const valuation = { trailingPE: 16, forwardPE: 15, priceToBook: 1.5, fairValue: 100, growthSignal: 10, evToEbitda: null, marginOfSafety: 0 };
const quality = { completeness: 80, confidence: 75, criticalMissingFields: [], financialStrengthCoverage: 'FULL', sectorFramework: bankFramework };
const score = scoreStock(bankFinancials, valuation, tech, quality, bankFramework);
assert.equal(score.sectorFramework.key, 'BANKING');
assert.ok(score.financialStrength <= 65);
assert.ok(!score.financialStrengthEvidence.includes('Debt/Equity'));

const q = buildDataQuality(
  { ...bankFinancials, rawAvailability: { annualStatements: true, annualBalanceSheet: true, annualCashFlow: true, quoteSummary: true }, periods: { annualHistoryCount: 5 }, errors: {}, current: { netDebt: 0, freeCashFlow: 100 }, ratios: { ...bankFinancials.ratios, netMargin: 20, operatingMargin: 20, revenueGrowth: 14, earningsGrowth: 10 }, growth: { revenue5yCagr: 12, eps5yCagr: 10 }, derived: { ...bankFinancials.derived, fcfConversion: 80 } },
  valuation, {}, tech,
  { marketAsOf: new Date().toISOString(), fundamentalsAsOf: new Date().toISOString() },
  bankFramework,
);
assert.ok(q.confidence <= 65);
console.log('sector-framework.unit: PASS');
