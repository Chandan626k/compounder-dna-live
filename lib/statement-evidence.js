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
  const financialCurrency = quote?.financialCurrency || null;
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
        ? 'Statement monetary values are retained as provider evidence and remain blocked when trading and financial currencies are unknown or mismatched.'
        : 'Trading and financial currencies match, but provider-only statement values remain supplemental until canonical filing provenance and point-in-time validation pass.',
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
      policy: 'Provider-returned annual statement values are supplemental evidence only. Currency equality is necessary but insufficient for canonical promotion; source-document identity/version, publication/availability timestamps, issuer/security identity, entitlement, period/scope/units, revision lineage, and PIT eligibility must be independently validated.',
    },
  };
}

export function mergeStatementEvidence(financials, evidence) {
  const current = { ...(financials?.current || {}) };
  const derived = { ...(financials?.derived || {}) };
  const rawAvailability = { ...(financials?.rawAvailability || {}) };

  const currencyStatus = evidence?.currency?.status;
  const currencyBlocked = currencyStatus !== 'MATCH';
  const currencyBlockNote = currencyStatus === 'MISMATCH'
    ? ' Statement currency differs from trading currency, so monetary values are not promoted into canonical trading-currency fields.'
    : ' Statement monetary values are not promoted into canonical trading-currency fields because currency identity is not explicitly matched.';
  const statementEvidencePromotion = {
    status: 'UNAVAILABLE',
    pitEligibility: 'PIT_UNKNOWN',
    reason: evidence
      ? 'Provider-only annual statement payloads do not include a validated canonical filing envelope; currency equality alone is insufficient for promotion.'
      : 'No statement evidence response or validated canonical filing envelope is available.',
  };
  const statementEvidenceNote = evidence
    ? ' Provider-only annual statement rows are retained as supplemental evidence. Currency equality alone does not establish source-document identity/version, publication/availability timestamps, issuer/security identity, entitlement, accounting basis, statement/metric scope, units, revision lineage, or point-in-time eligibility; PIT eligibility remains PIT_UNKNOWN.'
    : ' Statement evidence is unavailable; canonical filing provenance and PIT eligibility remain UNKNOWN.';

  // A currency mismatch or unknown currency blocks the provider-derived
  // financial values. A currency match is only a necessary check: this
  // provider payload still lacks the canonical filing identity, entitlement,
  // revision lineage and PIT evidence required for promotion. Keep it
  // supplemental and leave any independently sourced base fields untouched.
  if (currencyBlocked) {
    for (const key of ['revenue', 'ebitda', 'netIncome', 'freeCashFlow', 'operatingCashFlow', 'totalDebt', 'netDebt', 'cash', 'equity', 'currentAssets', 'currentLiabilities']) current[key] = null;
    for (const key of ['netDebtToEbitda', 'fcfMargin', 'fcfConversion', 'currentRatioFromStatements', 'workingCapital', 'debtToEquityFromStatements']) derived[key] = null;
    rawAvailability.annualStatements = false;
    rawAvailability.annualBalanceSheet = false;
    rawAvailability.annualCashFlow = false;
  }

  return {
    ...financials,
    current,
    derived,
    rawAvailability,
    statementEvidence: evidence,
    statementEvidencePromotion,
    sourceNote: `${financials?.sourceNote || ''} Separate annual financials, balance-sheet and cash-flow requests are retained as supplemental provider evidence only.${currencyBlocked ? currencyBlockNote : ''}${statementEvidenceNote}`.trim(),
  };
}
