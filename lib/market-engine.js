
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

const clamp = (v, a = 0, b = 100) =>
  Math.max(a, Math.min(b, Number.isFinite(v) ? v : a));

const num = (v) => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (v && typeof v === 'object' && typeof v.raw === 'number' && Number.isFinite(v.raw)) return v.raw;
  return null;
};

const pct = (v) => {
  const n = num(v);
  return n == null ? null : n * 100;
};

function normalizeDebtToEquity(v) {
  const n = num(v);
  if (n == null || n < 0) return null;
  // Yahoo financialData.debtToEquity is commonly exposed as a percentage
  // (e.g. 10.21 means 10.21%), while statement-derived debt/equity is a ratio.
  return n > 5 ? n / 100 : n;
}

function crore(v) {
  const n = num(v);
  return n == null ? null : n / 1e7;
}

const ticker = (input) => {
  let x = String(input || '').trim().toUpperCase().replace(/\s+/g, '');
  if (!x) throw Error('Stock symbol is required');
  if (x.endsWith('.NS') || x.endsWith('.BO') || x.startsWith('^')) return x;
  return `${x}.NS`;
};

function value(obj, key) {
  return num(obj?.[key]);
}

function normalizeTimeSeriesRows(rows, requestedPeriod) {
  return (Array.isArray(rows) ? rows : [])
    .map((row) => {
      if (!row || typeof row !== 'object') return null;
      const date = row.date instanceof Date ? row.date : new Date(row.date);
      if (Number.isNaN(date.getTime())) return null;
      const periodType = row.periodType == null ? null : String(row.periodType).toUpperCase();
      const providerType = row.TYPE == null ? null : String(row.TYPE).toUpperCase();
      const periodStatus = ['TTM','12M','3M'].includes(periodType) ? 'verified' : 'missing';
      return { ...row, date: date.toISOString(), periodType, providerType, requestedPeriod, periodStatus };
    })
    .filter(Boolean)
    .sort((a,b)=>new Date(a.date)-new Date(b.date));
}

function metricRows(rows, key, {preferTTM=true} = {}) {
  const valid=(rows||[]).filter(r=>num(r?.[key])!=null);
  if(!valid.length) return null;
  if(preferTTM){
    const ttm=valid.filter(r=>r.periodType==='TTM');
    if(ttm.length) return num(ttm.at(-1)[key]);
  }
  return num(valid.at(-1)[key]);
}

function annualRows(rows) {
  return (rows||[]).filter(r=>r && r.periodType!=='TTM' && (r.periodType==='12M' || r.requestedPeriod==='annual'));
}

function latest(rows, key) {
  const a = (rows || []).filter((r) => num(r?.[key]) != null);
  return a.length ? num(a.at(-1)[key]) : null;
}

function cagr(rows, key, years = 5) {
  const valid = (rows || [])
    .filter((r) => num(r?.[key]) != null)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  if (valid.length < 2) return null;

  const end = valid.at(-1);
  const targetMs = years * 365.25 * 24 * 60 * 60 * 1000;
  let start = valid[0];

  for (const row of valid) {
    if (new Date(end.date) - new Date(row.date) >= targetMs * 0.75) {
      start = row;
      break;
    }
  }

  const startValue = num(start[key]);
  const endValue = num(end[key]);
  const actualYears = (new Date(end.date) - new Date(start.date)) / (365.25 * 24 * 60 * 60 * 1000);

  if (!(startValue > 0) || !(endValue > 0) || actualYears < 1.5) return null;
  return (Math.pow(endValue / startValue, 1 / actualYears) - 1) * 100;
}

function growthPct(current, previous) {
  if (!(Number.isFinite(current) && Number.isFinite(previous)) || previous === 0) return null;
  return ((current / previous) - 1) * 100;
}

function sma(a, n) {
  return a.length < n ? null : a.slice(-n).reduce((s, v) => s + v, 0) / n;
}

function ema(a, n) {
  if (a.length < n) return null;
  let e = a.slice(0, n).reduce((s, v) => s + v, 0) / n;
  const k = 2 / (n + 1);
  for (let i = n; i < a.length; i++) e = a[i] * k + e * (1 - k);
  return e;
}

function rsi(a, n = 14) {
  if (a.length <= n) return null;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= n; i++) {
    const d = a[i] - a[i - 1];
    gain += Math.max(d, 0);
    loss += Math.max(-d, 0);
  }
  gain /= n;
  loss /= n;
  for (let i = n + 1; i < a.length; i++) {
    const d = a[i] - a[i - 1];
    gain = (gain * (n - 1) + Math.max(d, 0)) / n;
    loss = (loss * (n - 1) + Math.max(-d, 0)) / n;
  }
  return loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
}

function atr(rows, n = 14) {
  // Wilder's ATR: seed with the first n true ranges, then apply
  // Wilder smoothing. This is the standard ATR methodology used by
  // most professional charting implementations.
  if (rows.length <= n) return null;
  const tr = [];
  for (let i = 1; i < rows.length; i++) {
    const x = rows[i];
    const p = rows[i - 1];
    tr.push(Math.max(x.high - x.low, Math.abs(x.high - p.close), Math.abs(x.low - p.close)));
  }
  if (tr.length < n) return null;

  let value = tr.slice(0, n).reduce((sum, x) => sum + x, 0) / n;
  for (let i = n; i < tr.length; i++) {
    value = ((value * (n - 1)) + tr[i]) / n;
  }
  return value;
}

function percentChange(a, n) {
  return a.length <= n ? null : ((a.at(-1) / a.at(-1 - n)) - 1) * 100;
}

