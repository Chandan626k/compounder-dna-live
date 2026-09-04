import { isRateLimited } from '../lib/cache.js';
import { verifiedHistory, verifiedQuote } from '../lib/market-data-provider.js';
import { scanSymbols, DEFAULT_UNIVERSE } from '../lib/scanner-engine-v2.js';

const H = { 'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Cache-Control': 'no-store' };
const send = (res, status, body) => { Object.entries(H).forEach(([k, v]) => res.setHeader(k, v)); return res.status(status).json(body); };
const ticker = v => { const x = String(v || '').trim().toUpperCase(); if (!x || !/^[A-Z0-9._&-]{1,25}$/.test(x)) return ''; return x.endsWith('.NS') || x.endsWith('.BO') || x.startsWith('^') ? x : `${x}.NS`; };

async function chart(v, range = '1y', interval = '1d') {
  const s = ticker(v); if (!s) throw Error('Invalid ticker');
  const days = interval === '1d' ? (range === '10y' ? 3650 : range === '5y' ? 1825 : range === '2y' ? 730 : 365) : 60;
  const d = await verifiedHistory(s, { interval, days, minBars: interval === '1d' ? 60 : 50 });
  return {
    ticker: s, currency: d.currentQuote?.currency || 'INR', exchange: d.currentQuote?.exchange || '',
    regularMarketPrice: d.currentQuote?.price ?? d.rows.at(-1)?.c ?? null,
    currentQuote: d.currentQuote || null,
    timestamps: d.rows.map(x => new Date(x.date).getTime() / 1000),
    open: d.rows.map(x => x.o), high: d.rows.map(x => x.h), low: d.rows.map(x => x.l), close: d.rows.map(x => x.c), volume: d.rows.map(x => x.v), adjclose: d.rows.map(x => x.adjC ?? x.c),
    dataStatus: 'VERIFIED_MARKET_DATA', source: d.source, retrievedAt: d.retrievedAt, latestBar: d.latest, observationType: interval === '1d' ? 'LATEST_DAILY_BAR' : 'INTRADAY_BAR',
  };
}

async function summary(v) {
  const s = ticker(v); if (!s) throw Error('Invalid ticker');
  const [c, q] = await Promise.all([chart(s, '1y', '1d'), verifiedQuote(s)]);
  const close = c.close.filter(Number.isFinite), high = c.high.filter(Number.isFinite), low = c.low.filter(Number.isFinite), volume = c.volume.filter(Number.isFinite);
  return {
    symbol: s, price: q?.price ?? close.at(-1) ?? null, currency: c.currency, exchange: c.exchange,
    previousClose: close.at(-2) ?? null, fiftyTwoWeekHigh: high.length ? Math.max(...high) : null, fiftyTwoWeekLow: low.length ? Math.min(...low) : null,
    averageVolume: volume.length ? volume.reduce((a, b) => a + b, 0) / volume.length : null, volume: volume.at(-1) ?? null, chart: c,
    currentQuote: q, dataStatus: 'VERIFIED_MARKET_DATA',
    fundamentals: { note: 'Use /api/analyze or /api/investment-readiness for canonical verified financial evidence. Missing fields remain null.' },
  };
}

async function news(q) {
  q = String(q || '').trim(); if (!q) throw Error('query required');
  const r = await fetch(`https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&newsCount=10&quotesCount=5`, { headers: { 'User-Agent': 'Mozilla/5.0 StockSamjho/1.0', Accept: 'application/json' }, signal: AbortSignal.timeout(12000) });
  if (!r.ok) throw Error(`HTTP_${r.status}`);
  const j = await r.json();
  return (j?.news || []).map(n => ({ title: n.title || '', publisher: n.publisher || '', link: n.link || n.url || '#', publishedAt: n.providerPublishTime ? new Date(n.providerPublishTime * 1000).toISOString() : '' }));
}

export default async function handler(req, res) {
  Object.entries(H).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return send(res, 405, { error: 'POST only' });
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown', rate = isRateLimited(ip);
  if (rate.limited) return send(res, 429, { error: 'Rate limit exceeded', resetAt: rate.resetAt });
  try {
    const b = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    if (!b.type) return send(res, 400, { error: 'type required: summary|chart|news|scan' });
    if (b.type === 'summary') return send(res, 200, await summary(b.ticker));
    if (b.type === 'chart') return send(res, 200, await chart(b.ticker, b.range || '1y', b.interval || '1d'));
    if (b.type === 'news') return send(res, 200, await news(b.query || b.ticker));
    if (b.type === 'scan') {
      const limit = Math.max(1, Math.min(Number(b.limit) || 25, DEFAULT_UNIVERSE.length));
      const result = await scanSymbols(DEFAULT_UNIVERSE.slice(0, limit));
      return send(res, 200, { ...result, dataStatus: 'VERIFIED_MARKET_DATA' });
    }
    return send(res, 400, { error: 'Unknown type' });
  } catch (e) {
    return send(res, 502, { error: e?.message || 'Verified market data unavailable' });
  }
}
