import YahooFinance from 'yahoo-finance2';
import { areEvidenceCompatible, createCanonicalEvidence } from './financial-evidence.js';

const yahooFinance = new YahooFinance();
const num = (v) => typeof v === 'number' && Number.isFinite(v) ? v : (v && typeof v === 'object' && Number.isFinite(v.raw) ? v.raw : null);
const normalize = (rows, requestedPeriod) => (Array.isArray(rows) ? rows : []).filter(Boolean).map((row) => { const date = row.date instanceof Date ? row.date : new Date(row.date); if (Number.isNaN(date.getTime())) return null; return { ...row, date: date.toISOString(), requestedPeriod, periodType: row.periodType == null ? null : String(row.periodType).toUpperCase(), providerType: row.TYPE == null ? null : String(row.TYPE).toUpperCase() }; }).filter(Boolean).sort((a,b)=>new Date(a.date)-new Date(b.date));
const latest = (rows, keys) => { for (const row of [...(rows || [])].reverse()) for (const key of keys) { const value = num(row?.[key]); if (value != null) return { value, key, date: row.date, row }; } return null; };
const fieldStatus = (rows, keys, requestStatus) => { if (requestStatus === 'SOURCE_UNAVAILABLE') return { status:'SOURCE_UNAVAILABLE',value:null,key:null,date:null,row:null }; const found=latest(rows,keys); return found ? { status:'PROVIDER_RETURNED',...found } : { status:'PROVIDER_DID_NOT_RETURN',value:null,key:null,date:null,row:null }; };

const canonicalizeEvidence = (evidence, ticker, fetchedAt) => {
  const canonical = { byId: {}, fields: {}, observations: {} };
  for (const fields of Object.values(evidence || {})) for (const [field,item] of Object.entries(fields || {})) {
    if (item?.value == null || item.status !== 'PROVIDER_RETURNED' || !item.key || !item.date) continue;
    const row=item.row || {};
    const record=createCanonicalEvidence({ source:'YAHOO_FINANCE', sourceKey:item.key, issuer:row.issuer ?? row.companyName ?? null, ticker, value:item.value, reportingDate:item.date, reportingPeriod:row.reportingPeriod ?? item.date.slice(0,10), periodType:row.periodType ?? row.requestedPeriod ?? 'ANNUAL', statementScope:row.statementScope ?? row.scope ?? null, unit:row.unit ?? row.units ?? null, currency:row.currency ?? null, reportedOrDerived:'REPORTED', status:item.status, retrievedAt:fetchedAt });
    canonical.byId[record.evidenceId]=record;
    canonical.fields[field]=record.evidenceId;
    canonical.observations[field]=record.evidenceId;
  }
  return canonical;
};
const evidenceForField = (canonical, field) => { const id=canonical?.fields?.[field]; return id ? canonical.byId?.[id] || null : null; };
const allCompatible = (canonical, fields) => { const evidence=fields.map((field)=>evidenceForField(canonical,field)); if(evidence.some((item)=>!item)) return false; return evidence.slice(1).every((item)=>areEvidenceCompatible(evidence[0],item)); };

