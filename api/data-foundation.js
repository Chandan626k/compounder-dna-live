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
  const now=new Date(), p10=new Date(Date.now()-10*365.25*86400000), p5=new Date(Date.now()-5*365.25*86400000);
  const annualFields=['totalRevenue','operatingIncome','netIncomeFromContinuingAndDiscontinuedOperation','dilutedEPS','freeCashFlow','operatingCashFlow','capitalExpenditure','totalDebt','cashCashEquivalentsAndShortTermInvestments','stockholdersEquity','totalAssets'];
  const quarterlyFields=['totalRevenue','operatingIncome','netIncomeFromContinuingAndDiscontinuedOperation','dilutedEPS','freeCashFlow','operatingCashFlow','capitalExpenditure'];
  const [quote,annual,quarterly,chart]=await Promise.allSettled([
    yf.quoteSummary(symbol,{modules:['price','quoteType','summaryDetail','defaultKeyStatistics','financialData','assetProfile','majorHoldersBreakdown','institutionOwnership','insiderHolders','insiderTransactions','earningsTrend','calendarEvents']},{validateResult:false}),
    yf.fundamentalsTimeSeries(symbol,{period1:p5,period2:now,type:'annual',module:'all'},{validateResult:false}),
    yf.fundamentalsTimeSeries(symbol,{period1:p5,period2:now,type:'quarterly',module:'all'},{validateResult:false}),
    yf.chart(symbol,{period1:p10,period2:now,interval:'1d',events:'div,splits',return:'object'}),
  ]);
  const q=quote.status==='fulfilled'?quote.value:null;
  const ar=normalize(annual.status==='fulfilled'?annual.value:[],'annual',annualFields);
  const qr=normalize(quarterly.status==='fulfilled'?quarterly.value:[],'quarterly',quarterlyFields);
  const cd=chart.status==='fulfilled'?chart.value:null;
  const pr=(Array.isArray(cd?.quotes)?cd.quotes:[]).map(r=>({date:iso(r.date),open:num(r.open),high:num(r.high),low:num(r.low),close:num(r.close),volume:num(r.volume)})).filter(r=>r.date&&r.close!=null);
  const sd=q?.summaryDetail||{}, ks=q?.defaultKeyStatistics||{}, fd=q?.financialData||{};
  const market={price:num(cd?.meta?.regularMarketPrice)??pr.at(-1)?.close??null,currency:cd?.meta?.currency||q?.price?.currency||null,exchange:cd?.meta?.exchangeName||q?.price?.exchangeName||null,marketCap:num(sd.marketCap)??num(ks.marketCap)??null,high52:num(sd.fiftyTwoWeekHigh),low52:num(sd.fiftyTwoWeekLow),beta:num(ks.beta),averageVolume:num(sd.averageVolume),trailingPE:num(sd.trailingPE),forwardPE:num(sd.forwardPE),priceToBook:num(ks.priceToBook),enterpriseValue:num(ks.enterpriseValue),sharesOutstanding:num(ks.sharesOutstanding),roe:num(fd.returnOnEquity)!=null?num(fd.returnOnEquity)*100:null,roa:num(fd.returnOnAssets)!=null?num(fd.returnOnAssets)*100:null,debtToEquity:num(fd.debtToEquity)!=null?num(fd.debtToEquity)/100:null,revenueGrowth:num(fd.revenueGrowth)!=null?num(fd.revenueGrowth)*100:null,earningsGrowth:num(fd.earningsGrowth)!=null?num(fd.earningsGrowth)*100:null};
  const warnings=[]; if(!q)warnings.push('Quote/fundamental summary unavailable.'); if(!ar.length)warnings.push('Annual history unavailable.'); if(!qr.length)warnings.push('Quarterly history unavailable.'); if(pr.length<252)warnings.push(`Only ${pr.length} daily rows returned; 1Y history is incomplete.`); if(annual.status==='rejected')warnings.push(`Annual provider error: ${annual.reason?.message||annual.reason}`); if(quarterly.status==='rejected')warnings.push(`Quarterly provider error: ${quarterly.reason?.message||quarterly.reason}`); if(chart.status==='rejected')warnings.push(`Chart provider error: ${chart.reason?.message||chart.reason}`);
  return {success:true,symbol:symbol.replace(/\.NS$|\.BO$/i,''),yahooSymbol:symbol,generatedAt:new Date().toISOString(),dataPolicy:{fakeDataAllowed:false,zeroFabrication:true,providerEstimatesAllowed:true,missingValueRepresentation:null,rule:'Only provider-reported values or deterministic calculations from provider-reported inputs are returned. Missing values remain null.'},market,profile:{name:q?.quoteType?.longName||q?.quoteType?.shortName||symbol,sector:q?.assetProfile?.sector||null,industry:q?.assetProfile?.industry||null,country:q?.assetProfile?.country||null},ownership:{insidersPct:num(ks.heldPercentInsiders)!=null?num(ks.heldPercentInsiders)*100:null,institutionsPct:num(ks.heldPercentInstitutions)!=null?num(ks.heldPercentInstitutions)*100:null,majorHolders:q?.majorHoldersBreakdown||null,institutionOwnership:q?.institutionOwnership?.ownershipList||[],insiderHolders:q?.insiderHolders?.holders||[],insiderTransactions:q?.insiderTransactions?.transactions||[]},history:{priceDaily:pr,annual:ar,quarterly:qr,coverage:{annual:coverage(ar,annualFields),quarterly:coverage(qr,quarterlyFields),dailyPriceRows:pr.length,dailyPriceYears:Number((pr.length/252).toFixed(1))}},provenance:{provider:'Yahoo Finance via yahoo-finance2',marketAsOf:pr.at(-1)?.date||null,fetchedAt:new Date().toISOString(),annualPeriod:'5Y requested',quarterlyPeriod:'5Y requested',pricePeriod:'10Y requested',status:'PROVIDER_DATA_ONLY'},warnings};
}
export default async function handler(req,res){Object.entries(CORS).forEach(([k,v])=>res.setHeader(k,v));if(req.method==='OPTIONS')return res.status(204).end();if(req.method!=='GET')return res.status(405).json({success:false,error:'Method not allowed'});try{return res.status(200).json(await foundation(ticker(req.query?.symbol)));}catch(error){console.error('[DATA FOUNDATION]',error?.message);return res.status(502).json({success:false,error:'Verified market data is temporarily unavailable. No fallback or fabricated values are used.'});}}