function technical(rows) {
  const clean = (rows || []).filter(r =>
    Number.isFinite(r?.close) && Number.isFinite(r?.high) &&
    Number.isFinite(r?.low) && Number.isFinite(r?.volume)
  );
  const close = clean.map((r) => r.close);
  const volume = clean.map((r) => r.volume);
  if (!close.length) throw Error('No usable market prices returned by provider');

  const last = close.at(-1);
  const s20 = sma(close, 20);
  const s50 = sma(close, 50);
  const s200 = sma(close, 200);
  const e20 = ema(close, 20);
  const e50 = ema(close, 50);
  const e200 = ema(close, 200);
  const rr = rsi(close);
  const aa = atr(clean);
  const avgV = sma(volume, 20);
  const previous20 = volume.length >= 40 ? sma(volume.slice(-40, -20), 20) : null;
  const has52WeekHistory = clean.length >= 252;
  const yearRows = has52WeekHistory ? clean.slice(-252) : [];
  const hi52 = yearRows.length ? Math.max(...yearRows.map((r) => r.high)) : null;
  const lo52 = yearRows.length ? Math.min(...yearRows.map((r) => r.low)) : null;
  const hi20 = Math.max(...clean.slice(-20).map((r) => r.high));
  const lo20 = Math.min(...clean.slice(-20).map((r) => r.low));

  const trend =
    e200 != null
      ? last > e20 && e20 > e50 && e50 > e200
        ? 'STRONG UPTREND'
        : last > e50 && e50 > e200
          ? 'UPTREND'
          : last < e50 && e50 < e200
            ? 'DOWNTREND'
            : 'RECOVERING / MIXED'
      : e50 != null && last > e50
        ? 'UPTREND'
        : 'RECOVERING / MIXED';

  const distanceFrom200DMA = s200 != null ? ((last / s200) - 1) * 100 : null;
  const drawdown = hi52 > 0 ? Math.max(0, (1 - last / hi52) * 100) : null;
  const rangePosition = hi52 != null && lo52 != null && hi52 > lo52 ? ((last - lo52) / (hi52 - lo52)) * 100 : null;
  const volumeTrend = avgV != null && previous20 != null && previous20 > 0
    ? ((avgV / previous20) - 1) * 100
    : null;

  return {
    prices: close,
    s20, s50, s200, e20, e50, e200,
    rsi: rr, atr: aa,
    high: hi52, low: lo52, high52Week: hi52, low52Week: lo52,
    support: lo20, resistance: hi20,
    volume: volume.at(-1), avgVolume: avgV,
    volumeSpike: avgV && avgV > 0 ? volume.at(-1) / avgV : null,
    relativeVolume: avgV && avgV > 0 ? volume.at(-1) / avgV : null,
    volumeTrend, trend,
    trendStrength: Math.abs(distanceFrom200DMA ?? 0),
    trendStrengthBasis: 'absolute percentage distance from SMA200; not a statistical trend-strength score',
    has52WeekHistory,
    last,
    change1d: percentChange(close, 1),
    change20d: percentChange(close, 20),
    change3m: percentChange(close, 63),
    change6m: percentChange(close, 126),
    change1y: percentChange(close, 252),
    distanceFrom200DMA,
    distanceFrom52WHigh: hi52 ? ((last / hi52) - 1) * 100 : null,
    distanceFrom52WLow: lo52 ? ((last / lo52) - 1) * 100 : null,
    drawdown, rangePosition,
  };
}

async function fetchChart(symbol) {
  const data = await yahooFinance.chart(symbol, {
    period1: new Date(Date.now() - 2 * 365.25 * 24 * 60 * 60 * 1000),
    period2: new Date(),
    interval: '1d',
    events: 'div,splits',
    return: 'object',
  });

  const rows = [];

  // yahoo-finance2 v3 returns the array format by default. We explicitly request
  // the object format above, but keep this parser compatible with both formats.
  if (Array.isArray(data?.quotes)) {
    for (const item of data.quotes) {
      const close = num(item?.close);
      const high = num(item?.high);
      const low = num(item?.low);
      const volume = num(item?.volume);
      if (close != null && high != null && low != null && volume != null) {
        rows.push({
          date: new Date(item.date).toISOString(),
          close, high, low, volume,
        });
      }
    }
  } else {
    const timestamps = data?.timestamp || [];
    const q = data?.indicators?.quote?.[0] || {};
    for (let i = 0; i < timestamps.length; i++) {
      const close = num(q.close?.[i]);
      const high = num(q.high?.[i]);
      const low = num(q.low?.[i]);
      const volume = num(q.volume?.[i]);
      if (close != null && high != null && low != null && volume != null) {
        rows.push({
          date: new Date(timestamps[i] * 1000).toISOString(),
          close, high, low, volume,
        });
      }
    }
  }

  if (rows.length < 30) throw Error(`Insufficient market data (${rows.length} points)`);

  return {
    symbol,
    currency: data?.meta?.currency || 'INR',
    exchange: data?.meta?.exchangeName || '',
    price: num(data?.meta?.regularMarketPrice) ?? rows.at(-1).close,
    rows,
  };
}

