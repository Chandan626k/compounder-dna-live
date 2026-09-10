import assert from 'node:assert/strict';
import { buildMultiHorizonIntelligence } from '../lib/multi-horizon-intelligence.js';
import { PRODUCTION_ACTIONS_ENABLED } from '../lib/production-decision-gate.js';

const dates = ['2023-03-31T00:00:00.000Z', '2024-03-31T00:00:00.000Z', '2025-03-31T00:00:00.000Z'];
const makeRows = ({ revenue = [100, 120, 150], earnings = [10, 13, 17], equity = [60, 68, 76], debt = [20, 19, 18], ocf = [12, 15, 18], fcf = [8, 11, 14] } = {}) => ({
  income: dates.map((date, i) => ({ date, periodType: '12M', totalRevenue: revenue[i], netIncomeFromContinuingAndDiscontinuedOperation: earnings[i] })),
  balance: dates.map((date, i) => ({ date, periodType: '12M', totalDebt: debt[i], stockholdersEquity: equity[i] })),
  cash: dates.map((date, i) => ({ date, periodType: '12M', operatingCashFlow: ocf[i], freeCashFlow: fcf[i] })),
});

const makeAnalysis = (overrides = {}) => {
  const rows = makeRows(overrides.rows);
  const fields = { revenue: 'ev-revenue', netIncome: 'ev-earnings', equity: 'ev-equity', totalDebt: 'ev-debt', operatingCashFlow: 'ev-ocf', freeCashFlow: 'ev-fcf' };
  const values = { revenue: rows.income.at(-1).totalRevenue, netIncome: rows.income.at(-1).netIncomeFromContinuingAndDiscontinuedOperation, equity: rows.balance.at(-1).stockholdersEquity, totalDebt: rows.balance.at(-1).totalDebt, operatingCashFlow: rows.cash.at(-1).operatingCashFlow, freeCashFlow: rows.cash.at(-1).freeCashFlow };
  const byId = Object.fromEntries(Object.entries(fields).map(([field, evidenceId]) => [evidenceId, { evidenceId, source: 'YAHOO_FINANCE', sourceKey: field, issuer: 'TEST', ticker: 'TEST.NS', value: values[field], reportingDate: dates.at(-1), reportingPeriod: '2025-03-31', periodType: '12M', statementScope: 'CONSOLIDATED', unit: 'INR', currency: 'INR', reportedOrDerived: 'REPORTED', status: 'VERIFIED', retrievedAt: '2025-04-01T00:00:00.000Z' }]));
  const technical = { status: 'VERIFIED', setup: 'NEUTRAL', provenance: { symbol: 'TEST.NS', source: 'Yahoo Finance chart', retrievedAt: '2025-04-01T00:00:00.000Z', observationTimestamp: dates.at(-1), timeframe: '1d', dataQuality: 'VERIFIED', validation: 'passed' } };
  return {
    stock: { symbol: 'TEST', yahooSymbol: 'TEST.NS' },
    fundamentals: { current: values, evidence: { fields, byId, history: {} }, statementEvidence: rows },
    valuation: { fairValue: 120, verdict: 'FAIR / REASONABLE', metricLineage: { fairValue: { evidenceIds: ['ev-fair'], status: 'TRACEABLE_INPUT_CHAIN' }, currentPrice: { evidenceIds: ['ev-price'], status: 'TRACEABLE' } } },
    technical,
    provenance: { source: 'Yahoo Finance', annualFundamentals: { source: 'Yahoo Finance fundamentalsTimeSeries', period: '12M/annual', asOf: dates.at(-1), validation: 'provider payload normalized' }, technical: technical.provenance, marketData: { retrievedAt: technical.provenance.retrievedAt } },
    horizonFreshnessContract: {
      longTerm: { horizon: 'LONG_TERM', domain: 'financial', ticker: 'TEST.NS', source: 'YAHOO_FINANCE', issuer: 'TEST', asOf: '2025-04-01T00:00:00.000Z', reportingDate: dates.at(-1), reportingPeriod: '2025-03-31', periodType: 'ANNUAL', reportingCycleStatus: 'CURRENT', evidence: { verified: true }, evidenceReferences: ['ev-revenue'] },
      swing: { horizon: 'SWING', domain: 'technical', ticker: 'TEST.NS', source: 'Yahoo Finance chart', asOf: '2025-04-01T00:00:00.000Z', observationTimestamp: dates.at(-1), timeframe: '1d', exchange: 'NSE', session: 'CLOSED', calendarContext: 'TEST_CALENDAR', observationBoundaryStatus: 'COMPLETED_EXPECTED', evidence: { verified: true }, evidenceReferences: ['canonical-technical'] },
    },
    ...overrides,
    fundamentals: { current: values, evidence: { fields, byId, history: {} }, statementEvidence: rows, ...(overrides.fundamentals || {}) },
    valuation: { fairValue: 120, verdict: 'FAIR / REASONABLE', metricLineage: { fairValue: { evidenceIds: ['ev-fair'], status: 'TRACEABLE_INPUT_CHAIN' }, currentPrice: { evidenceIds: ['ev-price'], status: 'TRACEABLE' } }, ...(overrides.valuation || {}) },
    technical: { ...technical, ...(overrides.technical || {}) },
  };
};

