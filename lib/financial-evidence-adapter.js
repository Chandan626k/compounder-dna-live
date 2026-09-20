import { createFinancialEvidence, determinePitEligibility, PIT_STATES, VALIDATION_STATES } from './financial-evidence-contract.js';

const METRIC_MAP = Object.freeze({
  revenue: ['totalRevenue', 'revenue'],
  ebitda: ['EBITDA', 'ebitda'],
  netIncome: ['netIncomeFromContinuingAndDiscontinuedOperation', 'netIncomeToCommon', 'netIncome'],
  eps: ['dilutedEPS', 'trailingEps', 'eps'],
  operatingCashFlow: ['operatingCashFlow', 'cashFlowFromContinuingOperatingActivities'],
  freeCashFlow: ['freeCashFlow'],
  capitalExpenditure: ['capitalExpenditure', 'capitalExpenditureReported'],
  debt: ['totalDebt'],
  cash: ['cashCashEquivalentsAndShortTermInvestments', 'cashAndCashEquivalents'],
  equity: ['stockholdersEquity', 'commonStockEquity'],
  currentAssets: ['currentAssets'],
  currentLiabilities: ['currentLiabilities'],
  roe: ['returnOnEquity'],
  roa: ['returnOnAssets'],
});
const DEFAULT_UNITS = Object.freeze({
  revenue: 'PROVIDER_NATIVE_MONETARY', ebitda: 'PROVIDER_NATIVE_MONETARY', netIncome: 'PROVIDER_NATIVE_MONETARY',
  eps: 'PROVIDER_NATIVE_PER_SHARE', operatingCashFlow: 'PROVIDER_NATIVE_MONETARY',
  freeCashFlow: 'PROVIDER_NATIVE_MONETARY', capitalExpenditure: 'PROVIDER_NATIVE_MONETARY',
  debt: 'PROVIDER_NATIVE_MONETARY', cash: 'PROVIDER_NATIVE_MONETARY',
  equity: 'PROVIDER_NATIVE_MONETARY', currentAssets: 'PROVIDER_NATIVE_MONETARY',
  currentLiabilities: 'PROVIDER_NATIVE_MONETARY', roe: 'PERCENT', roa: 'PERCENT',
});
const numeric = (v) => typeof v === 'number' && Number.isFinite(v) ? v : (v && Number.isFinite(v.raw) ? v.raw : null);
const text = (v) => typeof v === 'string' && v.trim() ? v.trim() : null;
function periodType(row, requestedPeriod = null) {
  const raw = text(row?.periodType || requestedPeriod)?.toUpperCase();
  if (!raw) return null;
  if (raw === '12M' || raw === 'ANNUAL') return 'ANNUAL';
  if (raw === '3M' || raw === 'QUARTERLY') return 'QUARTERLY';
  if (raw === 'YTD') return 'YTD';
  if (raw === 'TTM') return 'TTM';
  if (raw === 'CURRENT' || raw === 'CURRENT_SNAPSHOT') return 'CURRENT_SNAPSHOT';
  return null;
}
function findValue(row, keys) {
  for (const key of keys) { const value = numeric(row?.[key]); if (value != null) return { value, providerField: key }; }
  return null;
}
function rowCurrency(row, fallback = null) {
  return text(row?.currencyCode || row?.currency || row?.financialCurrency || fallback)?.toUpperCase() || null;
}
function mapRow(row, metric, options) {
  const match = findValue(row, METRIC_MAP[metric] || []);
  if (!match) return null;
  const canonicalValue = (metric === 'roe' || metric === 'roa') ? match.value * 100 : match.value;
  const e = createFinancialEvidence({
    issuerIdentity: options.issuerIdentity || null,
    securityIdentity: options.securityIdentity || null,
    metric, value: canonicalValue, unit: DEFAULT_UNITS[metric],
    currency: rowCurrency(row, options.financialCurrency),
    accountingBasis: row?.accountingBasis || null,
    reportingPeriodStart: row?.reportingPeriodStart || null,
    reportingPeriodEnd: row?.date || null,
    periodType: periodType(row, row?.requestedPeriod),
    statementScope: row?.statementScope || null,
    metricScope: row?.metricScope || null,
    publicationTimestamp: row?.publicationTimestamp || null,
    availabilityTimestamp: row?.availabilityTimestamp || null,
    effectiveTimestamp: row?.effectiveTimestamp || null,
    sourceType: 'provider',
    sourceAuthority: row?.sourceAuthority || 'SECONDARY_PROVIDER',
    sourceDocumentId: row?.sourceDocumentId || null,
    sourceDocumentVersion: row?.sourceDocumentVersion || null,
    provider: options.provider,
    providerRecordId: row?.providerRecordId || null,
    retrievedAt: row?.retrievedAt || options.retrievedAt || null,
    revisionStatus: row?.revisionStatus || 'UNKNOWN',
    supersedes: row?.supersedes || null,
    lineage: row?.lineage || null,
    validationState: row?.validationState || VALIDATION_STATES.UNKNOWN,
    pitEligibility: row?.pitEligibility || PIT_STATES.PIT_UNKNOWN,
    entitlementStatus: row?.entitlementStatus || 'UNKNOWN',
    fixtureStatus: options.fixtureStatus || null,
  });
  return Object.freeze({ ...e, providerField: match.providerField, pitEligibility: options.evaluationTimestamp
    ? determinePitEligibility(e.evidence, options.evaluationTimestamp)
    : PIT_STATES.PIT_UNKNOWN });
}
export function adaptStatementEvidenceToCanonical(statementEvidence, {
  issuerIdentity = null, securityIdentity = null, evaluationTimestamp = null, fixtureStatus = null,
} = {}) {
  if (!statementEvidence || typeof statementEvidence !== 'object') return {
    contract: 'STOCKSAMJHO_STATEMENT_EVIDENCE_ADAPTER_V1', status: 'UNAVAILABLE', provider: null, records: [],
  };
  const provider = text(statementEvidence.provider) || 'UNKNOWN_PROVIDER';
  const financialCurrency = text(statementEvidence.currency?.financialCurrency)?.toUpperCase() || null;
  const rows = [
    ...(Array.isArray(statementEvidence.income) ? statementEvidence.income : []),
    ...(Array.isArray(statementEvidence.balance) ? statementEvidence.balance : []),
    ...(Array.isArray(statementEvidence.cash) ? statementEvidence.cash : []),
  ];
  const records = [];
  for (const metric of Object.keys(METRIC_MAP)) for (const row of rows) {
    const mapped = mapRow(row, metric, { provider, financialCurrency, issuerIdentity, securityIdentity, evaluationTimestamp,
      retrievedAt: statementEvidence.fetchedAt || null,
      fixtureStatus: fixtureStatus || statementEvidence.fixtureStatus || null });
    if (mapped) records.push(mapped);
  }
  return Object.freeze({
    contract: 'STOCKSAMJHO_STATEMENT_EVIDENCE_ADAPTER_V1',
    status: 'MAPPED', provider, sourceAuthority: 'SECONDARY_PROVIDER',
    currencyStatus: statementEvidence.currency?.status || 'UNKNOWN',
    records: Object.freeze(records),
  });
}