export async function fetchStatementEvidence(symbol) {
  const ticker=String(symbol||'').toUpperCase().endsWith('.NS')||String(symbol||'').toUpperCase().endsWith('.BO')?String(symbol).toUpperCase():`${String(symbol).toUpperCase()}.NS`;
  const period2=new Date(), period1=new Date(Date.now()-8*365.25*24*60*60*1000);
  const [incomeResult,balanceResult,cashResult]=await Promise.allSettled([
    yahooFinance.fundamentalsTimeSeries(ticker,{period1,period2,type:'annual',module:'financials'},{validateResult:false}),
    yahooFinance.fundamentalsTimeSeries(ticker,{period1,period2,type:'annual',module:'balance-sheet'},{validateResult:false}),
    yahooFinance.fundamentalsTimeSeries(ticker,{period1,period2,type:'annual',module:'cash-flow'},{validateResult:false}),
  ]);
  const income=incomeResult.status==='fulfilled'?normalize(incomeResult.value,'annual'):[], balance=balanceResult.status==='fulfilled'?normalize(balanceResult.value,'annual'):[], cash=cashResult.status==='fulfilled'?normalize(cashResult.value,'annual'):[];
  const errors={income:incomeResult.status==='rejected'?String(incomeResult.reason?.message||incomeResult.reason):null,balance:balanceResult.status==='rejected'?String(balanceResult.reason?.message||balanceResult.reason):null,cash:cashResult.status==='rejected'?String(cashResult.reason?.message||cashResult.reason):null};
  const balanceRequestStatus=balanceResult.status==='fulfilled'?'OK':'SOURCE_UNAVAILABLE', cashRequestStatus=cashResult.status==='fulfilled'?'OK':'SOURCE_UNAVAILABLE', incomeRequestStatus=incomeResult.status==='fulfilled'?'OK':'SOURCE_UNAVAILABLE';
  const balanceEvidence={totalAssets:fieldStatus(balance,['totalAssets'],balanceRequestStatus),totalDebt:fieldStatus(balance,['totalDebt'],balanceRequestStatus),cash:fieldStatus(balance,['cashCashEquivalentsAndShortTermInvestments','cashAndCashEquivalents'],balanceRequestStatus),equity:fieldStatus(balance,['stockholdersEquity','commonStockEquity'],balanceRequestStatus),currentAssets:fieldStatus(balance,['currentAssets'],balanceRequestStatus),currentLiabilities:fieldStatus(balance,['currentLiabilities'],balanceRequestStatus),workingCapital:fieldStatus(balance,['workingCapital'],balanceRequestStatus),ordinaryShares:fieldStatus(balance,['ordinarySharesNumber'],balanceRequestStatus)};
  const incomeEvidence={revenue:fieldStatus(income,['totalRevenue'],incomeRequestStatus),ebitda:fieldStatus(income,['EBITDA','normalizedEBITDA'],incomeRequestStatus),ebit:fieldStatus(income,['EBIT','operatingIncome'],incomeRequestStatus),eps:fieldStatus(income,['dilutedEPS','basicEPS'],incomeRequestStatus),netIncome:fieldStatus(income,['netIncomeFromContinuingAndDiscontinuedOperation','netIncome'],incomeRequestStatus),interestExpense:fieldStatus(income,['interestExpense'],incomeRequestStatus)};
  const cashEvidence={operatingCashFlow:fieldStatus(cash,['operatingCashFlow','cashFlowFromContinuingOperatingActivities'],cashRequestStatus),investingCashFlow:fieldStatus(cash,['investingCashFlow','cashFlowFromContinuingInvestingActivities'],cashRequestStatus),financingCashFlow:fieldStatus(cash,['financingCashFlow','cashFlowFromContinuingFinancingActivities'],cashRequestStatus),changeInCash:fieldStatus(cash,['changesInCash','changeInCash'],cashRequestStatus),freeCashFlow:fieldStatus(cash,['freeCashFlow'],cashRequestStatus),capitalExpenditure:fieldStatus(cash,['capitalExpenditure','capitalExpenditureReported'],cashRequestStatus),dividends:fieldStatus(cash,['commonStockDividendPaid','cashDividendsPaid','dividendPaidCFO'],cashRequestStatus),stockBasedCompensation:fieldStatus(cash,['stockBasedCompensation'],cashRequestStatus)};
  const evidence={income:incomeEvidence,balance:balanceEvidence,cash:cashEvidence}, fetchedAt=new Date().toISOString();
  return {provider:'Yahoo Finance fundamentalsTimeSeries',ticker,period:'annual / 12M',fetchedAt,income,balance,cash,evidence,canonicalEvidence:canonicalizeEvidence(evidence,ticker,fetchedAt),coverage:{income:income.length>0,balanceSheet:balance.length>0&&Boolean(balanceEvidence.equity?.value||balanceEvidence.totalAssets?.value||balanceEvidence.totalDebt?.value),cashFlow:cash.length>0&&Boolean(cashEvidence.operatingCashFlow?.value||cashEvidence.freeCashFlow?.value)},history:{incomeYears:income.length,balanceYears:balance.length,cashFlowYears:cash.length},errors,validation:{noSyntheticValues:true,policy:'Only provider-returned annual statement values are accepted; missing fields remain null. Financial derivations require complete evidence metadata.'}};
}

