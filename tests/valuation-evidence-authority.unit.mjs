import assert from 'node:assert/strict';
import { resolveValuationEvidence } from '../lib/valuation-evidence-authority.js';

const record = (id, value, extra = {}) => ({ evidenceId:id, value, source:'TEST_PROVIDER', sourceKey:`key.${id}`, ticker:'TEST.NS', issuer:'TEST LTD', reportingDate:'2026-03-31', reportingPeriod:'FY2026', periodType:'ANNUAL', statementScope:'CONSOLIDATED', unit:'INR', currency:'INR', reportedOrDerived:'REPORTED', status:'VERIFIED', retrievedAt:'2026-09-01T00:00:00.000Z', ...extra });
const forward = () => record('ev_forward', 8.3, { periodType:'FORWARD', reportingPeriod:'FY2027E' });
const price = () => record('ev_price', 150, { periodType:'CURRENT', reportingDate:'2026-09-01', reportingPeriod:'CURRENT' });
const valuationMetricLineage = () => ({
  fairValue:{value:180,inputMetrics:['forwardEPS'],inputLineage:{forwardEPS:{value:8.3,evidenceIds:['ev_forward'],qualification:'FORWARD',periodSemantics:{periodType:'FORWARD'}}}},
  forwardEPS:{value:8.3,evidenceIds:['ev_forward'],qualification:'FORWARD',periodSemantics:{periodType:'FORWARD'}},
  currentPrice:{evidence:price()},
});
const make = (overrides = {}) => resolveValuationEvidence({
  valuation:{fairValue:180,currentPrice:150,verdict:'ATTRACTIVE'},
  valuationMetricLineage:valuationMetricLineage(),
  financials:{canonicalEvidence:{byId:{ev_forward:forward(),ev_price:price()}}},
  ticker:'TEST.NS',
  ...overrides,
});

assert.equal(make().valuationEvidenceStatus,'VERIFIED');
assert.equal(make().eligibleForInvestmentReadiness,true);

const providerReturned = forward(); providerReturned.status = 'PROVIDER_RETURNED';
const providerAuthority = make({financials:{canonicalEvidence:{byId:{ev_forward:providerReturned,ev_price:price()}}}});
assert.equal(providerAuthority.valuationEvidenceStatus,'INSUFFICIENT_EVIDENCE');
assert.equal(providerAuthority.eligibleForInvestmentReadiness,false);

assert.equal(make({financials:{canonicalEvidence:{byId:{}}}}).valuationEvidenceStatus,'INSUFFICIENT_EVIDENCE');

const wrongValueLineage = valuationMetricLineage(); wrongValueLineage.fairValue.inputLineage.forwardEPS.value = 9;
assert.equal(make({valuationMetricLineage:wrongValueLineage}).valuationEvidenceStatus,'INSUFFICIENT_EVIDENCE');

assert.equal(make({financials:{canonicalEvidence:{byId:{ev_forward:forward({ticker:'OTHER.NS'}),ev_price:price()}}}}).valuationEvidenceStatus,'INSUFFICIENT_EVIDENCE');
assert.equal(make({financials:{canonicalEvidence:{byId:{ev_forward:forward({issuer:'OTHER LTD'}),ev_price:price()}}}}).valuationEvidenceStatus,'INSUFFICIENT_EVIDENCE');
assert.equal(make({financials:{canonicalEvidence:{byId:{ev_forward:forward({reportingPeriod:'FY2026'}),ev_price:price()}}}}).valuationEvidenceStatus,'INSUFFICIENT_EVIDENCE');

const trailingLineage = valuationMetricLineage();
trailingLineage.fairValue.inputMetrics = ['trailingEPS'];
trailingLineage.fairValue.inputLineage = { trailingEPS:{value:7.5,evidenceIds:['ev_ttm'],qualification:'TTM',periodSemantics:{periodType:'TTM'}} };
trailingLineage.trailingEPS = {value:7.5,evidenceIds:['ev_ttm'],qualification:'TTM',periodSemantics:{periodType:'TTM'}};
assert.equal(make({valuationMetricLineage:trailingLineage,financials:{canonicalEvidence:{byId:{ev_ttm:record('ev_ttm',7.5,{periodType:'TTM',reportingPeriod:'TTM'})}}}}).valuationEvidenceStatus,'VERIFIED');

const annualPeriodLineage = valuationMetricLineage();
annualPeriodLineage.fairValue.inputLineage.forwardEPS = {value:8.3,evidenceIds:['ev_forward'],qualification:'ANNUAL',periodSemantics:{periodType:'ANNUAL'}};
assert.equal(make({valuationMetricLineage:annualPeriodLineage}).valuationEvidenceStatus,'INSUFFICIENT_EVIDENCE');

const noInputsLineage = valuationMetricLineage(); noInputsLineage.fairValue.inputMetrics = [];
assert.equal(make({valuationMetricLineage:noInputsLineage}).valuationEvidenceStatus,'INSUFFICIENT_EVIDENCE');

const metadataLineage = valuationMetricLineage();
metadataLineage.fairValue.inputLineage.forwardEPS = {value:8.3,evidenceIds:['ev_forward'],qualification:'FORWARD',periodSemantics:{periodType:'FORWARD'},statementScope:'OTHER',unit:'USD',currency:'USD'};
assert.equal(make({valuationMetricLineage:metadataLineage}).valuationEvidenceStatus,'INSUFFICIENT_EVIDENCE');

assert.equal(make({financials:{canonicalEvidence:{byId:{ev_forward:forward({statementScope:null}),ev_price:price()}}}}).valuationEvidenceStatus,'INSUFFICIENT_EVIDENCE');
assert.equal(make({financials:{canonicalEvidence:{byId:{ev_forward:forward({unit:null}),ev_price:price()}}}}).valuationEvidenceStatus,'INSUFFICIENT_EVIDENCE');
assert.equal(make({financials:{canonicalEvidence:{byId:{ev_forward:forward({currency:null}),ev_price:price()}}}}).valuationEvidenceStatus,'INSUFFICIENT_EVIDENCE');
assert.equal(make({financials:{canonicalEvidence:{byId:{ev_forward:forward({source:null}),ev_price:price()}}}}).valuationEvidenceStatus,'INSUFFICIENT_EVIDENCE');
assert.equal(make({financials:{canonicalEvidence:{byId:{ev_forward:forward({retrievedAt:null}),ev_price:price()}}}}).valuationEvidenceStatus,'INSUFFICIENT_EVIDENCE');
assert.equal(make({financials:{canonicalEvidence:{byId:{ev_forward:forward({reportingDate:'2026-09-02'}),ev_price:price()}}}}).valuationEvidenceStatus,'INSUFFICIENT_EVIDENCE');

const derivedIncomplete = record('ev_derived', 8.3, { reportedOrDerived:'DERIVED', status:'VERIFIED_COMPATIBLE_STATEMENT_INPUTS', periodType:'FORWARD', reportingPeriod:'FY2027E' });
const derivedLineage = valuationMetricLineage(); derivedLineage.fairValue.inputLineage.forwardEPS = {value:8.3,evidenceIds:['ev_derived'],qualification:'FORWARD',periodSemantics:{periodType:'FORWARD'}};
assert.equal(make({valuationMetricLineage:derivedLineage,financials:{canonicalEvidence:{byId:{ev_derived:derivedIncomplete}}}}).valuationEvidenceStatus,'INSUFFICIENT_EVIDENCE');

assert.equal(make({valuation:{fairValue:180,currentPrice:151,verdict:'ATTRACTIVE'}}).eligibleForInvestmentReadiness,false);
console.log('valuation-evidence-authority.unit: PASS');
