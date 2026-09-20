const STATES = Object.freeze({
  READY: 'READY',
  PARTIALLY_READY: 'PARTIALLY_READY',
  NOT_READY: 'NOT_READY',
  UNKNOWN: 'UNKNOWN',
  NOT_AVAILABLE: 'NOT_AVAILABLE',
});

const HORIZONS = Object.freeze(['LONG_TERM', 'SWING', 'SHORT_TERM', 'INTRADAY']);

const finite = (v) => typeof v === 'number' && Number.isFinite(v);
const text = (v) => typeof v === 'string' && v.trim() ? v.trim() : null;
const asArray = (v) => Array.isArray(v) ? v : [];

function requirement(key, required, available, status, reason = null, source = null, asOf = null) {
  return { key, required, available, status, reason, source, asOf };
}

function canonicalRecords(analysis) {
  return asArray(analysis?.fundamentals?.canonicalFinancialEvidence?.records)
    .map((record) => record?.evidence || record)
    .filter(Boolean);
}

function latestCanonical(records, metric) {
  return records
    .filter((record) => record.metric === metric)
    .sort((a, b) => new Date(b.reportingPeriodEnd || 0) - new Date(a.reportingPeriodEnd || 0))[0] || null;
}

function canonicalStatus(record) {
  if (!record) return { available: false, status: 'NOT_AVAILABLE', reason: 'Canonical evidence record is missing.' };
  if (record.validationState !== 'VALID') return { available: true, status: 'UNVERIFIED', reason: 'Canonical validationState is not VALID.' };
  if (record.pitEligibility === 'PIT_VERIFIED') return { available: true, status: 'VERIFIED', reason: null };
  if (record.pitEligibility === 'PIT_UNKNOWN') return { available: true, status: 'UNKNOWN', reason: 'Publication/availability evidence is insufficient for PIT verification.' };
  return { available: true, status: 'BLOCKED', reason: `PIT state is ${record.pitEligibility}.` };
}

function financialRequirement(records, key, metric, fallbackValue, source, asOf) {
  const record = latestCanonical(records, metric);
  if (record) {
    const state = canonicalStatus(record);
    return requirement(key, true, state.available, state.status, state.reason, record.sourceAuthority || record.provider || source, record.reportingPeriodEnd || asOf);
  }
  if (finite(fallbackValue)) {
    return requirement(key, true, true, 'AVAILABLE_UNVERIFIED', 'A legacy/provider field is available, but no matching canonical evidence record exists.', source, asOf);
  }
  return requirement(key, true, false, 'NOT_AVAILABLE', 'No canonical or approved fallback evidence is available.', source, asOf);
}

