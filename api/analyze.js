import { sendMarketDataUnavailable } from '../lib/market-data-access-policy.js';
import { analyze as analyzeStock } from '../lib/market-engine.js';
import { cacheGet, cacheSet, cacheStats, isRateLimited } from '../lib/cache.js';
import { validateAnalyzeRequest } from '../lib/validate.js';
import { parseAIResponse, renderAIHtml } from '../lib/ai-schema.js';
const CORS={'Access-Control-Allow-Origin':process.env.ALLOWED_ORIGIN||'*','Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type, X-Request-ID','Cache-Control':'no-store'};
async function callOpenAI({apiKey,model,prompt}){const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),20000);try{const response=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({model,max_tokens:700,temperature:0.35,messages:[{role:'user',content:prompt}]}),signal:controller.signal});const data=await response.json().catch(()=>({}));if(!response.ok){const error=new Error(data?.error?.message||`OpenAI HTTP ${response.status}`);error.status=response.status;throw error}return data}finally{clearTimeout(timeout)}}
const applyHeaders=res=>{Object.entries(CORS).forEach(([k,v])=>res.setHeader(k,v));return res};
const requestId=req=>req.headers['x-request-id']||globalThis.crypto?.randomUUID?.()||Date.now().toString();
const errorResponse=(res,status,error,id)=>{Object.entries(C���q�^