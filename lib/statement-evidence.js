import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

const num = (v) => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (v && typeof v === 'object' && Number.isFinite(v.raw)) return v.raw;
  return null;
};

const normalize = (rows, requestedPeriod) => (Array.isArray(rows) ? rows : [])
  .filter(Boolean)
  .map((row) => {
    const date = row.date instanceof Date ? row.date : new Date(row.date);
    if (Number.isNaN(date.getTime())) return null;
    return {
      ...row,
      date: date.toISOString(),
      requestedPeriod,
      periodType: row.periodType == null ? null : String(row.periodType).toUpperCase(),
      providerType: row.TYPE == null ? null : String(row.TYPE).toUpperCase(),
    };
  })
  .filter(Boolean)
  .sort((a, b) => new Date(a.date) - new Date(b.date));

const latest = (rows, keys) => {
  for (const row of [...(rows || [])].reverse()) {
    for (const key of keys) {
      const value = num(row?.[key]);
      if (value != null) return { value, key, date: row.date };
    }
  }
  return null;
};

function rowCurrency(row) {
  const value = row?.currencyCode ?? row?.currency ?? row?.financialCurrency ?? null;
  return typeof value === 'string' && value.trim() ? value.trim().toUpperCase() : null;
}

export function deriveFinancialCurrency(rows = []) {
  const currencies = [...new Set((rows || []).map(rowCurrency).filter(Boolean))];
  return currencies.length === 1 ? currencies[0] : null;
}

export async function fetchStatementEvidence(symbol) {
  const ticker = String(symbol || '').toUpperCase().endsWith('.NS') || String(symbol || '').toUpperCase().endsWith('.BO')
    ? String(symbol).toUpperCase()
    : `${String(symbol).toUpperCase()}.NS`;
  const period2 = new Date();
  const period1 = new Date(Date.now() - 8 * 365.25 * 24 * 60 * 60 * 1000);

  const [incomeResult, balanceResult, cashResult, quoteResult] = await Promise.allSettled([
    yahooFinance.fundamentalsTimeSeries(ticker, { period1, period2, type: 'annual', module: 'financials' }, { validateResult: false }),
    yahooFinance.fundamentalsTimeSeries(ticker, { period1, period2, type: 'annual', module: 'balance-sheet' }, { validateResult: false }),
    yahooFinance.fundamentalsTimeSeries(ticker, { period1, period2, type: 'annual', module: 'cash-flow' }, { validateResult: false }),
    yahooFinance.quote(ticker),
  ]);

  const income = incomeResult.status === 'fulfilled' ? normalize(incomeResult.value, 'annual') : [];
  const balance = balanceResult.status === 'fulfilled' ? normalize(balanceResult.value, 'annual') : [];
  const cash = cashResult.status === 'fulfilled' ? normalize(cashResult.value, 'annual') : [];
  const quote = quoteResult.status === 'fulfilled' ? (quoteResult.value || {}) : {};

  const tradingCurrency = quote?.currency || null;
  const financialCurrency = deriveFinancialCurrency([...income, ...balance, ...cash]);
  const currencyStatus = tradingCurrency && financialCurrency
    ? (tradingCurrency === financialCurrency ? 'MATCH' : 'MISMATCH')
    : 'UNKNOWN';
  const currencyBlocked = currencyStatus !== 'MATCH';

  const errors = {
    income: incomeResult.status === 'rejected' ? String(incomeResult.reason?.message || incomeResult.reason) : null,
    balance: balanceResult.status === 'rejected' ? String(balanceResult.reason?.message || balanceResult.reason) : null,
    cash: cashResult.status === 'rejected' ? String(cashResult.reason?.message || cashResult.reason) : null,
    quote: quoteResult.status === 'rejected' ? String(quoteResult.reason?.message || quoteResult.reason) : null,
  };

  const balanceEvidence = {
    totalAssets: latest(balance, ['totalAssets']),
    totalDebt: latest(balance, ['totalDebt']),
    cash: latest(balance, ['cashCashEquivalentsAndShortTermInvestments', 'cashAndCashEquivalents']),
    equity: latest(balance, ['stockholdersEquity', 'commonStockEquity']),
    currentAssets: latest(balance, ['currentAssets']),
    currentLiabilities: latest(balance, ['currentLiabilities']),
    workingCapital: latest(balance, ['workingCapital']),
    ordinaryShares: latest(balance, ['ordinarySharesNumber']),
  };

  const cashEvidence = {
    operatingCashFlow: latest(cash, ['operatingCashFlow', 'cashFlowFromContinuingOperatingActivities']),
    freeCashFlow: latest(cash, ['freeCashFlow']),
    capitalExpenditure: latest(cash, ['capitalExpenditure', 'capitalExpenditureReported']),
  };

  const statementCoverage = {
    income: income.length > 0,
    balanceSheet: balance.length > 0 && Boolean(balanceEvidence.equity || balanceEvidence.totalAssets || balanceEvidence.totalDebt),
    cashFlow: cash.length > 0 && Boolean(cashEvidence.operatingCashFlow || cashEvidence.freeCashFlow),
  };

  return {
    provider: 'Yahoo Finance fundamentalsTimeSeries',
    period: 'annual / 12M',
    fetchedAt: new Date().toISOString(),
    currency: {
      tradingCurrency,
      financialCurrency,
      status: currencyStatus,
      policy: currencyBlocked
        ? 'Statement monetary values are retained as provider evidence but are not promoted into canonical trading-currency fields unless currency identity is explicitly matched.'
        : 'Statement monetary values may be propagated because trading and financial currencies explicitly match.',
    },
    income,
    balance,
    cash,
    evidence: { balance: balanceEvidence, cash: cashEvidence },
    coverage: statementCoverage,
    history: { incomeYears: income.length, balanceYears: balance.length, cashFlowYears: cash.length },
    errors,
    validation: {
      noSyntheticValues: true,
      policy: 'Only provider-returned annual statement values are accepted; missing, unknown-currency, or mismatched-currency monetary fields remain null in canonical trading-currency fields.',
    },
  };
}

