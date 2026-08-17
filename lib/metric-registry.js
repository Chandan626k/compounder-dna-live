// Canonical definitions for the metrics exposed by the StockSamjho analysis API.
// This registry documents the calculation contract; it is not a source of financial data.
export const METRIC_DEFINITIONS = Object.freeze({
  revenueGrowth: {
    label: 'Revenue Growth', unit: '%', sourceType: 'provider', period: 'TTM/current provider field',
    formula: 'Provider-reported revenue growth', missingPolicy: 'null',
  },
  revenue5yCagr: {
    label: '5Y Revenue CAGR', unit: '%', sourceType: 'calculated', period: 'annual 12M',
    formula: '(Ending Revenue / Beginning Revenue)^(1/years) - 1', missingPolicy: 'null when positive start/end and sufficient history are unavailable',
  },
  eps5yCagr: {
    label: '5Y EPS CAGR', unit: '%', sourceType: 'calculated', period: 'annual 12M',
    formula: '(Ending Diluted EPS / Beginning Diluted EPS)^(1/years) - 1', missingPolicy: 'null when positive start/end and sufficient history are unavailable',
  },
  roe: {
    label: 'ROE', unit: '%', sourceType: 'provider', period: 'provider-reported',
    formula: 'Provider-reported return on equity', missingPolicy: 'null',
  },
  roceFromStatements: {
    label: 'ROCE (simplified)', unit: '%', sourceType: 'calculated', period: 'latest annual statement set',
    formula: 'Operating Income / (Equity + Total Debt) × 100', missingPolicy: 'null when required balance-sheet inputs are unavailable',
  },
  debtToEquity: {
    label: 'Debt / Equity', unit: 'x', sourceType: 'provider', period: 'provider-reported current field',
    formula: 'Yahoo financialData debtToEquity (%) / 100', missingPolicy: 'null',
  },
  interestCoverage: {
    label: 'Interest Coverage', unit: 'x', sourceType: 'calculated', period: 'provider current/TTM operating income and interest expense',
    formula: 'Operating Income / Interest Expense', missingPolicy: 'null when interest expense is zero/missing',
  },
  fcfMargin: {
    label: 'FCF Margin', unit: '%', sourceType: 'calculated', period: 'provider current/TTM',
    formula: 'Free Cash Flow / Revenue × 100', missingPolicy: 'null',
  },
  fcfConversion: {
    label: 'FCF Conversion', unit: '%', sourceType: 'calculated', period: 'provider current/TTM',
    formula: 'Free Cash Flow / Net Income × 100', missingPolicy: 'null when net income is non-positive/missing',
  },
  currentRatioFromStatements: {
    label: 'Current Ratio (statement-derived)', unit: 'x', sourceType: 'calculated', period: 'latest annual balance sheet',
    formula: 'Current Assets / Current Liabilities', missingPolicy: 'null',
  },
  netDebtToEbitda: {
    label: 'Net Debt / EBITDA', unit: 'x', sourceType: 'calculated', period: 'provider current/TTM',
    formula: 'Net Debt / EBITDA', missingPolicy: 'null when EBITDA is non-positive/missing',
  },
  trailingPE: {
    label: 'Trailing P/E', unit: 'x', sourceType: 'provider', period: 'provider current',
    formula: 'Provider-reported trailing P/E', missingPolicy: 'null',
  },
  forwardPE: {
    label: 'Forward P/E', unit: 'x', sourceType: 'provider', period: 'forward estimate',
    formula: 'Provider-reported forward P/E', missingPolicy: 'null',
  },
  priceToBook: {
    label: 'P/B', unit: 'x', sourceType: 'provider', period: 'provider current',
    formula: 'Provider-reported price-to-book', missingPolicy: 'null',
  },
  valuationVerdict: {
    label: 'Valuation Verdict', unit: 'category', sourceType: 'calculated', period: 'current framework',
    formula: 'Scenario fair-value gap mapped to explicit valuation bands', missingPolicy: 'DATA INSUFFICIENT when fair value is unavailable',
  },
  financialStrength: {
    label: 'Financial Strength Score', unit: '0-100', sourceType: 'calculated', period: 'current provider fields + statement coverage',
    formula: 'Weighted debt/liquidity evidence with coverage caps when annual statements are unavailable', missingPolicy: 'neutral score with explicit coverage status',
  },
  fairValue: {
    label: 'Framework Fair Value', unit: 'currency/share', sourceType: 'calculated', period: 'current framework estimate',
    formula: 'EPS × justified P/E scenario; forward and trailing EPS are averaged when both exist', missingPolicy: 'null when defensible EPS inputs are unavailable',
  },
  sma200: {
    label: 'SMA200', unit: 'currency/share', sourceType: 'calculated', period: 'daily close',
    formula: 'Arithmetic mean of the latest 200 daily closes', missingPolicy: 'null with insufficient history',
  },
  ema200: {
    label: 'EMA200', unit: 'currency/share', sourceType: 'calculated', period: 'daily close',
    formula: 'EMA with smoothing factor 2/(200+1)', missingPolicy: 'null with insufficient history',
  },
  rsi14: {
    label: 'RSI14', unit: '0-100', sourceType: 'calculated', period: 'daily close',
    formula: 'Wilder-style smoothed average gains/losses', missingPolicy: 'null with insufficient history',
  },
  atr14: {
    label: 'ATR14', unit: 'currency/share', sourceType: 'calculated', period: 'daily OHLC',
    formula: 'Wilder ATR: initial mean true range, then Wilder smoothing', missingPolicy: 'null with insufficient history',
  },
  relativeVolume: {
    label: 'Relative Volume', unit: 'x', sourceType: 'calculated', period: 'latest daily volume vs 20D average',
    formula: 'Latest Volume / 20D Average Volume', missingPolicy: 'null with insufficient volume history',
  },
  distanceFrom200DMA: {
    label: 'Distance from 200 DMA', unit: '%', sourceType: 'calculated', period: 'latest daily close',
    formula: '(Price / SMA200 - 1) × 100', missingPolicy: 'null with insufficient history',
  },
});
