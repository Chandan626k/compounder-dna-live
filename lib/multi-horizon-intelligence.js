import { areEvidenceCompatible } from './financial-evidence.js';
import { resolveHorizonFreshness } from './horizon-freshness.js';

export const LONG_TERM_STATES = Object.freeze(['ATTRACTIVE', 'NEUTRAL', 'UNATTRACTIVE', 'INSUFFICIENT_EVIDENCE']);
export const SWING_STATES = Object.freeze(['UNKNOWN', 'WATCH', 'PENDING', 'BULLISH_SETUP', 'BEARISH_SETUP', 'NO_CLEAN_SETUP']);

const finite = (value) => typeof value === 'number' && Number.isFinite(value);
const positive = (value) => finite(value) && value > 0;

const canonicalRecord = (financials, field) => {
  const id = financials?.evidence?.fields?.[field];
  return id ? financials?.evidence?.byId?.[id] || null : null;
};

const annualRows = (financials, section, key) => (financials?.statementEvidence?.[section] || [])
  .filter((row) => String(row?.periodType || '').toUpperCase() === '12M' && finite(row?.[key]))
  .sort((a, b) => new Date(a.date) - new Date(b.date));

const strictlyDecreasing = (values) => values.length >= 3 && values.at(-3) > values.at(-2) && values.at(-2) > values.at(-1);
const strictlyIncreasing = (values) => values.length >= 3 && values.at(-3) < values.at(-2) && values.at(-2) < values.at(-1);
const nonDecreasing = (values) => values.length >= 3 && values.every((value, index) => index === 0 || value >= values[index - 1]);
const nonIncreasing = (values) => values.length >= 3 && values.every((value, index) => index === 0 || value <= values[index - 1]);

function mapFreshness(value) {
  const normalized = String(value || '').toUpperCase();
  if (normalized === 'FRESH') return 'FRESH';
  if (normalized === 'STALE') return 'STALE';
  if (normalized === 'EXPIRED') return 'EXPIRED';
  return 'UNKNOWN';
}

function horizonFreshness(analysis, horizon) {
  const key = String(horizon || '').toUpperCase() === 'LONG_TERM' ? 'longTerm' : String(horizon || '').toLowerCase().replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  const contract = analysis?.horizonFreshnessContract?.[key] || analysis?.horizonFreshnessContract?.[String(horizon || '').toUpperCase()];
  if (contract && typeof contract === 'object') return resolveHorizonFreshness(contract).state;
  const explicit = analysis?.horizonFreshness?.[horizon] ?? analysis?.horizonFreshness?.[key] ?? analysis?.[horizon]?.freshness;
  return mapFreshness(explicit);
}

function buildHorizonEvidenceStatus(available, required) {
  const missing = required.filter((field) => !available.includes(field));
  return {
    status: missing.length ? 'INSUFFICIENT_EVIDENCE' : 'VERIFIED',
    requiredDomains: required.length,
    availableDomains: required.length - missing.length,
    missingDomains: missing,
  };
}

