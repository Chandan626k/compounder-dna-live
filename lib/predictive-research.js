// Pre-registered predictive-validity research harness.
// Candidate set is fixed before evaluation; no candidate is chosen using the final holdout.
// All evaluations use verified OHLCV, next-bar entry, explicit transaction/slippage costs.

import { runValidationBacktest } from './strategy-validation.js';

export const RESEARCH_CANDIDATES = Object.freeze([
  { id:'trend20_50_rsi55', fast:20, slow:50, rsiLow:55, rsiHigh:72, volumeRatio:1, riskAtr:1.5, rewardRisk:2 },
  { id:'trend10_30_rsi50', fast:10, slow:30, rsiLow:50, rsiHigh:70, volumeRatio:1, riskAtr:1.5, rewardRisk:2 },
  { id:'trend30_70_rsi50', fast:30, slow:70, rsiLow:50, rsiHigh:70, volumeRatio:1, riskAtr:1.5, rewardRisk:2 },
  { id:'trend20_50_rsi50', fast:20, slow:50, rsiLow:50, rsiHigh:70, volumeRatio:1, riskAtr:1.5, rewardRisk:2 },
  { id:'trend20_50_rsi55_vol12', fast:20, slow:50, rsiLow:55, rsiHigh:72, volumeRatio:1.2, riskAtr:1.5, rewardRisk:2 },
  { id:'trend20_50_lowrisk', fast:20, slow:50, rsiLow:55, rsiHigh:72, volumeRatio:1, riskAtr:1, rewardRisk:1.5 },
  { id:'trend20_50_wider', fast:20, slow:50, rsiLow:55, rsiHigh:72, volumeRatio:1, riskAtr:2, rewardRisk:3 },
  { id:'trend10_30_rsi55', fast:10, slow:30, rsiLow:55, rsiHigh:72, volumeRatio:1, riskAtr:1.5, rewardRisk:2 },
  { id:'trend30_70_rsi55', fast:30, slow:70, rsiLow:55, rsiHigh:72, volumeRatio:1, riskAtr:1.5, rewardRisk:2 },
  { id:'trend10_50_rsi50', fast:10, slow:50, rsiLow:50, rsiHigh:70, volumeRatio:1, riskAtr:1.5, rewardRisk:2 },
  { id:'trend20_70_rsi50', fast:20, slow:70, rsiLow:50, rsiHigh:70, volumeRatio:1, riskAtr:1.5, rewardRisk:2 },
  { id:'trend30_50_rsi50', fast:30, slow:50, rsiLow:50, rsiHigh:70, volumeRatio:1, riskAtr:1.5, rewardRisk:2 },
]);

function pct(x){return Number.isFinite(x)?x:null;}
function mean(a){return a.length?a.reduce((s,x)=>s+x,0)/a.length:null;}
function stdev(a){if(a.length<2)return null;const m=mean(a);return Math.sqrt(a.reduce((s,x)=>s+(x-m)**2,0)/(a.length-1));}
function bonferroniCI(values,alpha=0.05,tests=RESEARCH_CANDIDATES.length){
  if(values.length<2)return null;
  const m=mean(values),sd=stdev(values),z=1.96; // conservative normal approximation; final holdout is not used here
  const a=alpha/tests;
  const zAdj=Math.sqrt(-2*Math.log(a/2));
  const se=sd/Math.sqrt(values.length);
  return {lower:m-zAdj*se,upper:m+zAdj*se,alphaFamily:alpha,tests};
}

export function buyAndHoldBenchmark(rows,{costs,start=0,end=rows.length-1}={}){
  if(!rows?.length||end<=start)return {status:'INSUFFICIENT_DATA'};
  const entryRaw=rows[start+1]?.o ?? rows[start+1]?.c;
  const exitRaw=rows[end]?.c;
  if(!Number.isFinite(entryRaw)||!Number.isFinite(exitRaw))return {status:'INSUFFICIENT_DATA'};
  const entry=entryRaw*(1+(costs.buyTransactionPct+costs.slippagePct)/100);
  const exit=exitRaw*(1-(costs.sellTransactionPct+costs.slippagePct)/100);
  const totalReturnPct=(exit/entry-1)*100;
  let equity=1,peak=1,maxDD=0;
  for(let i=start+1;i<=end;i++){
    const prev=rows[i-1]?.c,cur=rows[i]?.c;if(!Number.isFinite(prev)||!Number.isFinite(cur))continue;
    equity*=cur/prev;peak=Math.max(peak,equity);maxDD=Math.max(maxDD,(peak-equity)/peak);
  }
  return {status:'COMPLETED',totalReturnPct,benchmarkReturnPct:totalReturnPct,maxDrawdownPct:maxDD*100,entryRaw,exitRaw};
}

