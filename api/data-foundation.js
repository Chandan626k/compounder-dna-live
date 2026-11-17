import { sendMarketDataUnavailable } from '../lib/market-data-access-policy.js';
import { verifiedHistory } from '../lib/market-data-provider.js';
import YahooFinance from 'yahoo-finance2';

const yf = new YahooFinance();
const CORS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-store',
};
const num = (v) => typeof v === 'number' && Number.isFinite(v) ? v : (v && Number.isFinite(v.raw) ? v.raw : null);
const ticker = (s) => { const x=String(s||'').trim().toUpperCase().replace(/\s+/g,''); if(!x) throw Error('Stock symbol is required'); return x.endsWith('.NS')||x.endsWith('.BO')?x:`${x}.NS`; };
const iso = (v) => { const d=v instanceof Date?v:new Date(v); return Number.isNaN(d.getTime())?null:d.toISOString(); };
const normalize = (data, period, fields) => (Array.isArray(data)?data:[]).map(r=>{const out={date:iso(r?.date),period}; for(const f of fields) out[f]=num(r?.[f]); return out;}).filter(r=>r.date).sort((a,b)=>new Date(a.date)-new Date(b.date));
const coverage = (records, fields) => { const available=fields.filter(f=>records.some(r=>r[f]!=null)).length; return {available,total:fields.length,percentage:fields.length?Math.round(available/fields.length*100):0}; };

async function foundation(symbol) {
  const now=new Date(), p5=new Date(Date.now()-5*365.25*86400000);
  const annualFields=['totalRevenue','operatingIncome','netIncom���q�^