function financialEvidence(analysis) {
  const financials = analysis?.fundamentals || {};
  const required = ['revenue', 'earnings', 'profitability', 'balanceSheetDebtEquity', 'cashFlow', 'valuation'];
  const refs = {};
  const records = ['revenue', 'netIncome', 'equity', 'totalDebt', 'operatingCashFlow', 'freeCashFlow']
    .map((field) => [field, canonicalRecord(financials, field)])
    .filter(([, record]) => record);
  for (const [field, record] of records) refs[field] = record.evidenceId;

  const revenue = canonicalRecord(financials, 'revenue');
  const earnings = canonicalRecord(financials, 'netIncome');
  const equity = canonicalRecord(financials, 'equity');
  const debt = canonicalRecord(financials, 'totalDebt');
  const ocf = canonicalRecord(financials, 'operatingCashFlow');
  const fcf = canonicalRecord(financials, 'freeCashFlow');
  const statementRecords = [revenue, earnings, equity, debt, ocf, fcf];
  const statementComplete = statementRecords.every((record) => record && finite(record.value) && record.status === 'PROVIDER_RETURNED');
  const compatible = statementComplete && statementRecords.slice(1).every((record) => areEvidenceCompatible(revenue, record));
  const valuationLineage = analysis?.valuation?.metricLineage || {};
  const valuationUsable = ['fairValue', 'currentPrice'].every((field) =>
    Array.isArray(valuationLineage[field]?.evidenceIds) && valuationLineage[field].evidenceIds.length > 0 &&
    ['TRACEABLE_INPUT_CHAIN', 'TRACEABLE', 'PROVIDER_REPORTED', 'PROVIDER_MARKET_OBSERVATION'].includes(valuationLineage[field]?.status)
  ) && finite(analysis?.valuation?.fairValue) && analysis.valuation.fairValue > 0 &&
    typeof analysis?.valuation?.verdict === 'string' && !/DATA INSUFFICIENT/i.test(analysis.valuation.verdict);

  const income = annualRows(financials, 'income', 'totalRevenue');
  const earningsRows = annualRows(financials, 'income', 'netIncomeFromContinuingAndDiscontinuedOperation').length
    ? annualRows(financials, 'income', 'netIncomeFromContinuingAndDiscontinuedOperation')
    : annualRows(financials, 'income', 'netIncome');
  const balance = financials?.statementEvidence?.balance || [];
  const balanceYears = balance.filter((row) => String(row?.periodType || '').toUpperCase() === '12M' && finite(row?.totalDebt) && finite(row?.stockholdersEquity ?? row?.commonStockEquity));
  const cash = financials?.statementEvidence?.cash || [];
  const cashYears = cash.filter((row) => String(row?.periodType || '').toUpperCase() === '12M' && finite(row?.operatingCashFlow ?? row?.cashFlowFromContinuingOperatingActivities) && finite(row?.freeCashFlow));
  const annualHistory = income.length >= 3 && earningsRows.length >= 3 && balanceYears.length >= 3 && cashYears.length >= 3;

  return {
    financials,
    refs,
    statementComplete,
    compatible,
    valuationUsable,
    annualHistory,
    rows: { revenue: income, earnings: earningsRows, balance: balanceYears, cash: cashYears },
    status: buildHorizonEvidenceStatus(
      [
        ...(statementComplete && compatible ? ['revenue', 'earnings', 'profitability', 'balanceSheetDebtEquity', 'cashFlow'] : []),
        ...(valuationUsable ? ['valuation'] : []),
      ],
      required,
    ),
  };
}

function domainDeterioration(evidence) {
  const revenue = evidence.rows.revenue.map((row) => row.totalRevenue);
  const earnings = evidence.rows.earnings.map((row) => row.netIncomeFromContinuingAndDiscontinuedOperation ?? row.netIncome);
  const balance = evidence.rows.balance;
  const cash = evidence.rows.cash;
  const equity = balance.map((row) => row.stockholdersEquity ?? row.commonStockEquity);
  const debt = balance.map((row) => row.totalDebt);
  const ocf = cash.map((row) => row.operatingCashFlow ?? row.cashFlowFromContinuingOperatingActivities);
  const fcf = cash.map((row) => row.freeCashFlow);
  const profitability = earnings.map((value, index) => {
    const eq = equity[index];
    return positive(eq) ? value / eq : null;
  });
  const validProfitability = profitability.every(finite) ? profitability : [];
  return {
    revenue: strictlyDecreasing(revenue),
    earnings: strictlyDecreasing(earnings),
    profitability: validProfitability.length >= 3 && strictlyDecreasing(validProfitability),
    balanceSheet: strictlyDecreasing(equity),
    debt: strictlyIncreasing(debt),
    operatingCashFlow: strictlyDecreasing(ocf),
    freeCashFlow: strictlyDecreasing(fcf),
  };
}