function buildLongTerm(analysis) {
  const records = canonicalRecords(analysis);
  const f = analysis?.fundamentals || {};
  const current = f.current || {};
  const ratios = f.ratios || {};
  const derived = f.derived || {};
  const growth = f.growth || {};
  const valuation = analysis?.valuation || {};
  const asOf = analysis?.asOf || null;
  const currencyStatus = f.canonicalFinancialEvidence?.currencyStatus || 'UNKNOWN';
  const requirements = [
    financialRequirement(records, 'revenue', 'revenue', current.revenue, 'canonicalFinancialEvidence', asOf),
    financialRequirement(records, 'ebitda', 'ebitda', current.ebitda, 'canonicalFinancialEvidence', asOf),
    financialRequirement(records, 'net_profit_pat', 'netIncome', current.netIncome, 'canonicalFinancialEvidence', asOf),
    financialRequirement(records, 'eps', 'eps', null, 'canonicalFinancialEvidence', asOf),
    financialRequirement(records, 'cash', 'cash', current.cash, 'canonicalFinancialEvidence', asOf),
    financialRequirement(records, 'debt', 'debt', current.totalDebt, 'canonicalFinancialEvidence', asOf),
    financialRequirement(records, 'equity', 'equity', current.equity, 'canonicalFinancialEvidence', asOf),
    financialRequirement(records, 'current_assets', 'currentAssets', current.currentAssets, 'canonicalFinancialEvidence', asOf),
    financialRequirement(records, 'current_liabilities', 'currentLiabilities', current.currentLiabilities, 'canonicalFinancialEvidence', asOf),
    financialRequirement(records, 'operating_cash_flow', 'operatingCashFlow', current.operatingCashFlow, 'canonicalFinancialEvidence', asOf),
    financialRequirement(records, 'capex', 'capitalExpenditure', null, 'canonicalFinancialEvidence', asOf),
    financialRequirement(records, 'free_cash_flow', 'freeCashFlow', current.freeCashFlow, 'canonicalFinancialEvidence', asOf),
    financialRequirement(records, 'roe', 'roe', ratios.roe, 'canonicalFinancialEvidence', asOf),
    financialRequirement(records, 'roa', 'roa', ratios.roa, 'canonicalFinancialEvidence', asOf),
    requirement('debt_to_equity', true, finite(ratios.debtToEquity), finite(ratios.debtToEquity) ? 'CALCULATED' : 'NOT_AVAILABLE', finite(ratios.debtToEquity) ? null : 'Debt/equity is unavailable.', 'StockSamjho deterministic engine', asOf),
    requirement('current_ratio', true, finite(ratios.currentRatio), finite(ratios.currentRatio) ? 'CALCULATED' : 'NOT_AVAILABLE', finite(ratios.currentRatio) ? null : 'Current ratio is unavailable.', 'StockSamjho deterministic engine', asOf),
    requirement('net_debt_to_ebitda', true, finite(derived.netDebtToEbitda), finite(derived.netDebtToEbitda) ? 'CALCULATED' : 'NOT_AVAILABLE', finite(derived.netDebtToEbitda) ? null : 'Net debt/EBITDA is unavailable.', 'StockSamjho deterministic engine', asOf),
    requirement('fcf_growth', true, finite(derived.fcfGrowth), finite(derived.fcfGrowth) ? 'CALCULATED' : 'NOT_AVAILABLE', finite(derived.fcfGrowth) ? null : 'FCF growth is unavailable.', 'StockSamjho deterministic engine', asOf),
    requirement('earnings_growth', true, finite(ratios.earningsGrowth) || finite(growth.latestEPSGrowth), (finite(ratios.earningsGrowth) || finite(growth.latestEPSGrowth)) ? 'AVAILABLE_UNVERIFIED' : 'NOT_AVAILABLE', null, 'Yahoo Finance normalized', asOf),
    requirement('market_cap', true, finite(valuation.marketCap), finite(valuation.marketCap) ? 'PROVIDER' : 'NOT_AVAILABLE', finite(valuation.marketCap) ? null : 'Market capitalization is unavailable.', 'Yahoo Finance quoteSummary', asOf),
    requirement('pe', true, finite(valuation.trailingPE), finite(valuation.trailingPE) ? 'PROVIDER' : 'NOT_AVAILABLE', finite(valuation.trailingPE) ? null : 'P/E is unavailable.', 'Yahoo Finance quoteSummary', asOf),
    requirement('fair_value_method', true, text(valuation.fairValueMethod || valuation.method || valuation.verdict) != null, text(valuation.fairValueMethod || valuation.method || valuation.verdict) ? 'AVAILABLE' : 'NOT_AVAILABLE', text(valuation.fairValueMethod || valuation.method || valuation.verdict) ? null : 'No explicit fair-value method identity is exposed.', 'StockSamjho valuation engine', asOf),
    requirement('valuation_period_identity', true, Boolean(valuation?.providerMonetarySemantics?.observationAt || valuation?.asOf || asOf), Boolean(valuation?.providerMonetarySemantics?.observationAt || valuation?.asOf || asOf) ? 'AVAILABLE' : 'UNKNOWN', 'Valuation period identity is not fully represented in the current contract.', 'StockSamjho valuation evidence', asOf),
  ];

  const missingEvidence = requirements.filter((r) => !r.available || r.status !== 'VERIFIED').map((r) => r.key);
  const blockers = [];
  if (currencyStatus !== 'MATCH') blockers.push({ key: 'currency', reason: 'CANONICAL_FINANCIAL_STRENGTH_CURRENCY_UNSAFE', status: currencyStatus });
  const pitUnknown = records.some((r) => r.pitEligibility === 'PIT_UNKNOWN');
  if (pitUnknown) blockers.push({ key: 'pit', reason: 'Financial evidence contains PIT_UNKNOWN records; retrievedAt is not publicationTimestamp.', status: 'PIT_UNKNOWN' });
  const missing = requirements.filter((r) => !r.available);
  if (missing.length) blockers.push({ key: 'missing_evidence', reason: 'Required financial/valuation evidence is unavailable.', items: missing.map((r) => r.key) });
  const unverified = requirements.filter((r) => r.available && !['VERIFIED','CALCULATED','PROVIDER','AVAILABLE','CONFIRMED'].includes(r.status));
  if (unverified.length) blockers.push({ key: 'unverified_evidence', reason: 'Required evidence is available but not sufficiently verified for full readiness.', items: unverified.map((r) => r.key) });
  const allVerified = requirements.every((r) => r.available && ['VERIFIED', 'CALCULATED', 'PROVIDER', 'AVAILABLE'].includes(r.status))
    && currencyStatus === 'MATCH'
    && requirements.filter((r) => ['revenue','ebitda','net_profit_pat','eps','cash','debt','equity','current_assets','current_liabilities','operating_cash_flow','free_cash_flow'].includes(r.key)).every((r) => r.status === 'VERIFIED');
  const availableCount = requirements.filter((r) => r.available).length;
  const state = allVerified ? STATES.READY : availableCount > 0 ? STATES.PARTIALLY_READY : STATES.NOT_READY;
  return {
    horizon: 'LONG_TERM',
    state,
    recommendationEligible: false,
    requirements,
    availableEvidence: requirements.filter((r) => r.available),
    missingEvidence,
    blockers,
    evidenceStatus: { currency: currencyStatus, pit: pitUnknown ? 'UNKNOWN' : 'NOT_ESTABLISHED' },
    limitations: ['No FX conversion is performed.', 'Secondary provider evidence is not promoted to authoritative.', 'PIT is not inferred from retrieval time.'],
    nextRequiredEvidence: [...new Set([
      ...missing.map((r) => r.key),
      ...(currencyStatus === 'MATCH' ? [] : ['verified_financial_currency_match']),
      ...(pitUnknown ? ['publication_and_availability_timestamps', 'source_document_and_version'] : []),
    ])],
  };
}

