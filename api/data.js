import { sendMarketDataUnavailable } from '../lib/market-data-access-policy.js';
import {isRateLimited} from '../lib/cache.js';
const CACHE=new Map(),TTL=3*60*60*1000,MAX=400,H={'User-Agent':'Mozilla/5.0','Accept':'application/json','Referer':'https://finance.yahoo.com/'};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function cors(res){res.setHeader('Access-Control-Allow-Origin',process.env.ALLOWED_ORIGIN||'*');res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type');res.setHeader('Cache-Control','no-store')}
function send(res,s,b){cors(res);return res.status(s).json(b)}
function ticker(v){const x=String(v||'').trim().toUpperCase();if(!x||!/^[A-Z0-9._&-]{1,25}$/.test(x))return'';return x.endsWith('.NS')||x.endsWith('.BO')||x.startsWith('^')?x:x+'.NS'}
function get(k){const x=CACHE.get(k);if(!x||Date.now()>x.e){CACHE.delete(k);return null}return x.d}function set(k,d){if(CACHE.size>=MAX)CACHE.delete(CACHE.keys().next().value);CACHE.set(k,{d,e:Date.now()+TTL})}
async function yf(url,tries=2){let last;for(let i=1;i<=tries;i++){const c=new AbortController(),t=setTimeout(()=>c.abort(),15000);try{const r=await fetch(url,{headers:H,signal:c.signal}),txt=await r.text();clearTimeout(t);if(r.status===429||/too many requests/i.test(txt)){last=new Error('RATE_LIMIT');if(i<tries){await sleep(2000*i);continue}throw last}if(!r.ok)throw new Error('HTTP_'+r.status);return JSON.parse(txt)}catch(e){clearTimeout(t);last=e?.nam���q�^