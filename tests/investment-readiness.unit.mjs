import assert from 'node:assert/strict';
import { buildInvestmentReadiness } from '../lib/investment-readiness.js';

const evidence=(id,value,extra={})=>({evidenceId:id,value,source:'TEST_PROVIDER',sourceKey:`key.${id}`,ticker:'TEST.NS',issuer:'TEST LTD',reportingDate:'2026-09-01',reportingPeriod:'CURRENT',periodType:'CURRENT',statementScope:'MARKET_PRICE',unit:'INR',currency:'INR',reportedOrDerived:'REPORTED',status:'PROVIDER_RETURNED',retrievedAt:'2026-09-01T00:00:00.000Z',...extra});
const fundamentals={ratios:{roe:22,operatingMargin:18,revenueGrowth:10},growth:{revenue3yCagr:12,eps3yCagr:14,latestRevenueGrowth:8},derived:{fcfConversion:82,netDebtToEbitda:1.2}};
const valuation={fairValue:180,currentPrice:150,marginOfSafety:16.6666666667,verdict:'ATTRACTIVE',metricLineage:{fairValue:{value:180,inputMetrics:['forwardEPS'],inputLineage:{forwardEPS:{value:8.3,evidenceIds:['ev_eps'],qualification:'FORWARD',periodSemantics:{periodType:'FORWARD'}}}},forwardEPS:{value:8.3,evidenceIds:['ev_eps'],qualification:'FORWARD',periodSemantics:{periodType:'FORWARD'}},currentPrice:{value:150,evidenceIds:['ev_price'],evidence:evidence('ev_price',150)}}};
const canonicalEvidence={byId:{ev_eps:evidence('ev_eps',8.3,{periodType:'FORWARD',reportingPeriod:'FY2027E'}),ev_price:evidence('ev_price',150)}};
const base={fundamentals:{...fundamentals,canonicalEvidence},dataQuality:{confidence:88,completeness:82},valuation,technical:{last:150},score:{overall:84,dataLimited:false},stock:{yahooSymbol:'TEST.NS'}};

const ready=buildInvestmentReadiness(base);
assert.equal(ready.success,true); assert.equal(ready.evidenceBand,'HIGH'); assert.equal(ready.verifiedEvidence.valuationEvidenceStatus,'VERIFIED'); assert.equal(ready.verifiedEvidence.valuationScore,66.6666666667); assert.equal(ready.classification,'INVESTMENT CANDIDATE — HIGH EVIDENCE'); assert.equal(ready.blockers.length,0);

const noLineage=buildInvestmentReadiness({...base,valuation:{marginOfSafety:18,verdict:'ATTRACTIVE',fairValue:180,currentPrice:150}});
assert.equal(noLineage.verifiedEvidence.valuationScore,null); assert.ok(noLineage.blockers.includes('Verified valuation evidence is unavailable'));

const verdictOnly=buildInvestmentReadiness({...base,valuation:{verdict:'ATTRACTIVE'}});
assert.equal(verdictOnly.verifiedEvidence.valuationScore,null);

const invalidLineage={...valuation,metricLineage:{...valuation.metricLineage,fairValue:{...valuation.metricLineage.fairValue,inputLineage:{forwardEPS:{value:9,evidenceIds:['ev_eps'],qualification:'FORWARD',periodSemantics:{periodType:'FORWARD'}}}}}};
const mosInvalid=buildInvestmentReadiness({...base,valuation:invalidLineage});
assert.equal(mosInvalid.verifiedEvidence.valuationScore,null);

const dataLimited=buildInvestmentReadiness({...base,score:{overall:84,dataLimited:true});
assert.equal(dataLimited.classification,'WATCHLIST — EVIDENCE INCOMPLETE'); assert.ok(dataLimited.blockers.includes('Analysis is explicitly data-limited'));

const missingFundamentals=buildInvestmentReadiness({dataQuality:{confidence:88,completeness:82},valuation:base.valuation,technical:base.technical,score:{overall:84,dataLimited:false}});
assert.equal(missingFundamentals.verifiedEvidence.fundamentalScore,null); assert.ok(missingFundamentals.blockers.includes('Insufficient verified financial history for a fundamental score'));

const missingCoverage=buildInvestmentReadiness({...base,dataQuality:{confidence:88}});
assert.equal(missingCoverage.verifiedEvidence.coverage,null); assert.ok(missingCoverage.blockers.includes('Fundamental/sector evidence coverage below investment threshold'));

console.log('investment-readiness.unit: PASS');
