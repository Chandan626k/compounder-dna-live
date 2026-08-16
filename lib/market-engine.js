
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

const ticker = (input) => {
  let x = String(input || '').trim().toUpperCase().replace(/\s+/g, '');
  if (!x) throw Error('Stock symbol is required');
  if (x.endsWith('.NS') || x.endsWith('.BO') || x.startsWith('^')) return x;
  return `${x}.NS`;
};

function value(obj, key) {
  return num(obj?.[key]);
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
  return a.length <= n ? null : ((a.at(-1) / a.at(-1 - n)) - 1) * 100;
}

function technical(rows) {
  const close = rows.map((r) => r.close);
  const volume = rows.map((r) => r.volume);
  const last = close.at(-1);
  const s20 = sma(close, 20);
  const s50 = sma(close, 50);
  const s200 = sma(close, 200);
  const e20 = ema(close, 20);
  const e50 = ema(close, 50);
  const e200 = ema(close, 200);
  const rr = rsi(close);
  const aa = atr(rows);
  const avgV = sma(volume, 20);
  const hi20 = Math.max(...rows.slice(-20).map((r) => r.high));
  const lo20 = Math.min(...rows.slice(-20).map((r) => r.low));
  const hi60 = Math.max(...rows.slice(-60).map((r) => r.high));
  const lo60 = Math.min(...rows.slice(-60).map((r) => r.low));

  const trend =
    e200 != null
      ? last > e20 && e20 > e50 && e50 > e200
        ? 'STRONG UPTREND'
        : last > e50 && e50 > e200
          ? 'UPTREND'
          : last < e50 && e50 < e200
            ? 'DOWNTREND'
            : 'RECOVERING / MIXED'
      : last > (s50 || last)
        ? 'UPTREND'
        : 'RECOVERING / MIXED';

  return {
    prices: close,
    s20, s50, s200, e20, e50, e200,
    rsi: rr,
    atr: aa,
    high: hi60,
    low: lo60,
    support: lo20,
    resistance: hi20,
    volume: volume.at(-1),
    avgVolume: avgV,
    volumeSpike: avgV ? volume.at(-1) / avgV : null,
    trend,
    last,
    change1d: percentChange(close, 1),
    change20d: percentChange(close, 20),
    change3m: percentChange(close, 63),
    change6m: percentChange(close, 126),
    change1y: percentChange(close, 252),
    distanceFrom200DMA: s200 ? ((last / s200) - 1) * 100 : null,
    distanceFrom52WHigh: hi60 ? ((last / hi60) - 1) * 100 : null,
    distanceFrom52WLow: lo60 ? ((last / lo60) - 1) * 100 : null,
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
  const period1 = new Date(Date.now() - 6 * 365.25 * 24 * 60 * 60 * 1000);
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
      ],
    }),
    yahooFinance.fundamentalsTimeSeries(symbol, {
      period1,
      period2,
      type: 'annual',
      module: 'all',
    }),
    yahooFinance.fundamentalsTimeSeries(symbol, {
      period1: new Date(Date.now() - 18 * 30 * 24 * 60 * 60 * 1000),
      period2,
      type: 'trailing',
      module: 'all',
    }),
  ]);

  return {
    summary: summaryResult.status === 'fulfilled' ? summaryResult.value : null,
    annual: annualResult.status === 'fulfilled' ? annualResult.value : [],
    trailing: trailingResult.status === 'fulfilled' ? trailingResult.value : [],
    errors: {
      summary: summaryResult.status === 'rejected' ? String(summaryResult.reason?.message || summaryResult.reason) : null,
      annual: annualResult.status === 'rejected' ? String(annualResult.reason?.message || annualResult.reason) : null,
      trailing: trailingResult.status === 'rejected' ? String(trailingResult.reason?.message || trailingResult.reason) : null,
    },
  };
}

