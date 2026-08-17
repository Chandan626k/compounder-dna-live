import { scanSymbols, DEFAULT_UNIVERSE } from '../lib/scanner-engine.js';
import { cacheGet, cacheSet } from '../lib/cache.js';
const CORS={'Access-Control-Allow-Origin':process.env.ALLOWED_ORIGIN||'*','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type','Cache-Control':'no-store'};
const send=(res,status,body)=>{Object.entries(CORS).forEach(([k,v])=>res.setHeader(k,v));return res.status(status).json(body)};
export default async function handler(req,res){
 if(req.method==='OPTIONS')return send(res,204,{});
 if(req.method!=='GET'&&req.method!=='POST')return send(res,405,{success:false,error:'Method not allowed'});
 try{
  let symbols=DEFAULT_UNIVERSE;
  if(req.method==='GET'&&req.query?.symbols)symbols=String(req.query.symbols).split(',').map(x=>x.trim()).filter(Boolean);
  if(req.method==='POST'){const b=typeof req.body==='string'?JSON.parse(req.body):req.body||{};if(Array.isArray(b.symbols)&&b.symbols.length)symbols=b.symbols;}
  const key=`tomorrow-scan:${symbols.map(String).sort().join(',')}`;
  const cached=cacheGet(key);if(cached)return send(res,200,{...cached,cached:true});
  const result=await scanSymbols(symbols);cacheSet(key,result,10*60*1000);return send(res,200,{...result,cached:false});
 }catch(error){console.error('[SCAN ERROR]',error?.message);return send(res,502,{success:false,error:'Scanner data is temporarily unavailable. No fallback or fabricated values are used.'})}
}
