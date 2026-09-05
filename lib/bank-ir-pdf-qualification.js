import { BANK_KPI_FIELDS, emptyField } from './bank-ir-evidence.js';

const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();
const has = (text, patterns) => patterns.some((pattern) => pattern.test(text));
const PERCENT_FIELDS = new Set(['nim', 'roa', 'roe', 'gnpa', 'nnpa', 'provisionCoverage', 'casaRatio', 'creditGrowth', 'depositGrowth', 'creditCost', 'capitalAdequacy', 'cet1', 'tier1']);
const AMOUNT_FIELDS = new Set(['nii', 'pat', 'deposits', 'advances', 'casa', 'slippages', 'restructuredAssets']);
const validUnit = (field, unit) => {
  if (PERCENT_FIELDS.has(field)) return unit === '%';
  if (AMOUNT_FIELDS.has(field)) return /^(crore|million|billion) INR$/i.test(unit);
  return Boolean(unit);
};
const validPercent = (field, value) => !PERCENT_FIELDS.has(field) || (value >= -100 && value <= 100);

/**
 * Qualification boundary for official-bank PDF extraction.
 * It intentionally does NOT parse PDF bytes and does NOT OCR. It accepts text
 * only after an external extraction step and requires explicit document identity,
 * period, scope, unit and field-label evidence before any value becomes VERIFIED.
 */
export function qualifyBankPdfText({ issuer, ticker, documentType, documentTitle, documentDate, reportingPeriod, periodType, statementScope, currency = 'INR', sourceUrl, retrievedAt = new Date().toISOString(), page = null, table = null, documentVersion = null, extractedText, fields = {} }) {
  const text = normalize(extractedText);
  const errors = [];
  if (!text) errors.push('EMPTY_EXTRACTION');
  if (!issuer || !ticker || !documentTitle || !documentType || !documentDate || !reportingPeriod || !periodType || !statementScope || !sourceUrl) errors.push('INCOMPLETE_DOCUMENT_IDENTITY');
  if (!/^pdf$/i.test(String(documentType).replace(/^official-/, '').split('-').at(-1) || '')) errors.push('DOCUMENT_TYPE_NOT_QUALIFIED_AS_PDF');
  if (!/^https:\/\/(www\.)?(hdfc\.bank\.in|icici\.bank\.in)(\/|$)/i.test(String(sourceUrl || ''))) errors.push('SOURCE_URL_NOT_OFFICIAL_BANK_DOMAIN');

  if (!has(text, [/quarter ended june 30,? 2026/i, /q1\s*fy\s*27/i, /q1[- ]2027/i])) errors.push('REPORTING_PERIOD_NOT_CONFIRMED_IN_EXTRACTED_TEXT');
  const scopeOk = statementScope === 'standalone'
    ? has(text, [/standalone financial results/i, /standalone results/i, /standalone/i])
    : statementScope === 'consolidated'
      ? has(text, [/consolidated financial results/i, /consolidated results/i, /consolidated/i])
      : false;
  if (!scopeOk) errors.push('STATEMENT_SCOPE_NOT_CONFIRMED_IN_EXTRACTED_TEXT');

  const qualifiedFields = Object.fromEntries(BANK_KPI_FIELDS.map((field) => [field, emptyField('UNVERIFIED')]));
  const supplied = fields && typeof fields === 'object' ? fields : {};
  for (const field of BANK_KPI_FIELDS) {
    const candidate = supplied[field];
    if (!candidate || candidate.value == null) continue;
    const value = Number(candidate.value);
    const unit = candidate.unit == null ? null : String(candidate.unit).trim();
    const fieldText = normalize(candidate.context || '');
    if (!Number.isFinite(value) || !unit || !fieldText) continue;
    if (!validUnit(field, unit) || !validPercent(field, value)) continue;
    if (!text.includes(fieldText)) continue;
    if (candidate.reportedOrDerived !== 'reported') continue;
    qualifiedFields[field] = {
      value: errors.length ? null : value,
      unit: errors.length ? null : unit,
      currency: errors.length ? null : (candidate.currency ?? currency),
      reportedOrDerived: errors.length ? null : 'reported',
      status: errors.length ? 'UNVERIFIED' : 'VERIFIED',
      provenance: errors.length ? null : {
        source: 'Official bank investor-relations PDF', issuer, ticker, documentType, documentTitle, documentDate, reportingPeriod, periodType, statementScope,
        metric: field, value, unit, currency: candidate.currency ?? currency, reportedOrDerived: 'reported', sourceUrl, retrievedAt, page, table, documentVersion,
      },
    };
  }

  return {
    provider: 'Official bank investor-relations PDF', issuer, ticker, sourceUrl, documentType, documentTitle, documentDate, reportingPeriod, periodType, statementScope, retrievedAt, fields: qualifiedFields,
    qualification: { status: errors.length ? 'UNVERIFIED' : 'QUALIFIED', extractionMethod: 'pre-extracted PDF text; no OCR performed by this qualifier', errors, page, table, documentVersion, noPeriodInference: true, noScopeInference: true, noUnitInference: true, noSyntheticValues: true },
  };
}
