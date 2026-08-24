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

const fieldStatus = (rows, keys, requestStatus) => {
  if (requestStatus === 'SOURCE_UNAVAILABLE') return { status: 'SOURCE_UNAVAILABLE', value: null, key: null, date: null };
  const evidence = latest(rows, keys);
  if (evidence) return { status: 'PROVIDER_RETURNED', ...evidence };
  return { status: 'PROVIDER_DID_NOT_RETURN', value: null, key: null, date: null };
};

export async function fetchStatementEvidence(symbol) {
  const ticker = String(symbol || '').toUpperCase().endsWith('.NS') || String(symbol || '').toUpperCase().endsWith('.BO')
    ? String(symbol).toUpperCase()
    : `${String(symbol).toUpperCase()}.NS`;
  const period2 = new Date();
  const period1 = new Date(Date.now() - 8 * 365.25 * 24 * 60 * 60 * 1000);

  const [incomeResult, balanceResult, cashResult] = await Promise.allSettled([
    yahooFinance.fundamentalsTimeSeries(ticker, { period1, period2, type: 'annual', module: 'financials' }, { validateResult: false }),
    yahooFinance.fundamentalsTimeSeries(ticker, { period1, period2, type: 'annual', module: 'balance-sheet' }, { validateResult: false }),
    yahooFinance.fundamentalsTimeSeries(ticker, { period1, period2, type: 'annual', module: 'cash-flow' }, { validateResult: false }),
  ]);

  const income = incomeResult.status === 'fulfilled' ? normalize(incomeResult.value, 'annual') : [];
  const balance = balanceResult.status === 'fulfilled' ? normalize(balanceResult.value, 'annual') : [];
  const cash = cashResult.status === 'fulfilled' ? normalize(cashResult.value, 'annual') : [];

  const errors = {
    income: incomeResult.status === 'rejected' ? String(incomeResult.reason?.message || incomeResult.reason) : null,
    balance: balanceResult.status === 'rejected' ? String(balanceResult.reason?.message || balanceResult.reason) : null,
    cash: cashResult.status === 'rejected' ? String(cashResult.reason?.message || cashResult.reason) : null,
  };

  const balanceRequestStatus = balanceResult.status === 'fulfilled' ? 'OK' : 'SOURCE_UNAVAILABLE';
  const cashRequestStatus = cashResult.status === 'fulfilled' ? 'OK' : 'SOURCE_UNAVAILABLE';
  const incomeRequestStatus = incomeResult.status === 'fulfilled' ? 'OK' : 'SOURCE_UNAVAILABLE';

  const balanceEvidence = {
    totalAssets: fieldStatus(balance, ['totalAssets'], balanceRequestStatus),
    totalDebt: fieldStatus(balance, ['totalDebt'], balanceRequestStatus),
    cash: fieldStatus(balance, ['cashCashEquivalentsAndShortTermInvestments', 'cashAndCashEquivalents'], balanceRequestStatus),
    equity: fieldStatus(balance, ['stockholdersEquity', 'commonStockEquity'], balanceRequestStatus),
    currentAssets: fieldStatus(balance, ['currentAssets'], balanceRequestStatus),
    currentLiabilities: fieldStatus(balance, ['currentLiabilities'], balanceRequestStatus),
    workingCapital: fieldStatus(balance, ['workingCapital'], balanceRequestStatus),
    ordinaryShares: fieldStatus(balance, ['ordinarySharesNumber'], balanceRequestStatus),
  };

  const incomeEvidence = {
    revenue: fieldStatus(income, ['totalRevenue'], incomeRequestStatus),
    ebitda: fieldStatus(income, ['EBITDA', 'normalizedEBITDA'], incomeRequestStatus),
    ebit: fieldStatus(income, ['EBIT', 'operatingIncome'], incomeRequestStatus),
    eps: fieldStatus(income, ['dilutedEPS', 'basicEPS'], incomeRequestStatus),
    netIncome: fieldStatus(income, ['netIncomeFromContinuingAndDiscontinuedOperation', 'netIncome'], incomeRequestStatus),
    interestExpense: fieldStatus(income, ['interestExpense'], incomeRequestStatus),
  };

  const cashEvidence = {
    operatingCashFlow: fieldStatus(cash, ['operatingCashFlow', 'cashFlowFromContinuingOperatingActivities'], cashRequestStatus),
    investingCashFlow: fieldStatus(cash, ['investingCashFlow', 'cashFlowFromContinuingInvestingActivities'], cashRequestStatus),
    financingCashFlow: fieldStatus(cash, ['financingCashFlow', 'cashFlowFromContinuingFinancingActivities'], cashRequestStatus),
    changeInCash: fieldStatus(cash, ['changesInCash', 'changeInCash'], cashRequestStatus),
    freeCashFlow: fieldStatus(cash, ['freeCashFlow'], cashRequestStatus),
    capitalExpenditure: fieldStatus(cash, ['capitalExpenditure', 'capitalExpenditureReported'], cashRequestStatus),
    dividends: fieldStatus(cash, ['commonStockDividendPaid', 'cashDividendsPaid', 'dividendPaidCFO'], cashRequestStatus),
    stockBasedCompensation: fieldStatus(cash, ['stockBasedCompensation'], cashRequestStatus),
  };

  const statementCoverage = {
    income: income.length > 0,
    balanceSheet: balance.length > 0 && Boolean(balanceEvidence.equity?.value || balanceEvidence.totalAssets?.value || balanceEvidence.totalDebt?.value),
    cashFlow: cash.length > 0 && Boolean(cashEvidence.operatingCashFlow?.value || cashEvidence.freeCashFlow?.value),
  };

  return {
    provider: 'Yahoo Finance fundamentalsTimeSeries',
    period: 'annual / 12M',
    fetchedAt: new Date().toISOString(),
    income,
    balance,
    cash,
    evidence: { income: incomeEvidence, balance: balanceEvidence, cash: cashEvidence },
    coverage: statementCoverage,
    history: {
      incomeYears: income.length,
      balanceYears: balance.length,
      cashFlowYears: cash.length,
    },
    errors,
    validation: {
      noSyntheticValues: true,
      policy: 'Only provider-returned annual statement values are accepted; missing fields remain null.',
    },
  };
}