const CANONICAL_STRENGTH_MONETARY = new Set([
  'debt', 'equity', 'cash', 'ebitda', 'currentAssets', 'currentLiabilities',
]);

const STRENGTH_REQUIRED = Object.freeze({
  BANKING: ['roe', 'roa'],
  DEFAULT: ['debt', 'equity', 'cash', 'ebitda', 'currentAssets', 'currentLiabilities'],
});

const unwrapCanonical = (record) => record?.evidence || record || null;
const finiteCanonical = (value) => typeof value === 'number' && Number.isFinite(value);

function canonicalStrengthRecordIsUsable(record) {
  const e = unwrapCanonical(record);
  if (!e || e.validationState !== VALIDATION_STATES.VALID) return false;
  if (!e.metric || !finiteCanonical(e.value) || !e.periodType || !e.reportingPeriodEnd) return false;
  if (!e.issuerIdentity || !e.securityIdentity || !e.retrievedAt) return false;
  if (e.pitEligibility === PIT_STATES.INVALID || e.pitEligibility === PIT_STATES.PIT_INELIGIBLE || e.pitEligibility === PIT_STATES.SUPERSEDED) return false;
  if (CANONICAL_STRENGTH_MONETARY.has(e.metric) && !e.currency) return false;
  return true;
}

