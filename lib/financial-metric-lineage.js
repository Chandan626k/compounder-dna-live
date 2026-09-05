import { createHash } from 'node:crypto';

const hash = (value) => `pe_${createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 24)}`;
const providerEvidence = ({ sourceKey, value, retrievedAt, ticker = null, periodSemantics, qualification = 'PROVIDER_LEVEL_ONLY' }) => {
  if (value == null) return null;
  return { evidenceId: hash({ source: 'YAHOO_FINANCE', ticker, sourceKey, value, retrievedAt, periodSemantics, qualification }), source: 'YAHOO_FINANCE', sourceKey, issuer: null, ticker, value: value ?? null, observedAt: null, retrievedAt: retrievedAt || null, reportingDate: null, reportingPeriod: null, periodType: null, statementScope: 'QUOTE_SUMMARY', unit: null, currency: null, reportedOrDerived: 'REPORTED', qualification, periodSemantics };
};
const STATEMENT_FIELDS = Object.freeze(['revenue','ebitda','ebit','eps','netIncome','interestExpense','totalAssets','totalDebt','cash','equity','currentAssets','currentLiabilities','workingCapital','ordinaryShares','operatingCashFlow','freeCashFlow','capitalExpenditure']);
const PROVIDER_FIELDS = Object.freeze({ roe:['financialData.returnOnEquity','provider-reported ratio; exact reporting period not exposed by quoteSummary'], roa:['financialData.returnOnAssets','provider-reported ratio; exact reporting period not exposed by quoteSummary'], debtToEquity:['financialData.debtToEquity','provider-reported current field; Yahoo represents this as a percentage'], currentRatio:['financialData.currentRatio','provider-reported current field'], quickRatio:['financialData.quickRatio','provider-reported current field'], grossMargin:['financialData.grossMargins','provider-reported current/TTM field'], operatingMargin:['financialData.operatingMargins','provider-reported current/TTM field'], netMargin:['financialData.profitMargins','provider-reported current/TTM field'], ebitdaMargin:['financialData.ebitdaMargins','provider-reported current/TTM field'], revenueGrowth:['financialData.revenueGrowth','provider-reported current/TTM growth field'], earningsGrowth:['financialData.earningsGrowth','provider-reported current/TTM growth field'] });
const VALUATION_PROVIDER_FIELDS = Object.freeze({ trailingPE:['summaryDetail.trailingPE','provider-reported current ratio'], forwardPE:['summaryDetail.forwardPE/defaultKeyStatistics.forwardPE','provider-reported forward estimate'], priceToBook:['defaultKeyStatistics.priceToBook','provider-reported current ratio'], pegRatio:['defaultKeyStatistics.pegRatio','provider-reported valuation field; semantics provider-defined'], enterpriseValue:['defaultKeyStatistics.enterpriseValue','provider-reported current valuation field'], evToEbitda:['defaultKeyStatistics.enterpriseToEbitda','provider-reported current valuation ratio'], evToRevenue:['defaultKeyStatistics.enterpriseToRevenue','provider-reported current valuation ratio'], trailingEPS:['defaultKeyStatistics.trailingEps','provider-reported TTM EPS'], forwardEPS:['defaultKeyStatistics.forwardEps','provider-reported forward EPS estimate'], bookValue:['defaultKeyStatistics.bookValue','provider-reported book value per share'], sharesOutstanding:['defaultKeyStatistics.sharesOutstanding','provider-reported current shares field'], marketCap:['summaryDetail.marketCap','provider-reported current market capitalization'] });

export function buildFinancialMetricLineage({ financials = {}, ticker = null, retrievedAt = null } = {}) {
  const metrics = {}, canonical = financials?.evidence?.byId || {}, canonicalFields = financials?.evidence?.fields || {};
  for (const field of STATEMENT_FIELDS) {
    const id = canonicalFields[field], record = id ? canonical[id] : null;
    metrics[field] = record ? { value: record.value, classification: 'CANONICAL_STATEMENT', evidenceIds: [id], status: 'TRACEABLE' } : { value: financials?.current?.[field] ?? null, classification: financials?.current?.[field] != null ? 'PROVIDER_VALUE_NOT_CANONICALIZED' : 'UNAVAILABLE', evidenceIds: [], status: financials?.current?.[field] != null ? 'PROVIDER_VALUE_WITHOUT_STATEMENT_IDENTITY' : 'UNAVAILABLE' };
  }
  for (const [metric, [sourceKey, semantics]] of Object.entries(PROVIDER_FIELDS)) {
    const value = financials?.ratios?.[metric] ?? null, evidence = providerEvidence({ sourceKey, value, ticker, retrievedAt, periodSemantics: semantics });
    metrics[metric] = evidence ? { value, classification: 'PROVIDER_REPORTED', evidenceIds: [evidence.evidenceId], evidence, status: 'TRACEABLE_PROVIDER_LEVEL' } : { value: null, classification: 'UNAVAILABLE', evidenceIds: [], status: 'UNAVAILABLE' };
  }
  for (const [metric, info] of Object.entries(financials?.derivedEvidence || {})) {
    const value = financials?.derived?.[metric] ?? financials?.growth?.[metric] ?? null;
    metrics[metric] = value == null ? { value: null, classification: 'UNAVAILABLE', evidenceIds: [], status: 'UNAVAILABLE' } : { value, classification: 'APPLICATION_DERIVED', evidenceIds: info.inputEvidenceIds || [], calculation: info.calculation || 'APPLICATION_DERIVED', status: info.status || 'TRACEABLE' };
  }
  return metrics;
}

