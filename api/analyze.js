import { analyze as analyzeStock } from '../lib/market-engine.js';
import { cacheGet, cacheSet } from '../lib/cache.js';

// StockSamjho analysis endpoint. Expected provider lookup failures are user/data errors,
// not server faults, so they return 404 and are logged as warnings rather than runtime errors.
const CORS = { 'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, X-Request-ID', 'Cache-Control': 'no-store' };
const errorResponse = (res, status, message, requestId) => { Object.entries(CORS).forEach(([k,v]) => res.setHeader(k,v)); return res.status(status).json({ success:false, error:message, requestId }); };
const unavailableSymbol = (error) => /no data found|symbol may be delisted|insufficient market data/i.test(String(error?.message || ''));

export default async function handler(req,res){
  const id = req.headers?.['x-request-id'] || crypto.randomUUID();
  if (req.method === 'OPTIONS') { Object.entries(CORS).forEach(([k,v]) => res.setHeader(k,v)); return res.status(204).end(); }
  if (req.method === 'GET') {
    const rawSymbol = req.query?.symbol;
    const symbol = String(Array.isArray(rawSymbol) ? rawSymbol[0] : rawSymbol || '').trim();
    if (!symbol) return errorResponse(res, 400, 'Stock symbol is required.', id);
    if (!/^[A-Za-z0-9.&^_-]{1,25}(?:\.(?:NS|BO))?$/i.test(symbol)) return errorResponse(res, 400, 'Invalid stock symbol.', id);
    const cacheKey = `market:${symbol.toUpperCase()}`;
    const cached = cacheGet(cacheKey);
    if (cached) { Object.entries(CORS).forEach(([k,v]) => res.setHeader(k,v)); return res.status(200).json({ ...cached, meta: { ...(cached.meta || {}), cached: true } }); }
    try {
      const result = await analyzeStock(symbol);
      cacheSet(cacheKey, result, 10 * 60 * 1000);
      Object.entries(CORS).forEach(([k,v]) => res.setHeader(k,v));
      return res.status(200).json({ ...result, meta: { cached: false } });
    } catch (error) {
      if (unavailableSymbol(error)) {
        console.warn('[MARKET ANALYZE DATA UNAVAILABLE]', { requestId:id, symbol, message:error?.message });
        return errorResponse(res, 404, 'Verified market data is unavailable for this symbol.', id);
      }
      console.error('[MARKET ANALYZE ERROR]', { requestId:id, symbol, message:error?.message, stack:error?.stack });
      return errorResponse(res, 502, 'Market data is temporarily unavailable. Please try again.', id);
    }
  }
  return errorResponse(res, 405, 'Method not allowed.', id);
}