function canonicalStrengthPeriodCompatible(left, right) {
  const a = unwrapCanonical(left), b = unwrapCanonical(right);
  return Boolean(a && b
    && a.issuerIdentity === b.issuerIdentity
    && a.securityIdentity === b.securityIdentity
    && a.periodType === b.periodType
    && a.reportingPeriodStart === b.reportingPeriodStart
    && a.reportingPeriodEnd === b.reportingPeriodEnd
    && (!CANONICAL_STRENGTH_MONETARY.has(a.metric)
      || !CANONICAL_STRENGTH_MONETARY.has(b.metric)
      || a.currency === b.currency));
}

function pickCanonicalStrengthRecord(records, metric) {
  return records
    .filter((record) => unwrapCanonical(record)?.metric === metric && canonicalStrengthRecordIsUsable(record))
    .sort((a, b) => new Date(unwrapCanonical(b).reportingPeriodEnd) - new Date(unwrapCanonical(a).reportingPeriodEnd))[0] || null;
}

export function buildFinancialStrengthInputFromCanonical(canonicalFinancialEvidence, {
  sectorKey = null,
  baseFinancials = {},
} = {}) {
  const records = Array.isArray(canonicalFinancialEvidence?.records) ? canonicalFinancialEvidence.records : [];
  const required = String(sectorKey || '').toUpperCase() === 'BANKING'
    ? STRENGTH_REQUIRED.BANKING
    : STRENGTH_REQUIRED.DEFAULT;
  const selected = required.map((metric) => pickCanonicalStrengthRecord(records, metric));
  const complete = selected.every(Boolean)
    && selected.every((record) => canonicalStrengthPeriodCompatible(selected[0], record));

  const current = { ...(baseFinancials.current || {}) };
  const ratios = { ...(baseFinancials.ratios || {}) };
  const derived = { ...(baseFinancials.derived || {}) };

  if (!complete) {
    for (const key of ['debtToEquity', 'currentRatio', 'roe', 'roa']) ratios[key] = null;
    derived.netDebtToEbitda = null;
    for (const key of ['totalDebt', 'cash', 'netDebt', 'equity', 'currentAssets', 'currentLiabilities', 'ebitda']) current[key] = null;
    return {
      status: 'UNAVAILABLE',
      reason: 'CANONICAL_FINANCIAL_STRENGTH_EVIDENCE_INSUFFICIENT',
      financials: {
        ...baseFinancials,
        current,
        ratios,
        derived,
        rawAvailability: {
          ...(baseFinancials.rawAvailability || {}),
          annualBalanceSheet: false,
          annualCashFlow: false,
          annualStatements: false,
        },
      },
      evidence: { required, selected: [], pitStates: [] },
    };
  }

  const byMetric = Object.fromEntries(selected.map((record) => {
    const e = unwrapCanonical(record);
    return [e.metric, e];
  }));
  const debt = byMetric.debt?.value ?? null;
  const equity = byMetric.equity?.value ?? null;
  const cash = byMetric.cash?.value ?? null;
  const ebitda = byMetric.ebitda?.value ?? null;
  const currentAssets = byMetric.currentAssets?.value ?? null;
  const currentLiabilities = byMetric.currentLiabilities?.value ?? null;

  ratios.debtToEquity = debt != null && equity != null && equity > 0 ? debt / equity : null;
  ratios.currentRatio = currentAssets != null && currentLiabilities != null && currentLiabilities > 0
    ? currentAssets / currentLiabilities
    : null;
  ratios.roe = byMetric.roe?.value ?? null;
  ratios.roa = byMetric.roa?.value ?? null;

  const netDebt = debt != null && cash != null ? debt - cash : null;
  derived.netDebtToEbitda = netDebt != null && ebitda != null && ebitda > 0 ? netDebt / ebitda : null;

  return {
    status: 'READY',
    reason: null,
    financials: {
      ...baseFinancials,
      current: { ...current, totalDebt: debt, cash, netDebt, equity, currentAssets, currentLiabilities, ebitda },
      ratios,
      derived,
      rawAvailability: {
        ...(baseFinancials.rawAvailability || {}),
        annualBalanceSheet: true,
        annualCashFlow: true,
        annualStatements: true,
      },
    },
    evidence: {
      required,
      selected: selected.map(unwrapCanonical),
      pitStates: [...new Set(selected.map((record) => unwrapCanonical(record).pitEligibility))],
      source: 'canonicalFinancialEvidence',
    },
  };
}