async function fetchFundamentals(symbol) {
  const period1 = new Date(Date.now() - 7 * 365.25 * 24 * 60 * 60 * 1000);
  const period2 = new Date();

  const [summaryResult, annualResult, trailingResult] = await Promise.allSettled([
    yahooFinance.quoteSummary(symbol, {
      modules: ['price','summaryDetail','defaultKeyStatistics','financialData','assetProfile','majorHoldersBreakdown','institutionOwnership','insiderHolders','insiderTransactions','earningsTrend','quoteType'],
    }, { validateResult: false }),
    yahooFinance.fundamentalsTimeSeries(symbol, { period1, period2, type: 'annual', module: 'all' }, { validateResult: false }),
    yahooFinance.fundamentalsTimeSeries(symbol, { period1: new Date(Date.now() - 24 * 30 * 24 * 60 * 60 * 1000), period2, type: 'trailing', module: 'all' }, { validateResult: false }),
  ]);

  const summary = summaryResult.status === 'fulfilled' ? summaryResult.value : null;
  const annual = annualResult.status === 'fulfilled' ? normalizeTimeSeriesRows(annualResult.value, 'annual') : [];
  const trailing = trailingResult.status === 'fulfilled' ? normalizeTimeSeriesRows(trailingResult.value, 'trailing') : [];

  return {
    summary, annual, trailing,
    errors: {
      summary: summaryResult.status === 'rejected' ? String(summaryResult.reason?.message || summaryResult.reason) : null,
      annual: annualResult.status === 'rejected' ? String(annualResult.reason?.message || annualResult.reason) : null,
      trailing: trailingResult.status === 'rejected' ? String(trailingResult.reason?.message || trailingResult.reason) : null,
    },
    providerValidation: {
      summary: false, annual: false, trailing: false,
      reason: 'Yahoo Finance payloads are consumed with provider validation disabled and are validated by the StockSamjho normalization layer. TTM/ALL are accepted when structurally usable.',
    },
  };
}

function buildFinancials(raw) {
  const f = raw.summary?.financialData || {};
  const k = raw.summary?.defaultKeyStatistics || {};
  const d = raw.summary?.summaryDetail || {};

  // fundamentalsTimeSeries(module:'all') can return TYPE:'ALL' rows.
  // Treat those as statement rows too, otherwise valid financial history is discarded.
  const allFinancialRows = [...(raw.annual || []), ...(raw.trailing || [])];
  const annualFinancials = annualRows(raw.annual);
  const usableFinancialRows = allFinancialRows.filter((r) => r?.providerType === 'FINANCIALS' || r?.providerType === 'ALL' || r?.TYPE === 'FINANCIALS' || r?.TYPE === 'ALL');
  const annualBalance = annualRows(raw.annual);
  const annualCash = annualRows(raw.annual);

  const revenue = metricRows(raw.trailing, 'totalRevenue') ?? metricRows(usableFinancialRows, 'totalRevenue') ?? value(f, 'totalRevenue');
  const ebitda = metricRows(raw.trailing, 'EBITDA') ?? metricRows(usableFinancialRows, 'EBITDA') ?? value(f, 'ebitda');
  const netIncome = metricRows(raw.trailing, 'netIncomeFromContinuingAndDiscontinuedOperation') ?? metricRows(usableFinancialRows, 'netIncomeFromContinuingAndDiscontinuedOperation') ?? value(k, 'netIncomeToCommon');
  const freeCashFlow = value(f, 'freeCashflow') ?? metricRows(raw.trailing, 'freeCashFlow') ?? metricRows(usableFinancialRows, 'freeCashFlow');
  const operatingCashFlow = value(f, 'operatingCashflow') ?? metricRows(raw.trailing, 'operatingCashFlow') ?? metricRows(usableFinancialRows, 'operatingCashFlow');

  const totalDebt = value(f, 'totalDebt') ?? metricRows(usableFinancialRows, 'totalDebt');
  const cash = value(f, 'totalCash') ?? metricRows(usableFinancialRows, 'cashCashEquivalentsAndShortTermInvestments');
  const netDebt = metricRows(usableFinancialRows, 'netDebt') ?? (totalDebt != null && cash != null ? totalDebt - cash : null);
  const equity = metricRows(usableFinancialRows, 'stockholdersEquity') ?? metricRows(usableFinancialRows, 'commonStockEquity');

  const shares = value(k, 'sharesOutstanding') ?? metricRows(usableFinancialRows, 'ordinarySharesNumber');

  const revenue3y = cagr(annualFinancials, 'totalRevenue', 3);
  const revenue5y = cagr(annualFinancials, 'totalRevenue', 5);
  const eps3y = cagr(annualFinancials, 'dilutedEPS', 3);
  const eps5y = cagr(annualFinancials, 'dilutedEPS', 5);
  const pat3y = cagr(annualFinancials, 'netIncomeFromContinuingAndDiscontinuedOperation', 3);
  const pat5y = cagr(annualFinancials, 'netIncomeFromContinuingAndDiscontinuedOperation', 5);

  const currentAssets = latest(annualBalance, 'currentAssets');
  const currentLiabilities = latest(annualBalance, 'currentLiabilities');

  const revenueCurrent = latest(annualFinancials, 'totalRevenue');
  const revenuePrev = annualFinancials.length >= 2 ? num(annualFinancials.at(-2)?.totalRevenue) : null;
  const epsCurrent = latest(annualFinancials, 'dilutedEPS');
  const epsPrev = annualFinancials.length >= 2 ? num(annualFinancials.at(-2)?.dilutedEPS) : null;
  const fcfCurrent = latest(annualFinancials, 'freeCashFlow');
  const fcfPrev = annualFinancials.length >= 2 ? num(annualFinancials.at(-2)?.freeCashFlow) : null;
  const interestExpense = value(f, 'interestExpense') ?? metricRows(usableFinancialRows, 'interestExpense');
  const operatingIncome = value(f, 'operatingIncome') ?? metricRows(raw.trailing, 'operatingIncome') ?? metricRows(usableFinancialRows, 'operatingIncome');
  const totalAssets = latest(annualBalance, 'totalAssets');

  return {
    current: {
      revenue,
      ebitda,
      netIncome,
      freeCashFlow,
      operatingCashFlow,
      totalDebt,
      netDebt,
      cash,
      equity,
      shares,
      currentAssets,
      currentLiabilities,
    },
    ratios: {
      roe: pct(value(f, 'returnOnEquity')),
      roa: pct(value(f, 'returnOnAssets')),
      debtToEquity: normalizeDebtToEquity(value(f, 'debtToEquity')),
      currentRatio: value(f, 'currentRatio'),
      quickRatio: value(f, 'quickRatio'),
      grossMargin: pct(value(f, 'grossMargins')),
      operatingMargin: pct(value(f, 'operatingMargins')),
      netMargin: pct(value(f, 'profitMargins')),
      ebitdaMargin: pct(value(f, 'ebitdaMargins')),
      revenueGrowth: pct(value(f, 'revenueGrowth')),
      earningsGrowth: pct(value(f, 'earningsGrowth')),
      earningsQuarterlyGrowth: pct(value(k, 'earningsQuarterlyGrowth')),
    },
    growth: {
      revenue3yCagr: revenue3y,
      revenue5yCagr: revenue5y,
      eps3yCagr: eps3y,
      eps5yCagr: eps5y,
      pat3yCagr: pat3y,
      pat5yCagr: pat5y,
      latestRevenueGrowth: growthPct(revenueCurrent, revenuePrev),
      latestEPSGrowth: growthPct(epsCurrent, epsPrev),
    },
    derived: {
      debtToEquityFromStatements:
        equity && totalDebt != null ? totalDebt / equity : null,
      netDebtToEbitda:
        netDebt != null && ebitda > 0 ? netDebt / ebitda : null,
      fcfMargin:
        freeCashFlow != null && revenue > 0 ? (freeCashFlow / revenue) * 100 : null,
      fcfConversion:
        freeCashFlow != null && netIncome > 0 ? (freeCashFlow / netIncome) * 100 : null,
      currentRatioFromStatements:
        currentAssets != null && currentLiabilities > 0 ? currentAssets / currentLiabilities : null,
      interestCoverage:
        operatingIncome != null && interestExpense != null && interestExpense > 0
          ? operatingIncome / interestExpense : null,
      roeFromStatements:
        netIncome != null && equity != null && equity > 0 ? (netIncome / equity) * 100 : null,
      roaFromStatements:
        netIncome != null && totalAssets != null && totalAssets > 0 ? (netIncome / totalAssets) * 100 : null,
      roceFromStatements:
        operatingIncome != null && equity != null && totalDebt != null && (equity + totalDebt) > 0
          ? (operatingIncome / (equity + totalDebt)) * 100 : null,
      fcfGrowth: growthPct(fcfCurrent, fcfPrev),
    },
    sourceNote: 'Yahoo Finance quoteSummary + fundamentalsTimeSeries. Missing fields remain null; no financial metric is fabricated.',
    periods: { currentMetrics: raw.trailing.some(r => r.periodType === 'TTM') ? 'TTM' : (raw.trailing.at(-1)?.periodType || null), annualHistoryCount: annualFinancials.length, historicalGrowth: '12M/annual only; TTM excluded from CAGR baselines' },
    rawAvailability: {
      quoteSummary: Boolean(raw.summary),
      annualStatements: annualFinancials.length > 0,
      annualBalanceSheet: annualBalance.some(r => ['totalDebt','stockholdersEquity','commonStockEquity','currentAssets','currentLiabilities','cashCashEquivalentsAndShortTermInvestments'].some(k => num(r?.[k]) != null)),
      annualCashFlow: annualCash.some(r => ['freeCashFlow','operatingCashFlow','cashFlowFromContinuingOperatingActivities'].some(k => num(r?.[k]) != null)),
    },
  };
}

