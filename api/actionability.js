import { analyze as analyzeStock } from '../lib/market-engine.js';
import { buildTrading } from '../lib/trading-engine.js';
import { buildActionability } from '../lib/actionability.js';

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
      if (close != null && high != null && low != null && volume != null) {
        const date = item.date instanceof Date ? item.date : new Date(item.date);
        if (!Number.isNaN(date.getTime())) rows.push({ date: date.toISOString(), open: num(item?.open), close, high, low, volume });
      }
    }
  }
  if (rows.length < 60) throw Error(`Insufficient market data (${rows.length} points)`);
  return rows;
}

export default async function handler(req, res) {
  Object.entries(HEADERS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });
  const symbol = String(req.query?.symbol || '').trim().toUpperCase();
  if (!/^[A-Za-z0-9.&_-]{1,25}(?:\.(?:NS|BO))?$/i.test(symbol)) return res.status(400).json({ success: false, error: 'Valid stock symbol is required' });
  try {
    const analysis = await analyzeStock(symbol);
    const rows = await fetchChart(symbol);
    const trading = buildTrading(analysis, rows);
    return res.status(200).json(buildActionability(analysis, trading));
  } catch (e) {
    console.error('[ACTIONABILITY ERROR]', { symbol, message: e?.message, stack: e?.stack });
    return res.status(502).json({ success: false, error: 'Actionability data temporarily unavailable. Please try again.' });
  }
}
