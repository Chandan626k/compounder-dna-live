import { runValidationBacktest } from './strategy-validation.js';

const COST_SCENARIOS={current:{buyTransactionPct:.115,sellTransactionPct:.115,slippagePct:.05},conservative:{buyTransactionPct:.15,sellTransactionPct:.15,slippagePct:.10},stress:{buyTransactionPct:.25,sellTransactionPct:.25,slippagePct:.20}};
const DEFAULT_PARAMS={fast:20,slow:50,rsiLow:55,rsiHigh:72,volumeRatio:1,riskAtr:1.5,rewardRisk:2};

export function walkForwardValidation(rows,{horizon=20,params=DEFAULT_PARAMS,costs=COST_SCENARIOS.conservative,trainBars=500,testBars=125}={}){
  if(!Array.isArray(rows)||rows.length<trainBars+testBars+60)return{status:'INSUFFICIENT_DATA',classification:'HEURISTIC / EXPERIMENTAL / INSUFFICIENT VALIDATION',windows:[],summary:{windows:0,testBars:0,trades:0}};
  const windows=[];
  let testStart=trainBars;
  while(testStart<rows.length){
    const testEnd=Math.min(testStart+testBars-1,rows.length-1);
    if(testEnd-testStart+1<Math.max(60,horizon+1))break;
    const result=runValidationBacktest(rows,{horizon,params,costs,start:testStart,end:testEnd});
    windows.push({window:windows.length+1,trainStart:0,trainEnd:testStart-1,testStart,testEnd,testBars:testEnd-testStart+1,trades:result.trades,totalReturnPct:result.totalReturnPct,profitFactor:result.profitFactor,maxDrawdownPct:result.maxDrawdownPct,expectancyPct:result.expectancyPct,winRate:result.winRate});
    testStart=testEnd+1;
  }
  const usable=windows.filter(w=>w.trades>0);
  const totalReturnPct=usable.reduce((s,w)=>s+w.totalReturnPct,0);
  const positiveWindows=usable.filter(w=>w.totalReturnPct>0).length;
  const profitFactors=usable.map(w=>w.profitFactor).filter(v=>Number.isFinite(v));
  const maxDrawdownPct=usable.reduce((m,w)=>Math.max(m,w.maxDrawdownPct||0),0);
  return{status:windows.length>=3?'COMPLETED':'INSUFFICIENT_WINDOWS',classification:'HEURISTIC / EXPERIMENTAL / INSUFFICIENT VALIDATION',method:{type:'ROLLING_OUT_OF_SAMPLE',trainBars,testBars,horizon,parametersFixed:true,parameterTuning:false},windows,summary:{windows:windows.length,usableWindows:usable.length,testBars:windows.reduce((s,w)=>s+w.testBars,0),trades:windows.reduce((s,w)=>s+w.trades,0),aggregateWindowReturnPct:totalReturnPct,positiveWindowRate:usable.length?positiveWindows/usable.length*100:null,medianProfitFactor:profitFactors.length?[...profitFactors].sort((a,b)=>a-b)[Math.floor(profitFactors.length/2)]:null,worstWindowDrawdownPct:maxDrawdownPct},decision:'DO NOT PRODUCTION-VALIDATE'};
}

export { COST_SCENARIOS, DEFAULT_PARAMS };