export function buildValuationMetricLineage({ valuation = {}, financials = {}, ticker = null, priceSource = null, retrievedAt = null } = {}) {
  const metrics = {};
  for (const [metric, [sourceKey, semantics]] of Object.entries(VALUATION_PROVIDER_FIELDS)) {
    const value = valuation?.[metric] ?? null, evidence = providerEvidence({ sourceKey, value, ticker, retrievedAt, periodSemantics: semantics });
    metrics[metric] = evidence ? { value, classification: 'PROVIDER_REPORTED', evidenceIds: [evidence.evidenceId], evidence, status: 'TRACEABLE_PROVIDER_LEVEL' } : { value: null, classification: 'UNAVAILABLE', evidenceIds: [], status: 'UNAVAILABLE' };
  }
  const priceValue = priceSource?.source === 'CURRENT_PROVIDER_QUOTE' ? priceSource.currentQuotePrice : priceSource?.dailyBarClose;
  metrics.currentPrice = { value: priceValue ?? valuation?.currentPrice ?? null, classification: priceSource?.source || 'PRICE_SELECTION_UNSPECIFIED', observationType: priceSource?.source === 'CURRENT_PROVIDER_QUOTE' ? 'CURRENT_QUOTE' : 'LATEST_DAILY_BAR', status: (priceValue ?? valuation?.currentPrice) != null ? 'TRACEABLE' : 'UNAVAILABLE' };
  const growthInputs = ['eps3yCagr','eps5yCagr','pat3yCagr','earningsGrowth'].filter(name => (financials?.growth?.[name] ?? financials?.ratios?.[name]) != null);
  const growthEvidenceIds = growthInputs.flatMap(name => metrics[name]?.evidenceIds || financials?.metricLineage?.[name]?.evidenceIds || []);
  metrics.growthSignal = valuation?.growthSignal == null ? { value: null, classification: 'UNAVAILABLE', evidenceIds: [], inputMetrics: growthInputs, status: 'UNAVAILABLE' } : { value: valuation.growthSignal, classification: 'APPLICATION_DERIVED', evidenceIds: [...new Set(growthEvidenceIds)], inputMetrics: growthInputs, calculation: 'Average of available EPS CAGR, PAT CAGR and provider earnings growth candidates', status: growthEvidenceIds.length ? 'TRACEABLE_PARTIAL_INPUT_CHAIN' : 'INPUT_EVIDENCE_INCOMPLETE' };
  const fairValueInputs = ['forwardEPS','trailingEPS','growthSignal','roe'].filter(name => name === 'growthSignal' ? valuation?.growthSignal != null : name === 'roe' ? financials?.ratios?.roe != null : valuation?.[name] != null);
  const fairValueEvidenceIds = fairValueInputs.flatMap(name => name === 'roe' ? financials?.metricLineage?.roe?.evidenceIds || [] : name === 'growthSignal' ? metrics.growthSignal.evidenceIds || [] : metrics[name]?.evidenceIds || []);
  metrics.fairValue = valuation?.fairValue == null ? { value: null, classification: 'APPLICATION_DERIVED', evidenceIds: [], inputMetrics: fairValueInputs, status: 'UNAVAILABLE' } : { value: valuation.fairValue, classification: 'APPLICATION_DERIVED', evidenceIds: [...new Set(fairValueEvidenceIds)], inputMetrics: fairValueInputs, calculation: 'Growth-adjusted justified P/E using provider EPS/ROE/growth inputs', status: fairValueEvidenceIds.length ? 'TRACEABLE_INPUT_CHAIN' : 'INPUT_EVIDENCE_INCOMPLETE' };
  for (const metric of ['upsideToFairValue','marginOfSafety','valuationGap']) {
    metrics[metric] = valuation?.[metric] == null ? { value: null, classification: 'APPLICATION_DERIVED', evidenceIds: [], inputMetrics: ['fairValue','currentPrice'], status: 'UNAVAILABLE' } : { value: valuation[metric], classification: 'APPLICATION_DERIVED', evidenceIds: [...(metrics.fairValue.evidenceIds || [])], inputMetrics: ['fairValue','currentPrice'], calculation: metric, status: metrics.fairValue.evidenceIds?.length ? 'TRACEABLE_INPUT_CHAIN' : 'INPUT_EVIDENCE_INCOMPLETE' };
  }
  return metrics;
}