const run = (analysis) => buildMultiHorizonIntelligence(analysis);
const assertLT = (analysis, expected) => assert.equal(run(analysis).longTerm.state, expected);
const assertSwing = (analysis, expected) => assert.equal(run(analysis).swing.state, expected);

assertLT(makeAnalysis(), 'ATTRACTIVE');
assertLT(makeAnalysis({ rows: { revenue: [150, 120, 90], earnings: [18, 12, 7], equity: [80, 70, 60], debt: [15, 25, 40], ocf: [18, 11, 6], fcf: [14, 7, -2] } }), 'UNATTRACTIVE');
for (const field of ['revenue', 'netIncome', 'equity', 'totalDebt', 'operatingCashFlow', 'freeCashFlow']) {
  const a = makeAnalysis(); delete a.fundamentals.evidence.fields[field]; delete a.fundamentals.evidence.byId[`ev-${field === 'netIncome' ? 'earnings' : field === 'operatingCashFlow' ? 'ocf' : field === 'freeCashFlow' ? 'fcf' : field}`]; assertLT(a, 'INSUFFICIENT_EVIDENCE');
}
assertLT(makeAnalysis({ fundamentals: { evidence: { byId: { 'ev-revenue': { status: 'BAD' } } } } }), 'INSUFFICIENT_EVIDENCE');
assertLT(makeAnalysis({ fundamentals: { evidence: { byId: { 'ev-earnings': { issuer: 'OTHER', ticker: 'OTHER.NS' } } } } }), 'INSUFFICIENT_EVIDENCE');
assertLT(makeAnalysis({ rows: { revenue: [100, 110], earnings: [10, 11], equity: [60, 65], debt: [20, 19], ocf: [12, 13], fcf: [8, 9] } }), 'INSUFFICIENT_EVIDENCE');
assertLT(makeAnalysis({ rows: { revenue: [100, 130, 160], earnings: [10, 13, 16], equity: [60, 70, 80], debt: [20, 19, 18], ocf: [12, 15, 18], fcf: [8, 10, 7] } }), 'NEUTRAL');
assertLT(makeAnalysis({ rows: { revenue: [100, 130, 160], earnings: [10, 13, 18], equity: [60, 70, 80], debt: [15, 25, 35], ocf: [12, 15, 18], fcf: [8, 10, 12] } }), 'NEUTRAL');
assertLT(makeAnalysis({ valuation: { fairValue: 50, verdict: 'VERY EXPENSIVE', metricLineage: { fairValue: { evidenceIds: ['ev-fair'], status: 'TRACEABLE_INPUT_CHAIN' }, currentPrice: { evidenceIds: ['ev-price'], status: 'TRACEABLE' } } } }), 'NEUTRAL');
assertLT(makeAnalysis({ rows: { revenue: [100, 120, 110], earnings: [10, 13, 15], equity: [60, 68, 76], debt: [20, 19, 18], ocf: [12, 15, 18], fcf: [8, 11, 14] } }), 'NEUTRAL');
assertLT(makeAnalysis({ rows: { revenue: [150, 120, 90], earnings: [18, 12, 7], equity: [80, 70, 60], debt: [15, 25, 40], ocf: [18, 11, 6], fcf: [14, 7, -2] }, technical: { setup: 'BULLISH' } }), 'UNATTRACTIVE');
const unattractive = makeAnalysis({ rows: { revenue: [150, 120, 90], earnings: [18, 12, 7], equity: [80, 70, 60], debt: [15, 25, 40], ocf: [18, 11, 6], fcf: [14, 7, -2] } });
assertLT({ ...unattractive, technical: { setup: 'BULLISH' } }, 'UNATTRACTIVE');
assertLT(makeAnalysis({ rows: { revenue: [100, 120, 150], earnings: [10, 13, 17], equity: [60, 68, 76], debt: [20, 19, 18], ocf: [12, 15, 18], fcf: [8, 11, 14] }, technical: { setup: 'BULLISH' } }), 'ATTRACTIVE');
assertLT(makeAnalysis({ rows: { revenue: [150, 120, 100], earnings: [18, 14, 10], equity: [80, 75, 70], debt: [15, 20, 25], ocf: [18, 14, 10], fcf: [14, 9, 4] }, technical: { setup: 'BULLISH' } }), 'UNATTRACTIVE');
assertLT(makeAnalysis({ rows: { revenue: [100, 120, 140], earnings: [10, 13, 16], equity: [60, 68, 76], debt: [20, 19, 18], ocf: [12, 15, 18], fcf: [8, 11, 14] }, longTermRisk: { verified: true, materialAdverseBusinessEvent: true } }), 'NEUTRAL');
const recovery = makeAnalysis({ rows: { revenue: [150, 120, 100], earnings: [18, 14, 10], equity: [80, 75, 70], debt: [15, 20, 25], ocf: [18, 14, 10], fcf: [14, 9, 4] } });
assertLT(recovery, 'UNATTRACTIVE');
assertLT(makeAnalysis({ rows: { revenue: [100, 105, 115], earnings: [8, 9, 11], equity: [60, 65, 72], debt: [25, 24, 22], ocf: [9, 10, 12], fcf: [4, 6, 8] } }), 'ATTRACTIVE');