function buildValuation(raw, price) {
  const d = raw.summary?.summaryDetail || {};
  const k = raw.summary?.defaultKeyStatistics || {};
  const f = raw.summary?.financialData || {};

  const allFinancialRows = [...(raw.annual || []), ...(raw.trailing || [])];
  const usableFinancialRows = allFinancialRows.filter((r) =>
    r?.providerType === 'FINANCIALS' || r?.providerType === 'ALL' ||
    r?.TYPE === 'FINANCIALS' || r?.TYPE === 'ALL'
  );
  const sharesOutstanding =
    value(k, 'sharesOutstanding') ??
    metricRows(usableFinancialRows, 'ordinarySharesNumber') ??
    metricRows(usableFinancialRows, 'sharesOutstanding');
  const reportedMarketCap = value(d, 'marketCap') ?? value(raw.summary?.price, 'marketCap');
  const calculatedMarketCap =
    sharesOutstanding != null && price != null && sharesOutstanding > 0 && price > 0
      ? sharesOutstanding * price : null;
  const marketCap = reportedMarketCap != null && reportedMarketCap > 0
    ? reportedMarketCap : calculatedMarketCap;
  const marketCapStatus =
    reportedMarketCap != null && reportedMarketCap > 0 ? 'verified' :
    calculatedMarketCap != null ? 'calculated' : 'missing';
  const trailingPE = value(d, 'trailingPE');
  const forwardPE = value(d, 'forwardPE') ?? value(k, 'forwardPE');
  const priceToBook = value(k, 'priceToBook');
  const pegRatio = value(k, 'pegRatio');
  const enterpriseValue = value(k, 'enterpriseValue');
  const evToEbitda = value(k, 'enterpriseToEbitda');
  const evToRevenue = value(k, 'enterpriseToRevenue');
  const trailingEps = value(k, 'trailingEps');
  const forwardEps = value(k, 'forwardEps');
  const bookValue = value(k, 'bookValue');

  // Build a growth signal from multiple independent sources.
  const annualFinancials = annualRows(raw.annual);
  const eps3y = cagr(annualFinancials, 'dilutedEPS', 3);
  const eps5y = cagr(annualFinancials, 'dilutedEPS', 5);
  const pat3y = cagr(annualFinancials, 'netIncomeFromContinuingAndDiscontinuedOperation', 3);
  const pat5y = cagr(annualFinancials, 'netIncomeFromContinuingAndDiscontinuedOperation', 5);
  const rev3y = cagr(annualFinancials, 'totalRevenue', 3);
  const rev5y = cagr(annualFinancials, 'totalRevenue', 5);
  const earningsGrowth = pct(value(f, 'earningsGrowth'));
  const revenueGrowth = pct(value(f, 'revenueGrowth'));
  const roe = pct(value(f, 'returnOnEquity'));

  const growthCandidates = [eps3y, eps5y, pat3y, pat5y, earningsGrowth]
    .filter((x) => Number.isFinite(x) && x > -50 && x < 100);
  const growthSignal = growthCandidates.length
    ? growthCandidates.reduce((a, b) => a + b, 0) / growthCandidates.length
    : null;

  // A justified multiple is deliberately more conservative than simply using
  // the market's current P/E. This prevents fair value = current price.
  const qualityPremium =
    roe == null ? 0 :
    roe >= 30 ? 4 :
    roe >= 20 ? 2.5 :
    roe >= 15 ? 1 :
    0;

  const baseGrowth = growthSignal == null ? null : Math.max(-5, Math.min(30, growthSignal));
  const conservativeGrowth = baseGrowth == null ? null : Math.max(-5, baseGrowth * 0.70);
  const optimisticGrowth = baseGrowth == null ? null : Math.min(35, Math.max(-5, baseGrowth * 1.20));

  const justifiedPE = (growth, premium = qualityPremium) =>
    growth == null ? null : Math.max(10, Math.min(32, 12 + growth * 0.75 + premium));

  const conservativePE = justifiedPE(conservativeGrowth);
  const basePE = justifiedPE(baseGrowth);
  const optimisticPE = justifiedPE(optimisticGrowth);

  const forwardFair = (eps, pe) => eps > 0 && pe > 0 ? eps * pe : null;
  const trailingFair = (eps, pe) => eps > 0 && pe > 0 ? eps * pe : null;

  const conservativeValues = [
    forwardFair(forwardEps, conservativePE),
    trailingFair(trailingEps, conservativePE)
  ].filter(Number.isFinite);

  const baseValues = [
    forwardFair(forwardEps, basePE),
    trailingFair(trailingEps, basePE)
  ].filter(Number.isFinite);

  const optimisticValues = [
    forwardFair(forwardEps, optimisticPE),
    trailingFair(trailingEps, optimisticPE)
  ].filter(Number.isFinite);

  const avg = (a) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
  const conservativeFairValue = avg(conservativeValues);
  const baseFairValue = avg(baseValues);
  const optimisticFairValue = avg(optimisticValues);

  // If EPS is unavailable, do not manufacture an earnings fair value.
  // P/B is retained as a reference for financial companies, not mixed blindly
  // into the primary fair-value estimate.
  const pbReference = bookValue > 0 && priceToBook > 0 ? bookValue * priceToBook : null;
  const primaryFairValue = baseFairValue;

  const upside = (fv) => fv && price ? ((fv / price) - 1) * 100 : null;
  const mos = (fv) => fv && price ? (1 - price / fv) * 100 : null;

  const valuationGap = primaryFairValue && price ? ((price / primaryFairValue) - 1) * 100 : null;
  const verdict =
    primaryFairValue == null ? 'DATA INSUFFICIENT' :
    valuationGap <= -20 ? 'DEEPLY UNDERVALUED' :
    valuationGap <= -8 ? 'ATTRACTIVE' :
    valuationGap <= 8 ? 'FAIR / REASONABLE' :
    valuationGap <= 20 ? 'EXPENSIVE' :
    'VERY EXPENSIVE';

  return {
    currentPrice: price,
    marketCap,
    marketCapStatus,
    sharesOutstanding,
    trailingPE,
    forwardPE,
    priceToBook,
    pegRatio,
    enterpriseValue,
    evToEbitda,
    evToRevenue,
    trailingEPS: trailingEps,
    forwardEPS: forwardEps,
    bookValue,
    earningsYield: trailingPE > 0 ? (1 / trailingPE) * 100 : null,

    growthSignal,
    revenueGrowth,
    revenue3yCagr: rev3y,
    revenue5yCagr: rev5y,
    eps3yCagr: eps3y,
    eps5yCagr: eps5y,
    pat3yCagr: pat3y,
    pat5yCagr: pat5y,
    roe,

    conservativeGrowth,
    baseGrowth,
    optimisticGrowth,
    conservativePE,
    basePE,
    optimisticPE,
    conservativeFairValue,
    baseFairValue,
    optimisticFairValue,
    fairValue: primaryFairValue,
    pbReference,
    upsideToFairValue: upside(primaryFairValue),
    marginOfSafety: mos(primaryFairValue),
    valuationGap,
    verdict,
    method: 'Growth-adjusted justified P/E using EPS history, earnings growth and ROE; P/B shown separately as a reference.',
    warning:
      primaryFairValue == null
        ? 'No defensible earnings-based fair value available from the returned data.'
        : 'Scenario fair values are framework estimates, not analyst targets or guarantees.',
  };
}
function buildOwnership(raw) {
  const m = raw.summary?.majorHoldersBreakdown || {};
  const k = raw.summary?.defaultKeyStatistics || {};

  return {
    insidersPct: pct(value(k, 'heldPercentInsiders')),
    institutionsPct: pct(value(k, 'heldPercentInstitutions')),
    majorHolders: m,
    institutionOwnership: raw.summary?.institutionOwnership?.ownershipList || [],
    insiderHolders: raw.summary?.insiderHolders?.holders || [],
    insiderTransactions: raw.summary?.insiderTransactions?.transactions || [],
    sourceNote: 'Ownership fields depend on Yahoo availability and may be delayed or incomplete.',
  };
}