export function mergeStatementEvidence(financials,evidence) {
  const current={...(financials?.current||{})}, derived={...(financials?.derived||{})}, rawAvailability={...(financials?.rawAvailability||{})};
  const canonical={byId:{},fields:{},observations:{},...(evidence?.canonicalEvidence||{})}; canonical.byId={...(evidence?.canonicalEvidence?.byId||{})}; canonical.fields={...(evidence?.canonicalEvidence?.fields||{})}; canonical.observations={...(evidence?.canonicalEvidence?.observations||{})};
  const b=evidence?.evidence?.balance||{}, i=evidence?.evidence?.income||{}, c=evidence?.evidence?.cash||{}, valueOf=(item)=>item?.value??null;
  const promoted=(field,item)=>{
    const value=valueOf(item);
    if(current[field]!=null||value==null)return;
    const candidateId=canonical.fields[field]||canonical.observations[field];
    let id=candidateId;
    let record=id ? canonical.byId?.[id] || null : null;
    if(!record || record.value !== value){
      const row=item?.row||{};
      const base=record||{};
      record=createCanonicalEvidence({source:base.source??'YAHOO_FINANCE',sourceKey:item?.key??base.sourceKey,issuer:row.issuer??row.companyName??base.issuer??null,ticker:evidence?.ticker??base.ticker??null,value,reportingDate:item?.date??base.reportingDate,reportingPeriod:row.reportingPeriod??base.reportingPeriod??item?.date?.slice(0,10)??null,periodType:row.periodType??row.requestedPeriod??base.periodType??'ANNUAL',statementScope:row.statementScope??row.scope??base.statementScope??null,unit:row.unit??row.units??base.unit??null,currency:row.currency??base.currency??null,reportedOrDerived:base.reportedOrDerived??'REPORTED',status:item?.status??base.status,retrievedAt:evidence?.fetchedAt??base.retrievedAt,documentType:base.documentType,documentTitle:base.documentTitle,sourceUrl:base.sourceUrl,page:base.page,table:base.table,documentVersion:base.documentVersion,extractionMethod:base.extractionMethod});
      canonical.byId[record.evidenceId]=record;
      id=record.evidenceId;
    }
    if(!id || !record || record.value !== value)return;
    current[field]=value;
    canonical.fields[field]=id;
  };
  promoted('totalAssets',b.totalAssets);promoted('totalDebt',b.totalDebt);promoted('cash',b.cash);promoted('equity',b.equity);promoted('currentAssets',b.currentAssets);promoted('currentLiabilities',b.currentLiabilities);promoted('workingCapital',b.workingCapital);promoted('ordinaryShares',b.ordinaryShares);promoted('revenue',i.revenue);promoted('ebitda',i.ebitda);promoted('ebit',i.ebit);promoted('eps',i.eps);promoted('netIncome',i.netIncome);promoted('interestExpense',i.interestExpense);promoted('freeCashFlow',c.freeCashFlow);promoted('operatingCashFlow',c.operatingCashFlow);promoted('investingCashFlow',c.investingCashFlow);promoted('financingCashFlow',c.financingCashFlow);promoted('changeInCash',c.changeInCash);promoted('capitalExpenditure',c.capitalExpenditure);promoted('dividends',c.dividends);promoted('stockBasedCompensation',c.stockBasedCompensation);
  const guarded=(name,fields,formula)=>{derived[name]=allCompatible(canonical,fields)?formula():null;};
  guarded('debtToEquityFromStatements',['totalDebt','equity'],()=>current.equity>0?current.totalDebt/current.equity:null);guarded('currentRatioFromStatements',['currentAssets','currentLiabilities'],()=>current.currentLiabilities>0?current.currentAssets/current.currentLiabilities:null);guarded('fcfConversion',['freeCashFlow','netIncome'],()=>current.netIncome>0?(current.freeCashFlow/current.netIncome)*100:null);guarded('fcfMargin',['freeCashFlow','revenue'],()=>current.revenue>0?(current.freeCashFlow/current.revenue)*100:null);guarded('netDebtToEbitda',['totalDebt','cash','ebitda'],()=>current.ebitda>0?(current.totalDebt-current.cash)/current.ebitda:null);guarded('interestCoverage',['ebit','interestExpense'],()=>current.interestExpense>0?current.ebit/current.interestExpense:null);guarded('roeFromStatements',['netIncome','equity'],()=>current.equity>0?(current.netIncome/current.equity)*100:null);guarded('roaFromStatements',['netIncome','totalAssets'],()=>current.totalAssets>0?(current.netIncome/current.totalAssets)*100:null);guarded('roceFromStatements',['ebit','equity','totalDebt'],()=>current.equity+current.totalDebt>0?(current.ebit/(current.equity+current.totalDebt))*100:null);guarded('workingCapital',['currentAssets','currentLiabilities'],()=>current.currentAssets-current.currentLiabilities);
  rawAvailability.annualStatements=rawAvailability.annualStatements||Boolean(evidence?.coverage?.income);rawAvailability.annualBalanceSheet=rawAvailability.annualBalanceSheet||Boolean(evidence?.coverage?.balanceSheet);rawAvailability.annualCashFlow=rawAvailability.annualCashFlow||Boolean(evidence?.coverage?.cashFlow);
  return {...financials,current,derived,evidence:canonical,rawAvailability,statementEvidence:evidence,sourceNote:`${financials?.sourceNote||''} Separate annual financials, balance-sheet and cash-flow requests are used as an evidence recovery path.`.trim()};
}