const providerReturned = makeAnalysis();
for (const record of Object.values(providerReturned.fundamentals.evidence.byId)) record.status = 'PROVIDER_RETURNED';
assertLT(providerReturned, 'INSUFFICIENT_EVIDENCE');

const lifecycle = (status, direction = 'UP', riskReady = true) => ({ status, direction, riskEvidence: riskReady ? { status: 'VERIFIED', riskReward: 2, invalidationLevel: 95, targetEvidence: [{ price: 110 }] } : { status: 'UNAVAILABLE' } });
assertSwing(makeAnalysis({ technical: { status: 'VERIFIED', setup: 'BULLISH', breakoutLifecycle: { status: 'NO_BREAKOUT' } } }), 'WATCH');
const confirmed = makeAnalysis({ technical: { status: 'VERIFIED', setup: 'BREAKOUT', breakoutLifecycle: lifecycle('PENDING_RETEST') } });
assertSwing(confirmed, 'PENDING');
assert.equal(run(confirmed).swing.lifecycle.status, 'PENDING_RETEST');
const successful = makeAnalysis({ technical: { status: 'VERIFIED', setup: 'BREAKOUT', breakoutLifecycle: lifecycle('SUCCESSFUL_RETEST') } }); assertSwing(successful, 'BULLISH_SETUP'); assert.equal(run(successful).swing.lifecycle.status, 'SUCCESSFUL_RETEST');
assertSwing(makeAnalysis({ technical: { status: 'VERIFIED', setup: 'BREAKOUT', breakoutLifecycle: lifecycle('FAILED') } }), 'NO_CLEAN_SETUP');
assertSwing(makeAnalysis({ technical: { status: 'VERIFIED', setup: 'BREAKDOWN', breakoutLifecycle: lifecycle('SUCCESSFUL_RETEST', 'DOWN') } }), 'BEARISH_SETUP');
assertSwing(makeAnalysis({ technical: { status: 'UNAVAILABLE' } }), 'UNKNOWN');
const both = makeAnalysis({ technical: { status: 'VERIFIED', setup: 'BREAKOUT', breakoutLifecycle: lifecycle('SUCCESSFUL_RETEST') } });
assert.equal(run(both).longTerm.state, 'ATTRACTIVE'); assert.equal(run(both).swing.state, 'BULLISH_SETUP');
const ltMissing = makeAnalysis(); delete ltMissing.fundamentals.evidence.fields.revenue; assert.equal(run(ltMissing).longTerm.state, 'INSUFFICIENT_EVIDENCE');
const ltBad = makeAnalysis({ rows: { revenue: [150, 120, 90], earnings: [18, 12, 7], equity: [80, 70, 60], debt: [15, 25, 40], ocf: [18, 11, 6], fcf: [14, 7, -2] }, technical: { status: 'VERIFIED', setup: 'BREAKOUT', breakoutLifecycle: lifecycle('SUCCESSFUL_RETEST') } }); assert.equal(run(ltBad).longTerm.state, 'UNATTRACTIVE'); assert.equal(run(ltBad).swing.state, 'BULLISH_SETUP');
const isolated = run(both); isolated.longTerm.state = 'NEUTRAL'; assert.equal(run(both).swing.state, 'BULLISH_SETUP');
const isolated2 = run(both); isolated2.swing.state = 'NO_CLEAN_SETUP'; assert.equal(run(both).longTerm.state, 'ATTRACTIVE');
const historical = makeAnalysis({ technical: { status: 'VERIFIED', setup: 'BREAKOUT', breakoutLifecycle: { status: 'BREAKOUT_CONFIRMED', direction: 'UP', riskEvidence: { status: 'UNAVAILABLE' } } } });
assert.equal(run(historical).swing.state, 'PENDING');
assert.equal(run(historical).swing.lifecycle.status, 'BREAKOUT_CONFIRMED');
const result = run(both);
assert.equal(result.longTerm.provenance.source, 'Yahoo Finance fundamentalsTimeSeries');
assert.equal(result.swing.provenance.source, 'Yahoo Finance chart');
assert.equal(result.swing.provenance.timeframe, '1d');
assert.equal(result.swing.provenance.observationTimestamp, dates.at(-1));
assert.equal(result.swing.provenance.retrievedAt, '2025-04-01T00:00:00.000Z');
assert.ok(result.longTerm.evidenceReferences.includes('ev-revenue'));
assert.ok(result.longTerm.evidenceReferences.includes('ev-fcf'));
assert.equal(result.swing.evidenceReferences.includes('ev-revenue'), false);
assert.equal(result.longTerm.freshness, 'FRESH');
assert.equal(result.swing.freshness, 'FRESH');
assert.equal(PRODUCTION_ACTIONS_ENABLED, false);

console.log('multi-horizon-intelligence.unit: PASS (verified-evidence contract/isolation/provenance assertions)');
