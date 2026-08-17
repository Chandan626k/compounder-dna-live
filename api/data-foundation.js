import YahooFinance from 'yahoo-finance2';

const yf = new YahooFinance();
const CORS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-store',
};
const num = (v) => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (v && typeof v === 'object' && Number.isFinite(v.raw)) return v.raw;
  return null;
};
const ticker = (s) => {
  const x = String(s || '').trim().toUpperCase().replace(/\s+/g, '');
  if (!x) throw Error('Stock symbol is required');
  return x.endsWith('.NS') || x.endsWith('.BO') ? x : `${x}.NS`;
};
const dateISO = (v) => {
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};
const rows = (data, period) => (Array.isArray(data) ? data : [])
  .filter(Boolean)
  .map((r) => ({ ...r, date: dateISO(r.date), period }))
  .filter((r) => r.date)
  .sort((a, b) => new Date(a.date) - new Date(b.date));
function coverage(records, fields) {
  const available = fields.filter((f) => records.some((r) => num(r?.[f]) != null)).length;
  return { available, total: fields.length, percentage: fields.length ? Math.round(available / fields.length * 100) : 0 };
}
async function getFoundation(symbol) {
  const period2 = new Date();
  const period10y = new Date(Date.now() - 10 * 365.25 * 24 * 60 * 60 * 1000);
  const period5y = new Date(Date.now() - 5 * 365.25 * 24 * 60 * 60 * 1000);
  const [quote, annual, quarterly, chart] = await Promise.allSettled([
    yf.quoteSummary(symbol, { modules: ['price','quoteType','summaryDetail','defaultKeyStatistics','financialData','assetProfile','majorHoldersBreakdown','institutionOwnership','insiderHolders','insiderTransactions','earningsTrend','calendarEvents'] }, { validateResult: false }),
    yf.fundamentalsTimeSeries(symbol, { period1: period5y, period2, type: 'annual', module: 'all' }, { validateResult: false }),
    yf.fundamentalsTimeSeries(symbol, { period1: period5y, period2, type: 'quarterly', module: 'all' }, { validateResult: false }),
    yf.chart(symbol, { period1: period10y, period2, interval: '1d', events: 'div,splits', return: 'object' }),
  ]);
  const q = quote.status === 'fulfilled' ? quote.value : null;
  const annualRows = rows(annual.status === 'fulfilled' ? annual.value : [], 'annual');
  const quarterlyRows = rows(quarterly.status === 'fulfilled' ? quarterly.value : [], 'quarterly');
  const chartData = chart.status === 'fulfilled' ? chart.value : null;
  const priceRows = (Array.isArray(chartData?.quotes) ? chartData.quotes : []).map((r) => ({ date: dateISO(r.date), open: num(r.open), high: num(r.high), low: num(r.low), close: num(r.close), volume: num(r.volume) })).filter((r) => r.date && r.close != null);
  const annualFields = ['totalRevenue','operatingIncome','netIncomeFromContinuingAndDiscontinuedOperation','dilutedEPS','freeCashFlow','operatingCashFlow','capitalExpenditure','totalDebt','cashCashEquivalentsAndShortTermInvestments','stockholdersEquity','totalAssets'];
  const quarterlyFields = ['totalRevenue','operatingIncome','netIncomeFromContinuingAndDiscontinuedOperation','dilutedEPS','freeCashFlow','operatingCashFlow','capitalExpenditure'];
  const market = {
    price: num(chartData?.meta?.regularMarketPrice) ?? priceRows.at(-1)?.close ?? null,
    currency: chartData?.meta?.currency || q?.price?.currency || null,
    exchange: chartData?.meta?.exchangeName || q?.price?.exchangeName || null,
    marketCap: num(q?.summaryDetail?.marketCap) ?? num(q?.defaultKeyStatistics?.marketCap) ?? null,
    52WeekHigh: num(q?.summaryDetail?.fiftyTwoWeekHigh),
    52WeekLow: num(q?.summaryDetail?.fiftyTwoWeekLow),
    beta: num(q?.defaultKeyStatistics?.beta),
    averageVolume: num(q?.summaryDetail?.averageVolume),
    trailingPE: num(q?.summaryDetail?.trailingPE),
    forwardPE: num(q?.summaryDetail?.forwardPE),
    priceToBook: num(q?.defaultKeyStatistics?.priceToBook),
    enterpriseValue: num(q?.defaultKeyStatistics?.enterpriseValue),
    sharesOutstanding: num(q?.defaultKeyStatistics?.sharesOutstanding),
  };
  const warnings = [];
  if (!q) warnings.push('Quote/fundamental summary unavailable from provider.');
  if (!annualRows.length) warnings.push('Annual statement history unavailable from provider.');
  if (!quarterlyRows.length) warnings.push('Quarterly statement history unavailable from provider.');
  if (priceRows.length < 252) warnings.push(`Only ${priceRows.length} usable daily price rows returned; 1Y technical history is incomplete.`);
  if (annual.status === 'rejected') warnings.push(`Annual provider error: ${annual.reason?.message || annual.reason}`);
  if (quarterly.status === 'rejected') warnings.push(`Quarterly provider error: ${quarterly.reason?.message || quarterly.reason}`);
  if (chart.status === 'rejected') warnings.push(`Chart provider error: ${chart.reason?.message || chart.reason}`);
  return {
    success: true,
    symbol: symbol.replace(/\.NS$|\.BO$/i, ''),
    yahooSymbol: symbol,
    generatedAt: new Date().toISOString(),
    dataPolicy: { fakeDataAllowed: false, estimatedDataAllowed: false, providerEstimatesAllowed: true, missingValueRepresentation: null, rule: 'Only provider-reported values or deterministic calculations from provider-reported inputs are returned. Missing values remain null.' },
    market,
    profile: { name: q?.quoteType?.longName || q?.quoteType?.shortName || symbol, sector: q?.assetProfile?.sector || null, industry: q?.assetProfile?.industry || null, country: q?.assetProfile?.country || null },
    ownership: {
      insidersPct: num(q?.defaultKeyStatistics?.heldPercentInsiders) != null ? num(q.defaultKeyStatistics.heldPercentInsiders) * 100 : null,
      institutionsPct: num(q?.defaultKeyStatistics?.heldPercentInstitutions) != null ? num(q.defaultKeyStatistics.heldPercentInstitutions) * 100 : null,
      majorHolders: q?.majorHoldersBreakdown || null,
      institutionOwnership: q?.institutionOwnership?.ownershipList || [],
      insiderHolders: q?.insiderHolders?.holders || [],
      insiderTransactions: q?.insiderTransactions?.transactions || [],
    },
    history: { priceDaily: priceRows, annual: annualRows, quarterly: quarterlyRows, coverage: { annual: coverage(annualRows, annualFields), quarterly: coverage(quarterlyRows, quarterlyFields), dailyPriceRows: priceRows.length, dailyPriceYears: Number((priceRows.length / 252).toFixed(1)) } },
    provenance: { provider: 'Yahoo Finance via yahoo-finance2', marketAsOf: priceRows.at(-1)?.date || null, fundamentalsFetchedAt: new Date().toISOString(), annualPeriod: '5Y requested', quarterlyPeriod: '5Y requested', pricePeriod: '10Y requested', status: 'PROVIDER_DATA_ONLY' },
    warnings,
  };
}
export default async function handler(req, res) {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });
  try { return res.status(200).json(await getFoundation(ticker(req.query?.symbol))); }
  catch (error) { console.error('[DATA FOUNDATION]', error?.message); return res.status(502).json({ success: false, error: 'Verified market data is temporarily unavailable. No fallback or fabricated values are used.' }); }
}