function buildDataQuality(financials, valuation, ownership, technical) {
  // Confidence measures data completeness, not whether the API call succeeded.
  // Critical missing inputs cap confidence so a partial dataset can never look
  // like a fully verified research dataset.
  const checks = [
    ['price', valuation.currentPrice, 1.0, true],
    ['marketCap', valuation.marketCap, 0.75, true],
    ['P/E', valuation.trailingPE, 1.0, true],
    ['Forward P/E', valuation.forwardPE, 0.5, false],
    ['P/B', valuation.priceToBook, 0.5, false],
    ['Fair Value', valuation.fairValue, 1.0, true],
    ['Growth Signal', valuation.growthSignal, 0.75, true],
    ['ROE', financials.ratios.roe, 1.0, true],
    ['ROA', financials.ratios.roa, 0.5, false],
    ['Debt/Equity', financials.ratios.debtToEquity, 1.0, true],
    ['Net Debt', financials.current.netDebt, 0.75, true],
    ['Net Margin', financials.ratios.netMargin, 1.0, true],
    ['Operating Margin', financials.ratios.operatingMargin, 0.5, false],
    ['Revenue Growth', financials.ratios.revenueGrowth, 1.0, true],
    ['Earnings Growth', financials.ratios.earningsGrowth, 1.0, true],
    ['Free Cash Flow', financials.current.freeCashFlow, 1.0, true],
    ['FCF Conversion', financials.derived.fcfConversion, 0.5, false],
    ['5Y Revenue CAGR', financials.growth.revenue5yCagr, 1.0, true],
    ['5Y EPS CAGR', financials.growth.eps5yCagr, 1.0, true],
    ['RSI', technical.rsi, 0.5, false],
    ['200 DMA', technical.s200, 1.0, true],
    ['EV/EBITDA', valuation.evToEbitda, 0.5, false],
    ['52W Range', technical.high52Week != null && technical.low52Week != null ? 1 : null, 0.5, false],
    ['Drawdown', technical.drawdown, 0.5, false],
    ['Volume Trend', technical.volumeTrend, 0.25, false],
  ];

  const totalWeight = checks.reduce((sum, [, value, weight]) => sum + weight, 0);
  const availableWeight = checks.filter(([, value]) => value != null).reduce((sum, [, , weight]) => sum + weight, 0);
  let completeness = Math.round((availableWeight / totalWeight) * 100);
  const missing = checks.filter(([, value]) => value == null).map(([name]) => name);
  const criticalMissing = checks.filter(([, value, , critical]) => critical && value == null).map(([name]) => name);

  const warnings = [
    ...(!financials.rawAvailability.quoteSummary ? ['Quote summary unavailable.'] : []),
    ...(!financials.rawAvailability.annualStatements ? ['Annual financial statements unavailable.'] : []),
    ...(!financials.rawAvailability.annualBalanceSheet ? ['Annual balance-sheet data unavailable.'] : []),
    ...(!financials.rawAvailability.annualCashFlow ? ['Annual cash-flow data unavailable.'] : []),
    ...(criticalMissing.length ? [`Critical fields unavailable: ${criticalMissing.join(', ')}.`] : []),
  ];

  if (!financials.rawAvailability.annualStatements) completeness = Math.min(completeness, 65);
  if (!financials.rawAvailability.annualBalanceSheet) completeness = Math.min(completeness, 80);
  if (!financials.rawAvailability.annualCashFlow) completeness = Math.min(completeness, 80);
  const annualHistoryRows = financials.periods?.annualHistoryCount ?? 0;
  if (annualHistoryRows < 5) completeness = Math.min(completeness, 88);
  if (annualHistoryRows < 3) completeness = Math.min(completeness, 78);
  if (annualHistoryRows < 2) completeness = Math.min(completeness, 65);
  if (criticalMissing.length >= 3) completeness = Math.min(completeness, 70);
  else if (criticalMissing.length === 2) completeness = Math.min(completeness, 80);
  else if (criticalMissing.length === 1) completeness = Math.min(completeness, 92);

  const verifiedFields = [
    'price','marketCap','P/E','Forward P/E','P/B','ROE','ROA','Debt/Equity',
    'Net Debt','Net Margin','Operating Margin','Revenue Growth','Earnings Growth',
    'Free Cash Flow','RSI','200 DMA','EV/EBITDA'
  ].filter(name => !missing.includes(name));
  const calculatedFields = [
    '5Y Revenue CAGR','5Y EPS CAGR','Growth Signal','Fair Value','FCF Conversion'
  ].filter(name => !missing.includes(name));
  if (valuation.marketCapStatus === 'calculated') {
    const i = verifiedFields.indexOf('marketCap');
    if (i >= 0) verifiedFields.splice(i, 1);
    calculatedFields.push('marketCap');
  }

  return {
    completeness,
    confidence: completeness,
    available: checks.filter(([, value]) => value != null).length,
    total: checks.length,
    verifiedFields,
    calculatedFields,
    missingFields: missing,
    criticalMissingFields: criticalMissing,
    staleFields: [],
    status: completeness >= 85 ? 'STRONG' : completeness >= 65 ? 'PARTIAL' : 'WEAK',
    warnings,
  };
}

