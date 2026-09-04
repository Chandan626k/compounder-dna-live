import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();
const toNum = v => typeof v === 'number' && Number.isFinite(v) ? v : null;
const sleep = ms => new Promise(r => setTimeout(r, ms));

export function validateMarketRows(rows, nowMs = Date.now()) {
  if (!Array.isArray(rows)) return [];
  const seen = new Set();
  return rows
    .map(row => {
      if (!row || typeof row !== 'object') return null;
      const time = new Date(row.date).getTime();
      const o = toNum(row.o), h = toNum(row.h), l = toNum(row.l), c = toNum(row.c), v = toNum(row.v);
      if (!Number.isFinite(time) || time > nowMs + 5 * 60 * 1000) return null;
      if (!(o > 0 && h > 0 && l > 0 && c > 0) || v == null || v < 0) return null;
      if (h < Math.max(o, c) || l > Math.min(o, c) || h < l) return null;
      const key = String(time);
      if (seen.has(key)) return null;
      seen.add(key);
      return { ...row, date: new Date(time).toISOString(), o, h, l, c, v };
    })
    .filter(Boolean)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

function quoteTime(value) {
  if (value instanceof Date) {
    const ms = value.getTime();
    return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
  }
  const n = toNum(value);
  if (n == null) return null;
  const ms = n > 1e12 ? n : n * 1000;
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

export function normalizeQuote(meta, retrievedAt = new Date().toISOString()) {
  const price = toNum(meta?.regularMarketPrice);
  const observedAt = quoteTime(meta?.regularMarketTime);
  const retrievedMs = new Date(retrievedAt).getTime();
  const observedMs = observedAt ? new Date(observedAt).getTime() : NaN;
  const ageSeconds = Number.isFinite(retrievedMs) && Number.isFinite(observedMs)
    ? Math.max(0, Math.round((retrievedMs - observedMs) / 1000))
    : null;
  const sourceIntervalMinutes = toNum(meta?.sourceInterval);
  const exchangeDataDelayedBy = toNum(meta?.exchangeDataDelayedBy);
  const expectedFreshSeconds = ((sourceIntervalMinutes ?? 15) + (exchangeDataDelayedBy ?? 0) + 5) * 60;
  const freshnessStatus = price == null || observedAt == null
    ? 'UNAVAILABLE'
    : meta?.marketState === 'REGULAR' && ageSeconds != null && ageSeconds > expectedFreshSeconds
      ? 'STALE_DURING_REGULAR_SESSION'
      : meta?.marketState && meta.marketState !== 'REGULAR'
        ? 'LAST_REGULAR_OR_EXTENDED_QUOTE'
        : 'PROVIDER_QUOTE';
  return {
    price, observedAt, ageSeconds, marketState: meta?.marketState || null, exchangeDataDelayedBy,
    quoteSourceName: meta?.quoteSourceName || null, sourceIntervalMinutes, currency: meta?.currency || null,
    exchange: meta?.exchange || meta?.fullExchangeName || meta?.exchangeName || null, retrievedAt,
    status: price != null && observedAt ? 'PROVIDER_QUOTE' : 'UNAVAILABLE', freshnessStatus,
  };
}

export async function verifiedQuote(symbol) {
  const requestedSymbol = String(symbol || '').trim().toUpperCase();
  const normalizedSymbol = requestedSymbol.startsWith('^') || requestedSymbol.endsWith('.NS') || requestedSymbol.endsWith('.BO') ? requestedSymbol : `${requestedSymbol}.NS`;
  const retrievedAt = new Date().toISOString();
  try {
    const quote = await yahooFinance.quote(normalizedSymbol, {
      fields: ['symbol', 'regularMarketPrice', 'regularMarketTime', 'marketState', 'exchangeDataDelayedBy', 'quoteSourceName', 'sourceInterval', 'currency', 'exchange', 'fullExchangeName'],
    }, { validateResult: false });
    if (quote?.symbol && String(quote.symbol).toUpperCase() !== normalizedSymbol) {
      return { price: null, observedAt: null, ageSeconds: null, marketState: null, exchangeDataDelayedBy: null, quoteSourceName: null, sourceIntervalMinutes: null, currency: null, exchange: null, retrievedAt, status: 'UNAVAILABLE', freshnessStatus: 'UNAVAILABLE', symbol: normalizedSymbol, provider: 'Yahoo Finance quote API', error: `Provider returned mismatched symbol ${quote.symbol}` };
    }
    const normalized = normalizeQuote(quote, retrievedAt);
    return { ...normalized, symbol: quote?.symbol || normalizedSymbol, provider: 'Yahoo Finance quote API' };
  } catch (error) {
    return { price: null, observedAt: null, ageSeconds: null, marketState: null, exchangeDataDelayedBy: null, quoteSourceName: null, sourceIntervalMinutes: null, currency: null, exchange: null, retrievedAt, status: 'UNAVAILABLE', freshnessStatus: 'UNAVAILABLE', symbol: normalizedSymbol, provider: 'Yahoo Finance quote API', error: String(error?.message || error) };
  }
}

function parseYahoo(json) {
  const r = json?.chart?.result?.[0], q = r?.indicators?.quote?.[0], adj = r?.indicators?.adjclose?.[0]?.adjclose;
  if (!r || !q) return { rows: [], quote: null };
  const ts = r.timestamp || [];
  const rows = ts.map((t, i) => ({ date: new Date(t * 1000).toISOString(), o: toNum(q.open?.[i]), h: toNum(q.high?.[i]), l: toNum(q.low?.[i]), c: toNum(q.close?.[i]), adjC: toNum(adj?.[i]), v: toNum(q.volume?.[i]) }));
  return { rows: validateMarketRows(rows), quote: normalizeQuote(r.meta) };
}

async function direct(symbol, range, interval) {
  const hosts = ['query1.finance.yahoo.com', 'query2.finance.yahoo.com'];
  for (const host of hosts) {
    try {
      const u = `https://${host}/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}&events=div%2Csplits&includeAdjustedClose=true`;
      const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0 StockSamjho/1.0', 'Accept': 'application/json' }, signal: AbortSignal.timeout(12000) });
      if (!r.ok) continue;
      const parsed = parseYahoo(await r.json());
      if (parsed.rows.length) return parsed;
    } catch {}
  }
  return { rows: [], quote: null };
}

async function libraryFallback(symbol, days, interval) {
  const period1 = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const period2 = new Date();
  const data = await yahooFinance.chart(symbol, { period1, period2, interval, events: 'div,splits', return: 'object' });
  if (Array.isArray(data?.quotes)) {
    const rows = data.quotes.map(item => ({ date: (item?.date instanceof Date ? item.date : new Date(item?.date)).toISOString(), o: toNum(item?.open), h: toNum(item?.high), l: toNum(item?.low), c: toNum(item?.close), v: toNum(item?.volume), adjC: toNum(item?.adjclose) }));
    return { rows: validateMarketRows(rows), quote: normalizeQuote(data?.meta) };
  }
  const timestamps = data?.timestamp || [], q = data?.indicators?.quote?.[0] || {}, adj = data?.indicators?.adjclose?.[0]?.adjclose || [];
  const rows = timestamps.map((t, i) => ({ date: new Date(t * 1000).toISOString(), o: toNum(q.open?.[i]), h: toNum(q.high?.[i]), l: toNum(q.low?.[i]), c: toNum(q.close?.[i]), adjC: toNum(adj?.[i]), v: toNum(q.volume?.[i]) }));
  return { rows: validateMarketRows(rows), quote: normalizeQuote(data?.meta) };
}

function result(rows, source, status, interval, range, retrievedAt, quote) {
  return { rows, source, status, verified: true, interval, range, bars: rows.length, latest: rows.at(-1)?.date, retrievedAt, currentQuote: quote || null };
}

export async function verifiedHistory(symbol, { interval = '1d', days = 900, minBars = 60 } = {}) {
  const requestedSymbol = String(symbol || '').trim().toUpperCase();
  const normalizedSymbol = requestedSymbol.startsWith('^') || requestedSymbol.endsWith('.NS') || requestedSymbol.endsWith('.BO') ? requestedSymbol : `${requestedSymbol}.NS`;
  const range = interval === '1d' ? (days > 1500 ? '10y' : days > 700 ? '5y' : days > 300 ? '2y' : '1y') : (days > 180 ? '6mo' : '3mo');
  let parsed = await direct(normalizedSymbol, range, interval);
  if (parsed.rows.length >= minBars) return result(parsed.rows, 'Yahoo Finance chart API', 'PRIMARY', interval, range, new Date().toISOString(), parsed.quote);
  await sleep(150);
  parsed = await direct(normalizedSymbol, range, interval);
  if (parsed.rows.length >= minBars) return result(parsed.rows, 'Yahoo Finance chart API', 'PRIMARY', interval, range, new Date().toISOString(), parsed.quote);
  try {
    parsed = await libraryFallback(normalizedSymbol, days, interval);
    if (parsed.rows.length >= minBars) return result(parsed.rows, 'Yahoo Finance chart via yahoo-finance2', 'FALLBACK', interval, range, new Date().toISOString(), parsed.quote);
  } catch (error) {
    throw new Error(`VERIFIED_PRICE_PROVIDER_FAILED:${error?.message || error}`);
  }
  throw new Error(`INSUFFICIENT_VERIFIED_PRICE_HISTORY:${parsed.rows.length}/${minBars}`);
}
