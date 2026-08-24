const BANK_KPI_FIELDS = Object.freeze([
  'nii', 'nim', 'pat', 'roa', 'roe',
  'gnpa', 'nnpa', 'provisionCoverage', 'slippages', 'creditCost', 'restructuredAssets',
  'deposits', 'advances', 'casa', 'casaRatio', 'creditGrowth', 'depositGrowth',
  'capitalAdequacy', 'cet1', 'tier1',
]);

const ALLOWED_STATUS = new Set(['VERIFIED', 'UNVERIFIED', 'NOT_DISCLOSED', 'SOURCE_UNAVAILABLE']);

const emptyField = (status = 'NOT_DISCLOSED') => ({ value: null, unit: null, currency: null, reportedOrDerived: null, status: ALLOWED_STATUS.has(status) ? status : 'UNVERIFIED', provenance: null });
const emptyEvidence = (source) => Object.fromEntries(BANK_KPI_FIELDS.map((field) => [field, emptyField(source ? 'UNVERIFIED' : 'SOURCE_UNAVAILABLE')]));

function provenance({ source, issuer, ticker, documentType, documentTitle, documentDate, reportingPeriod, periodType, statementScope, metric, value, unit, currency, reportedOrDerived = 'reported', sourceUrl, retrievedAt, page = null, table = null, documentVersion = null }) {
  return { source, issuer, ticker, documentType, documentTitle, documentDate, reportingPeriod, periodType, statementScope, metric, value, unit, currency, reportedOrDerived, sourceUrl, retrievedAt, page, table, documentVersion };
}

function setReported(fields, field, value, meta) {
  if (value == null || !Number.isFinite(value)) return;
  fields[field] = { value, unit: meta.unit ?? null, currency: meta.currency ?? null, reportedOrDerived: 'reported', status: 'VERIFIED', provenance: provenance({ ...meta, metric: field, value, reportedOrDerived: 'reported' }) };
}