function domainPositive(evidence) {
  const revenue = evidence.rows.revenue.map((row) => row.totalRevenue);
  const earnings = evidence.rows.earnings.map((row) => row.netIncomeFromContinuingAndDiscontinuedOperation ?? row.netIncome);
  const balance = evidence.rows.balance;
  const cash = evidence.rows.cash;
  const equity = balance.map((row) => row.stockholdersEquity ?? row.commonStockEquity);
  const debt = balance.map((row) => row.totalDebt);
  const ocf = cash.map((row) => row.operatingCashFlow ?? row.cashFlowFromContinuingOperatingActivities);
  const fcf = cash.map((row) => row.freeCashFlow);
  const profitability = earnings.map((value, index) => positive(equity[index]) ? value / equity[index] : null);
  return {
    revenue: revenue.at(-1) > 0 && nonDecreasing(revenue),
    earnings: earnings.at(-1) > 0 && nonDecreasing(earnings),
    profitability: profitability.every(finite) && profitability.at(-1) > 0 && nonDecreasing(profitability),
    balanceSheet: equity.at(-1) > 0 && nonDecreasing(equity),
    debt: debt.at(-1) >= 0 && nonIncreasing(debt),
    operatingCashFlow: ocf.at(-1) > 0 && nonDecreasing(ocf),
    freeCashFlow: fcf.at(-1) > 0 && nonDecreasing(fcf),
  };
}

function valuationBlocks(valuation) {
  const verdict = String(valuation?.verdict || '').toUpperCase();
  return /EXPENSIVE|OVERVALUED|VERY EXPENSIVE/.test(verdict);
}

function materialAdverseBusinessRisk(analysis) {
  const risk = analysis?.longTermRisk;
  return risk?.verified === true && risk?.materialAdverseBusinessEvent === true;
}

function buildLongTermState(analysis) {
  const evidence = financialEvidence(analysis);
  const limitations = [];
  if (!evidence.statementComplete) limitations.push('One or more mandatory statement domains are unavailable or unverified.');
  if (!evidence.compatible && evidence.statementComplete) limitations.push('Mandatory statement evidence is incompatible.');
  if (!evidence.annualHistory) limitations.push('At least three verified annual observations are required across income, balance-sheet and cash-flow evidence.');
  if (!evidence.valuationUsable) limitations.push('Verified valuation evidence is unavailable or incomplete.');
  const freshness = horizonFreshness(analysis, 'LONG_TERM');
  if (freshness !== 'FRESH') limitations.push(`Long-Term freshness is ${freshness}; current classification requires FRESH evidence.`);

  if (evidence.status.status === 'INSUFFICIENT_EVIDENCE' || !evidence.annualHistory || freshness !== 'FRESH') {
    return {
      state: 'INSUFFICIENT_EVIDENCE',
      evidenceStatus: evidence.status,
      evidenceCompleteness: evidence.status,
      provenance: buildHorizonProvenance(analysis, 'LONG_TERM', evidence.refs),
      freshness,
      limitations,
      evidenceReferences: Object.values(evidence.refs),
      supportingEvidence: [],
      negativeEvidence: [],
    };
  }

  const positiveDomains = domainPositive(evidence);
  const deteriorating = domainDeterioration(evidence);
  const deteriorationDomains = Object.entries(deteriorating).filter(([, value]) => value).map(([name]) => name);
  const coreDeterioration = deteriorationDomains.some((name) => ['revenue', 'earnings', 'balanceSheet', 'debt', 'operatingCashFlow', 'freeCashFlow'].includes(name));
  const unattractive = deteriorationDomains.length >= 2 && coreDeterioration;
  const valuationBlocked = valuationBlocks(analysis.valuation);
  const attractive = Object.values(positiveDomains).every(Boolean) && !unattractive && !valuationBlocked && !materialAdverseBusinessRisk(analysis);

  const supportingEvidence = Object.entries(positiveDomains).filter(([, value]) => value).map(([domain]) => domain);
  const negativeEvidence = deteriorationDomains.slice();
  if (valuationBlocked) negativeEvidence.push('valuation');
  if (materialAdverseBusinessRisk(analysis)) negativeEvidence.push('verified material adverse business event');

  const state = unattractive ? 'UNATTRACTIVE' : attractive ? 'ATTRACTIVE' : 'NEUTRAL';
  return {
    state,
    evidenceStatus: evidence.status,
    evidenceCompleteness: evidence.status,
    provenance: buildHorizonProvenance(analysis, 'LONG_TERM', evidence.refs),
    freshness,
    limitations,
    evidenceReferences: Object.values(evidence.refs),
    supportingEvidence,
    negativeEvidence,
  };
}

