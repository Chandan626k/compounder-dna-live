import YahooFinance from 'yahoo-finance2';
import { areEvidenceCompatible, createCanonicalEvidence } from './financial-evidence.js';

const yahooFinance = new YahooFinance();
const num = (v) => typeof v === 'number' && Number.isFinite(v) ? v : (v && typeof v === 'object' && Number.isFinite(v.raw) ? v.raw : null);
const normalize = (rows, requestedPeriod) => (Array.isArray(rows) ? rows : []).filter(Boolean).map((row) => { const date = row.date instanceof Date ? row.date : new Date(row.date); if (Number.isNaN(date.getTime())) return null; return { ...row, date: date.toISOString(), requestedPeriod, periodType: row.periodType == null ? null : String(row.periodType).toUpperCase(), providerType: row.TYPE == null ? null : String(row.TYPE).toUpperCase() }; }).filter(Boolean).sort((a,b)=>new Date(a.date)-new Date(b.date));
export const qualifyAnnualRows = (rows) => (Array.isArray(rows) ? rows : []).filter((row) => row?.periodType === '12M');
const latest = (rows, keys) => { for (const row of [...(rows || [])].reverse()) for (const key of keys) { const value = num(row?.[key]); if (value != null) return { value, key, date: row.date, row }; } return null; };
const fieldStatus = (rows, keys, requestStatus) => { if (requestStatus === 'SOURCE_UNAVAILABLE') return { status:'SOURCE_UNAVAILABLE',value:null,key:null,date:null,row:null }; const found=latest(rows,keys); return found ? { status:'PROVIDER_RETURNED',...found } : { status:'PROVIDER_DID_NOT_RETURN',value:null,key:null,date:null,row:null }; };
export const buildStatementCoverage = (evidence) => ({ income: hasReturnedValue(evidence?.income), balanceSheet: hasReturnedValue({ totalAssets: evidence?.balance?.totalAssets, totalDebt: evidence?.balance?.totalDebt, equity: evidence?.balance?.equity }), cashFlow: hasReturnedValue({ operatingCashFlow: evidence?.cash?.operatingCashFlow, freeCashFlow: evidence?.cash?.freeCashFlow }) });
function hasReturnedValue(fields) { return Object.values(fields || {}).some((item) => item?.status === 'PROVIDER_RETURNED' && item?.value != null); }