export function mergeStatementEvidence(financials, evidence) {
  const current = { ...(financials?.current || {}) };
  const derived = { ...(financials?.derived || {}) };
  const rawAvailability = { ...(financials?.rawAvailability || {}) };

  const b = evidence?.evidence?.balance || {};
  const c = evidence?.evidence?.cash || {};
  const valueOf = (item) => item?.value ?? null;
  const currencyBlocked = evidence?.currency?.status !== 'MATCH';

  if (!currencyBlocked) {
    current.totalDebt = current.totalDebt ?? valueOf(b.totalDebt);
    current.cash = current.cash ?? valueOf(b.cash);
    current.equity = current.equity ?? valueOf(b.equity);
    current.currentAssets = current.currentAssets ?? valueOf(b.currentAssets);
    current.currentLiabilities = current.currentLiabilities ?? valueOf(b.currentLiabilities);
    current.freeCashFlow = current.freeCashFlow ?? valueOf(c.freeCashFlow);
    current.operatingCashFlow = current.operatingCashFlow ?? valueOf(c.operatingCashFlow);

    if (current.totalDebt != null && current.equity != null && current.equity > 0) derived.debtToEquityFromStatements = current.totalDebt / current.equity;
    if (current.currentAssets != null && current.currentLiabilities != null && current.currentLiabilities > 0) derived.currentRatioFromStatements = current.currentAssets / current.currentLiabilities;
    if (current.freeCashFlow != null && current.netIncome != null && current.netIncome > 0) derived.fcfConversion = (current.freeCashFlow / current.netIncome) * 100;
  } else {
    for (const key of ['revenue', 'ebitda', 'netIncome', 'freeCashFlow', 'operatingCashFlow', 'totalDebt', 'netDebt', 'cash', 'equity', 'currentAssets', 'currentLiabilities']) current[key] = null;
    for (const key of ['netDebtToEbitda', 'fcfMargin', 'fcfConversion', 'currentRatioFromStatements', 'workingCapital', 'debtToEquityFromStatements']) derived[key] = null;
    rawAvailability.annualStatements = false;
    rawAvailability.annualBalanceSheet = false;
    rawAvailability.annualCashFlow = false;
  }

  rawAvailability.annualStatements = rawAvailability.annualStatements || (!currencyBlocked && Boolean(evidence?.coverage?.income));
  rawAvailability.annualBalanceSheet = rawAvailability.annualBalanceSheet || (!currencyBlocked && Boolean(evidence?.coverage?.balanceSheet));
  rawAvailability.annualCashFlow = rawAvailability.annualCashFlow || (!currencyBlocked && Boolean(evidence?.coverage?.cashFlow));

  return {
    ...financials,
    current,
    derived,
    rawAvailability,
    statementEvidence: evidence,
    sourceNote: `${financials?.sourceNote || ''} Separate annual financials, balance-sheet and cash-flow requests are used as an evidence recovery path.${currencyBlocked ? ' Statement monetary values are not promoted into canonical trading-currency fields because currency identity is not explicitly matched.' : ''}`.trim(),
  };
}
