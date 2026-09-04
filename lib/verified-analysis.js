import { analyze as analyzeStock, technical, buildFinancials, buildValuation, buildDataQuality, scoreStock, decision, buildSectorFramework } from './market-engine.js';
import { verifiedHistory } from './market-data-provider.js';
import { fetchStatementEvidence, mergeStatementEvidence } from './statement-evidence.js';
import { fetchBankIrEvidence, mergeBankIrEvidence } from './bank-ir-evidence.js';

const ISO = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const latestEvidenceDate = (evidence) => {
  const dates = [
    ...(evidence?.income || []).map(row => row?.date),
    ...(evidence?.balance || []).map(row => row?.date),
    ...(evidence?.cash || []).map(row => row?.date),
  ].map(ISO).filter(Boolean).sort();
  return dates.at(-1) || null;
};

const freshnessLabel = (score) => {
  if (!Number.isFinite(score) || score <= 0) return 'UNAVAILABLE';
  if (score >= 90) return 'FRESH';
  if (score >= 75) return 'RECENT';
  if (score >= 50) return 'STALE';
  return 'VERY_STALE';
};

function statementRaw(statementEvidence) {
  return {
    summary: null,
    annual: [
      ...(statementEvidence?.income || []).map(row => ({ ...row, providerType: 'FINANCIALS', TYPE: 'FINANCIALS', periodType: '12M' })),
      ...(statementEvidence?.balance || []).map(row => ({ ...row, providerType: 'BALANCE_SHEET', TYPE: 'BALANCE_SHEET', periodType: '12M' })),
      ...(statementEvidence?.cash || []).map(row => ({ ...row, providerType: 'CASH_FLOW', TYPE: 'CASH_FLOW', periodType: '12M' })),
    ],
    trailing: [],
  };
}

function recalculateValuationAtPrice(valuation, price) {
  const next = { ...(valuation || {}), currentPrice: price };
  const shares = Number.isFinite(next.sharesOutstanding) ? next.sharesOutstanding : null;
  if (shares != null && shares > 0 && price > 0) { next.marketCap = shares * price; next.marketCapStatus = 'calculated'; }
  const fairValue = Number.isFinite(next.fairValue) ? next.fairValue : null;
  if (fairValue != null && fairValue > 0 && price > 0) {
    next.upsideToFairValue = ((fairValue / price) - 1) * 100;
    next.marginOfSafety = (1 - price / fairValue) * 100;
    next.valuationGap = ((price / fairValue) - 1) * 100;
    const gap = next.valuationGap;
    next.verdict = gap <= -35 ? 'DEEPLY UNDERVALUED' : gap <= -20 ? 'UNDERVALUED' : gap <= -8 ? 'ATTRACTIVE' : gap <= 8 ? 'FAIR / REASONABLE' : gap <= 20 ? 'EXPENSIVE' : 'VERY EXPENSIVE';
  }
  return next;
}

export function buildVerifiedDataQualityProvenance({ dataQuality, marketAsOf, fundamentalsAsOf, marketRetrievedAt = null }) {
  const freshnessScore = Number.isFinite(dataQuality?.confidenceModel?.components?.freshness) ? dataQuality.confidenceModel.components.freshness : 0;
  const coveragePct = Number.isFinite(dataQuality?.completeness) ? dataQuality.completeness : 0;
  const asOf = marketAsOf || fundamentalsAsOf || null;
  return { asOf, freshness: freshnessLabel(freshnessScore), freshnessScore, coveragePct, confidence: Number.isFinite(dataQuality?.confidence) ? dataQuality.confidence : 0, provider: 'Yahoo Finance', source: 'Yahoo Finance chart API + quoteSummary + fundamentalsTimeSeries', marketRetrievedAt: marketRetrievedAt || null };
}

