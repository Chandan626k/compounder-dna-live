import { sendMarketDataUnavailable } from '../lib/market-data-access-policy.js';
import YahooFinance from 'yahoo-finance2';
import { analyze as analyzeStock } from '../lib/market-engine.js';
import { buildTrading } from '../lib/trading-engine.js';
import { gateTradingAction, productionDecisionPolicy } from '../lib/production-decision-gate.js';
const yahooFinance=new YahooFinance();
const HEADERS={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,OPTIONS','Cache-Control':'no-store'};
const num=v=>{if(typeof v==='number'&&Number.isFinite(v))return v;if(v&&typeof v==='object'&&Number.isFinite(v.raw))return v.raw;return null};
const unavailable=e=>/no data found|symbol may be delisted|insufficient market data/i.test(String(e?.message||''));
async function fetchChart(symbol){const ticker=String(symbol).endsWith('.NS')||String(symbol).endsWith('.BO')?String(symbol):`${symbol}.NS`;const data=await yahooFinance.chart(ticker,{period1:new Date(Date.now()-2*365.25*24*60*60*1000),period2:new Date(),interval:'1d',events:'div,splits',return:'object'});const rows=[];if(Array.isArray(data?.quotes)){for(const item of data.quotes){const close=num(item?.close),high=num(item?.high),low=num(item?.low),volume=num(item?.volume);if(close!=null&&high!=null&&low!=null&&volume!=null){const date=item.date instanceof Date?item.date:new Date(item.date);if(!Number.isNaN(date.getTime()))rows.push({date:date.toISOString(),open:num(item?.open),close,high,low,volume})}}}else{const timestamp���q�^