const SECTION_FIELDS = {
  income: { revenue:['totalRevenue'], ebitda:['EBITDA','normalizedEBITDA'], ebit:['EBIT','operatingIncome'], eps:['dilutedEPS','basicEPS'], netIncome:['netIncomeFromContinuingAndDiscontinuedOperation','netIncome'], interestExpense:['interestExpense'] },
  balance: { totalAssets:['totalAssets'], totalDebt:['totalDebt'], cash:['cashCashEquivalentsAndShortTermInvestments','cashAndCashEquivalents'], equity:['stockholdersEquity','commonStockEquity'], currentAssets:['currentAssets'], currentLiabilities:['currentLiabilities'], workingCapital:['workingCapital'], ordinaryShares:['ordinarySharesNumber'] },
  cash: { operatingCashFlow:['operatingCashFlow','cashFlowFromContinuingOperatingActivities'], investingCashFlow:['investingCashFlow','cashFlowFromContinuingInvestingActivities'], financingCashFlow:['financingCashFlow','cashFlowFromContinuingFinancingActivities'], changeInCash:['changesInCash','changeInCash'], freeCashFlow:['freeCashFlow'], capitalExpenditure:['capitalExpenditure','capitalExpenditureReported'], dividends:['commonStockDividendPaid','cashDividendsPaid','dividendPaidCFO'], stockBasedCompensation:['stockBasedCompensation'] },
};
const canonicalRecordFromItem = (item,ticker,fetchedAt,reportedOrDerived='REPORTED') => {
  if(item?.value==null || item.status!=='PROVIDER_RETURNED' || !item.key || !item.date) return null;
  const row=item.row||{}, periodType=row.periodType==null?null:String(row.periodType).toUpperCase();
  if(periodType!=='12M') return null;
  return createCanonicalEvidence({source:'YAHOO_FINANCE',sourceKey:item.key,issuer:row.issuer??row.companyName??null,ticker,value:item.value,reportingDate:item.date,reportingPeriod:row.reportingPeriod??item.date.slice(0,10),periodType,statementScope:row.statementScope??row.scope??null,unit:row.unit??row.units??null,currency:row.currency??null,reportedOrDerived,status:item.status,retrievedAt:fetchedAt});
};
const canonicalizeEvidence = (evidence, ticker, fetchedAt, rowsBySection = {}) => {
  const canonical = { byId: {}, fields: {}, observations: {}, history: {} };
  for (const [section, rows] of Object.entries(rowsBySection)) {
    const fieldMap = SECTION_FIELDS[section] || {};
    for (const [field, keys] of Object.entries(fieldMap)) {
      const history=[];
      for(const row of rows || []) {
        const key=keys.find(k=>num(row?.[k])!=null); if(!key) continue;
        const item={status:'PROVIDER_RETURNED',value:num(row[key]),key,date:row.date,row};
        const record=canonicalRecordFromItem(item,ticker,fetchedAt); if(!record) continue;
        canonical.byId[record.evidenceId]=record; history.push(record.evidenceId);
      }
      if(history.length) canonical.history[field]=history;
    }
  }
  for (const fields of Object.values(evidence || {})) for (const [field,item] of Object.entries(fields || {})) {
    const record=canonicalRecordFromItem(item,ticker,fetchedAt); if(!record) continue;
    canonical.byId[record.evidenceId]=record;
    canonical.fields[field]=record.evidenceId;
    canonical.observations[field]=record.evidenceId;
  }
  return canonical;
};
const evidenceForField = (canonical, field) => { const id=canonical?.fields?.[field]; return id ? canonical.byId?.[id] || null : null; };
const allCompatible = (canonical, fields) => { const evidence=fields.map((field)=>evidenceForField(canonical,field)); if(evidence.some((item)=>!item)) return false; return evidence.slice(1).every((item)=>areEvidenceCompatible(evidence[0],item)); };
const annualCagr = (rows,key,years=5) => {
  const valid=(rows||[]).filter(r=>num(r?.[key])!=null).sort((a,b)=>new Date(a.date)-new Date(b.date));
  if(valid.length<2)return null;
  const end=valid.at(-1), targetMs=years*365.25*24*60*60*1000; let start=valid[0];
  for(const row of valid){if(new Date(end.date)-new Date(row.date)>=targetMs*0.75){start=row;break;}}
  const startValue=num(start[key]), endValue=num(end[key]), actualYears=(new Date(end.date)-new Date(start.date))/(365.25*24*60*60*1000);
  if(!(startValue>0)||!(endValue>0)||actualYears<1.5)return null;
  return {value:(Math.pow(endValue/startValue,1/actualYears)-1)*100,start,end};
};