function buildSwing(analysis, trading) {
  const t = trading?.technical || analysis?.technical || {};
  const c = t.canonicalEvidence || {};
  const lifecycle = c.breakoutLifecycle || null;
  const risk = lifecycle?.riskEvidence || null;
  const provenance = t.provenance || c.provenance || {};
  const asOf = provenance.observationTimestamp || provenance.retrievedAt || null;
  const requirements = [
    requirement('latest_valid_price', true, finite(t.last), finite(t.last) ? 'VERIFIED' : 'NOT_AVAILABLE', finite(t.last) ? null : 'Latest valid price is missing.', provenance.source, asOf),
    requirement('completed_daily_ohlc', true, provenance.timeframe === '1d' && provenance.dataQuality === 'VERIFIED', provenance.timeframe === '1d' && provenance.dataQuality === 'VERIFIED' ? 'VERIFIED' : 'NOT_AVAILABLE', 'Daily OHLC must pass canonical validation.', provenance.source, asOf),
    requirement('sufficient_daily_history', true, finite(c.historyBars) ? c.historyBars >= 252 : finite(t.has52WeekHistory) ? t.has52WeekHistory : false, (c.historyBars >= 252 || t.has52WeekHistory === true) ? 'VERIFIED' : 'INCOMPLETE', 'At least 252 daily observations are required for the 52-week evidence gate.', provenance.source, asOf),
    ...[
      ['sma20', t.s20], ['sma50', t.s50], ['sma200', t.s200], ['ema20', t.e20], ['ema50', t.e50], ['ema100', t.e100], ['ema200', t.e200],
      ['rsi14', t.rsi], ['atr14', t.atr], ['macd12_26_9', t.macd?.histogram], ['adx14', t.adx], ['bollinger20_2', t.bollinger?.upper], ['relative_volume', t.relativeVolume],
      ['support_resistance', t.supportResistance || (t.support != null && t.resistance != null)], ['52_week_high_low', t.high52Week != null && t.low52Week != null], ['market_structure', c.structure?.state], ['breakout_state', lifecycle?.status],
    ].map(([key, value]) => requirement(key, true, value != null, value != null ? 'VERIFIED' : 'NOT_AVAILABLE', value != null ? null : 'Technical evidence is not available in the canonical response.', provenance.source, asOf)),
    requirement('breakout_lifecycle', true, lifecycle != null, lifecycle ? 'VERIFIED' : 'NOT_AVAILABLE', lifecycle ? null : 'Canonical breakout lifecycle is not available.', 'canonical-breakout-lifecycle', asOf),
    requirement('entry_zone', true, risk?.entryZone != null, risk?.entryZone != null ? 'VERIFIED' : 'INCOMPLETE', 'Entry is only valid when canonical risk evidence provides it; no entry is invented.', provenance.source, asOf),
    requirement('invalidation_stop', true, finite(risk?.invalidationLevel), finite(risk?.invalidationLevel) ? 'VERIFIED' : 'INCOMPLETE', 'No stop is invented when canonical invalidation is absent.', provenance.source, asOf),
    requirement('target', true, asArray(risk?.targetZones).length > 0, asArray(risk?.targetZones).length > 0 ? 'VERIFIED' : 'INCOMPLETE', 'No target is invented when canonical target zones are absent.', provenance.source, asOf),
    requirement('risk_reward', true, finite(risk?.riskReward), finite(risk?.riskReward) ? 'VERIFIED' : 'INCOMPLETE', 'No R/R is calculated from guessed entry/stop/target values.', provenance.source, asOf),
    requirement('atr_risk_evidence', true, finite(risk?.basis?.atrAtBreakout), finite(risk?.basis?.atrAtBreakout) ? 'VERIFIED' : 'INCOMPLETE', 'ATR-based risk evidence must be sourced from the canonical lifecycle.', provenance.source, asOf),
    requirement('volume_confirmation', true, lifecycle?.confirmationEvidence?.volumeStatus === 'CONFIRMED', lifecycle?.confirmationEvidence?.volumeStatus || 'NOT_AVAILABLE', 'Volume confirmation must come from canonical breakout evidence.', provenance.source, asOf),
    requirement('overextension_check', true, typeof lifecycle?.overextended === 'boolean', typeof lifecycle?.overextended === 'boolean' ? 'VERIFIED' : 'NOT_AVAILABLE', 'Overextension must be explicitly evaluated by canonical evidence.', provenance.source, asOf),
  ];
  const blockers = [];
  if (!lifecycle) blockers.push({ key: 'breakout_lifecycle', reason: 'Canonical breakout lifecycle is unavailable.' });
  if (lifecycle && lifecycle.evidenceAvailability === 'BREAKOUT_CONFIRMED_BUT_RISK_EVIDENCE_INCOMPLETE') blockers.push({ key: 'risk_evidence', reason: 'BREAKOUT_EVIDENCE_PRESENT_BUT_RECOMMENDATION_NOT_READY' });
  for (const r of requirements.filter((x) => !x.available || ['INCOMPLETE','NOT_AVAILABLE','LOW','UNKNOWN'].includes(x.status))) blockers.push({ key: r.key, reason: r.reason || 'Required evidence is incomplete.' });
  const allVerified = requirements.every((r) => r.available && ['VERIFIED','AVAILABLE','CONFIRMED'].includes(r.status))
    && lifecycle != null
    && risk?.status === 'VERIFIED';
  const availableCount = requirements.filter((r) => r.available).length;
  const state = allVerified ? STATES.READY : availableCount > 0 ? STATES.NOT_READY : STATES.UNKNOWN;
  return {
    horizon: 'SWING',
    state,
    recommendationEligible: false,
    requirements,
    availableEvidence: requirements.filter((r) => r.available),
    missingEvidence: requirements.filter((r) => !r.available).map((r) => r.key),
    blockers,
    evidenceStatus: { technical: t.provenance?.dataQuality || 'UNKNOWN', breakout: lifecycle?.status || 'NOT_AVAILABLE', risk: risk?.status || 'NOT_AVAILABLE' },
    limitations: ['Daily evidence is not inherited by Short-Term or Intraday.', 'No entry, stop, target, or R/R is invented.'],
    nextRequiredEvidence: blockers.map((b) => b.key),
  };
}