function scoreTraining(r){
  // Selection rule is fixed before testing: require positive expectancy and PF>1, then maximize expectancy.
  // No test/holdout observations enter this score.
  const expectancy=pct(r.expectancyPct),pf=pct(r.profitFactor),dd=pct(r.maxDrawdownPct),trades=r.trades||0;
  return {eligible:trades>=8&&expectancy!=null&&expectancy>0&&pf!=null&&pf>1&&dd!=null&&dd<=25,expectancy,pf,dd,trades};
}

export function walkForwardCandidateSearch(rows,{horizon=20,costs,trainBars=500,testBars=125,holdoutFraction=.20,candidates=RESEARCH_CANDIDATES}={}){
  const holdoutStart=Math.floor(rows.length*(1-holdoutFraction));
  const researchRows=rows.slice(0,holdoutStart);
  const holdoutRows=rows.slice(holdoutStart-1); // one warmup bar only; NO holdout metrics used in selection
  if(researchRows.length<trainBars+testBars+60||holdoutRows.length<60)return {status:'INSUFFICIENT_DATA'};
  const windows=[];let testStart=trainBars;
  while(testStart+testBars<=researchRows.length){
    const trainStart=Math.max(0,testStart-trainBars);
    const trainEnd=testStart-1;
    const ranked=candidates.map(p=>({p,r:runValidationBacktest(rows,{horizon,params:p,costs,start:trainStart,end:trainEnd})}))
      .map(x=>({...x,score:scoreTraining(x.r)}))
      .sort((a,b)=>(b.score.eligible-a.score.eligible)||(b.score.expectancy??-Infinity)-(a.score.expectancy??-Infinity));
    const chosen=ranked[0];
    const testEnd=testStart+testBars-1;
    const test=runValidationBacktest(rows,{horizon,params:chosen.p,costs,start:testStart,end:testEnd});
    windows.push({window:windows.length+1,trainStart,trainEnd,testStart,testEnd,chosen:chosen.p.id,training:chosen.r,test});
    testStart=testEnd+1;
  }
  const usable=windows.filter(w=>w.test.trades>0), returns=usable.map(w=>w.test.totalReturnPct), exps=usable.map(w=>w.test.expectancyPct).filter(Number.isFinite);
  const positive=usable.filter(w=>w.test.totalReturnPct>0).length;
  return {status:windows.length>=3?'COMPLETED':'INSUFFICIENT_WINDOWS',method:'WALK_FORWARD_MODEL_SELECTION',candidateCount:candidates.length,selectionRule:'training-only: >=8 trades, positive expectancy, PF>1, maxDD<=25%; otherwise highest training expectancy',windows,summary:{windows:windows.length,usableWindows:usable.length,positiveWindowRatePct:usable.length?positive/usable.length*100:null,aggregateReturnPct:returns.reduce((s,x)=>s+x,0),meanTestExpectancyPct:mean(exps),testExpectancyBonferroniCI:bonferroniCI(exps),worstTestDrawdownPct:usable.length?Math.max(...usable.map(w=>w.test.maxDrawdownPct||0)):null},finalHoldout:{status:'UNTOUCHED',startIndex:holdoutStart,bars:holdoutRows.length,selectionUsed:false,evaluated:false},decision:'HOLDOUT_REQUIRED'};
}

export function diagnoseFailure(strategy,benchmark){
  return {strategyVsBenchmark:{strategyReturnPct:strategy?.totalReturnPct??null,benchmarkReturnPct:benchmark?.totalReturnPct??null,excessReturnPct:(Number.isFinite(strategy?.totalReturnPct)&&Number.isFinite(benchmark?.totalReturnPct))?strategy.totalReturnPct-benchmark.totalReturnPct:null},failureReasons:{negativeExpectancy:Number(strategy?.expectancyPct)<0,profitFactorBelowOne:Number(strategy?.profitFactor)<1,drawdownHigh:Number(strategy?.maxDrawdownPct)>25,lowPositiveWindows:Number(strategy?.positiveWindowRatePct)<50}};
}
