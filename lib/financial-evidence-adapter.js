import { createFinancialEvidence, determinePitEligibility, PIT_STATES, VALIDATION_STATES } from './financial-evidence-contract.js';

const METRIC_MAP = Object.freeze({
  revenue: ['totalRevenue', 'revenue'],
  netIncome: ['netIncomeFromContinuingAndDiscontinuedOperation', 'netIncomeToCommon', 'netIncome'],
  eps: ['dilutedEPS', 'trailingEps', 'eps'],
  operatingCashFlow: ['operatingCashFlow', 'cashFlowFromContinuingOperatingActivities'],
  freeCashFlow: ['freeCashFlow'],
  capitalExpenditure: ['capitalExpenditure', 'capitalExpenditureReported'],
  debt: ['totalDebt'],
  cash: ['cashCashEquivalentsAndShortTermInvestments', 'cashAndCashEquivalents'],
  equity: ['stockholdersEquity', 'commonStockEquity'],
  roe: ['returnOnEquity'],
});
const DEFAULT_UNITS = Object.freeze({
  revenue: 'PROVIDER_NATIVE_MONETARY', netIncome: 'PROVIDER_NATIVE_MONETARY',
  eps: 'PROVIDER_NATIVE_PER_SHARE', operatingCashFlow: 'PROVIDER_NATIVE_MONETARY',
  freeCashFlow: 'PROVIDER_NATIVE_MONETARY', capitalExpenditure: 'PROVIDER_NATIVE_MONETARY',
  debt: 'PROVIDER_NATIVE_MONETARY', cash: 'PROVIDER_NATIVE_MONETARY',
  equity: 'PROVIDER_NATIVE_MONETARY', roe: 'PERCENT',
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
  const e = createFinancialEvidence({
    issuerIdentity: options.issuerIdentity || null,
    securityIdentity: options.securityIdentity || null,
    metric, value: match.value, unit: DEFAULT_UNITS[metric],
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
    retrievedAt: row?.retrievedAt || null,
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