function buildShortTerm(analysis, trading) {
  const t = trading?.technical || {};
  const hasQualifiedIntraday = false;
  const requirements = [
    requirement('production_qualified_intraday_source', true, hasQualifiedIntraday, 'NOT_AVAILABLE', 'SHORT_TERM_DATA_SOURCE_NOT_PRODUCTION_QUALIFIED', null, null),
    requirement('intraday_candles', true, false, 'NOT_AVAILABLE', 'Daily candles are not intraday evidence.', null, null),
    requirement('session_status', true, false, 'UNKNOWN', 'No qualified intraday session source is connected.', null, null),
    requirement('intraday_vwap', true, false, 'NOT_AVAILABLE', 'Cumulative daily VWAP is not an intraday session VWAP.', null, null),
    requirement('intraday_risk_evidence', true, false, 'NOT_AVAILABLE', 'Entry/invalidation/stop/target/RR cannot be produced without qualified intraday evidence.', null, null),
  ];
  return {
    horizon: 'SHORT_TERM',
    state: STATES.NOT_READY,
    recommendationEligible: false,
    requirements,
    availableEvidence: [],
    missingEvidence: requirements.map((r) => r.key),
    blockers: [{ key: 'intraday_source', reason: 'SHORT_TERM_DATA_SOURCE_NOT_PRODUCTION_QUALIFIED' }],
    evidenceStatus: { intradaySource: 'NOT_AVAILABLE' },
    limitations: ['Daily evidence does not qualify as intraday evidence.', 'No provider integration is added in Slice #4.'],
    nextRequiredEvidence: ['production_qualified_intraday_source', 'session_aware_intraday_candles', 'intraday_vwap', 'intraday_risk_evidence'],
  };
}

