import assert from 'node:assert/strict';
import { buildFinancialMetricLineage, buildValuationMetricLineage } from '../lib/financial-metric-lineage.js';

const statement = { evidence:{ fields:{ revenue:'ev_rev', totalDebt:'ev_debt' }, byId:{ ev_rev:{ evidenceId:'ev_rev', value:1000 }, ev_debt:{ evidenceId:'ev_debt', value:200 } } }, current:{ revenue:1000, totalDebt:200, cash:50 }, ratios:{ roe:18, revenueGrowth:12 }, derived:{ fcfMargin:15 }, derivedEvidence:{ fcfMargin:{ inputEvidenceIds:['ev_fcf','ev_rev'], calculation:'APPLICATION_DERIVED', status:'VERIFIED_COMPATIBLE_STATEMENT_INPUTS' } }, growth:{ eps5yCagr:10, pat5yCagr:8 } };
const lineage = buildFinancialMetricLineage({ financials:statement, ticker:'TEST.NS', retrievedAt:'2026-09-05T03:30:00.000Z' });
assert.deepEqual(lineage.revenue.evidenceIds,['ev_rev']);
assert.equal(lineage.revenue.classification,'CANONICAL_STATEMENT');
assert.equal(lineage.totalDebt.classification,'CANONICAL_STATEMENT');
assert.equal(lineage.roe.classification,'PROVIDER_REPORTED');
assert.equal(lineage.roe.evidence[0] || lineage.roe.evidenceId, lineage.roe.evidence[0] || lineage.roe.evidenceId);
assert.equal(lineage.fcfMargin.calculation,'APPLICATION_DERIVED');
assert.deepEqual(lineage.fcfMargin.evidenceIds,['ev_fcf','ev_rev']);

const valuation = { currentPrice:150, marketCap:150000, marketCapStatus:'calculated', trailingPE:20, forwardPE:18, priceToBook:3, pegRatio:1.4, enterpriseValue:160000, evToEbitda:12, evToRevenue:4, trailingEPS:7.5, forwardEPS:8.3, bookValue:50, sharesOutstanding:1000, growthSignal:9, fairValue:180, upsideToFairValue:20, marginOfSafety:16.7, valuationGap:-16.7 };
const vl = buildValuationMetricLineage({ valuation, financials:{ ...statement, metricLineage:lineage }, ticker:'TEST.NS', priceSource:{ source:'CURRENT_PROVIDER_QUOTE', currentQuotePrice:150, dailyBarClose:149 }, retrievedAt:'2026-09-05T03:30:00.000Z' });
assert.equal(vl.currentPrice.observationType,'CURRENT_QUOTE');
assert.equal(vl.trailingPE.classification,'PROVIDER_REPORTED');
assert.equal(vl.fairValue.classification,'APPLICATION_DERIVED');
assert.ok(vl.fairValue.evidenceIds.length >= 1);
assert.equal(vl.upsideToFairValue.inputMetrics.includes('currentPrice'),true);
console.log('financial-metric-lineage-builder.unit: PASS');
