import YahooFinance from 'yahoo-finance2';
import { analyze as analyzeStock } from '../lib/market-engine.js';
import { buildTrading } from '../lib/trading-engine.js';
const yf=new YahooFinance();
const headers={'Access-Control-Allow-Origin':'*','Cache-Control':'no-store'};
const num=v=>{if(typeof v==='number'&&Number.isFinite(v))return v;if(v&&typeof v==='object'&&Number.isFinite(v.raw))return v.raw;return null};
async function chart(symbol){const data=await yf.chart(symbol.endsWith('.NS')||symbol.endsWith('.BO')?symbol:`${symbol}.NS`,{period1:new Date(Date.now()-2*365.25*86400000),period2:new Date(),interval:'1d',events:'div,splits',return:'object'});const rows=[];for(const q of data?.quotes||[]){const close=num(q.close),high=num(q.high),low=num(q.low),volume=num(q.volume);if(close!=null&&high!=null&&low!=null&&volume!=null)rows.push({date:new Date(q.date).toISOString(),open:num(q.open),high,low,close,volume});}if(rows.length<60)throw Error('Insufficient chart history');return rows;}
export default async function handler(req,res){Object.entries(headers).forEach(([k,v])=>res.setHeader(k,v));if(req.method==='OPTIONS')return res.status(204).end();const symbol=String(req.query?.symbol||'').trim().toUpperCase();if(!symbol)return res.status(400).json({error:'Stock symbol is required'});try{const [analysis,rows]=await Promise.all([analyzeStock(symbol),chart(symbol)]);return res.status(200).json(buildTrading(analysis,rows));}catch(e){console.error('[TRADING]',symbol,e?.message);return res.status(502).json({error:'Trading data temporarily unavailable. Please try again.'});}}
