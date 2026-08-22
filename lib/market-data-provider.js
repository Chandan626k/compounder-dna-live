import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();
const toNum=v=>typeof v==='number'&&Number.isFinite(v)?v:null;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

function parseYahoo(json){const r=json?.chart?.result?.[0],q=r?.indicators?.quote?.[0],adj=r?.indicators?.adjclose?.[0]?.adjclose;if(!r||!q)return[];const ts=r.timestamp||[];return ts.map((t,i)=>({date:new Date(t*1000).toISOString(),o:toNum(q.open?.[i]),h:toNum(q.high?.[i]),l:toNum(q.low?.[i]),c:toNum(q.close?.[i]),adjC:toNum(adj?.[i]),v:toNum(q.volume?.[i])})).filter(x=>x.o!=null&&x.h!=null&&x.l!=null&&x.c!=null&&x.v!=null)}

async function direct(symbol,range,interval){const hosts=['query1.finance.yahoo.com','query2.finance.yahoo.com'];for(const host of hosts){try{const u=`https://${host}/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}&events=div%2Csplits&includeAdjustedClose=true`;const r=await fetch(u,{headers:{'User-Agent':'Mozilla/5.0 StockSamjho/1.0','Accept':'application/json'},signal:AbortSignal.timeout(12000)});if(!r.ok)continue;const rows=parseYahoo(await r.json());if(rows.length)return rows}catch{}}return[]}

async function libraryFallback(symbol,days,interval){
  const period1=new Date(Date.now()-days*24*60*60*1000);
  const period2=new Date();
  const data=await yahooFinance.chart(symbol,{period1,period2,interval,events:'div,splits',return:'object'});
  if(Array.isArray(data?.quotes)){
    return data.quotes.map(item=>({
      date:(item?.date instanceof Date?item.date:new Date(item?.date)).toISOString(),
      o:toNum(item?.open),h:toNum(item?.high),l:toNum(item?.low),c:toNum(item?.close),v:toNum(item?.volume),adjC:toNum(item?.adjclose),
    })).filter(x=>Number.isFinite(new Date(x.date).getTime())&&x.o!=null&&x.h!=null&&x.l!=null&&x.c!=null&&x.v!=null);
  }
  const timestamps=data?.timestamp||[],q=data?.indicators?.quote?.[0]||{},adj=data?.indicators?.adjclose?.[0]?.adjclose||[];
  return timestamps.map((t,i)=>({date:new Date(t*1000).toISOString(),o:toNum(q.open?.[i]),h:toNum(q.high?.[i]),l:toNum(q.low?.[i]),c:toNum(q.close?.[i]),adjC:toNum(adj?.[i]),v:toNum(q.volume?.[i])})).filter(x=>x.o!=null&&x.h!=null&&x.l!=null&&x.c!=null&&x.v!=null);
}

export async function verifiedHistory(symbol,{interval='1d',days=900,minBars=60}={}){
  const range=interval==='1d'?(days>1500?'10y':days>700?'5y':days>300?'2y':'1y'):(days>180?'6mo':'3mo');
  let rows=await direct(symbol,range,interval);
  if(rows.length)return{rows,source:'Yahoo Finance chart API',verified:true,interval,range,bars:rows.length,latest:rows.at(-1)?.date};
  await sleep(150);
  rows=await direct(symbol,range,interval);
  if(rows.length)return{rows,source:'Yahoo Finance chart API',verified:true,interval,range,bars:rows.length,latest:rows.at(-1)?.date};
  try{
    rows=await libraryFallback(symbol,days,interval);
    if(rows.length)return{rows,source:'Yahoo Finance chart via yahoo-finance2',verified:true,interval,range,bars:rows.length,latest:rows.at(-1)?.date};
  }catch(error){
    throw new Error(`VERIFIED_PRICE_PROVIDER_FAILED:${error?.message||error}`);
  }
  throw new Error(`INSUFFICIENT_VERIFIED_PRICE_HISTORY:${rows.length}/${minBars}`);
}