function buildIntraday() {
  return {
    horizon: 'INTRADAY',
    state: STATES.NOT_AVAILABLE,
    recommendationEligible: false,
    requirements: [requirement('production_qualified_intraday_source', true, false, 'NOT_AVAILABLE', 'No production-qualified authoritative intraday source exists in the current system.', null, null)],
    availableEvidence: [],
    missingEvidence: ['production_qualified_intraday_source'],
    blockers: [{ key: 'intraday_source', reason: 'Production-qualified intraday evidence source is not connected.' }],
    evidenceStatus: { intradaySource: 'NOT_AVAILABLE' },
    limitations: ['No live/fake intraday data is fabricated.', 'No broker integration or trading execution is enabled.'],
    nextRequiredEvidence: ['production_qualified_intraday_source', 'exchange_session_calendar', 'historical_reproducibility', 'entitlement_and_redistribution_policy'],
  };
}

export function evaluateRecommendationReadiness({ analysis = null, trading = null } = {}) {
  const result = {
    contract: 'STOCKSAMJHO_RECOMMENDATION_READINESS_V1',
    evaluatedAt: new Date().toISOString(),
    horizons: {
      LONG_TERM: buildLongTerm(analysis),
      SWING: buildSwing(analysis, trading),
      SHORT_TERM: buildShortTerm(analysis, trading),
      INTRADAY: buildIntraday(),
    },
    policy: {
      recommendationEnginePresent: false,
      recommendationEligible: false,
      productionActionsEnabled: false,
      productionDecisionBlocked: true,
      noBuySellGenerated: true,
      noProviderCredentialsAdded: true,
    },
  };
  return result;
}

export { STATES, HORIZONS };