function scoreStock(financials, valuation, technical, quality) {
  const r = financials.ratios;
  const g = financials.growth;
  const d = financials.derived;

  let q = 50;
  if (r.roe != null) q += r.roe >= 25 ? 18 : r.roe >= 20 ? 14 : r.roe >= 15 ? 9 : r.roe >= 10 ? 4 : -6;
  if (r.operatingMargin != null) q += r.operatingMargin >= 25 ? 10 : r.operatingMargin >= 15 ? 7 : r.operatingMargin >= 10 ? 3 : -3;
  if (r.netMargin != null) q += r.netMargin >= 20 ? 8 : r.netMargin >= 12 ? 5 : r.netMargin >= 7 ? 2 : -3;
  if (d.fcfConversion != null) q += d.fcfConversion >= 100 ? 8 : d.fcfConversion >= 80 ? 5 : d.fcfConversion >= 60 ? 2 : -5;
  if (g.revenue5yCagr != null) q += g.revenue5yCagr >= 15 ? 8 : g.revenue5yCagr >= 10 ? 5 : g.revenue5yCagr >= 5 ? 2 : 0;
  q = clamp(q);

  const growthRates = [g.revenue5yCagr, g.eps5yCagr, g.pat5yCagr].filter(Number.isFinite);
  let growth = 50;
  if (growthRates.length) {
    const avg = growthRates.reduce((a, b) => a + b, 0) / growthRates.length;
    growth = clamp(50 + avg * 2.2);
  }

  let financialStrength = 60;
  if (r.debtToEquity != null) {
    financialStrength += r.debtToEquity <= 0.25 ? 20 : r.debtToEquity <= 0.75 ? 10 : r.debtToEquity <= 1.5 ? 0 : r.debtToEquity <= 2.5 ? -8 : -18;
  }
  if (d.netDebtToEbitda != null) {
    financialStrength += d.netDebtToEbitda <= 0 ? 10 : d.netDebtToEbitda <= 1 ? 8 : d.netDebtToEbitda <= 2 ? 3 : d.netDebtToEbitda <= 3 ? -5 : -15;
  }
  if (r.currentRatio != null) financialStrength += r.currentRatio >= 1.5 ? 8 : r.currentRatio >= 1 ? 3 : -8;
  financialStrength = clamp(financialStrength);

  // Wealth creation = sustainable returns + cash generation + growth.
  let wealth = 50;
  if (r.roe != null) wealth += r.roe >= 20 ? 15 : r.roe >= 15 ? 10 : r.roe >= 10 ? 5 : 0;
  if (d.fcfConversion != null) wealth += d.fcfConversion >= 90 ? 12 : d.fcfConversion >= 70 ? 8 : d.fcfConversion >= 50 ? 4 : -5;
  if (g.eps5yCagr != null) wealth += g.eps5yCagr >= 15 ? 13 : g.eps5yCagr >= 10 ? 8 : g.eps5yCagr >= 5 ? 4 : 0;
  wealth = clamp(wealth);

  let valuationScore = 50;
  if (valuation.trailingPE != null && valuation.trailingPE > 0) {
    valuationScore = clamp(100 - Math.max(0, valuation.trailingPE - 15) * 2.2);
  }
  if (valuation.marginOfSafety != null) valuationScore = clamp(valuationScore + valuation.marginOfSafety * 0.8);

  // A perfect valuation score is not justified by P/E alone. Require a
  // defensible fair value and at least one supporting valuation cross-check.
  const valuationInputs = [
    valuation.trailingPE, valuation.forwardPE, valuation.priceToBook,
    valuation.fairValue, valuation.growthSignal, valuation.evToEbitda
  ];
  const valuationAvailable = valuationInputs.filter(v => v != null).length;
  if (valuation.fairValue == null) valuationScore = Math.min(valuationScore, 65);
  else if (valuationAvailable < 3) valuationScore = Math.min(valuationScore, 75);
  else if (valuationAvailable < 4) valuationScore = Math.min(valuationScore, 85);

  let technicalScore = 50;
  if (technical.trend === 'STRONG UPTREND') technicalScore += 25;
  else if (technical.trend === 'UPTREND') technicalScore += 15;
  else if (technical.trend === 'DOWNTREND') technicalScore -= 20;
  if (technical.rsi != null) {
    if (technical.rsi >= 70) technicalScore -= 10;
    else if (technical.rsi >= 50) technicalScore += 8;
    else if (technical.rsi < 30) technicalScore += 4;
  }
  technicalScore = clamp(technicalScore);

  let risk = 35;
  if (r.debtToEquity != null && r.debtToEquity > 1.5) risk += 20;
  if (valuation.trailingPE != null && valuation.trailingPE > 40) risk += 18;
  if (technical.trend === 'DOWNTREND') risk += 12;
  if (technical.distanceFrom200DMA != null && technical.distanceFrom200DMA < -20) risk += 10;
  if (technical.drawdown != null && technical.drawdown > 30) risk += 8;
  if (quality.completeness < 70) risk += 15;
  risk = clamp(risk);

  const overall = clamp(
    q * 0.22 +
    growth * 0.15 +
    wealth * 0.14 +
    financialStrength * 0.18 +
    valuationScore * 0.14 +
    technicalScore * 0.05 +
    (100 - risk) * 0.04 +
    quality.confidence * 0.08
  );

  return {
    quality: Math.round(q),
    wealth: Math.round(wealth),
    growth: Math.round(growth),
    financialStrength: Math.round(financialStrength),
    valuation: Math.round(valuationScore),
    technical: Math.round(technicalScore),
    risk: Math.round(risk),
    confidence: Math.round(quality.completeness),
    overall: Math.round(overall),
  };
}