export async function fetchStatementEvidence(symbol) {
  const ticker=String(symbol||'').toUpperCase().endsWith('.NS')||String(symbol||'').toUpperCase().endsWith('.BO')?String(symbol).toUpperCase():`${String(symbol).toUpperCase()}.NS`;
  const period2=new Date(), period1=new Date(Date.now()-8*365.25*24*60*60*1000);
  const [incomeResult,balanceResult,cashResult]=await Promise.allSettled([
    yahooFinance.fundamentalsTimeSeries(ticker,{period1,period2,type:'annual',module:'financials'},{validateResult:false}),
    yahooFinance.fundamentalsTimeSeries(ticker,{period1,period2,type:'annual',module:'balance-sheet'},{validateResult:false}),
    yahooFinance.fundamentalsTimeSeries(ticker,{period1,period2,type:'annual',module:'cash-flow'},{validateResult:false}),
  ]);
  const income=incomeResult.status==='fulfilled'?qualifyAnnualRows(normalize(incomeResult.value,'annual')):[], balance=balanceResult.status==='fulfilled'?qualifyAnnualRows(normalize(balanceResult.value,'annual')):[], cash=cashResult.status==='fulfilled'?qualifyAnnualRows(normalize(cashResult.value,'annual')):[];
  const errors={income:incomeResult.status==='rejected'?String(incomeResult.reason?.message||incomeResult.reason):null,balance:balanceResult.status==='rejected'?String(balanceResult.reason?.message||balanceResult.reason):null,cash:cashResult.status==='rejected'?String(cashResult.reason?.message||cashResult.reason):null};
  const balanceRequestStatus=balanceResult.status==='fulfilled'?'OK':'SOURCE_UNAVAILABLE', cashRequestStatus=cashResult.status==='fulfilled'?'OK':'SOURCE_UNAVAILABLE', incomeRequestStatus=incomeResult.status==='fulfilled'?'OK':'SOURCE_UNAVAILABLE';
  const balanceEvidence={totalAssets:fieldStatus(balance,['totalAssets'],balanceRequestStatus),totalDebt:fieldStatus(balance,['totalDebt'],balanceRequestStatus),cash:fieldStatus(balance,['cashCashEquivalentsAndShortTermInvestments','cashAndCashEquivalents'],balanceRequestStatus),equity:fieldStatus(balance,['stockholdersEquity','commonStockEquity'],balanceRequestStatus),currentAssets:fieldStatus(balance,['currentAssets'],balanceRequestStatus),currentLiabilities:fieldStatus(balance,['currentLiabilities'],balanceRequestStatus),workingCapital:fieldStatus(balance,['workingCapital'],balanceRequestStatus),ordinaryShares:fieldStatus(balance,['ordinarySharesNumber'],balanceRequestStatus)};
  const incomeEvidence={revenue:fieldStatus(income,['totalRevenue'],incomeRequestStatus),ebitda:fieldStatus(income,['EBITDA','normalizedEBITDA'],incomeRequestStatus),ebit:fieldStatus(income,['EBIT','operatingIncome'],incomeRequestStatus),eps:fieldStatus(income,['dilutedEPS','basicEPS'],incomeRequestStatus),netIncome:fieldStatus(income,['netIncomeFromContinuingAndDiscontinuedOperation','netIncome'],incomeRequestStatus),interestExpense:fieldStatus(income,['interestExpense'],incomeRequestStatus)};
  const cashEvidence={operatingCashFlow:fieldStatus(cash,['operatingCashFlow','cashFlowFromContinuingOperatingActivities'],cashRequestStatus),investingCashFlow:fieldStatus(cash,['investingCashFlow','investingCashFlow','cashFlowFromContinuingInvestingActivities'],cashRequestStatus),financingCashFlow:fieldStatus(cash,['financingCashFlow','cashFlowFromContinuingFinancingActivities'],cashRequestStatus),changeInCash:fieldStatus(cash,['changesInCash','changeInCash'],cashRequestStatus),freeCashFlow:fieldStatus(cash,['freeCashFlow'],cashRequestStatus),capitalExpenditure:fieldStatus(cash,['capitalExpenditure','capitalExpenditureReported'],cashRequestStatus),dividends:fieldStatus(cash,['commonStockDividendPaid','cashDividendsPaid','dividendPaidCFO'],cashRequestStatus),stockBasedCompensation:fieldStatus(cash,['stockBasedCompensation'],cashRequestStatus)};
  const evidence={income:incomeEvidence,balance:balanceEvidence,cash:cashEvidence}, fetchedAt=new Date().toISOString();
  return {provider:'Yahoo Finance fundamentalsTimeSeries',ticker,period:'annual / 12M',fetchedAt,income,balance,cash,evidence,canonicalEvidence:canonicalizeEvidence(evidence,ticker,fetchedAt,{income,balance,cash}),coverage:buildStatementCoverage(evidence),history:{incomeYears:income.length,balanceYears:balance.length,cashFlowYears:cash.length},errors,validation:{noSyntheticValues:true,policy:'Only provider-returned annual statement values with periodType=12M are accepted; missing or unqualified fields remain null. Financial derivations require complete evidence metadata.'}};
}

