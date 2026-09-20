import * as core from './market-engine-core.js';
import { deriveFinancialCurrency } from './statement-evidence.js';
import { adaptStatementEvidenceToCanonical, buildFinancialStrengthInputFromCanonical } from './financial-evidence-adapter.js';

const num = (v) => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (v && typeof v === 'object' && typeof v.raw === 'number' && Number.isFinite(v.raw)) return v.raw;
  return null;
};

const rowCurrency = (row) => {
  const value = row?.currencyCode ?? row?.currency ?? row?.financialCurrency ?? null;
  return typeof value === 'string' && value.trim() ? value.trim().toUpperCase() : null;
};

function inferFinancialCurrency(raw) {
  return deriveFinancialCurrency([...(raw?.annual || []), ...(raw?.trailing || [])]);
}

export function assessProviderMonetarySemantics(raw, statementEvidence = null) {
  const price = raw?.summary?.price || {};
  const tradingCurrency = statementEvidence?.currency
    ? statementEvidence.currency.tradingCurrency || price.currency || null
    : price.currency || null;
  const financialCurrency = statementEvidence?.currency
    ? statementEvidence.currency.financialCurrency || null
    : inferFinancialCurrency(raw);
  const currencyStatus = tradingCurrency && financialCurrency ? (tradingCurrency === financialCurrency ? 'MATCH' : 'MISMATCH') : 'UNKNOWN';
  const snapshotSeconds = num(price.regularMarketTime);
  const observationAt = snapshotSeconds != null ? new Date(snapshotSeconds * 1000).toISOString() : null;
  const ttmRows = (raw?.trailing || []).filter((r) => String(r?.periodType || '').toUpperCase() === 'TTM');
  const latestTtm = (key) => {
    const rows = ttmRows
      .filter((r) => num(r?.[key]) != null && r?.date)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    return rows.length ? rows.at(-1) : null;
  };
  const ebitdaRow = latestTtm('EBITDA');
  const revenueRow = latestTtm('totalRevenue');
  const ebitdaCurrency = rowCurrency(ebitdaRow);
  const revenueCurrency = rowCurrency(revenueRow);
  const ebitdaPeriod = ebitdaRow?.date || null;
  const revenuePeriod = revenueRow?.date || null;
  const currencyCompatible = currencyStatus === 'MATCH'
    && ebitdaCurrency != null
    && revenueCurrency != null
    && ebitdaCurrency === financialCurrency
    && revenueCurrency === financialCurrency;
  const observationEstablished = observationAt != null;
  const ebitdaPeriodEstablished = ebitdaPeriod != null && ebitdaRow?.periodType === 'TTM';
  const revenuePeriodEstablished = revenuePeriod != null && revenueRow?.periodType === 'TTM';
  const provenanceEstablished = Boolean(raw?.summary?.defaultKeyStatistics) && Boolean(raw?.summary?.financialData || raw?.trailing?.length);
  const ratioCompatible = currencyCompatible && observationEstablished && ebitdaPeriodEstablished && revenuePeriodEstablished && provenanceEstablished;
  const evCompatible = currencyStatus === 'MATCH' && observationEstablished && provenanceEstablished;
  const blockedReason = !currencyCompatible || !observationEstablished || !ebitdaPeriodEstablished || !revenuePeriodEstablished || !provenanceEstablished
    ? 'CURRENCY_OR_PERIOD_SEMANTICS_UNVERIFIED'
    : null;
  return {
    source: 'Yahoo Finance quoteSummary.defaultKeyStatistics + quoteSummary.price + fundamentalsTimeSeries',
    tradingCurrency,
    financialCurrency,
    currencyStatus,
    evCurrencyBasis: financialCurrency,
    observationAt,
    ebitda: { source: 'Yahoo Finance fundamentalsTimeSeries', currency: ebitdaCurrency, period: ebitdaPeriod, periodType: ebitdaRow?.periodType || null },
    revenue: { source: 'Yahoo Finance fundamentalsTimeSeries', currency: revenueCurrency, period: revenuePeriod, periodType: revenueRow?.periodType || null },
    enterpriseValue: { evidenceStatus: evCompatible ? 'PROVIDER' : 'NOT_AVAILABLE', verification: 'UNKNOWN', reason: evCompatible ? null : blockedReason },
    evToEbitda: { evidenceStatus: ratioCompatible ? 'PROVIDER' : 'NOT_AVAILABLE', verification: 'UNKNOWN', reason: ratioCompatible ? null : blockedReason },
    evToRevenue: { evidenceStatus: ratioCompatible ? 'PROVIDER' : 'NOT_AVAILABLE', verification: 'UNKNOWN', reason: ratioCompatible ? null : blockedReason },
    compatible: { enterpriseValue: evCompatible, evToEbitda: ratioCompatible, evToRevenue: ratioCompatible },
    provenanceEstablished,
  };
}

