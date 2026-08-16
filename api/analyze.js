import OpenAI from 'openai';
import { analyze as analyzeStock } from '../lib/market-engine.js';
import { cacheGet, cacheSet, cacheStats, isRateLimited } from '../lib/cache.js';
import { validateAnalyzeRequest, safeMetric } from '../lib/validate.js';

const CORS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Request-ID',
  'Cache-Control': 'no-store',
};

let openaiClient = null;
function getOpenAI() {
  if (!openaiClient) {
    const key = process.env.OPENAI_API_KEY;
    if (!key || !key.startsWith('sk-')) throw new Error('OPENAI_API_KEY not configured on server');
    openaiClient = new OpenAI({ apiKey: key });
  }
  return openaiClient;
}

function requestId(req) {
  return req.headers['x-request-id'] || globalThis.crypto?.randomUUID?.() || Date.now().toString();
}

function errorResponse(res, status, error, id) {
  Object.entries(CORS).forEach(([k,v]) => res.setHeader(k,v)); return res.status(status).json({ success: false, error, requestId: id });
}

function buildPrompt(stockName, sector, industry, metrics, scores, horizon = 20) {
  const m = metrics || {};
  const sm = (key, dec = 1) => safeMetric(m, key, dec);
  return `You are a senior equity research analyst specializing in Indian long-term investing.
Do NOT invent numbers. Interpret only the verified data supplied below.
Return concise Hinglish HTML only.

Company: ${stockName}
Sector: ${sector || 'Unavailable'} · ${industry || 'Unavailable'}
Market Cap: ₹${sm('marketCap', 0)} Cr
Current Price: ₹${sm('currentPrice', 0)}
P/E: ${sm('peRatio')}x
P/B: ${sm('pbRatio')}x
ROE: ${sm('roe')}%
Debt/Equity: ${sm('debtToEquity')}x
Net Margin: ${sm('netProfitMargin')}%
Revenue Growth: ${sm('revenueGrowthYoY')}%
Earnings Growth: ${sm('earningsGrowthYoY')}%
Dividend Yield: ${sm('dividendYield')}%
FCF: ₹${sm('freeCashFlow', 0)} Cr
52W High: ₹${sm('week52High', 0)}
52W Low: ₹${sm('week52Low', 0)}

Overall DNA: ${scores?.overallDNA ?? 'Unavailable'}/100
Confidence: ${scores?.confidenceScore?.total ?? 'Unavailable'}/100
Investment Horizon: ${horizon} years

Write four short sections: business quality/moat, numbers & valuation, risks, and long-term thesis. Be explicit when data is unavailable.`;
}

async function handleAI(req, res, id) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
  const rate = isRateLimited(ip);
  if (rate.limited) return errorResponse(res, 429, 'Rate limit exceeded. Please try again later.', id);

  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
  catch { return errorResponse(res, 400, 'Invalid JSON body', id); }

  const { valid, errors } = validateAnalyzeRequest(body);
  if (!valid) {
    Object.entries(CORS).forEach(([k,v]) => res.setHeader(k,v));
    return res.status(400).json({ success: false, error: 'Validation failed', details: errors, requestId: id });
  }

  const { stockName, sector, industry = '', metrics, scores, horizon = 20 } = body;
  const cacheKey = `analyze:${String(stockName).toLowerCase().replace(/[^a-z0-9]/g, '_')}:${horizon}`;
  const cached = cacheGet(cacheKey);
  if (cached) {
    return res.status(200).set(CORS).json({ success: true, verdict: cached.verdict, cached: true, cachedAt: cached.generatedAt, generatedAt: cached.generatedAt, tokensUsed: 0, requestId: id });
  }

  try {
    const ai = getOpenAI();
    const completion = await ai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      max_tokens: 700,
      temperature: 0.35,
      messages: [{ role: 'user', content: buildPrompt(stockName, sector, industry, metrics, scores, horizon) }],
    });
    const verdict = completion.choices?.[0]?.message?.content?.trim() || '';
    if (!verdict) throw new Error('OpenAI returned empty response');
    const generatedAt = new Date().toISOString();
    const tokensUsed = completion.usage?.total_tokens || 0;
    cacheSet(cacheKey, { verdict, generatedAt });
    return res.status(200).set(CORS).json({ success: true, verdict, cached: false, generatedAt, tokensUsed, requestId: id, cacheStats: cacheStats() });
  } catch (error) {
    console.error('[AI ERROR]', { requestId: id, message: error?.message, status: error?.status });
    const keyError = error?.status === 401 || /api key/i.test(error?.message || '');
    const quotaError = error?.status === 429 || /quota/i.test(error?.message || '');
    return errorResponse(res, 502, keyError ? 'AI service is not configured correctly.' : quotaError ? 'AI service is temporarily unavailable.' : 'AI service is temporarily unavailable.', id);
  }
}

export default async function handler(req, res) {
  const id = requestId(req);
  if (req.method === 'OPTIONS') {
    Object.entries(CORS).forEach(([k,v]) => res.setHeader(k,v));
    return res.status(204).end();
  }

  // Live StockSamjho analysis: GET /api/analyze?symbol=TCS
  if (req.method === 'GET') {
    const rawSymbol = req.query?.symbol;
    const symbol = String(Array.isArray(rawSymbol) ? rawSymbol[0] : rawSymbol || '').trim();
    if (!symbol) return errorResponse(res, 400, 'Stock symbol is required.', id);
    if (!/^[A-Za-z0-9.&^_-]{1,25}(?:\.(?:NS|BO))?$/i.test(symbol)) return errorResponse(res, 400, 'Invalid stock symbol.', id);

    try {
      const result = await analyzeStock(symbol);
      Object.entries(CORS).forEach(([k,v]) => res.setHeader(k,v)); return res.status(200).json(result);
    } catch (error) {
      // Keep provider/schema details in server logs only.
      console.error('[MARKET ANALYZE ERROR]', {
        requestId: id,
        symbol,
        message: error?.message,
        stack: error?.stack,
      });
      const message = /insufficient market data/i.test(error?.message || '')
        ? 'Market data is temporarily unavailable. Please try again.'
        : 'Market data is temporarily unavailable. Please try again.';
      return errorResponse(res, 502, message, id);
    }
  }

  // Preserve the existing AI narrative POST contract.
  if (req.method === 'POST') return handleAI(req, res, id);

  return errorResponse(res, 405, 'Method not allowed.', id);
}