function buildFinancials(raw) {
  const f = raw.summary?.financialData || {};
  const k = raw.summary?.defaultKeyStatistics || {};
  const d = raw.summary?.summaryDetail || {};

  const annualFinancials = raw.annual.filter((r) => r?.TYPE === 'FINANCIALS');
  const annualBalance = raw.annual.filter((r) => r?.TYPE === 'BALANCE_SHEET');
  const annualCash = raw.annual.filter((r) => r?.TYPE === 'CASH_FLOW');

  const revenue = latest(annualFinancials, 'totalRevenue') ?? value(f, 'totalRevenue');
  const ebitda = latest(annualFinancials, 'EBITDA') ?? value(f, 'ebitda');
  const netIncome = latest(annualFinancials, 'netIncomeFromContinuingAndDiscontinuedOperation') ?? value(k, 'netIncomeToCommon');
  const freeCashFlow = value(f, 'freeCashflow') ?? latest(annualCash, 'freeCashFlow');
  const operatingCashFlow = value(f, 'operatingCashflow') ?? latest(annualCash, 'operatingCashFlow');

  const totalDebt = value(f, 'totalDebt') ?? latest(annualBalance, 'totalDebt');
  const netDebt = latest(annualBalance, 'netDebt');
  const cash = value(f, 'totalCash') ?? latest(annualBalance, 'cashCashEquivalentsAndShortTermInvestments');
  const equity = latest(annualBalance, 'stockholdersEquity') ?? latest(annualBalance, 'commonStockEquity');

  const shares = value(k, 'sharesOutstanding') ?? latest(annualBalance, 'ordinarySharesNumber');

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
      debtToEquity: value(f, 'debtToEquity'),
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
    },
    sourceNote: 'Yahoo Finance quoteSummary + fundamentalsTimeSeries. Missing fields remain null; no financial metric is fabricated.',
    rawAvailability: {
      quoteSummary: Boolean(raw.summary),
      annualStatements: annualFinancials.length > 0,
      annualBalanceSheet: annualBalance.length > 0,
      annualCashFlow: annualCash.length > 0,
    },
  };
}

function buildValuation(raw, price) {
  const d = raw.summary?.summaryDetail || {};
  const k = raw.summary?.defaultKeyStatistics || {};
  const f = raw.summary?.financialData || {};

  const marketCap = value(d, 'marketCap') ?? value(raw.summary?.price, 'marketCap');
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

  const earningsYield = trailingPE > 0 ? (1 / trailingPE) * 100 : null;

  const fairValueFromPE =
    trailingEps > 0 && trailingPE > 0
      ? trailingEps * trailingPE
      : null;

  const fairValueFromForwardPE =
    forwardEps > 0 && forwardPE > 0
      ? forwardEps * forwardPE
      : null;

  const fairValue =
    fairValueFromForwardPE ?? fairValueFromPE ?? null;

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
    earningsYield,
    fairValue,
    upsideToFairValue:
      fairValue && price ? ((fairValue / price) - 1) * 100 : null,
    marginOfSafety:
      fairValue && price ? (1 - price / fairValue) * 100 : null,
    warning:
      fairValue == null
        ? 'No defensible fair value available from the returned data.'
        : 'Fair value is a framework estimate, not a guarantee or analyst target.',
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
  const checks = [
    ['price', valuation.currentPrice],
    ['P/E', valuation.trailingPE],
    ['P/B', valuation.priceToBook],
    ['ROE', financials.ratios.roe],
    ['Debt/Equity', financials.ratios.debtToEquity],
    ['Net Margin', financials.ratios.netMargin],
    ['Operating Margin', financials.ratios.operatingMargin],
    ['Revenue Growth', financials.ratios.revenueGrowth],
    ['Earnings Growth', financials.ratios.earningsGrowth],
    ['Free Cash Flow', financials.current.freeCashFlow],
    ['5Y Revenue CAGR', financials.growth.revenue5yCagr],
    ['5Y EPS CAGR', financials.growth.eps5yCagr],
    ['RSI', technical.rsi],
    ['200 DMA', technical.s200],
  ];

  const available = checks.filter(([, v]) => v != null).length;
  const completeness = Math.round((available / checks.length) * 100);

  return {
    completeness,
    available,
    total: checks.length,
    missing: checks.filter(([, v]) => v == null).map(([name]) => name),
    status: completeness >= 85 ? 'STRONG' : completeness >= 65 ? 'PARTIAL' : 'WEAK',
    warnings: [
      ...(!financials.rawAvailability.quoteSummary ? ['Quote summary unavailable.'] : []),
      ...(!financials.rawAvailability.annualStatements ? ['Annual financial statements unavailable.'] : []),
      ...(!financials.rawAvailability.annualBalanceSheet ? ['Annual balance sheet unavailable.'] : []),
      ...(!financials.rawAvailability.annualCashFlow ? ['Annual cash-flow statement unavailable.'] : []),
    ],
  };
}