function parseNumber(text) {
  const normalized = String(text).replace(/,/g, '').replace(/₹/g, '').trim();
  const match = normalized.match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function matchFirst(text, regexes) {
  for (const re of regexes) { const m = text.match(re); if (m) return m[1]; }
  return null;
}

export function parseIciciOfficialHtml(html, retrievedAt = new Date().toISOString()) {
  const text = String(html || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  const sourceUrl = 'https://www.icici.bank.in/about-us/news-room/2026/performance-review-quarter-ended-june-30-2026';
  const fields = emptyEvidence(sourceUrl);
  const base = { source: 'ICICI Bank Investor Relations', issuer: 'ICICI Bank Limited', ticker: 'ICICIBANK.NS', documentType: 'official-performance-review-html', documentTitle: 'Performance Review: Quarter ended June 30, 2026', documentDate: '2026-07-18', reportingPeriod: 'Q1 FY2027', periodType: 'Q1', statementScope: 'standalone', sourceUrl, retrievedAt, currency: 'INR' };
  const capture = (regexes) => parseNumber(matchFirst(text, regexes));
  setReported(fields, 'nii', capture([/net interest income \(NII\) increased[^₹]*₹\s*([\d,]+) crore in Q1-2027/i]), { ...base, unit: 'crore INR' });
  setReported(fields, 'nim', capture([/net interest margin was\s*([\d.]+)% in Q1-2027/i]), { ...base, unit: '%' });
  setReported(fields, 'pat', capture([/profit after tax increased by 15\.9%[^₹]*₹\s*([\d,]+) crore/i]), { ...base, unit: 'crore INR' });
  setReported(fields, 'gnpa', capture([/gross NPA ratio was\s*([\d.]+)% at June 30, 2026/i]), { ...base, unit: '%' });
  setReported(fields, 'nnpa', capture([/net NPA ratio was\s*([\d.]+)% at June 30, 2026/i]), { ...base, unit: '%' });
  setReported(fields, 'provisionCoverage', capture([/provisioning coverage ratio on non-performing loans was\s*([\d.]+)% at June 30, 2026/i]), { ...base, unit: '%' });
  setReported(fields, 'deposits', capture([/total period-end deposits increased by 14\.0%[^₹]*₹\s*([\d,]+) crore at June 30, 2026/i]), { ...base, unit: 'crore INR' });
  setReported(fields, 'advances', capture([/total advances increased by 19\.6%[^₹]*₹\s*([\d,]+) crore at June 30, 2026/i]), { ...base, unit: 'crore INR' });
  setReported(fields, 'casaRatio', capture([/average current account and savings account \(CASA\) ratio was\s*([\d.]+)% in Q1-2027/i]), { ...base, unit: '%' });
  setReported(fields, 'creditGrowth', capture([/total advances increased by\s*([\d.]+)% year-on-year/i]), { ...base, unit: '%' });
  setReported(fields, 'depositGrowth', capture([/total period-end deposits increased by\s*([\d.]+)% year-on-year/i]), { ...base, unit: '%' });
  setReported(fields, 'capitalAdequacy', capture([/total capital adequacy ratio at June 30, 2026 was\s*([\d.]+)%/i]), { ...base, unit: '%' });
  setReported(fields, 'cet1', capture([/CET-1 ratio was\s*([\d.]+)% compared to/i]), { ...base, unit: '%' });
  return { provider: 'Official bank investor-relations evidence', issuer: base.issuer, ticker: base.ticker, sourceUrl, documentType: base.documentType, documentTitle: base.documentTitle, documentDate: base.documentDate, reportingPeriod: base.reportingPeriod, periodType: base.periodType, statementScope: base.statementScope, retrievedAt, fields, qualification: { status: 'QUALIFIED', method: 'official HTML performance review with explicit period/scope labels', noPeriodInference: true, noScopeInference: true, noSyntheticValues: true } };
}

function hdfcEvidence(retrievedAt) {
  const sourceUrl = 'https://www.hdfc.bank.in/about-us/investor-relations/financial-results';
  return { provider: 'Official bank investor-relations evidence', issuer: 'HDFC Bank Limited', ticker: 'HDFCBANK.NS', sourceUrl, documentType: 'official-financial-results-index', documentTitle: 'HDFC Bank Financial Results — Q1 FY2027 documents', documentDate: '2026-07-18', reportingPeriod: 'Q1 FY2027', periodType: 'Q1', statementScope: null, retrievedAt, fields: emptyEvidence(sourceUrl), qualification: { status: 'UNVERIFIED', reason: 'Official Q1 FY2027 documents are discoverable, but the current runtime has no qualified PDF extraction path. No HDFC KPI is admitted from third-party summaries or inferred from document titles.', discoveredDocuments: ['Q1FY27 Earnings Presentation', 'Press Release June 2026', 'Key Parameters — Financial Results for the Quarter ended June 30, 2026', 'Financial results for the quarter ended June 30, 2026'], noSyntheticValues: true } };
}

export async function fetchBankIrEvidence(ticker) {
  const normalized = String(ticker || '').toUpperCase().replace(/\s+/g, '');
  const retrievedAt = new Date().toISOString();
  if (normalized === 'ICICIBANK' || normalized === 'ICICIBANK.NS') {
    const url = 'https://www.icici.bank.in/about-us/news-room/2026/performance-review-quarter-ended-june-30-2026';
    try {
      const response = await fetch(url, { headers: { accept: 'text/html' }, signal: AbortSignal.timeout(8000) });
      if (!response.ok) return { ...hdfcEvidence(retrievedAt), issuer: 'ICICI Bank Limited', ticker: 'ICICIBANK.NS', sourceUrl: url, qualification: { status: 'SOURCE_UNAVAILABLE', reason: `Official IR HTTP ${response.status}` } };
      return parseIciciOfficialHtml(await response.text(), retrievedAt);
    } catch (error) {
      return { ...hdfcEvidence(retrievedAt), issuer: 'ICICI Bank Limited', ticker: 'ICICIBANK.NS', sourceUrl: url, qualification: { status: 'SOURCE_UNAVAILABLE', reason: String(error?.message || error) } };
    }
  }
  if (normalized === 'HDFCBANK' || normalized === 'HDFCBANK.NS') return hdfcEvidence(retrievedAt);
  return null;
}

export function mergeBankIrEvidence(financials, bankEvidence) {
  if (!bankEvidence) return financials;
  return { ...financials, bankEvidence: { ...(financials?.bankEvidence || {}), [bankEvidence.ticker]: bankEvidence } };
}

export { BANK_KPI_FIELDS, emptyField };