function gateValuation(valuation, raw, statementEvidence = null) {
  const semantics = assessProviderMonetarySemantics(raw, statementEvidence);
  return {
    ...valuation,
    enterpriseValue: semantics.compatible.enterpriseValue ? valuation.enterpriseValue : null,
    evToEbitda: semantics.compatible.evToEbitda ? valuation.evToEbitda : null,
    evToRevenue: semantics.compatible.evToRevenue ? valuation.evToRevenue : null,
    providerMonetarySemantics: semantics,
  };
}

export async function analyze(input) {
  const response = await core.analyze(input);
  const statementEvidence = response?.fundamentals?.statementEvidence || null;
  const valuation = response?.valuation || {};
  const tradingCurrency = statementEvidence?.currency?.tradingCurrency || response?.currency || null;
  const financialCurrency = statementEvidence?.currency?.financialCurrency || null;
  const currencyStatus = statementEvidence?.currency?.status || (tradingCurrency && financialCurrency ? (tradingCurrency === financialCurrency ? 'MATCH' : 'MISMATCH') : 'UNKNOWN');
  const observationAt = statementEvidence?.fetchedAt || response?.provenance?.currentFundamentals?.asOf || response?.asOf || null;
  const evCompatible = currencyStatus === 'MATCH' && observationAt != null;
  const semantics = {
    source: 'Yahoo Finance quoteSummary.defaultKeyStatistics + quoteSummary.price + fundamentalsTimeSeries',
    tradingCurrency,
    financialCurrency,
    currencyStatus,
    evCurrencyBasis: financialCurrency,
    observationAt,
    ebitda: { source: 'Yahoo Finance fundamentalsTimeSeries', currency: null, period: null, periodType: null },
    revenue: { source: 'Yahoo Finance fundamentalsTimeSeries', currency: null, period: null, periodType: null },
    enterpriseValue: { evidenceStatus: evCompatible ? 'PROVIDER' : 'NOT_AVAILABLE', verification: 'UNKNOWN', reason: evCompatible ? null : 'CURRENCY_OR_PERIOD_SEMANTICS_UNVERIFIED' },
    evToEbitda: { evidenceStatus: 'NOT_AVAILABLE', verification: 'UNKNOWN', reason: 'CURRENCY_OR_PERIOD_SEMANTICS_UNVERIFIED' },
    evToRevenue: { evidenceStatus: 'NOT_AVAILABLE', verification: 'UNKNOWN', reason: 'CURRENCY_OR_PERIOD_SEMANTICS_UNVERIFIED' },
    compatible: { enterpriseValue: evCompatible, evToEbitda: false, evToRevenue: false },
    provenanceEstablished: true,
  };
  const gatedValuation = {
    ...valuation,
    enterpriseValue: evCompatible ? valuation.enterpriseValue : null,
    evToEbitda: null,
    evToRevenue: null,
    providerMonetarySemantics: semantics,
  };
  const strengthInput = buildFinancialStrengthInputFromCanonical(
    response?.fundamentals?.canonicalFinancialEvidence,
    { sectorKey: response?.sectorFramework?.key || response?.fundamentals?.sectorFramework?.key || null, baseFinancials: response?.fundamentals || {} },
  );
  const score = core.scoreStock(strengthInput.financials, gatedValuation, response.technical, response.dataQuality, response.sectorFramework);
  score.financialStrengthEvidenceSource = strengthInput.evidence.source || 'canonicalFinancialEvidence';
  score.financialStrengthEvidenceStatus = strengthInput.status;
  score.financialStrengthEvidenceReason = strengthInput.reason;
  score.financialStrengthEvidencePITStates = strengthInput.evidence.pitStates || [];

  const decisionResult = core.decision(score, gatedValuation, response.technical, response.dataQuality);
  return { ...response, score, decision: decisionResult, valuation: gatedValuation };
}

export function buildValuation(raw, price, statementEvidence = null) {
  return gateValuation(core.buildValuation(raw, price), raw, statementEvidence);
}
export const atr = core.atr;
export const rsi = core.rsi;
export const normalizeDebtToEquity = core.normalizeDebtToEquity;
export const technical = core.technical;
export const buildFinancials = core.buildFinancials;
export const buildDataQuality = core.buildDataQuality;
export const scoreStock = core.scoreStock;
export const decision = core.decision;
export const SCORE_MODEL = core.SCORE_MODEL;
export const buildSectorFramework = core.buildSectorFramework;
export const classifySector = core.classifySector;
