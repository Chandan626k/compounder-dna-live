import { createHash } from 'node:crypto';

const hash = (value) => `pe_${createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 24)}`;
const providerEvidence = ({ sourceKey, value, retrievedAt, periodSemantics, qualification = 'PROVIDER_LEVEL_ONLY' }) => {
  if (value == null) return null;
  return {
    evidenceId: hash({ source: 'YAHOO_FINANCE', sourceKey, value, retrievedAt, periodSemantics, qualification }),
    source: 'YAHOO_FINANCE', sourceKey, value: value ?? null, observedAt: null, retrievedAt: retrievedAt || null,
    reportingDate: null, reportingPeriod: null, periodType: null, statementScope: null, unit: null, currency: null,
    reportedOrDerived: 'REPORTED', qualification, periodSemantics,
  };
};

const STATEMENT_FIELDS = Object.freeze([
  'revenue','ebitda','ebit','eps','netIncome','interestExpense','totalAssets','totalDebt','cash','equity',
  'currentAssets','currentLiabilities','workingCapital','ordinaryShares','operatingCashFlow','freeCashFlow','capitalExpenditure',
]);
const PROVIDER_FIELDS = Object.freeze({
  roe: ['financialData.returnOnEquity','provider-reported ratio; exact reporting period not exposed by quoteSummary'],
  roa: ['financialData.returnOnAssets','provider-reported ratio; exact reporting period not exposed by quoteSummary'],
  debtToEquity: ['financialData.debtToEquity','provider-reported current field; Yahoo represents this as a percentage'],
  currentRatio: ['financialData.currentRatio','provider-reported current field'],
  quickRatio: ['financialData.quickRatio','provider-reported current field'],
  grossMargin: ['financialData.grossMargins','provider-reported current/TTM field'],
  operatingMargin: ['financialData.operatingMargins','provider-reported current/TTM field'],
  netMargin: ['financialData.profitMargins','provider-reported current/TTM field'],
  ebitdaMargin: ['financialData.ebitdaMargins','provider-reported current/TTM field'],
  revenueGrowth: ['financialData.revenueGrowth','provider-reported current/TTM growth field'],
  earningsGrowth: ['financialData.earningsGrowth','provider-reported current/TTM growth field'],
});
const VALUATION_PROVIDER_FIELDS = Object.freeze({
  trailingPE: ['summaryDetail.trailingPE','provider-reported current ratio'],
  forwardPE: ['summaryDetail.forwardPE/defaultKeyStatistics.forwardPE','provider-reported forward estimate'],
  priceToBook: ['defaultKeyStatistics.priceToBook','provider-reported current ratio'],
  pegRatio: ['defaultKeyStatistics.pegRatio','provider-reported valuation field; semantics provider-defined'],
  enterpriseValue: ['defaultKeyStatistics.enterpriseValue','provider-reported current valuation field'],
  evToEbitda: ['defaultKeyStatistics.enterpriseToEbitda','provider-reported current valuation ratio'],
  evToRevenue: ['defaultKeyStatistics.enterpriseToRevenue','provider-reported current valuation ratio'],
  trailingEPS: ['defaultKeyStatistics.trailingEps','provider-reported TTM EPS'],
  forwardEPS: ['defaultKeyStatistics.forwardEps','provider-reported forward EPS estimate'],
  bookValue: ['defaultKeyStatistics.bookValue','provider-reported book value per share'],
  sharesOutstanding: ['defaultKeyStatistics.sharesOutstanding','provider-reported current shares field'],
  marketCap: ['summaryDetail.marketCap','provider-reported current market capitalization'],
});

