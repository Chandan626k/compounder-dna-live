import { sendMarketDataUnavailable } from '../lib/market-data-access-policy.js';
import { scanSymbols, DEFAULT_UNIVERSE } from '../lib/scanner-engine-v2.js';
import { analyze as analyzeStock } from '../lib/market-engine.js';
import { cacheGet, cacheSet } from '../lib/cache.js';
import { gateTradingAction, productionDecisionPolicy } from '../lib/production-decision-gate.js';
const CORS={'Access-Control-Allow-Origin':process.env.ALLOWED_ORIGIN||'*','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type','Cache-Control':'no-store'};
const send=(res,status,body)=>{Object.entries(CORS).forEach(([k,v])=>res.setHeader(k,v));return res.status(status).json(body)};
const withTimeout=(p,ms)=>Promise.race([p,new Promise((_,rej)=>setTimeout(()=>rej(new Error('TIMEOUT')),ms))]);
function uiResult(x){const setup=x.setup||{},why=Array.isArray(x.why)?x.why:(x.evidence||[]),rawValuation=x.deep?.valuation||'DATA INSUFFICIENT',score=x.strategyScore??setup.strategyScore??null,risk=x.riskRewardScore??setup.riskRewardScore??null,confidence=x.confidence??setup.confidence??null,reason=why.slice(0,3).join(' • ')||'No separate evidence available';return {...x,score,risk,confidence,action:setup.action??x.deep?.decision??'WAIT',valuation:`${rawValuation} | Confidence ${confidence??'—'}/100 | Why: ${reason}`,trend:x.technical?.trend??'—',reason,ui:{strategyScore:score,riskRewardScore:risk,confidence,why:why.slice(0,5)}}}
async function enrichDeep(rows){const c���q�^