export function mergeStatementEvidence(financials, evidence) {
  const current = { ...(financials?.current || {}) };
  const derived = { ...(financials?.derived || {}) };
  const rawAvailability = { ...(financials?.rawAvailability || {}) };

  const b = evidence?.evidence?.balance || {};
  const i = evidence?.evidence?.income || {};
  const c = evidence?.evidence?.cash || {};
  const valueOf = (item) => item?.value ?? null;

  current.totalAssets = current.totalAssets ?? valueOf(b.totalAssets);
  current.totalDebt = current.totalDebt ?? valueOf(b.totalDebt);
  current.cash = current.cash ?? valueOf(b.cash);
  current.equity = current.equity ?? valueOf(b.equity);
  current.currentAssets = current.currentAssets ?? valueOf(b.currentAssets);
  current.currentLiabilities = current.currentLiabilities ?? valueOf(b.currentLiabilities);
  current.workingCapital = current.workingCapital ?? valueOf(b.workingCapital);
  current.ordinaryShares = current.ordinaryShares ?? valueOf(b.ordinaryShares);

  current.revenue = current.revenue ?? valueOf(i.revenue);
  current.ebitda = current.ebitda ?? valueOf(i.ebitda);
  current.ebit = current.ebit ?? valueOf(i.ebit);
  current.eps = current.eps ?? valueOf(i.eps);
  current.netIncome = current.netIncome ?? valueOf(i.netIncome);
  current.interestExpense = current.interestExpense ?? valueOf(i.interestExpense);

  current.freeCashFlow = current.freeCashFlow ?? valueOf(c.freeCashFlow);
  current.operatingCashFlow = current.operatingCashFlow ?? valueOf(c.operatingCashFlow);
  current.investingCashFlow = current.investingCashFlow ?? valueOf(c.investingCashFlow);
  current.financingCashFlow = current.financingCashFlow ?? valueOf(c.financingCashFlow);
  current.changeInCash = current.changeInCash ?? valueOf(c.changeInCash);
  current.capitalExpenditure = current.capitalExpenditure ?? valueOf(c.capitalExpenditure);
  current.dividends = current.dividends ?? valueOf(c.dividends);
  current.stockBasedCompensation = current.stockBasedCompensation ?? valueOf(c.stockBasedCompensation);

  if (current.totalDebt != null && current.equity != null && current.equity > 0) {
    derived.debtToEquityFromStatements = current.totalDebt / current.equity;
  }
  if (current.currentAssets != null && current.currentLiabilities != null && current.currentLiabilities > 0) {
    derived.currentRatioFromStatements = current.currentAssets / current.currentLiabilities;
  }
  if (current.freeCashFlow != null && current.netIncome != null && current.netIncome > 0) {
    derived.fcfConversion = (current.freeCashFlow / current.netIncome) * 100;
  }
  if (current.currentAssets != null && current.currentLiabilities != null) {
    derived.workingCapital = current.currentAssets - current.currentLiabilities;
  }

  rawAvailability.annualStatements = rawAvailability.annualStatements || Boolean(evidence?.coverage?.income);
  rawAvailability.annualBalanceSheet = rawAvailability.annualBalanceSheet || Boolean(evidence?.coverage?.balanceSheet);
  rawAvailability.annualCashFlow = rawAvailability.annualCashFlow || Boolean(evidence?.coverage?.cashFlow);

  return {
    ...financials,
    current,
    derived,
    rawAvailability,
    statementEvidence: evidence,
    sourceNote: `${financials?.sourceNote || ''} Separate annual financials, balance-sheet and cash-flow requests are used as an evidence recovery path.`.trim(),
  };
}
