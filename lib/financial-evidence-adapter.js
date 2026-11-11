import { createFinancialEvidence, determinePitEligibility, ACCESS_STATES, PIT_STATES, VALIDATION_STATES } from './financial-evidence-contract.js';
import { timestampMs } from './strict-timestamp.js';

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
const AUTHORITATIVE_SOURCE_TYPES = new Set(['FILING']);
const AUTHORITATIVE_SOURCE_AUTHORITIES = new Set([
  'NSE_EXCHANGE', 'BSE_EXCHANGE', 'COMPANY_FILING', 'ISSUER_OFFICIAL_SITE', 'SEBI_FILING',
]);

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
    accountingBasis: null,
    reportingPeriodStart: row?.reportingPeriodStart || null,
    reportingPeriodEnd: row?.date || null,
    periodType: periodType(row, row?.requestedPeriod),
    statementScope: null,
    metricScope: null,
    publicationTimestamp: null,
    availabilityTimestamp: null,
    effectiveTimestamp: null,
    sourceType: 'provider',
    sourceAuthority: 'SECONDARY_PROVIDER',
    sourceDocumentId: null,
    sourceDocumentVersion: null,
    provider: options.provider,
    providerRecordId: row?.providerRecordId || null,
    retrievedAt: options.retrievedAt || null,
    revisionStatus: 'UNKNOWN',
    supersedes: null,
    lineage: null,
    validationState: VALIDATION_STATES.UNKNOWN,
    pitEligibility: PIT_STATES.PIT_UNKNOWN,
    entitlementStatus: 'UNKNOWN',
    fixtureStatus: options.fixtureStatus || null,
  });
  const pitEligibility = options.evaluationTimestamp
    ? determinePitEligibility(e, options.evaluationTimestamp)
    : PIT_STATES.PIT_UNKNOWN;
  return Object.freeze({
    ...e,
    evidence: Object.freeze({ ...e.evidence, pitEligibility }),
    providerField: match.providerField,
    pitEligibility,
  });
}
export function adaptStatementEvidenceToCanonical(statementEvidence, {
  issuerIdentity = null, securityIdentity = null, evaluationTimestamp = null, fixtureStatus = null,
} = {}) {
  if (!statementEvidence || typeof statementEvidence !== 'object') return {
    contract: 'STOCKSAMJHO_STATEMENT_EVIDENCE_ADAPTER_V1', status: 'UNAVAILABLE', provider: null, records: [],
  };
  const provider = text(statementEvidence.provider) || 'UNKNOWN_PROVIDER';
  // This generic adapter is provider-only. An independently validated filing adapter must
  // construct canonical filing evidence separately; provider rows can never receive trust context here.
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
    status: 'MAPPED', provider,
    sourceType: 'provider',
    sourceAuthority: 'SECONDARY_PROVIDER',
    currencyStatus: statementEvidence.currency?.status || 'UNKNOWN',
    records: Object.freeze(records),
  });
}

const CANONICAL_STRENGTH_MONETARY = new Set([
  'debt', 'equity', 'cash', 'ebitda', 'currentAssets', 'currentLiabilities',
]);
const CANONICAL_PERIOD_TYPES = new Set(['ANNUAL', 'QUARTERLY', 'YTD', 'TTM', 'CURRENT_SNAPSHOT']);
const STRENGTH_REQUIRED = Object.freeze({
  BANKING: ['roe', 'roa'],
  DEFAULT: ['debt', 'equity', 'cash', 'ebitda', 'currentAssets', 'currentLiabilities'],
});

const unwrapCanonical = (record) => record?.evidence || record || null;
const finiteCanonical = (value) => typeof value === 'number' && Number.isFinite(value);
const canonicalText = (value) => typeof value === 'string' && value.trim().length > 0 && value === value.trim();

function canonicalStrengthRecordIsUsable(record, evaluationTimestamp) {
  if (!record || typeof record !== 'object') return false;
  const e = record.evidence;
  if (!e || typeof e !== 'object' || e.contract !== 'STOCKSAMJHO_FINANCIAL_EVIDENCE_V1') return false;
  if (record.validationState !== VALIDATION_STATES.VALID || e.validationState !== VALIDATION_STATES.VALID) return false;
  if (!Array.isArray(record.errors) || record.errors.length !== 0) return false;
  if (e.fixtureStatus) return false;
  if (record.pitEligibility !== PIT_STATES.PIT_VERIFIED || e.pitEligibility !== PIT_STATES.PIT_VERIFIED) return false;
  if (typeof evaluationTimestamp !== 'string' || !evaluationTimestamp.trim()
    || !Number.isFinite(Date.parse(evaluationTimestamp))
    || determinePitEligibility(record, evaluationTimestamp) !== PIT_STATES.PIT_VERIFIED) return false;
  if (!canonicalText(e.sourceType) || !AUTHORITATIVE_SOURCE_TYPES.has(e.sourceType)) return false;
  if (!canonicalText(e.sourceAuthority) || !AUTHORITATIVE_SOURCE_AUTHORITIES.has(e.sourceAuthority)) return false;
  if (!canonicalText(e.sourceDocumentId) || !canonicalText(e.sourceDocumentVersion)
    || !e.publicationTimestamp || !e.availabilityTimestamp) return false;
  const periodStartMs = typeof e.reportingPeriodStart === 'string' ? timestampMs(e.reportingPeriodStart) : null;
  const periodEndMs = typeof e.reportingPeriodEnd === 'string' ? timestampMs(e.reportingPeriodEnd) : null;
  if (periodStartMs == null || periodEndMs == null || periodStartMs > periodEndMs) return false;
  if (!canonicalText(e.metric) || !finiteCanonical(e.value) || !canonicalText(e.unit)
    || !canonicalText(e.periodType) || !CANONICAL_PERIOD_TYPES.has(e.periodType)) return false;
  if (![e.accountingBasis, e.statementScope, e.metricScope].every(canonicalText)) return false;
  if (!canonicalText(e.currency) || e.currency !== e.currency.toUpperCase() || !/^[A-Z]{3}$/.test(e.currency)) return false;
  if (!canonicalText(e.issuerIdentity) || !canonicalText(e.securityIdentity)
    || !canonicalText(e.retrievedAt) || timestampMs(e.retrievedAt) == null) return false;
  if (e.entitlementStatus !== ACCESS_STATES.ALLOWED) return false;
  if (![e.accessMode, e.storagePolicy, e.displayPolicy, e.redistributionPolicy].every(canonicalText)) return false;
  if (CANONICAL_STRENGTH_MONETARY.has(e.metric) && !e.currency) return false;
  return true;
}