function canonicalTechnical(analysis) {
  const technical = analysis?.technical;
  if (!technical || technical.status !== 'VERIFIED') return null;
  return technical;
}

function buildSwingState(analysis) {
  const technical = canonicalTechnical(analysis);
  const freshness = horizonFreshness(analysis, 'SWING');
  const lifecycle = technical?.breakoutLifecycle || null;
  const limitations = [];
  if (!technical) limitations.push('Canonical technical evidence is unavailable.');
  if (freshness !== 'FRESH') limitations.push(`Swing setup freshness is ${freshness}; current setup readiness requires FRESH evidence.`);
  const evidenceReferences = [];
  if (technical?.provenance) evidenceReferences.push('canonical-technical');
  if (lifecycle?.riskEvidence) evidenceReferences.push('canonical-risk-evidence');

  const base = {
    lifecycle,
    evidenceStatus: technical ? 'VERIFIED' : 'INSUFFICIENT_EVIDENCE',
    evidenceCompleteness: technical ? 'COMPLETE_CANONICAL_TECHNICAL' : 'UNAVAILABLE',
    provenance: buildHorizonProvenance(analysis, 'SWING', evidenceReferences),
    freshness,
    limitations,
    evidenceReferences,
    supportingEvidence: [],
    negativeEvidence: [],
  };
  if (!technical) return { state: 'UNKNOWN', ...base };
  if (freshness === 'STALE' || freshness === 'EXPIRED') return { state: 'NO_CLEAN_SETUP', ...base, negativeEvidence: ['stale current setup evidence'] };
  if (freshness === 'UNKNOWN') return { state: 'UNKNOWN', ...base };

  const status = lifecycle?.status;
  if (status === 'FAILED' || status === 'FAILED_RETEST') return { state: 'NO_CLEAN_SETUP', ...base, negativeEvidence: [status] };
  const bullishLifecycle = lifecycle?.direction === 'UP' && ['SUCCESSFUL_RETEST', 'CONTINUATION'].includes(status);
  const bearishLifecycle = lifecycle?.direction === 'DOWN' && ['SUCCESSFUL_RETEST', 'CONTINUATION'].includes(status);
  const risk = lifecycle?.riskEvidence;
  const riskReady = risk?.status === 'VERIFIED' && finite(risk?.riskReward) && risk.riskReward > 0 && Array.isArray(risk?.targetEvidence) && risk.targetEvidence.length > 0 && finite(risk?.invalidationLevel);
  if (bullishLifecycle && riskReady) return { state: 'BULLISH_SETUP', ...base, supportingEvidence: [status, 'riskEvidence', 'targetEvidence', 'riskReward'] };
  if (bearishLifecycle && riskReady) return { state: 'BEARISH_SETUP', ...base, supportingEvidence: [status, 'riskEvidence', 'targetEvidence', 'riskReward'] };
  if (['BREAKOUT_CONFIRMED', 'PENDING_RETEST', 'CONFIRMED'].includes(status)) return { state: 'PENDING', ...base, supportingEvidence: [status] };
  const setup = String(technical.setup || '').toUpperCase();
  if (['BULLISH', 'BEARISH', 'BREAKOUT', 'BREAKDOWN'].includes(setup)) return { state: 'WATCH', ...base, supportingEvidence: [setup] };
  return { state: 'NO_CLEAN_SETUP', ...base };
}