export function buildFinancialMetricLineage({ financials = {}, valuation = {}, retrievedAt = null } = {}) {
  const metrics = {};
  const canonical = financials?.evidence?.byId || {};
  const canonicalFields = financials?.evidence?.fields || {};
  for (const field of STATEMENT_FIELDS) {
    const id = canonicalFields[field];
    const record = id ? canonical[id] : null;
    metrics[field] = record
      ? { value: financials?.current?.[field] ?? record.value, classification: 'CANONICAL_STATEMENT', evidenceIds: [id], status: 'TRACEABLE' }
      : { value: financials?.current?.[field] ?? null, classification: 'UNAVAILABLE_CANONICAL_STATEMENT', evidenceIds: [], status: financials?.current?.[field] != null ? 'PROVIDER_VALUE_NOT_CANONICALIZED' : 'UNAVAILABLE' };
  }
  for (const [metric, [sourceKey, semantics]] of Object.entries(PROVIDER_FIELDS)) {
    const value = financials?.ratios?.[metric] ?? null;
    const evidence = providerEvidence({ sourceKey, value, retrievedAt, periodSemantics: semantics });
    metrics[metric] = evidence
      ? { value, classification: 'PROVIDER_REPORTED', evidenceIds: [evidence.evidenceId], evidence, status: 'TRACEABLE_PROVIDER_LEVEL' }
      : { value: null, classification: 'UNAVAILABLE', evidenceIds: [], status: 'UNAVAILABLE' };
  }
  for (const [metric, info] of Object.entries(financials?.derivedEvidence || {})) {
    const value = financials?.derived?.[metric] ?? null;
    metrics[metric] = value == null
      ? { value: null, classification: 'UNAVAILABLE', evidenceIds: [], status: 'UNAVAILABLE' }
      : { value, classification: 'APPLICATION_DERIVED', evidenceIds: info.inputEvidenceIds || [], calculation: info.calculation || 'APPLICATION_DERIVED', status: info.status || 'TRACEABLE' };
  }
  return metrics;
}

export function buildValuationMetricLineage({ valuation = {}, financials = {}, priceSource = null, retrievedAt = null } = {}) {
  const metrics = {};
  for (const [metric, [sourceKey, semantics]] of Object.entries(VALUATION_PROVIDER_FIELDS)) {
    const value = valuation?.[metric] ?? null;
    const evidence = providerEvidence({ sourceKey, value, retrievedAt, periodSemantics: semantics });
    metrics[metric] = evidence
      ? { value, classification: 'PROVIDER_REPORTED', evidenceIds: [evidence.evidenceId], evidence, status: 'TRACEABLE_PROVIDER_LEVEL' }
      : { value: null, classification: 'UNAVAILABLE', evidenceIds: [], status: 'UNAVAILABLE' };
  }
  const priceEvidence = priceSource ? { value: priceSource.currentQuotePrice ?? priceSource.dailyBarClose ?? null, classification: priceSource.source || 'UNKNOWN', observationType: priceSource.source === 'CURRENT_PROVIDER_QUOTE' ? 'CURRENT_QUOTE' : 'LATEST_DAILY_BAR' } : null;
  metrics.currentPrice = priceEvidence ? { ...priceEvidence, status: priceEvidence.value != null ? 'TRACEABLE' : 'UNAVAILABLE' } : { value: valuation?.currentPrice ?? null, classification: 'PRICE_SELECTION_UNSPECIFIED', evidenceIds: [], status: 'UNAVAILABLE' };
  const fairValueInputs = ['forwardEPS','trailingEPS','growthSignal','roe'].filter(name => {
    if (name === 'growthSignal') return valuation?.growthSignal != null;
    if (name === 'roe') return financials?.ratios?.roe != null;
    return valuation?.[name] != null;
  });
  metrics.fairValue = valuation?.fairValue == null
    ? { value: null, classification: 'APPLICATION_DERIVED', evidenceIds: [], inputMetrics: fairValueInputs, status: 'UNAVAILABLE' }
    : { value: valuation.fairValue, classification: 'APPLICATION_DERIVED', evidenceIds: fairValueInputs.flatMap(name => financials?.metricLineage?.[name]?.evidenceIds || []), inputMetrics: fairValueInputs, calculation: 'Growth-adjusted justified P/E using provider EPS/ROE/growth inputs', status: 'TRACEABLE_INPUT_CHAIN' };
  for (const metric of ['upsideToFairValue','marginOfSafety','valuationGap']) {
    metrics[metric] = valuation?.[metric] == null
      ? { value: null, classification: 'APPLICATION_DERIVED', evidenceIds: [], inputMetrics: ['fairValue','currentPrice'], status: 'UNAVAILABLE' }
      : { value: valuation[metric], classification: 'APPLICATION_DERIVED', evidenceIds: [...(metrics.fairValue.evidenceIds || [])], inputMetrics: ['fairValue','currentPrice'], calculation: metric, status: 'TRACEABLE_INPUT_CHAIN' };
  }
  return metrics;
}
