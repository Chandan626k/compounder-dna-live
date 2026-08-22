import { analyze as analyzeStock, technical, buildDataQuality, scoreStock, decision, buildSectorFramework } from './market-engine.js';
import { verifiedHistory } from './market-data-provider.js';
import { fetchStatementEvidence, mergeStatementEvidence } from './statement-evidence.js';

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

function recalculateValuationAtPrice(valuation, price) {
  const next = { ...(valuation || {}), currentPrice: price };
  const shares = Number.isFinite(next.sharesOutstanding) ? next.sharesOutstanding : null;
  if (shares != null && shares > 0 && price > 0) {
    next.marketCap = shares * price;
    next.marketCapStatus = 'calculated';
  }
  const fairValue = Number.isFinite(next.fairValue) ? next.fairValue : null;
  if (fairValue != null && fairValue > 0 && price > 0) {
    next.upsideToFairValue = ((fairValue / price) - 1) * 100;
    next.marginOfSafety = (1 - price / fairValue) * 100;
    next.valuationGap = ((price / fairValue) - 1) * 100;
    const gap = next.valuationGap;
    next.verdict = gap <= -35 ? 'DEEPLY UNDERVALUED'
      : gap <= -20 ? 'UNDERVALUED'
        : gap <= -8 ? 'ATTRACTIVE'
          : gap <= 8 ? 'FAIR / REASONABLE'
            : gap <= 20 ? 'EXPENSIVE'
              : 'VERY EXPENSIVE';
  }
  return next;
}

export function buildVerifiedDataQualityProvenance({ dataQuality, marketAsOf, fundamentalsAsOf }) {
  const freshnessScore = Number.isFinite(dataQuality?.confidenceModel?.components?.freshness)
    ? dataQuality.confidenceModel.components.freshness
    : 0;
  const coveragePct = Number.isFinite(dataQuality?.completeness) ? dataQuality.completeness : 0;
  const asOf = marketAsOf || fundamentalsAsOf || null;
  const provider = 'Yahoo Finance';
  const source = 'Yahoo Finance chart API + quoteSummary + fundamentalsTimeSeries';
  return {
    asOf,
    freshness: freshnessLabel(freshnessScore),
    freshnessScore,
    coveragePct,
    confidence: Number.isFinite(dataQuality?.confidence) ? dataQuality.confidence : 0,
    provider,
    source,
  };
}

export async function analyzeVerified(input) {
  const symbol = String(input || '').trim().toUpperCase();
  if (!symbol) throw new Error('Stock symbol is required');

  const [baseResult, historyResult, statementResult] = await Promise.allSettled([
    analyzeStock(symbol),
    verifiedHistory(symbol, { interval: '1d', days: 900, minBars: 60 }),
    fetchStatementEvidence(symbol),
  ]);

  if (baseResult.status !== 'fulfilled') throw baseResult.reason;
  if (historyResult.status !== 'fulfilled') {
    throw new Error(`VERIFIED_MARKET_DATA_UNAVAILABLE:${historyResult.reason?.message || historyResult.reason}`);
  }

  const base = baseResult.value;
  const history = historyResult.value;
  const statementEvidence = statementResult.status === 'fulfilled'
    ? statementResult.value
    : {
      provider: 'Yahoo Finance fundamentalsTimeSeries',
      income: [], balance: [], cash: [],
      evidence: { balance: {}, cash: {} },
      coverage: { income: false, balanceSheet: false, cashFlow: false },
      history: { incomeYears: 0, balanceYears: 0, cashFlowYears: 0 },
      errors: { provider: String(statementResult.reason?.message || statementResult.reason) },
      fetchedAt: new Date().toISOString(),
    };

  const rows = history.rows.map(row => ({
    date: row.date,
    open: row.o,
    close: row.c,
    high: row.h,
    low: row.l,
    volume: row.v,
  }));
  const verifiedTechnical = technical(rows);
  const verifiedPrice = verifiedTechnical.last;
  const mergedFinancials = mergeStatementEvidence(base.fundamentals, statementEvidence);
  const financials = {
    ...mergedFinancials,
    errors: {
      ...(mergedFinancials.errors || {}),
      ...Object.fromEntries(Object.entries(statementEvidence.errors || {}).map(([key, value]) => [`statements.${key}`, value]).filter(([, value]) => Boolean(value))),
    },
    periods: {
      ...(mergedFinancials.periods || {}),
      annualHistoryCount: Math.max(
        Number(mergedFinancials.periods?.annualHistoryCount || 0),
        Number(statementEvidence.history?.incomeYears || 0),
      ),
    },
  };

  const valuation = recalculateValuationAtPrice(base.valuation, verifiedPrice);
  const profile = base.stock || {};
  const sectorFramework = buildSectorFramework(financials, profile.sector, profile.industry);
  const marketAsOf = history.latest || verifiedTechnical?.rows?.at(-1)?.date || null;
  const fundamentalsAsOf = latestEvidenceDate(statementEvidence) || base.provenance?.currentFundamentals?.asOf || null;
  const dataQualityBase = buildDataQuality(
    financials,
    valuation,
    base.ownership,
    verifiedTechnical,
    { marketAsOf, fundamentalsAsOf },
    sectorFramework,
  );
  const provenanceDataQuality = buildVerifiedDataQualityProvenance({
    dataQuality: dataQualityBase,
    marketAsOf,
    fundamentalsAsOf,
  });
  const dataQuality = {
    ...dataQualityBase,
    ...provenanceDataQuality,
    provider: provenanceDataQuality.provider,
    source: provenanceDataQuality.source,
  };
  const score = scoreStock(financials, valuation, verifiedTechnical, dataQuality, sectorFramework);
  const finalDecision = decision(score, valuation, verifiedTechnical, dataQuality);

  return {
    ...base,
    stock: {
      ...base.stock,
      price: verifiedPrice,
      marketCap: valuation.marketCap,
      dataNote: 'Verified daily market history + provider fundamentals. Missing values remain null; no financial metric is fabricated.',
    },
    fundamentals: financials,
    valuation,
    technical: verifiedTechnical,
    score,
    decision: finalDecision,
    dataQuality,
    provenance: {
      ...(base.provenance || {}),
      provider: provenanceDataQuality.provider,
      source: provenanceDataQuality.source,
      asOf: provenanceDataQuality.asOf,
      freshness: provenanceDataQuality.freshness,
      freshnessScore: provenanceDataQuality.freshnessScore,
      coveragePct: provenanceDataQuality.coveragePct,
      confidence: provenanceDataQuality.confidence,
      marketData: {
        ...(base.provenance?.marketData || {}),
        source: 'Yahoo Finance chart API via verifiedHistory',
        asOf: marketAsOf,
        interval: '1d',
        validation: 'verified provider payload',
      },
      annualFundamentals: {
        ...(base.provenance?.annualFundamentals || {}),
        source: statementEvidence.provider || 'Yahoo Finance fundamentalsTimeSeries',
        period: '12M/annual',
        historyRows: financials.periods?.annualHistoryCount || 0,
        asOf: fundamentalsAsOf,
        validation: 'provider payload normalized; missing fields remain null',
      },
      statementEvidence: {
        provider: statementEvidence.provider || 'Yahoo Finance fundamentalsTimeSeries',
        coverage: statementEvidence.coverage || null,
        history: statementEvidence.history || null,
        asOf: fundamentalsAsOf,
        errors: statementEvidence.errors || {},
      },
    },
  };
}