export function mergeStatementEvidence(financials,evidence) {
  const current={...(financials?.current||{})}, derived={...(financials?.derived||{})}, rawAvailability={...(financials?.rawAvailability||{})};
  const canonical={byId:{},fields:{},observations:{},history:{},...(evidence?.canonicalEvidence||{})}; canonical.byId={...(evidence?.canonicalEvidence?.byId||{})}; canonical.fields={...(evidence?.canonicalEvidence?.fields||{})}; canonical.observations={...(evidence?.canonicalEvidence?.observations||{})}; canonical.history={...(evidence?.canonicalEvidence?.history||{})};
  const b=evidence?.evidence?.balance||{}, i=evidence?.evidence?.income||{}, c=evidence?.evidence?.cash||{}, valueOf=(item)=>item?.value??null;
  const promoted=(field,item)=>{
    const value=valueOf(item);
    if(value==null){if(!(field in current))current[field]=null;return;}
    if(current[field]!=null)return;
    const candidateId=canonical.fields[field]||canonical.observations[field];
    let id=candidateId;
    let record=id ? canonical.byId?.[id] || null : null;
    if(!record || record.value !== value){
      const row=item?.row||{}, base=record||{}, periodType=row.periodType==null?null:String(row.periodType).toUpperCase();
      if(periodType!=='12M'){current[field]=null;return;}
      record=createCanonicalEvidence({source:base.source??'YAHOO_FINANCE',sourceKey:item?.key??base.sourceKey,issuer:row.issuer??row.companyName??base.issuer??null,ticker:evidence?.ticker??base.ticker??null,value,reportingDate:item?.date??base.reportingDate,reportingPeriod:row.reportingPeriod??base.reportingPeriod??item?.date?.slice(0,10)??null,periodType,statementScope:row.statementScope??row.scope??base.statementScope??null,unit:row.unit??row.units??base.unit??null,currency:row.currency??base.currency??null,reportedOrDerived:base.reportedOrDerived??'REPORTED',status:item?.status??base.status,retrievedAt:evidence?.fetchedAt??base.retrievedAt,documentType:base.documentType,documentTitle:base.documentTitle,sourceUrl:base.sourceUrl,page:base.page,table:base.table,documentVersion:base.documentVersion,extractionMethod:base.extractionMethod});
      canonical.byId[record.evidenceId]=record; id=record.evidenceId;
    }
    if(!id||!record||record.value!==value)return;
    current[field]=value; canonical.fields[field]=id;
  };
  promoted('totalAssets',b.totalAssets);promoted('totalDebt',b.totalDebt);promoted('cash',b.cash);promoted('equity',b.equity);promoted('currentAssets',b.currentAssets);promoted('currentLiabilities',b.currentLiabilities);promoted('workingCapital',b.workingCapital);promoted('ordinaryShares',b.ordinaryShares);promoted('revenue',i.revenue);promoted('ebitda',i.ebitda);promoted('ebit',i.ebit);promoted('eps',i.eps);promoted('netIncome',i.netIncome);promoted('interestExpense',i.interestExpense);promoted('freeCashFlow',c.freeCashFlow);promoted('operatingCashFlow',c.operatingCashFlow);promoted('investingCashFlow',c.investingCashFlow);promoted('financingCashFlow',c.financingCashFlow);promoted('changeInCash',c.changeInCash);promoted('capitalExpenditure',c.capitalExpenditure);promoted('dividends',c.dividends);promoted('stockBasedCompensation',c.stockBasedCompensation);
  const statementValue=(field)=>{const item=evidenceForField(canonical,field);return item?.value??null;};
  const guarded=(name,fields,formula)=>{if(!allCompatible(canonical,fields)){derived[name]=null;return;}const values=Object.fromEntries(fields.map(field=>[field,statementValue(field)]));derived[name]=formula(values);};
  const derivedEvidence={...(financials?.derivedEvidence||{})};
  const setDerivedEvidence=(name,fields)=>{const ids=fields.map(field=>canonical.fields[field]).filter(Boolean);if(ids.length===fields.length)derivedEvidence[name]={reportedOrDerived:'DERIVED',inputEvidenceIds:ids,calculation:'APPLICATION_DERIVED',status:'VERIFIED_COMPATIBLE_STATEMENT_INPUTS'};else delete derivedEvidence[name];};
  guarded('debtToEquityFromStatements',['totalDebt','equity'],({totalDebt,equity})=>equity>0?totalDebt/equity:null);setDerivedEvidence('debtToEquityFromStatements',['totalDebt','equity']);
  guarded('currentRatioFromStatements',['currentAssets','currentLiabilities'],({currentAssets,currentLiabilities})=>currentLiabilities>0?currentAssets/currentLiabilities:null);setDerivedEvidence('currentRatioFromStatements',['currentAssets','currentLiabilities']);
  guarded('fcfConversion',['freeCashFlow','netIncome'],({freeCashFlow,netIncome})=>netIncome>0?(freeCashFlow/netIncome)*100:null);setDerivedEvidence('fcfConversion',['freeCashFlow','netIncome']);
  guarded('fcfMargin',['freeCashFlow','revenue'],({freeCashFlow,revenue})=>revenue>0?(freeCashFlow/revenue)*100:null);setDerivedEvidence('fcfMargin',['freeCashFlow','revenue']);
  guarded('netDebtToEbitda',['totalDebt','cash','ebitda'],({totalDebt,cash,ebitda})=>ebitda>0?(totalDebt-cash)/ebitda:null);setDerivedEvidence('netDebtToEbitda',['totalDebt','cash','ebitda']);
  guarded('interestCoverage',['ebit','interestExpense'],({ebit,interestExpense})=>interestExpense>0?ebit/interestExpense:null);setDerivedEvidence('interestCoverage',['ebit','interestExpense']);
  guarded('roeFromStatements',['netIncome','equity'],({netIncome,equity})=>equity>0?(netIncome/equity)*100:null);setDerivedEvidence('roeFromStatements',['netIncome','equity']);
  guarded('roaFromStatements',['netIncome','totalAssets'],({netIncome,totalAssets})=>totalAssets>0?(netIncome/totalAssets)*100:null);setDerivedEvidence('roaFromStatements',['netIncome','totalAssets']);
  guarded('roceFromStatements',['ebit','equity','totalDebt'],({ebit,equity,totalDebt})=>equity+totalDebt>0?(ebit/(equity+totalDebt))*100:null);setDerivedEvidence('roceFromStatements',['ebit','equity','totalDebt']);
  guarded('workingCapital',['currentAssets','currentLiabilities'],({currentAssets,currentLiabilities})=>currentAssets-currentLiabilities);setDerivedEvidence('workingCapital',['currentAssets','currentLiabilities']);

  const growth={...(financials?.growth||{})};
  const growthDefinitions=[['revenue3yCagr','revenue','totalRevenue',3],['revenue5yCagr','revenue','totalRevenue',5],['eps3yCagr','eps','dilutedEPS',3],['eps5yCagr','eps','dilutedEPS',5],['pat3yCagr','netIncomeFromContinuingAndDiscontinuedOperation','netIncomeFromContinuingAndDiscontinuedOperation',3],['pat5yCagr','netIncomeFromContinuingAndDiscontinuedOperation','netIncomeFromContinuingAndDiscontinuedOperation',5]];
  for(const [name,field,key,years] of growthDefinitions){const result=annualCagr(evidence?.income||[],key,years);if(!result)continue;growth[name]=result.value;const ids=(canonical.history[field]||[]).map(id=>canonical.byId[id]).filter(Boolean);const startId=ids.find(x=>x.reportingDate===result.start.date)?.evidenceId;const endId=ids.find(x=>x.reportingDate===result.end.date)?.evidenceId;if(startId&&endId)derivedEvidence[name]={reportedOrDerived:'DERIVED',inputEvidenceIds:[startId,endId],calculation:'ANNUAL_CAGR',status:'VERIFIED_12M_HISTORY'};}
  const growthPct=(a,b)=>Number.isFinite(a)&&Number.isFinite(b)&&b!==0?((a/b)-1)*100:null;
  const annualIncome=evidence?.income||[]; const latestRevenue=latest(annualIncome,['totalRevenue']), prevRevenue=annualIncome.length>=2?latest(annualIncome.slice(0,-1),['totalRevenue']):null; const latestEps=latest(annualIncome,['dilutedEPS']), prevEps=annualIncome.length>=2?latest(annualIncome.slice(0,-1),['dilutedEPS']):null;
  growth.latestRevenueGrowth=growthPct(latestRevenue?.value,prevRevenue?.value); growth.latestEPSGrowth=growthPct(latestEps?.value,prevEps?.value);
  if(latestRevenue&&prevRevenue){const ids=[latestRevenue,prevRevenue].map(item=>canonical.byId[canonical.fields.revenue]).filter(Boolean).map(x=>x.evidenceId);if(ids.length===2)derivedEvidence.latestRevenueGrowth={reportedOrDerived:'DERIVED',inputEvidenceIds:ids,calculation:'YEAR_OVER_YEAR',status:'VERIFIED_12M_HISTORY'};}
  if(latestEps&&prevEps){const ids=[latestEps,prevEps].map(item=>canonical.byId[canonical.fields.eps]).filter(Boolean).map(x=>x.evidenceId);if(ids.length===2)derivedEvidence.latestEPSGrowth={reportedOrDerived:'DERIVED',inputEvidenceIds:ids,calculation:'YEAR_OVER_YEAR',status:'VERIFIED_12M_HISTORY'};}
  rawAvailability.annualStatements=rawAvailability.annualStatements||Boolean(evidence?.coverage?.income);rawAvailability.annualBalanceSheet=rawAvailability.annualBalanceSheet||Boolean(evidence?.coverage?.balanceSheet);rawAvailability.annualCashFlow=rawAvailability.annualCashFlow||Boolean(evidence?.coverage?.cashFlow);
  return {...financials,current,derived,derivedEvidence,growth,evidence:canonical,rawAvailability,statementEvidence:evidence,sourceNote:`${financials?.sourceNote||''} Separate annual financials, balance-sheet and cash-flow requests are used as an evidence recovery path.`.trim()};
}