function buildHorizonProvenance(analysis, horizon, evidenceReferences = []) {
  const p = analysis?.provenance || {};
  const source = horizon === 'SWING' ? p?.technical?.source : p?.annualFundamentals?.source;
  const timeframe = horizon === 'SWING' ? p?.technical?.timeframe : p?.annualFundamentals?.period || 'annual / 12M';
  const observationTimestamp = horizon === 'SWING' ? p?.technical?.observationTimestamp : p?.annualFundamentals?.asOf;
  return {
    symbol: analysis?.stock?.yahooSymbol || analysis?.stock?.symbol || null,
    horizon,
    timeframe: timeframe || null,
    source: source || p?.source || null,
    observationTimestamp: observationTimestamp || null,
    retrievedAt: horizon === 'SWING' ? p?.technical?.retrievedAt || p?.marketData?.retrievedAt || null : analysis?.fundamentals?.statementEvidence?.fetchedAt || null,
    dataQuality: horizon === 'SWING' ? p?.technical?.dataQuality || null : p?.annualFundamentals?.validation || null,
    validationState: horizon === 'SWING' ? p?.technical?.validation || null : p?.annualFundamentals?.validation || null,
    evidenceReferences,
  };
}

export function buildMultiHorizonIntelligence(analysis) {
  if (!analysis || typeof analysis !== 'object') throw new Error('Verified analysis is required');
  const freshnessContracts = {
    longTerm: analysis?.horizonFreshnessContract?.longTerm || analysis?.horizonFreshnessContract?.LONG_TERM || resolveHorizonFreshness({
      horizon: 'LONG_TERM', domain: 'financial', ticker: analysis?.stock?.yahooSymbol || analysis?.stock?.symbol,
      source: analysis?.provenance?.annualFundamentals?.source || analysis?.provenance?.source,
      issuer: analysis?.stock?.name || null, asOf: analysis?.provenance?.annualFundamentals?.asOf,
      reportingDate: analysis?.provenance?.annualFundamentals?.asOf,
      reportingPeriod: analysis?.fundamentals?.statementEvidence?.period || null,
      periodType: 'ANNUAL', evidence: { status: 'VERIFIED' }, evidenceReferences: Object.values(analysis?.fundamentals?.evidence?.fields || {}),
    }),
    swing: analysis?.horizonFreshnessContract?.swing || analysis?.horizonFreshnessContract?.SWING || resolveHorizonFreshness({
      horizon: 'SWING', domain: 'technical', ticker: analysis?.stock?.yahooSymbol || analysis?.stock?.symbol,
      source: analysis?.provenance?.technical?.source, observationTimestamp: analysis?.provenance?.technical?.observationTimestamp,
      retrievedAt: analysis?.provenance?.technical?.retrievedAt, timeframe: analysis?.provenance?.technical?.timeframe,
      exchange: analysis?.stock?.exchange || analysis?.provenance?.marketData?.exchange,
      session: analysis?.provenance?.marketData?.session, calendarContext: analysis?.provenance?.marketData?.calendarContext,
      asOf: analysis?.provenance?.marketData?.asOf, evidence: analysis?.technical, evidenceReferences: ['canonical-technical'],
    }),
    shortTerm: analysis?.horizonFreshnessContract?.shortTerm || analysis?.horizonFreshnessContract?.SHORT_TERM || resolveHorizonFreshness({ horizon: 'SHORT_TERM', domain: 'technical', asOf: analysis?.provenance?.marketData?.asOf, evidence: analysis?.technical, evidenceReferences: ['canonical-technical'], observationTimestamp: analysis?.provenance?.technical?.observationTimestamp }),
    intraday: analysis?.horizonFreshnessContract?.intraday || analysis?.horizonFreshnessContract?.INTRADAY || resolveHorizonFreshness({ horizon: 'INTRADAY', domain: 'technical', asOf: analysis?.provenance?.marketData?.asOf, evidence: analysis?.technical, evidenceReferences: ['canonical-technical'], observationTimestamp: analysis?.provenance?.technical?.observationTimestamp, timeframe: analysis?.provenance?.technical?.timeframe }),
  };
  return {
    horizonFreshness: freshnessContracts,
    longTerm: buildLongTermState({ ...analysis, horizonFreshnessContract: freshnessContracts }),
    swing: buildSwingState({ ...analysis, horizonFreshnessContract: freshnessContracts }),
  };
}

export { buildLongTermState, buildSwingState, buildHorizonEvidenceStatus, buildHorizonProvenance };