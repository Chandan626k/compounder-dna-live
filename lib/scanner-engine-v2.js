import { verifiedHistory } from './market-data-provider.js';
import { calculateCanonicalTechnical } from './canonical-technical-engine.js';
const clamp=(x,a=0,b=100)=>Math.max(a,Math.min(b,Number.isFinite(x)?x:a));
const pct=(a,b)=>a!=null&&b?((a/b)-1)*100:null;
const norm=s=>{s=String(s||'').toUpperCase().trim();return s.endsWith('.NS')||s.endsWith('.BO')?s:`${s}.NS`};
export const DEFAULT_UNIVERSE=['RELIANCE','TCS','HDFCBANK','ICICIBANK','INFY','BHARTIARTL','SBIN','LICI','ITC','HINDUNILVR','LT','BAJFINANCE','HCLTECH','MARUTI','M&M','KOTAKBANK','SUNPHARMA','AXISBANK','ULTRACEMCO','TITAN','ADANIENT','ADANIPORTS','NTPC','ONGC','POWERGRID','TATASTEEL','JSWSTEEL','NESTLEIND','ASIANPAINT','WIPRO','TECHM','TATAMOTORS','BAJAJFINSV','COALINDIA','HINDALCO','TRENT','EICHERMOT','GRASIM','CIPLA','DRREDDY','DIVISLAB','APOLLOHOSP','SBILIFE','HDFCLIFE','BAJAJ-AUTO','HEROMOTOCO','TATACONSUM','BEL','HAL','INDUSINDBK'];
function tech(rows, context={}) {
  const r=calculateCanonicalTechnical(rows.map(x=>({date:x.date,open:x.o,high:x.h,low:x.l,close:x.c,volume:x.v})),context);
  if(r.status!=='VERIFIED') throw new Error(`CANONICAL_TECHNICAL_UNAVAILABLE:${r.reason||'UNKNOWN'}`);
  const momentum5d=r.change1d!=null&&rows.length>5?pct(r.last,rows.at(-6).c):null;
  let bull=50+(r.trend==='STRONG UPTREND'?18:r.trend==='UPTREND'?10:r.trend==='DOWNTREND'?-18:0)+(r.last>r.e20?7:-7)+(r.rsi!=null?(r.rsi>=55&&r.rsi<=72?8:r.rsi>78||r.rsi<35?-7:0):0)+(r.macd?.histogram>0?7:-7)+(r.relativeVolume>=1.25?6:0);
  bull+=momentum5d>3?5:momentum5d<-3?-5:0;
  const historyQuality=Math.round(clamp(r.historyBars/252*100));
  return {...r,momentum5d,historyQuality,bullScore:Math.round(clamp(bull)),bearScore:Math.round(clamp(100-bull)),ema200Available:Boolean(r.e200)};
}
export function buildScannerSetup(t,intra){
  const lifecycle=t.breakoutLifecycle||null;
  const risk=lifecycle?.riskEvidence||null;
  const direction=lifecycle?.direction||null;
  const atrVerified=Number.isFinite(risk?.invalidationEvidence?.atrAtBreakout);
  const riskVerified=risk?.status==='VERIFIED'&&atrVerified&&Number.isFinite(risk?.invalidationLevel)&&Number.isFinite(risk?.riskReward)&&risk.riskReward>0;
  const volumeConfirmed=lifecycle?.confirmationEvidence?.volumeStatus==='CONFIRMED'&&Number.isFinite(lifecycle?.confirmationEvidence?.relativeVolume)&&lifecycle.confirmationEvidence.relativeVolume>=1.2;
  const targetEvidence=Array.isArray(risk?.targetEvidence)&&risk.targetEvidence.length>0;
  const notOverextended=lifecycle?.overextended===false;
  const breakoutLevel=Number.isFinite(lifecycle?.breakoutLevel)?lifecycle.breakoutLevel:null;
  const invalidation=Number.isFinite(risk?.invalidationLevel)?risk.invalidationLevel:null;
  const target=Array.isArray(risk?.targetZones)&&Number.isFinite(risk.targetZones[0])?risk.targetZones[0]:null;
  const rr=riskVerified?risk.riskReward:null;
  const buyRiskAvailable=riskVerified&&direction==='UP'&&invalidation<lifecycle?.breakoutLevel&&target>lifecycle?.breakoutLevel&&targetEvidence;
  const sellRiskAvailable=riskVerified&&direction==='DOWN'&&invalidation>lifecycle?.breakoutLevel&&target<lifecycle?.breakoutLevel&&targetEvidence;
  let action='WAIT';
  if(t.bullScore>=72&&direction==='UP'&&['SUCCESSFUL_RETEST','CONTINUATION'].includes(lifecycle?.status)&&t.trend!=='DOWNTREND'&&t.rsi!=null&&t.rsi<76&&volumeConfirmed&&atrVerified&&buyRiskAvailable&&rr>=1.5&&t.historyBars>=120&&notOverextended)action='BUY_READY';
  else if(t.bearScore>=72&&direction==='DOWN'&&['SUCCESSFUL_RETEST','CONTINUATION'].includes(lifecycle?.status)&&t.trend==='DOWNTREND'&&t.rsi!=null&&t.rsi>24&&volumeConfirmed&&atrVerified&&sellRiskAvailable&&rr>=1.5&&t.historyBars>=120&&notOverextended)action='SELL_READY';
  else if(t.trend==='UPTREND'&&t.rsi!=null&&t.rsi<50)action='BUY_ON_PULLBACK';
  else if(t.trend==='DOWNTREND'&&t.rsi!=null&&t.rsi>50)action='SELL_ON_RALLY';
  if(intra&&intra.status==='VERIFIED'&&action==='BUY_READY'&&intra.bullScore<52)action='WAIT_MTF_CONFLICT';
  if(intra&&intra.status==='VERIFIED'&&action==='SELL_READY'&&intra.bearScore<52)action='WAIT_MTF_CONFLICT';
  const relativeVolumeScore=Math.min(100,(lifecycle?.confirmationEvidence?.relativeVolume||0)/1.5*100);
  let conf=Math.round(clamp(Math.max(t.bullScore,t.bearScore)*.55+t.historyQuality*.2+relativeVolumeScore*.1+(intra?.status==='VERIFIED'?Math.max(intra.bullScore,intra.bearScore):50)*.15));
  const rrScore=rr==null?null:Math.round(clamp(rr/2.5*100));
  const strategyScore=rrScore==null?Math.round(clamp(conf*.65+Math.max(t.bullScore,t.bearScore)*.35)):Math.round(clamp(conf*.45+Math.max(t.bullScore,t.bearScore)*.25+rrScore*.30));
  const buyReadyRisk=buyRiskAvailable?{trigger:+breakoutLevel.toFixed(2),stop:+invalidation.toFixed(2),target1:+target.toFixed(2),target2:null,riskReward:+rr.toFixed(2)}:{trigger:null,stop:null,target1:null,target2:null,riskReward:null};
  const sellReadyRisk=sellRiskAvailable?{trigger:+breakoutLevel.toFixed(2),stop:+invalidation.toFixed(2),target1:+target.toFixed(2),target2:null,riskReward:+rr.toFixed(2)}:{trigger:null,stop:null,target1:null,target2:null,riskReward:null};
  return{action,confidence:conf,readiness:Math.max(t.bullScore,t.bearScore),strategyScore,riskRewardScore:rrScore,tradeHorizon:action.includes('READY')?'NEXT_SESSION':action.includes('PULLBACK')||action.includes('RALLY')?'SWING_WATCH':'NO_SETUP',buy:buyReadyRisk,sell:sellReadyRisk,gates:{historyVerified:t.historyBars>=120,volumeConfirmed,riskRewardConfirmed:riskVerified&&rr>=1.5,canonicalRiskVerified:riskVerified,atrVerified,locationVerified:targetEvidence,multiTimeframeChecked:Boolean(intra)}}
}
function evidence(t){return[].concat(t.trend.includes('UPTREND')?'Daily trend bullish':t.trend==='DOWNTREND'?'Daily trend bearish':'Daily trend mixed',t.rsi>=55&&t.rsi<=72?'RSI momentum confirmed':[],t.macd?.histogram>0?'MACD positive':t.macd?.histogram<0?'MACD negative':[],t.relativeVolume>=1.25?'Volume expansion':[],t.momentum5d>3?'5D momentum positive':t.momentum5d<-3?'5D momentum negative':[],t.breakout?.confirmed?'Breakout close confirmed':[],t.breakdown?.confirmed?'Breakdown close confirmed':[]).filter(Boolean)}
function addStrategyFields(x){const setup=x.setup||{};return{...x,strategyScore:setup.strategyScore??null,riskRewardScore:setup.riskRewardScore??null,confidence:setup.confidence??null,why:x.evidence||[],dataConfidence:setup.confidence??null}}
export async function scanSymbols(symbols=DEFAULT_UNIVERSE){const u=[...new Set(symbols.map(norm))].slice(0,100),out=[],errors=[];let i=0;async function worker(){while(i<u.length){const s=u[i++];try{const d=await verifiedHistory(s,{interval:'1d',days:1800,minBars:60}),t=tech(d.rows,{symbol:s,source:d.source,retrievedAt:d.retrievedAt,timeframe:d.interval||'1d'});out.push({symbol:s.replace(/\.NS$|\.BO$/,''),yahooSymbol:s,price:t.last,asOf:d.latest,source:d.source,technical:t,evidence:evidence(t),dataStatus:'VERIFIED_MARKET_DATA'})}catch(e){errors.push({symbol:s,error:e?.message||'UNAVAILABLE'})}}}await Promise.all(Array.from({length:5},worker));out.sort((a,b)=>Math.max(b.technical.bullScore,b.technical.bearScore)-Math.max(a.technical.bullScore,a.technical.bearScore));const top=out.slice(0,20);let j=0;async function iw(){while(j<top.length){const x=top[j++];try{const d=await verifiedHistory(x.yahooSymbol,{interval:'1h',days:60,minBars:50});const intra=tech(d.rows,{symbol:x.yahooSymbol,source:d.source,retrievedAt:d.retrievedAt,timeframe:d.interval||'1h'});x.intraday={bars:d.bars,source:d.source,technical:intra};x.setup=buildScannerSetup(x.technical,intra)}catch(e){x.intraday={bars:0,source:null,unavailable:true};x.setup=buildScannerSetup(x.technical,null)}}}await Promise.all(Array.from({length:4},iw));out.forEach(x=>{if(!x.setup)x.setup=buildScannerSetup(x.technical,null);Object.assign(x,addStrategyFields(x))});out.sort((a,b)=>(b.strategyScore??-1)-(a.strategyScore??-1));const ready=out.filter(x=>x.setup&&['BUY_READY','SELL_READY'].includes(x.setup.action));return{generatedAt:new Date().toISOString(),universeRequested:u.length,scanned:out.length,readyCount:ready.length,readyList:ready,errors,results:out,policy:{fakeDataAllowed:false,missingDataAction:'EXCLUDE_FROM_READY_LIST',decisionBasis:'strategy quality (45% confidence + 25% directional readiness + 30% risk/reward), canonical verified OHLCV + multi-indicator price action + explicit timeframe confirmation',explanationField:'why = evidence supporting the setup; absence of evidence does not create a signal'},indicatorSet:['EMA20/50/100/200','RSI14','MACD12/26/9','ATR14','ADX14','Bollinger20/2','RelativeVolume20','20D/52W structure','breakout/breakdown','explicit timeframe provenance','risk/reward','next-session readiness']}}