function canonicalStrengthPeriodCompatible(left, right) {
  const a = unwrapCanonical(left), b = unwrapCanonical(right);
  return Boolean(a && b
    && a.issuerIdentity && b.issuerIdentity && a.issuerIdentity === b.issuerIdentity
    && a.securityIdentity && b.securityIdentity && a.securityIdentity === b.securityIdentity
    && a.periodType && b.periodType && a.periodType === b.periodType
    && a.reportingPeriodStart && b.reportingPeriodStart && a.reportingPeriodStart === b.reportingPeriodStart
    && a.reportingPeriodEnd && b.reportingPeriodEnd && a.reportingPeriodEnd === b.reportingPeriodEnd
    && a.accountingBasis && b.accountingBasis && a.accountingBasis === b.accountingBasis
    && a.statementScope && b.statementScope && a.statementScope === b.statementScope
    && a.metricScope && b.metricScope && a.metricScope === b.metricScope
    && a.unit && b.unit && a.unit === b.unit
    && a.currency && b.currency && a.currency === b.currency);
}

function pickCanonicalStrengthRecord(records, metric, evaluationTimestamp) {
  return records
    .filter((record) => unwrapCanonical(record)?.metric === metric && canonicalStrengthRecordIsUsable(record, evaluationTimestamp))
    .sort((a, b) => new Date(unwrapCanonical(b).reportingPeriodEnd) - new Date(unwrapCanonical(a).reportingPeriodEnd))[0] || null;
}

export function buildFinancialStrengthInputFromCanonical(canonicalFinancialEvidence, {
  sectorKey = null,
  baseFinancials = {},
  evaluationTimestamp = null,
} = {}) {
  const envelopeValid = canonicalFinancialEvidence?.contract === 'STOCKSAMJHO_STATEMENT_EVIDENCE_ADAPTER_V1'
    && canonicalFinancialEvidence?.status === 'MAPPED'
    && Array.isArray(canonicalFinancialEvidence?.records);
  const records = envelopeValid ? canonicalFinancialEvidence.records : [];
  const identityResolution = canonicalFinancialEvidence?.identityResolution || null;
  const resolvedIssuerIdentity = text(identityResolution?.issuerIdentity);
  const resolvedSecurityIdentity = text(identityResolution?.securityIdentity);
  const identityResolved = identityResolution?.status === 'RESOLVED'
    && resolvedIssuerIdentity != null
    && resolvedSecurityIdentity != null;
  const required = String(sectorKey || '').toUpperCase() === 'BANKING'
    ? STRENGTH_REQUIRED.BANKING
    : STRENGTH_REQUIRED.DEFAULT;
  const banking = String(sectorKey || '').toUpperCase() === 'BANKING';
  const monetaryCurrencySafe = banking
    ? true
    : canonicalFinancialEvidence?.currencyStatus === 'MATCH';
  const evaluationTimestampValid = typeof evaluationTimestamp === 'string'
    && evaluationTimestamp.trim().length > 0
    && Number.isFinite(Date.parse(evaluationTimestamp));
  const selected = required.map((metric) => pickCanonicalStrengthRecord(records, metric, evaluationTimestamp));
  const selectedIdentityCompatible = identityResolved && selected.every((record) => {
    const evidence = unwrapCanonical(record);
    return evidence?.issuerIdentity === resolvedIssuerIdentity
      && evidence?.securityIdentity === resolvedSecurityIdentity;
  });
  const selectedUnitsCompatible = selected.every((record) => {
    const unit = unwrapCanonical(record)?.unit;
    return banking ? unit === 'PERCENT' : Boolean(text(unit)) && unit !== 'PERCENT';
  });
  const complete = envelopeValid
    && selectedIdentityCompatible
    && selectedUnitsCompatible
    && evaluationTimestampValid
    && monetaryCurrencySafe
    && selected.every(Boolean)
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
      reason: !monetaryCurrencySafe
        ? 'CANONICAL_FINANCIAL_STRENGTH_CURRENCY_UNSAFE'
        : !evaluationTimestampValid
          ? 'CANONICAL_FINANCIAL_STRENGTH_EVALUATION_TIMESTAMP_REQUIRED'
          : 'CANONICAL_FINANCIAL_STRENGTH_EVIDENCE_INSUFFICIENT',
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

  const selectedEvidence = selected.map((record) => {
    const e = unwrapCanonical(record);
    return Object.freeze({
      ...e,
      pitEligibility: PIT_STATES.PIT_VERIFIED,
    });
  });
  const byMetric = Object.fromEntries(selectedEvidence.map((e) => [e.metric, e]));
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
      selected: selectedEvidence,
      pitStates: [...new Set(selectedEvidence.map((record) => record.pitEligibility))],
      source: 'canonicalFinancialEvidence',
    },
  };
}