function scoreStock(financials, valuation, technical, quality) {
  const r = financials.ratios;
  const g = financials.growth;
  const d = financials.derived;

  const qualityScore = [
    [r.roe, 20, 25],
    [r.operatingMargin, 20, 20],
    [r.netMargin, 15, 15],
    [d.fcfConversion, 60, 20],
    [g.revenue5yCagr, 20, 20],
  ];

  let q = 50;
  if (r.roe != null) q += r.roe >= 20 ? 15 : r.roe >= 15 ? 10 : r.roe >= 10 ? 5 : -5;
  if (r.operatingMargin != null) q += r.operatingMargin >= 20 ? 10 : r.operatingMargin >= 12 ? 6 : 0;
  if (r.netMargin != null) q += r.netMargin >= 15 ? 8 : r.netMargin >= 8 ? 4 : 0;
  if (d.fcfConversion != null) q += d.fcfConversion >= 90 ? 8 : d.fcfConversion >= 70 ? 5 : d.fcfConversion >= 50 ? 2 : -5;
  if (g.revenue5yCagr != null) q += g.revenue5yCagr >= 15 ? 8 : g.revenue5yCagr >= 10 ? 5 : g.revenue5yCagr >= 5 ? 2 : 0;
  q = clamp(q);

  let growth = 50;
  const growthRates = [g.revenue5yCagr, g.eps5yCagr, g.pat5yCagr].filter((x) => x != null);
  if (growthRates.length) {
    const avg = growthRates.reduce((a, b) => a + b, 0) / growthRates.length;
    growth = clamp(45 + avg * 2.5);
  }

  let financialStrength = 60;
  if (r.debtToEquity != null) financialStrength += r.debtToEquity <= 0.25 ? 20 : r.debtToEquity <= 0.75 ? 10 : r.debtToEquity <= 1.5 ? 0 : -15;
  if (d.netDebtToEbitda != null) financialStrength += d.netDebtToEbitda <= 0 ? 10 : d.netDebtToEbitda <= 1 ? 8 : d.netDebtToEbitda <= 2 ? 3 : d.netDebtToEbitda <= 3 ? -5 : -15;
  if (r.currentRatio != null) financialStrength += r.currentRatio >= 1.5 ? 8 : r.currentRatio >= 1 ? 3 : -8;
  financialStrength = clamp(financialStrength);

  let valuationScore = 50;
  if (valuation.trailingPE != null && valuation.trailingPE > 0) {
    valuationScore = clamp(100 - Math.max(0, valuation.trailingPE - 15) * 2.2);
  }
  if (valuation.marginOfSafety != null) valuationScore = clamp(valuationScore + valuation.marginOfSafety * 0.8);

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
  if (quality.completeness < 70) risk += 15;
  risk = clamp(risk);

  const overall = clamp(
    q * 0.25 +
    growth * 0.20 +
    financialStrength * 0.20 +
    valuationScore * 0.15 +
    technicalScore * 0.10 +
    (100 - risk) * 0.10
  );

  return {
    quality: Math.round(q),
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

  if (score.overall >= 78 && score.risk < 40 && technical.trend !== 'DOWNTREND') {
    return {
      action: 'BUY / ACCUMULATE',
      reason: ['Business and financial evidence are strong.', 'Valuation and technical conditions do not show a major disqualifier.'],
    };
  }

  if (score.overall >= 68 && score.risk < 55) {
    return {
      action: 'BUY ON WEAKNESS / HOLD',
      reason: ['Underlying evidence is constructive.', 'Entry valuation and price confirmation should be considered.'],
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
    sector: profile.sector || 'N/A',
    industry: profile.industry || 'N/A',
    price: market.price,
    currency: market.currency,
    exchange: market.exchange,
    marketCap: valuation.marketCap,
    pe: valuation.trailingPE,
    pb: valuation.priceToBook,
    roe: financials.ratios.roe,
    de: financials.ratios.debtToEquity,
    npm: financials.ratios.netMargin,
    opm: financials.ratios.operatingMargin,
    rg: financials.ratios.revenueGrowth,
    eg: financials.ratios.earningsGrowth,
    fcf: financials.current.freeCashFlow,
    low: Math.min(...market.rows.map((r) => r.low)),
    high: Math.max(...market.rows.map((r) => r.high)),
    dataNote: 'Live market data + Yahoo Finance quoteSummary/fundamentalsTimeSeries. Missing values are reported as null rather than invented.',
  };

  return {
    stock,
    score,
    fundamentals: financials,
    valuation,
    ownership,
    technical: t,
    dataQuality,
    decision: finalDecision,
    source: 'Yahoo Finance via yahoo-finance2',
    asOf: new Date().toISOString(),
  };
}
