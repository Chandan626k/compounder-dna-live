import { sendMarketDataUnavailable } from '../lib/market-data-access-policy.js';
import { analyze as analyzeStock } from '../lib/market-engine.js';
import { buildTrading } from '../lib/trading-engine.js';
import { buildActionability } from '../lib/actionability.js';
import { buildScenarios, scenarioEvidenceFromValidation } from '../lib/scenario-engine.js';
import { validateStrategy } from '../lib/strategy-validation.js';

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Cache-Control': 'no-store',
};

const num = (v) => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (v && typeof v === 'object' && Number.isFinite(v.raw)) return v.raw;
  return null;
};

async function fetchChart(symbol) {
  const YahooFinance = (await import('yahoo-finance2')).default;
  const yahooFinance = new YahooFinance();
  const ticker = String(symbol).endsWith('.NS') || String(symbol).endsWith('.BO') ? String(symbol) : `${symbol}.NS`;
  const data = await yahooFinance.chart(ticker, {
    period1: new Date(Date.now() - 2 * 365.25 * 24 * 60 * 60 * 1000),
    period2: new Date(),
    interval: '1d',
    events: 'div,splits',
    return: 'object',
  });
  const rows = [];
  if (Array.isArray(data?.quotes)) {
    for (const item of data.quotes) {
      const close = num(item?.close), high = num(item?.high), low = num(item?.low), volume = num(item?.volume);
      if (close != null && high != null && low != null && volume != null)���q�^