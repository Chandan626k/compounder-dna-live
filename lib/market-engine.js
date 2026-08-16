import YahooFinance from 'yahoo-finance2';

// yahoo-finance2 v4 supports validateResult:false for provider responses whose
// runtime schema can lag Yahoo's live payload shape. We still normalize and
// validate every field inside this engine before it can affect scoring.
const yahooFinance = new YahooFinance();

const clamp = (v, a = 0, b = 100) =>
  Math.max(a, Math.min(b, Number.isFinite(v) ? v : a));

const num = (v) => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (v && typeof v === 'object' && Number.isFinite(v.raw)) return v.raw;
  return null;
};

const pct = (v) => {
  const n = num(v);
  return n == null ? null : n * 100;
};

const safeDivide = (a, b) =>
  Number.isFinite(a) && Number.isFinite(b) && b !== 0 ? a / b : null;

const finiteOrNull = (v) => (Number.isFinite(v) ? v : null);
const ratioPct = (a, b) => { const r = safeDivide(a, b); return r == null ? null : finiteOrNull(r * 100); };

function normalizeDebtToEquity(v) {
  const n = num(v);
  if (n == null || n < 0) return null;
  // Yahoo financialData.debtToEquity is commonly percentage-like.
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

function toDate(v) {
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v;
  if (typeof v === 'number' && Number.isFinite(v)) {
    const ms = v < 2e10 ? v * 1000 : v;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof v === 'string') {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function normalizeTimeSeriesRows(rows, requestedPeriod) {
  return (Array.isArray(rows) ? rows : [])
    .map((row) => {
      if (!row || typeof row !== 'object') return null;
      const date = toDate(row.date);
      if (!date) return null;
      const periodType = row.periodType == null ? null : String(row.periodType).toUpperCase();
      const periodStatus = periodType === 'TTM' || periodType === '12M' || periodType === '3M'
        ? 'verified'
        : 'missing';
      return {
        ...row,
        date: date.toISOString(),
        requestedPeriod,
        periodType,
        periodStatus,
        providerType: row.TYPE == null ? null : String(row.TYPE),
      };
    })
    .filter(Boolean)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

function rowsOfType(rows, types) {
  const allowed = new Set(types);
  return (rows || []).filter((r) => allowed.has(r?.TYPE));
}

function latest(rows, key) {
  const valid = (rows || []).filter((r) => num(r?.[key]) != null);
  return valid.length ? num(valid.at(-1)[key]) : null;
}

function latestRow(rows, predicate = () => true) {
  const valid = (rows || []).filter((r) => r && predicate(r));
  return valid.length ? valid.at(-1) : null;
}

function cagr(rows, key, years = 5) {
  const valid = (rows || [])
    .filter((r) => num(r?.[key]) != null && r?.periodType !== 'TTM')
    .map((r) => ({ ...r, _date: toDate(r.date) }))
    .filter((r) => r._date)
    .sort((a, b) => a._date - b._date);

  if (valid.length < 2) return null;

  const end = valid.at(-1);
  const targetMs = years * 365.25 * 24 * 60 * 60 * 1000;
  let start = valid[0];

  for (const row of valid) {
    if (end._date - row._date >= targetMs * 0.75) {
      start = row;
      break;
    }
  }

  const startValue = num(start[key]);
  const endValue = num(end[key]);
  const actualYears = (end._date - start._date) / (365.25 * 24 * 60 * 60 * 1000);

  if (!(startValue > 0) || !(endValue > 0) || actualYears < 1.5) return null;
  return finiteOrNull((Math.pow(endValue / startValue, 1 / actualYears) - 1) * 100);
}

function growthPct(current, previous) {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) return null;
  return finiteOrNull(((current / previous) - 1) * 100);
}

function growthFromRows(rows, key) {
  const valid = (rows || []).filter((r) => num(r?.[key]) != null && r?.periodType !== 'TTM');
  if (valid.length < 2) return null;
  return growthPct(num(valid.at(-1)[key]), num(valid.at(-2)[key]));
}

function sma(a, n) {
  return a.length < n ? null : finiteOrNull(a.slice(-n).reduce((s, v) => s + v, 0) / n);
}

function ema(a, n) {
  if (a.length < n) return null;
  let e = a.slice(0, n).reduce((s, v) => s + v, 0) / n;
  const k = 2 / (n + 1);
  for (let i = n; i < a.length; i++) e = a[i] * k + e * (1 - k);
  return finiteOrNull(e);
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
  if (loss === 0) return 100;
  return finiteOrNull(100 - 100 / (1 + gain / loss));
}

function atr(rows, n = 14) {
  if (rows.length <= n) return null;
  const tr = [];
  for (let i = 1; i < rows.length; i++) {
    const x = rows[i];
    const p = rows[i - 1];
    tr.push(Math.max(x.high - x.low, Math.abs(x.high - p.close), Math.abs(x.low - p.close)));
  }
  return sma(tr, n);
}

function percentChange(a, n) {
  if (a.length <= n) return null;
  return growthPct(a.at(-1), a.at(-1 - n));
}

function technical(rows) {
  const close = rows.map((r) => r.close);
  const volume = rows.map((r) => r.volume);
  const last = close.at(-1) ?? null;
  const s20 = sma(close, 20);
  const s50 = sma(close, 50);
  const s200 = sma(close, 200);
  const e20 = ema(close, 20);
  const e50 = ema(close, 50);
  const e200 = ema(close, 200);
  const rr = rsi(close);
  const aa = atr(rows);
  const avgV = sma(volume, 20);
  const recent20 = rows.slice(-20);
  const recent252 = rows.slice(-252);
  const hi20 = recent20.length ? Math.max(...recent20.map((r) => r.high)) : null;
  const lo20 = recent20.length ? Math.min(...recent20.map((r) => r.low)) : null;
  const hi52 = recent252.length ? Math.max(...recent252.map((r) => r.high)) : null;
  const lo52 = recent252.length ? Math.min(...recent252.map((r) => r.low)) : null;

  const trend =
    e200 != null
      ? last > e20 && e20 > e50 && e50 > e200
        ? 'STRONG UPTREND'
        : last > e50 && e50 > e200
          ? 'UPTREND'
          : last < e50 && e50 < e200
            ? 'DOWNTREND'
            : 'RECOVERING / MIXED'
      : last != null && last > (s50 || last)
        ? 'UPTREND'
        : 'RECOVERING / MIXED';

  return {
    prices: close,
    s20, s50, s200, e20, e50, e200,
    rsi: rr,
    atr: aa,
    high: hi52,
    low: lo52,
    high52Week: hi52,
    low52Week: lo52,
    support: lo20,
    resistance: hi20,
    volume: volume.at(-1) ?? null,
    avgVolume: avgV,
    volumeSpike: avgV != null ? finiteOrNull(volume.at(-1) / avgV) : null,
    trend,
    last,
    change1d: percentChange(close, 1),
    change20d: percentChange(close, 20),
    change3m: percentChange(close, 63),
    change6m: percentChange(close, 126),
    change1y: percentChange(close, 252),
    distanceFrom200DMA: s200 != null ? growthPct(last, s200) : null,
    distanceFrom52WHigh: hi52 != null ? growthPct(last, hi52) : null,
    distanceFrom52WLow: lo52 != null ? growthPct(last, lo52) : null,
    drawdownFrom52WHigh: hi52 != null && last != null ? finiteOrNull((1 - last / hi52) * 100) : null,
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
  if (Array.isArray(data?.quotes)) {
    for (const item of data.quotes) {
      const date = toDate(item?.date);
      const close = num(item?.close);
      const high = num(item?.high);
      const low = num(item?.low);
      const volume = num(item?.volume);
      if (date && close != null && high != null && low != null && volume != null) {
        rows.push({ date: date.toISOString(), close, high, low, volume });
      }
    }
  } else {
    const timestamps = data?.timestamp || [];
    const q = data?.indicators?.quote?.[0] || {};
    for (let i = 0; i < timestamps.length; i++) {
      const date = toDate(timestamps[i]);
      const close = num(q.close?.[i]);
      const high = num(q.high?.[i]);
      const low = num(q.low?.[i]);
      const volume = num(q.volume?.[i]);
      if (date && close != null && high != null && low != null && volume != null) {
        rows.push({ date: date.toISOString(), close, high, low, volume });
      }
    }
  }

  if (rows.length < 30) throw Error(`Insufficient market data (${rows.length} points)`);

  return {
    symbol,
    currency: data?.meta?.currency || null,
    exchange: data?.meta?.exchangeName || null,
    price: num(data?.meta?.regularMarketPrice) ?? rows.at(-1).close,
    rows,
  };
}

async function fetchFundamentals(symbol) {
  const period1 = new Date(Date.now() - 7 * 365.25 * 24 * 60 * 60 * 1000);
  const period2 = new Date();

  const [summaryResult, annualResult, trailingResult] = await Promise.allSettled([
    yahooFinance.quoteSummary(symbol, {
      modules: [
        'price',
        'summaryDetail',
        'defaultKeyStatistics',
        'financialData',
        'assetProfile',
        'majorHoldersBreakdown',
        'institutionOwnership',
        'insiderHolders',
        'insiderTransactions',
        'earningsTrend',
        'quoteType',
      ],
    }),
    // Yahoo currently returns valid TTM/ALL rows that yahoo-finance2 v4.0.2's
    // generated schema rejects. Skip only provider validation; do not skip ours.
    yahooFinance.fundamentalsTimeSeries(
      symbol,
      { period1, period2, type: 'annual', module: 'all' },
      { validateResult: false },
    ),
    yahooFinance.fundamentalsTimeSeries(
      symbol,
      { period1: new Date(Date.now() - 24 * 30 * 24 * 60 * 60 * 1000), period2, type: 'trailing', module: 'all' },
      { validateResult: false },
    ),
  ]);

  const annual = annualResult.status === 'fulfilled'
    ? normalizeTimeSeriesRows(annualResult.value, 'annual')
    : [];
  const trailing = trailingResult.status === 'fulfilled'
    ? normalizeTimeSeriesRows(trailingResult.value, 'trailing')
    : [];

  return {
    summary: summaryResult.status === 'fulfilled' ? summaryResult.value : null,
    annual,
    trailing,
    errors: {
      summary: summaryResult.status === 'rejected' ? String(summaryResult.reason?.message || summaryResult.reason) : null,
      annual: annualResult.status === 'rejected' ? String(summaryResult.reason?.message || annualResult.reason) : null,
      trailing: trailingResult.status === 'rejected' ? String(trailingResult.reason?.message || trailingResult.reason) : null,
    },
    providerValidation: {
      annual: false,
      trailing: false,
      reason: 'yahoo-finance2 schema currently rejects valid Yahoo TTM/ALL payloads; application-level normalization is authoritative.',
    },
  };
}

function buildFinancials(raw) {
  const f = raw.summary?.financialData || {};
  const k = raw.summary?.defaultKeyStatistics || {};

  const annual = raw.annual || [];
  const trailing = raw.trailing || [];
  const annualFinancials = rowsOfType(annual, ['FINANCIALS', 'ALL']);
  const annualBalance = rowsOfType(annual, ['BALANCE_SHEET', 'ALL']);
  const annualCash = rowsOfType(annual, ['CASH_FLOW', 'ALL']);
  const trailingFinancials = rowsOfType(trailing, ['FINANCIALS', 'ALL']);
  const trailingBalance = rowsOfType(trailing, ['BALANCE_SHEET', 'ALL']);
  const trailingCash = rowsOfType(trailing, ['CASH_FLOW', 'ALL']);

  const ttmIncome = latestRow(trailingFinancials, (r) => r.periodType === 'TTM');
  const ttmCash = latestRow(trailingCash, (r) => r.periodType === 'TTM');

  const revenue = num(ttmIncome?.totalRevenue) ?? latest(annualFinancials, 'totalRevenue') ?? value(f, 'totalRevenue');
  const ebitda = num(ttmIncome?.EBITDA) ?? latest(annualFinancials, 'EBITDA') ?? value(f, 'ebitda');
  const operatingIncome = num(ttmIncome?.totalOperatingIncomeAsReported) ?? latest(annualFinancials, 'totalOperatingIncomeAsReported') ?? value(f, 'operatingIncome');
  const netIncome = num(ttmIncome?.netIncomeFromContinuingAndDiscontinuedOperation) ?? latest(annualFinancials, 'netIncomeFromContinuingAndDiscontinuedOperation') ?? value(k, 'netIncomeToCommon');
  const eps = num(ttmIncome?.dilutedEPS) ?? latest(annualFinancials, 'dilutedEPS') ?? value(k, 'trailingEps');
  const freeCashFlow = value(f, 'freeCashflow') ?? num(ttmCash?.freeCashFlow) ?? latest(annualCash, 'freeCashFlow');
  const operatingCashFlow = value(f, 'operatingCashflow') ?? num(ttmCash?.operatingCashFlow) ?? latest(annualCash, 'operatingCashFlow');

  const totalDebt = value(f, 'totalDebt') ?? num(ttmBalanceFromRows(trailingBalance)?.totalDebt) ?? latest(annualBalance, 'totalDebt');
  const netDebt = num(ttmBalanceFromRows(trailingBalance)?.netDebt) ?? latest(annualBalance, 'netDebt');
  const cash = value(f, 'totalCash') ?? num(ttmBalanceFromRows(trailingBalance)?.cashCashEquivalentsAndShortTermInvestments) ?? latest(annualBalance, 'cashCashEquivalentsAndShortTermInvestments');
  const equity = num(ttmBalanceFromRows(trailingBalance)?.stockholdersEquity) ?? num(ttmBalanceFromRows(trailingBalance)?.commonStockEquity) ?? latest(annualBalance, 'stockholdersEquity') ?? latest(annualBalance, 'commonStockEquity');
  const assets = num(ttmBalanceFromRows(trailingBalance)?.totalAssets) ?? latest(annualBalance, 'totalAssets');
  const currentAssets = num(ttmBalanceFromRows(trailingBalance)?.currentAssets) ?? latest(annualBalance, 'currentAssets');
  const currentLiabilities = num(ttmBalanceFromRows(trailingBalance)?.currentLiabilities) ?? latest(annualBalance, 'currentLiabilities');
  const shares = value(k, 'sharesOutstanding') ?? num(ttmBalanceFromRows(trailingBalance)?.ordinarySharesNumber) ?? latest(annualBalance, 'ordinarySharesNumber');

  const roe = pct(value(f, 'returnOnEquity')) ?? ratioPct(netIncome, equity);
  const roa = pct(value(f, 'returnOnAssets')) ?? ratioPct(netIncome, assets);
  const debtToEquity = normalizeDebtToEquity(value(f, 'debtToEquity')) ?? safeDivide(totalDebt, equity);
  const operatingMargin = pct(value(f, 'operatingMargins')) ?? ratioPct(operatingIncome, revenue);
  const netMargin = pct(value(f, 'profitMargins')) ?? ratioPct(netIncome, revenue);
  const ebitdaMargin = pct(value(f, 'ebitdaMargins')) ?? ratioPct(ebitda, revenue);
  const revenueGrowth = pct(value(f, 'revenueGrowth')) ?? growthFromRows(annualFinancials, 'totalRevenue');
  const earningsGrowth = pct(value(f, 'earningsGrowth')) ?? growthFromRows(annualFinancials, 'netIncomeFromContinuingAndDiscontinuedOperation');
  const epsGrowth = growthFromRows(annualFinancials, 'dilutedEPS');
  const fcfGrowth = growthFromRows(annualCash, 'freeCashFlow');
  const interestCoverage = value(f, 'interestCoverage') ?? safeDivide(operatingIncome, value(f, 'interestExpense'));
  const roceCapital = totalDebt != null && equity != null && cash != null ? totalDebt + equity - cash : null;
  const roce = safeDivide(operatingIncome, roceCapital) == null ? null : safeDivide(operatingIncome, roceCapital) * 100;

  const periods = {
    revenue: ttmIncome?.periodType === 'TTM' ? 'TTM' : 'annual',
    netIncome: ttmIncome?.periodType === 'TTM' ? 'TTM' : 'annual',
    eps: ttmIncome?.periodType === 'TTM' ? 'TTM' : 'annual',
    freeCashFlow: ttmCash?.periodType === 'TTM' ? 'TTM' : 'annual',
    balanceSheet: trailingBalance.length ? (trailingBalance.at(-1)?.periodType || 'trailing') : 'annual',
  };

  return {
    current: {
      revenue, ebitda, operatingIncome, netIncome, eps, freeCashFlow, operatingCashFlow,
      totalDebt, netDebt, cash, equity, assets, shares, currentAssets, currentLiabilities,
    },
    ratios: {
      roe, roa, debtToEquity,
      currentRatio: value(f, 'currentRatio') ?? safeDivide(currentAssets, currentLiabilities),
      quickRatio: value(f, 'quickRatio'),
      grossMargin: pct(value(f, 'grossMargins')),
      operatingMargin,
      netMargin,
      ebitdaMargin,
      revenueGrowth,
      earningsGrowth,
      epsGrowth,
      fcfGrowth,
      interestCoverage,
      roce,
      earningsQuarterlyGrowth: pct(value(k, 'earningsQuarterlyGrowth')),
    },
    growth: {
      revenue3yCagr: cagr(annualFinancials, 'totalRevenue', 3),
      revenue5yCagr: cagr(annualFinancials, 'totalRevenue', 5),
      eps3yCagr: cagr(annualFinancials, 'dilutedEPS', 3),
      eps5yCagr: cagr(annualFinancials, 'dilutedEPS', 5),
      pat3yCagr: cagr(annualFinancials, 'netIncomeFromContinuingAndDiscontinuedOperation', 3),
      pat5yCagr: cagr(annualFinancials, 'netIncomeFromContinuingAndDiscontinuedOperation', 5),
      latestRevenueGrowth: growthFromRows(annualFinancials, 'totalRevenue'),
      latestEPSGrowth: epsGrowth,
      latestProfitGrowth: growthFromRows(annualFinancials, 'netIncomeFromContinuingAndDiscontinuedOperation'),
      latestFCFGrowth: fcfGrowth,
    },
    derived: {
      debtToEquityFromStatements: safeDivide(totalDebt, equity),
      netDebtToEbitda: netDebt != null && ebitda > 0 ? safeDivide(netDebt, ebitda) : null,
      fcfMargin: ratioPct(freeCashFlow, revenue),
      fcfConversion: ratioPct(freeCashFlow, netIncome),
      currentRatioFromStatements: safeDivide(currentAssets, currentLiabilities),
      roce,
    },
    periods,
    rawAvailability: {
      quoteSummary: Boolean(raw.summary),
      annualStatements: annualFinancials.length > 0,
      annualBalanceSheet: annualBalance.length > 0,
      annualCashFlow: annualCash.length > 0,
      trailingTTM: Boolean(ttmIncome || ttmCash),
    },
    sourceNote: 'Yahoo Finance quoteSummary + fundamentalsTimeSeries. TTM is treated as a verified reporting period; derived values are explicitly calculated; unavailable values remain null.',
  };
}

function ttmBalanceFromRows(rows) {
  return latestRow(rows, (r) => r.periodType === 'TTM') || latestRow(rows);
}

function buildValuation(raw, price, financials) {
  const d = raw.summary?.summaryDetail || {};
  const k = raw.summary?.defaultKeyStatistics || {};
  const f = raw.summary?.financialData || {};

  const marketCap = value(d, 'marketCap') ?? value(raw.summary?.price, 'marketCap');
  const trailingPE = value(d, 'trailingPE') ?? (financials.current.eps > 0 ? safeDivide(price, financials.current.eps) : null);
  const forwardPE = value(d, 'forwardPE') ?? value(k, 'forwardPE');
  const priceToBook = value(k, 'priceToBook') ?? (financials.current.equity > 0 && financials.current.shares > 0 ? safeDivide(price, safeDivide(financials.current.equity, financials.current.shares)) : null);
  const pegRatio = value(k, 'pegRatio');
  const enterpriseValue = value(k, 'enterpriseValue');
  const evToEbitda = value(k, 'enterpriseToEbitda') ?? (enterpriseValue != null && financials.current.ebitda > 0 ? safeDivide(enterpriseValue, financials.current.ebitda) : null);
  const evToRevenue = value(k, 'enterpriseToRevenue') ?? (enterpriseValue != null && financials.current.revenue > 0 ? safeDivide(enterpriseValue, financials.current.revenue) : null);
  const trailingEps = value(k, 'trailingEps') ?? financials.current.eps;
  const forwardEps = value(k, 'forwardEps');
  const bookValue = value(k, 'bookValue') ?? (financials.current.equity != null && financials.current.shares > 0 ? safeDivide(financials.current.equity, financials.current.shares) : null);

  const growthSignal = [financials.growth.eps3yCagr, financials.growth.eps5yCagr, financials.growth.pat3yCagr, financials.growth.pat5yCagr, financials.ratios.earningsGrowth]
    .filter((x) => Number.isFinite(x) && x > -50 && x < 100);
  const growthAvg = growthSignal.length ? growthSignal.reduce((a, b) => a + b, 0) / growthSignal.length : null;

  const qualityPremium = financials.ratios.roe == null ? 0 : financials.ratios.roe >= 30 ? 4 : financials.ratios.roe >= 20 ? 2.5 : financials.ratios.roe >= 15 ? 1 : 0;
  const baseGrowth = growthAvg == null ? null : Math.max(-5, Math.min(30, growthAvg));
  const conservativeGrowth = baseGrowth == null ? null : Math.max(-5, baseGrowth * 0.70);
  const optimisticGrowth = baseGrowth == null ? null : Math.min(35, Math.max(-5, baseGrowth * 1.20));
  const justifiedPE = (growth) => growth == null ? null : Math.max(10, Math.min(32, 12 + growth * 0.75 + qualityPremium));
  const conservativePE = justifiedPE(conservativeGrowth);
  const basePE = justifiedPE(baseGrowth);
  const optimisticPE = justifiedPE(optimisticGrowth);
  const fair = (eps, pe) => eps > 0 && pe > 0 ? eps * pe : null;
  const avg = (a) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
  const conservativeFairValue = avg([fair(forwardEps, conservativePE), fair(trailingEps, conservativePE)].filter(Number.isFinite));
  const baseFairValue = avg([fair(forwardEps, basePE), fair(trailingEps, basePE)].filter(Number.isFinite));
  const optimisticFairValue = avg([fair(forwardEps, optimisticPE), fair(trailingEps, optimisticPE)].filter(Number.isFinite));
  const pbReference = bookValue > 0 && priceToBook > 0 ? bookValue * priceToBook : null;
  const valuationGap = baseFairValue && price ? ((price / baseFairValue) - 1) * 100 : null;
  const verdict = baseFairValue == null ? 'DATA INSUFFICIENT' : valuationGap <= -20 ? 'DEEPLY UNDERVALUED' : valuationGap <= -8 ? 'ATTRACTIVE' : valuationGap <= 8 ? 'FAIR / REASONABLE' : valuationGap <= 20 ? 'EXPENSIVE' : 'VERY EXPENSIVE';

  return {
    currentPrice: price,
    marketCap,
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
    growthSignal: growthAvg,
    revenueGrowth: financials.ratios.revenueGrowth,
    revenue3yCagr: financials.growth.revenue3yCagr,
    revenue5yCagr: financials.growth.revenue5yCagr,
    eps3yCagr: financials.growth.eps3yCagr,
    eps5yCagr: financials.growth.eps5yCagr,
    pat3yCagr: financials.growth.pat3yCagr,
    pat5yCagr: financials.growth.pat5yCagr,
    roe: financials.ratios.roe,
    conservativeGrowth, baseGrowth, optimisticGrowth,
    conservativePE, basePE, optimisticPE,
    conservativeFairValue, baseFairValue, optimisticFairValue,
    fairValue: baseFairValue,
    pbReference,
    upsideToFairValue: baseFairValue && price ? ((baseFairValue / price) - 1) * 100 : null,
    marginOfSafety: baseFairValue && price ? (1 - price / baseFairValue) * 100 : null,
    valuationGap,
    verdict,
    method: 'Growth-adjusted justified P/E using verified EPS/growth/ROE data; P/B is kept as a separate reference.',
    status: baseFairValue == null ? 'unavailable' : 'calculated',
  };
}

function buildOwnership(raw) {
  const k = raw.summary?.defaultKeyStatistics || {};
  return {
    insidersPct: pct(value(k, 'heldPercentInsiders')),
    institutionsPct: pct(value(k, 'heldPercentInstitutions')),
    majorHolders: raw.summary?.majorHoldersBreakdown || null,
    institutionOwnership: raw.summary?.institutionOwnership?.ownershipList || [],
    insiderHolders: raw.summary?.insiderHolders?.holders || [],
    insiderTransactions: raw.summary?.insiderTransactions?.transactions || [],
    sourceNote: 'Ownership fields depend on Yahoo availability and may be delayed or incomplete.',
  };
}

function buildDataQuality(financials, valuation, technical) {
  const checks = [
    ['price', valuation.currentPrice, true],
    ['P/E', valuation.trailingPE, true],
    ['P/B', valuation.priceToBook, false],
    ['ROE', financials.ratios.roe, true],
    ['ROA', financials.ratios.roa, false],
    ['ROCE', financials.ratios.roce, false],
    ['Debt/Equity', financials.ratios.debtToEquity, true],
    ['Net Margin', financials.ratios.netMargin, true],
    ['Operating Margin', financials.ratios.operatingMargin, true],
    ['Revenue Growth', financials.ratios.revenueGrowth, true],
    ['Earnings Growth', financials.ratios.earningsGrowth, true],
    ['EPS Growth', financials.ratios.epsGrowth, false],
    ['Free Cash Flow', financials.current.freeCashFlow, true],
    ['5Y Revenue CAGR', financials.growth.revenue5yCagr, false],
    ['5Y EPS CAGR', financials.growth.eps5yCagr, false],
    ['RSI', technical.rsi, false],
    ['200 DMA', technical.s200, false],
    ['52W High/Low', technical.high52Week != null && technical.low52Week != null ? 1 : null, false],
  ];
  const available = checks.filter(([, v]) => v != null).length;
  const completeness = Math.round((available / checks.length) * 100);
  const critical = checks.filter(([, , isCritical]) => isCritical);
  const criticalAvailable = critical.filter(([, v]) => v != null).length;
  const criticalCompleteness = Math.round((criticalAvailable / critical.length) * 100);
  const historyScore = financials.rawAvailability.annualStatements && financials.rawAvailability.annualBalanceSheet && financials.rawAvailability.annualCashFlow ? 100 : financials.rawAvailability.trailingTTM ? 70 : 35;
  const confidence = Math.round(clamp(completeness * 0.55 + criticalCompleteness * 0.30 + historyScore * 0.15));

  return {
    completeness,
    criticalCompleteness,
    confidence,
    available,
    total: checks.length,
    verifiedFields: [
      financials.rawAvailability.quoteSummary ? 'quoteSummary' : null,
      financials.rawAvailability.trailingTTM ? 'TTM fundamentals' : null,
      financials.rawAvailability.annualStatements ? 'annual statements' : null,
      financials.rawAvailability.annualBalanceSheet ? 'annual balance sheet' : null,
      financials.rawAvailability.annualCashFlow ? 'annual cash flow' : null,
    ].filter(Boolean),
    calculatedFields: ['operatingMargin', 'netMargin', 'ROA', 'ROCE', 'Debt/Equity from statements', 'FCF margin', 'FCF conversion', 'growth metrics', 'technical indicators', 'fair value'].filter((field) => {
      const map = {
        operatingMargin: financials.ratios.operatingMargin,
        netMargin: financials.ratios.netMargin,
        ROA: financials.ratios.roa,
        ROCE: financials.ratios.roce,
        'Debt/Equity from statements': financials.derived.debtToEquityFromStatements,
        'FCF margin': financials.derived.fcfMargin,
        'FCF conversion': financials.derived.fcfConversion,
        'growth metrics': financials.ratios.revenueGrowth ?? financials.ratios.earningsGrowth,
        'technical indicators': technical.rsi ?? technical.s200,
        'fair value': valuation.fairValue,
      };
      return map[field] != null;
    }),
    missingFields: checks.filter(([, v]) => v == null).map(([name]) => name),
    staleFields: [],
    status: confidence >= 85 ? 'STRONG' : confidence >= 65 ? 'PARTIAL' : 'WEAK',
    warnings: [
      ...(!financials.rawAvailability.quoteSummary ? ['Quote summary unavailable.'] : []),
      ...(!financials.rawAvailability.annualStatements ? ['Annual financial statements unavailable.'] : []),
      ...(!financials.rawAvailability.annualBalanceSheet ? ['Annual balance sheet unavailable.'] : []),
      ...(!financials.rawAvailability.annualCashFlow ? ['Annual cash-flow statement unavailable.'] : []),
      ...(financials.rawAvailability.trailingTTM ? ['TTM provider payload accepted and normalized with application-level validation.'] : []),
    ],
  };
}

function scoreStock(financials, valuation, technical, quality, sector) {
  const r = financials.ratios;
  const g = financials.growth;
  const d = financials.derived;
  const isFinancial = /bank|financial|nbfc|insurance|credit/i.test(String(sector || ''));

  let q = 50;
  if (r.roe != null) q += r.roe >= 25 ? 18 : r.roe >= 20 ? 14 : r.roe >= 15 ? 9 : r.roe >= 10 ? 4 : -6;
  if (r.operatingMargin != null) q += r.operatingMargin >= 25 ? 10 : r.operatingMargin >= 15 ? 7 : r.operatingMargin >= 10 ? 3 : -3;
  if (r.netMargin != null) q += r.netMargin >= 20 ? 8 : r.netMargin >= 12 ? 5 : r.netMargin >= 7 ? 2 : -3;
  if (d.fcfConversion != null) q += d.fcfConversion >= 100 ? 8 : d.fcfConversion >= 80 ? 5 : d.fcfConversion >= 60 ? 2 : -5;
  if (g.revenue5yCagr != null) q += g.revenue5yCagr >= 15 ? 8 : g.revenue5yCagr >= 10 ? 5 : g.revenue5yCagr >= 5 ? 2 : 0;
  q = clamp(q);

  const growthRates = [g.revenue5yCagr, g.eps5yCagr, g.pat5yCagr].filter(Number.isFinite);
  let growth = 50;
  if (growthRates.length) growth = clamp(50 + (growthRates.reduce((a, b) => a + b, 0) / growthRates.length) * 2.2);

  let financialStrength = 60;
  if (r.debtToEquity != null && !isFinancial) financialStrength += r.debtToEquity <= 0.25 ? 20 : r.debtToEquity <= 0.75 ? 10 : r.debtToEquity <= 1.5 ? 0 : r.debtToEquity <= 2.5 ? -8 : -18;
  if (d.netDebtToEbitda != null && !isFinancial) financialStrength += d.netDebtToEbitda <= 0 ? 10 : d.netDebtToEbitda <= 1 ? 8 : d.netDebtToEbitda <= 2 ? 3 : d.netDebtToEbitda <= 3 ? -5 : -15;
  if (r.currentRatio != null && !isFinancial) financialStrength += r.currentRatio >= 1.5 ? 8 : r.currentRatio >= 1 ? 3 : -8;
  financialStrength = clamp(financialStrength);

  let wealth = 50;
  if (r.roe != null) wealth += r.roe >= 20 ? 15 : r.roe >= 15 ? 10 : r.roe >= 10 ? 5 : 0;
  if (d.fcfConversion != null) wealth += d.fcfConversion >= 90 ? 12 : d.fcfConversion >= 70 ? 8 : d.fcfConversion >= 50 ? 4 : -5;
  if (g.eps5yCagr != null) wealth += g.eps5yCagr >= 15 ? 13 : g.eps5yCagr >= 10 ? 8 : g.eps5yCagr >= 5 ? 4 : 0;
  wealth = clamp(wealth);

  let valuationScore = 50;
  if (valuation.trailingPE != null && valuation.trailingPE > 0) valuationScore = clamp(100 - Math.max(0, valuation.trailingPE - 15) * 2.2);
  if (valuation.marginOfSafety != null) valuationScore = clamp(valuationScore + valuation.marginOfSafety * 0.8);

  let technicalScore = 50;
  if (technical.trend === 'STRONG UPTREND') technicalScore += 25;
  else if (technical.trend === 'UPTREND') technicalScore += 15;
  else if (technical.trend === 'DOWNTREND') technicalScore -= 20;
  if (technical.rsi != null) technicalScore += technical.rsi >= 70 ? -10 : technical.rsi >= 50 ? 8 : technical.rsi < 30 ? 4 : 0;
  technicalScore = clamp(technicalScore);

  let risk = 35;
  if (r.debtToEquity != null && r.debtToEquity > 1.5 && !isFinancial) risk += 20;
  if (valuation.trailingPE != null && valuation.trailingPE > 40) risk += 18;
  if (technical.trend === 'DOWNTREND') risk += 12;
  if (quality.confidence < 70) risk += 15;
  risk = clamp(risk);

  const rawOverall = clamp(
    q * 0.23 + growth * 0.17 + wealth * 0.15 + financialStrength * 0.20 +
    valuationScore * 0.15 + technicalScore * 0.05 + (100 - risk) * 0.05,
  );
  const confidenceAdjustedOverall = Math.round(clamp(rawOverall * (0.65 + quality.confidence * 0.0035)));

  return {
    quality: Math.round(q),
    wealth: Math.round(wealth),
    growth: Math.round(growth),
    financialStrength: Math.round(financialStrength),
    valuation: Math.round(valuationScore),
    technical: Math.round(technicalScore),
    risk: Math.round(risk),
    confidence: Math.round(quality.confidence),
    rawOverall: Math.round(rawOverall),
    overall: confidenceAdjustedOverall,
    riskModel: isFinancial ? 'financial-institution-adjusted' : 'standard-non-financial',
  };
}

function decision(score, valuation, technical, quality) {
  if (quality.confidence < 60) {
    return {
      action: 'DATA INSUFFICIENT',
      reason: ['Critical market or financial evidence is missing.', 'Do not make a capital-allocation decision until data completeness improves.'],
    };
  }
  if (valuation.verdict === 'VERY EXPENSIVE' && score.overall >= 68) {
    return { action: 'WAIT / WATCH', reason: ['Business quality may be strong, but valuation is stretched.', 'Wait for a better entry price or materially stronger earnings growth.'] };
  }
  if (score.overall >= 78 && score.risk < 40 && technical.trend !== 'DOWNTREND' && !['EXPENSIVE', 'VERY EXPENSIVE'].includes(valuation.verdict)) {
    return { action: 'BUY / ACCUMULATE', reason: ['Business and financial evidence are strong.', 'Valuation and technical conditions do not currently disqualify the setup.'] };
  }
  if (score.overall >= 68 && score.risk < 55) {
    return { action: 'BUY ON WEAKNESS / HOLD', reason: ['Underlying evidence is constructive.', 'Entry valuation and price confirmation should be considered before adding aggressively.'] };
  }
  if (score.overall < 48 || score.risk >= 70) {
    return { action: 'AVOID / REVIEW', reason: ['Risk/reward is currently unattractive.', 'Re-check the investment thesis before committing capital.'] };
  }
  return { action: 'WAIT / WATCH', reason: ['Evidence is mixed.', 'Wait for better valuation, improving fundamentals, or technical confirmation.'] };
}

function assertSerializable(value, path = '$') {
  if (typeof value === 'number' && !Number.isFinite(value)) throw new Error(`Invalid numeric value at ${path}`);
  if (value === undefined) throw new Error(`Undefined value at ${path}`);
  if (Array.isArray(value)) value.forEach((v, i) => assertSerializable(v, `${path}[${i}]`));
  else if (value && typeof value === 'object') Object.entries(value).forEach(([k, v]) => assertSerializable(v, `${path}.${k}`));
}

export async function analyze(input) {
  const symbol = ticker(input);
  const [marketResult, fundamentalsResult] = await Promise.allSettled([fetchChart(symbol), fetchFundamentals(symbol)]);
  if (marketResult.status !== 'fulfilled') throw marketResult.reason;

  const market = marketResult.value;
  const raw = fundamentalsResult.status === 'fulfilled'
    ? fundamentalsResult.value
    : { summary: null, annual: [], trailing: [], errors: { fatal: 'Fundamental data unavailable' }, providerValidation: { annual: false, trailing: false } };

  const t = technical(market.rows);
  const financials = buildFinancials(raw);
  const valuation = buildValuation(raw, market.price, financials);
  const ownership = buildOwnership(raw);
  const profile = raw.summary?.assetProfile || {};
  const quoteType = raw.summary?.quoteType || {};
  const sector = profile.sector || null;
  const quality = buildDataQuality(financials, valuation, t);
  const score = scoreStock(financials, valuation, t, quality, sector);
  const finalDecision = decision(score, valuation, t, quality);

  const stock = {
    symbol: String(input).toUpperCase().replace(/\.NS$|\.BO$/i, ''),
    yahooSymbol: symbol,
    name: quoteType.longName || quoteType.shortName || symbol,
    sector,
    industry: profile.industry || null,
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
    low: t.low52Week,
    high: t.high52Week,
    dataNote: 'Live Yahoo Finance data. Missing values are null and never fabricated.',
  };

  const result = {
    stock,
    score,
    fundamentals: financials,
    valuation,
    ownership,
    technical: t,
    dataQuality: quality,
    decision: finalDecision,
    source: 'Yahoo Finance via yahoo-finance2',
    asOf: new Date().toISOString(),
  };

  assertSerializable(result);
  return result;
}

export const __test = {
  normalizeTimeSeriesRows,
  growthPct,
  cagr,
  technical,
  buildDataQuality,
  scoreStock,
};
