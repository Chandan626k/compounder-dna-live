import assert from 'node:assert/strict';
import { buildInvestmentReadiness } from '../lib/investment-readiness.js';

const fundamentals={ratios:{roe:22,operatingMargin:18,revenueGrowth:10},growth:{revenue3yCagr:12,eps3yCagr:14,latestRevenueGrowth:8},derived:{fcfConversion:82,netDebtToEbitda:1.2}};
const evidence=(id,value,extra={})=>({evidenceId:id,value,source:'TEST_PROVIDER',sourceKey:`key.${id}`,ticker:'TEST.NS',issuer:'TEST LTD',reportingDate:'2026-09-10',reportingPeriod:'CURRENT',periodType:'CURRENT',statementScope:'MARKET_PRICE',unit:'INR',currency:'INR',reportedOrDerived:'REPORTED',status:'PROVIDER_RETURNED',retrievedAt:'2026-09-10T00:00:00.000Z',...extra});
const valuation={fairValue:180,currentPrice:500,marginOfSafety:18,verdict:'ATTRACTIVE',metricLineage:{fairValue:{value:180,inputMetrics:['forwardEPS'],inputLineage:{forwardEPS:{value:8.3,evidenceIds:['ev_eps'],qualification:'FORWARD',periodSemantics:{periodType:'FORWARD'}}}},forwardEPS:{value:8.3,evidenceIds:['ev_eps'],qualification:'FORWARD',periodSemantics:{periodType:'FORWARD'}},currentPrice:{value:500,evidenceIds:['ev_price'],evidence:evidence('ev_price',500)}}};
const canonical={byId:{ev_eps:evidence('ev_eps',8.3,{periodType:'FORWARD',reportingPeriod:'FY2027E'}),ev_price:evidence('ev_price',500)}};
const base={fundamentals,dataQuality:{confidence:88,completeness:82},valuation,technical:{last:500},score:{overall:84,dataLimited:false},stock:{yahooSymbol:'TEST.NS'}};
const ready=buildInvestmentReadiness(base);
assert.equal(ready.success,true); assert.equal(ready.evidenceBand,'HIGH'); assert.equal(ready.verifiedEvidence.coverage,82); assert.equal(ready.verifiedEvidence.fundamentalScore,100); assert.equal(ready.verifiedEvidence.valuationEvidenceStatus,'INSUFFICIENT_EVIDENCE'); assert.equal(ready.classification,'WATCHLIST — EVIDENCE INCOMPLETE'); assert.ok(ready.blockers.includes('Verified valuation evidence is unavailable'));
const verified=buildInvestmentReadiness({...base,fundamentals,valuation:{...valuation},financials:{canonicalEvidence:canonical}});
verified.valuationEvidenceAuthority = undefined;
const direct=buildInvestmentReadiness({...base,fundamentals,valuation:{...valuation},financials:{canonicalEvidence:canonical},valuationEvidenceAuthority:{valuationEvidenceStatus:'VERIFIED',eligibleForInvestmentReadiness:true}});
assert.equal(direct.verifiedEvidence.valuationScore,77); assert.equal(direct.classification,'INVESTMENT CANDIDATE — HIGH EVIDENCE'); assert.equal(direct.blockers.length,0);
const dataLimited=buildInvestmentReadiness({...base,score:{overall:84,dataLimited:true}}); assert.equal(dataLimited.classification,'WATCHLIST — EVIDENCE INCOMPLETE'); assert.ok(dataLimited.blockers.includes('Analysis is explicitly data-limited'));
const missingFundamentals=buildInvestmentReadiness({dataQuality:{confidence:88,completeness:82},valuation:base.valuation,technical:base.technical,score:{overall:84,dataLimited:false}}); assert.equal(missingFundamentals.verifiedEvidence.fundamentalScore,null); assert.ok(missingFundamentals.blockers.includes('Insufficient verified financial history for a fundamental score')); assert.equal(missingFundamentals.classification,'WATCHLIST — EVIDENCE INCOMPLETE');
const missingCoverage=buildInvestmentReadiness({...base,dataQuality:{confidence:88}}); assert.equal(missingCoverage.verifiedEvidence.coverage,null); assert.ok(missingCoverage.blockers.includes('Fundamental/sector evidence coverage below investment threshold'));
console.log('investment-readiness.unit: PASS');