function decision(score, valuation, technical, quality) {
  if (quality.completeness < 60) {
    return {
      action: 'DATA INSUFFICIENT',
      reason: ['Too many core metrics are unavailable.', 'Do not make a capital-allocation decision until data completeness improves.'],
    };
  }

  if (valuation.verdict === 'VERY EXPENSIVE' && score.overall >= 68) {
    return {
      action: 'WAIT / WATCH',
      reason: ['Business quality may be strong, but valuation is stretched versus the growth-adjusted framework.', 'Wait for a better entry price or materially stronger earnings growth.'],
    };
  }

  if (score.overall >= 78 && score.risk < 40 && technical.trend !== 'DOWNTREND' &&
      valuation.verdict !== 'EXPENSIVE' && valuation.verdict !== 'VERY EXPENSIVE') {
    return {
      action: 'BUY / ACCUMULATE',
      reason: ['Business and financial evidence are strong.', 'Valuation is not a major disqualifier and technical conditions are not in a downtrend.'],
    };
  }

  const technicallyWeak =
    technical.trend === 'DOWNTREND' ||
    (technical.distanceFrom200DMA != null && technical.distanceFrom200DMA < -20);

  if (score.overall >= 68 && score.risk < 55 && !technicallyWeak) {
    return {
      action: 'BUY ON WEAKNESS / HOLD',
      reason: ['Underlying evidence is constructive.', 'Entry valuation and price confirmation should be considered before adding aggressively.'],
    };
  }

  if (score.overall >= 60 && technicallyWeak) {
    return {
      action: 'WAIT / WATCH',
      reason: ['Underlying fundamentals may be constructive, but price is materially below the long-term trend reference.', 'Wait for technical recovery or a stronger margin of safety before adding aggressively.'],
    };
  }

  if (score.overall < 48 || score.risk >= 70) {
    return {
      action: 'AVOID / REVIEW',
      reason: ['Risk/reward is currently unattractive.', 'Re-check the investment thesis before committing capital.'],
    };
  }

  return {
    action: 'WAIT / WATCH',
    reason: ['Evidence is mixed.', 'Wait for better valuation, improving fundamentals, or technical confirmation.'],
  };
}