export async function analyzeVerified(input) {
  const requestedSymbol = String(input || '').trim().toUpperCase();
  if (!requestedSymbol) throw new Error('Stock symbol is required');
  const symbol = requestedSymbol.startsWith('^') || requestedSymbol.endsWith('.NS') || requestedSymbol.endsWith('.BO') ? requestedSymbol : `${requestedSymbol}.NS`;

  let history;
  try { history = await verifiedHistory(symbol, { interval: '1d', days: 900, minBars: 60 }); }
  catch (error) { throw new Error(`VERIFIED_MARKET_DATA_UNAVAILABLE:${error?.message || error}`); }

  const rows = history.rows.map(row => ({ date: row.date, open: row.o, close: row.c, high: row.h, low: row.l, volume: row.v }));
  const [baseResult, bankIrResult] = await Promise.allSettled([
    analyzeStock(symbol, { marketOverride: { currency: 'INR', exchange: null, price: rows.at(-1)?.close ?? null, rows } }),
    fetchBankIrEvidence(symbol),
  ]);
  const base = baseResult.status === 'fulfilled' ? baseResult.value : null;
  const bankIrEvidence = bankIrResult.status === 'fulfilled' ? bankIrResult.value : null;

  let statementEvidence = base?.fundamentals?.statementEvidence;
  if (!statementEvidence) {
    try { statementEvidence = await fetchStatementEvidence(symbol); }
    catch (error) {
      statementEvidence = { provider: 'Yahoo Finance fundamentalsTimeSeries', income: [], balance: [], cash: [], evidence: { balance: {}, cash: {} }, coverage: { income: false, balanceSheet: false, cashFlow: false }, history: { incomeYears: 0, balanceYears: 0, cashFlowYears: 0 }, errors: { provider: String(error?.message || error) }, fetchedAt: new Date().toISOString() };
    }
  }

  const raw = statementRaw(statementEvidence);
  const fallbackFinancials = buildFinancials(raw);
  const fallbackValuation = buildValuation(raw, null);
  const fallbackStock = { symbol: symbol.replace(/\.NS$|\.BO$/i, ''), yahooSymbol: symbol, name: symbol, sector: null, industry: null, price: null, currency: 'INR', exchange: null, marketCap: fallbackValuation.marketCap, dataNote: 'Verified market history + provider statements only. Quote-summary fields unavailable remain null.', modelVersion: 'analysis-v1.0', dataLimited: true, sectorFramework: 'DEFAULT' };

  const verifiedTechnical = technical(rows);
  const verifiedPrice = verifiedTechnical.last;
  let financials = mergeStatementEvidence(base?.fundamentals || fallbackFinancials, statementEvidence);
  financials = mergeBankIrEvidence(financials, bankIrEvidence);
  financials = {
    ...financials,
    errors: { ...(financials.errors || {}), ...Object.fromEntries(Object.entries(statementEvidence.errors || {}).map(([key, value]) => [`statements.${key}`, value]).filter(([, value]) => Boolean(value))) },
    periods: { ...(financials.periods || {}), annualHistoryCount: Math.max(Number(financials.periods?.annualHistoryCount || 0), Number(statementEvidence.history?.incomeYears || 0)) },
  };

  const valuation = recalculateValuationAtPrice(base?.valuation || fallbackValuation, verifiedPrice);
  const stock = base?.stock || fallbackStock;
  const ownership = base?.ownership || { insidersPct: null, institutionsPct: null, majorHolders: null, institutionOwnership: [], insiderHolders: [], insiderTransactions: [], sourceNote: 'Ownership provider data unavailable.' };
  const sectorFramework = buildSectorFramework(financials, stock.sector, stock.industry);
  const marketAsOf = history.latest || rows.at(-1)?.date || null;
  const fundamentalsAsOf = latestEvidenceDate(statementEvidence) || base?.provenance?.currentFundamentals?.asOf || null;
  const dataQualityBase = buildDataQuality(financials, valuation, ownership, verifiedTechnical, { marketAsOf, fundamentalsAsOf }, sectorFramework);
  const provenanceDataQuality = buildVerifiedDataQualityProvenance({ dataQuality: dataQualityBase, marketAsOf, fundamentalsAsOf, marketRetrievedAt: history.retrievedAt });
  const dataQuality = { ...dataQualityBase, ...provenanceDataQuality, provider: provenanceDataQuality.provider, source: provenanceDataQuality.source };
  const score = scoreStock(financials, valuation, verifiedTechnical, dataQuality, sectorFramework);
  const finalDecision = decision(score, valuation, verifiedTechnical, dataQuality);

  return {
    ...(base || {}),
    stock: { ...stock, price: verifiedPrice, marketCap: valuation.marketCap, dataNote: 'Verified daily market history + provider fundamentals. Missing values remain null; no financial metric is fabricated.' },
    fundamentals: financials,
    valuation, ownership, technical: verifiedTechnical, score, decision: finalDecision, dataQuality,
    provenance: {
      ...(base?.provenance || {}), provider: provenanceDataQuality.provider, source: provenanceDataQuality.source, asOf: provenanceDataQuality.asOf, freshness: provenanceDataQuality.freshness, freshnessScore: provenanceDataQuality.freshnessScore, coveragePct: provenanceDataQuality.coveragePct, confidence: provenanceDataQuality.confidence,
      marketData: { ...(base?.provenance?.marketData || {}), source: 'Yahoo Finance chart API via verifiedHistory', asOf: marketAsOf, retrievedAt: history.retrievedAt || null, interval: '1d', validation: 'verified provider payload', status: history.status || 'PRIMARY' },
      annualFundamentals: { ...(base?.provenance?.annualFundamentals || {}), source: statementEvidence.provider || 'Yahoo Finance fundamentalsTimeSeries', period: '12M/annual', historyRows: financials.periods?.annualHistoryCount || 0, asOf: fundamentalsAsOf, validation: 'provider payload normalized; missing fields remain null' },
      statementEvidence: { provider: statementEvidence.provider || 'Yahoo Finance fundamentalsTimeSeries', coverage: statementEvidence.coverage || null, history: statementEvidence.history || null, asOf: fundamentalsAsOf, errors: statementEvidence.errors || {} },
      bankIrEvidence: bankIrEvidence ? { issuer: bankIrEvidence.issuer, ticker: bankIrEvidence.ticker, sourceUrl: bankIrEvidence.sourceUrl, reportingPeriod: bankIrEvidence.reportingPeriod, periodType: bankIrEvidence.periodType, statementScope: bankIrEvidence.statementScope, qualification: bankIrEvidence.qualification } : null,
    },
    verifiedMarketHistory: rows,
  };
}