function sanitize(value) {
  if (value === undefined) return null;
  if (typeof value === 'number' && !Number.isFinite(value)) return null;
  if (Array.isArray(value)) return value.map(sanitize);
  if (value && typeof value === 'object') {
    const out={};
    for (const [k,v] of Object.entries(value)) out[k]=sanitize(v);
    return out;
  }
  return value;
}
export async function analyze(input) {
  const symbol = ticker(input);

  const [marketResult, fundamentalsResult] = await Promise.allSettled([
    fetchChart(symbol),
    fetchFundamentals(symbol),
  ]);

  if (marketResult.status !== 'fulfilled') {
    throw marketResult.reason;
  }

  const market = marketResult.value;
  const raw = fundamentalsResult.status === 'fulfilled'
    ? fundamentalsResult.value
    : { summary: null, annual: [], trailing: [], errors: { fatal: String(fundamentalsResult.reason?.message || fundamentalsResult.reason) } };

  const t = technical(market.rows);
  const financials = buildFinancials(raw);
  const valuation = buildValuation(raw, market.price);
  const ownership = buildOwnership(raw);
  const dataQuality = buildDataQuality(financials, valuation, ownership, t);
  const score = scoreStock(financials, valuation, t, dataQuality);
  const finalDecision = decision(score, valuation, t, dataQuality);

  const profile = raw.summary?.assetProfile || {};
  const quoteType = raw.summary?.quoteType || {};

  const stock = {
    symbol: String(input).toUpperCase().replace(/\.NS$|\.BO$/i, ''),
    yahooSymbol: symbol,
    name: quoteType.longName || quoteType.shortName || symbol,
    sector: profile.sector ?? null,
    industry: profile.industry ?? null,
    price: market.price,
    currency: market.currency,
    exchange: market.exchange,
    marketCap: valuation.marketCap,
    pe: valuation.trailingPE,
    pb: valuation.priceToBook,
    roe: financials.ratios.roe,
    de: financials.ratios.debtToEquity,
    fcfRaw: financials.current.freeCashFlow,
    fcfCrore: crore(financials.current.freeCashFlow),
    npm: financials.ratios.netMargin,
    opm: financials.ratios.operatingMargin,
    rg: financials.ratios.revenueGrowth,
    eg: financials.ratios.earningsGrowth,
    // The frontend labels this field in ₹ Cr, so expose the normalized crore value.
    fcf: crore(financials.current.freeCashFlow),
    low: t.low52Week,
    high: t.high52Week,
    dataNote: 'Live market data + Yahoo Finance quoteSummary/fundamentalsTimeSeries. Missing values are reported as null rather than invented.',
  };

  const response = {
    stock,
    score,
    fundamentals: financials,
    valuation,
    ownership,
    technical: t,
    dataQuality,
    decision: finalDecision,
    source: 'Yahoo Finance via yahoo-finance2 (normalized)',
    asOf: new Date().toISOString(),
  };
  return sanitize(response);
}
