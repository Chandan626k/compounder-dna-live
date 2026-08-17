import { analyze as analyzeStock } from '../lib/market-engine.js';
import { cacheGet, cacheSet, cacheStats, isRateLimited } from '../lib/cache.js';
import { validateAnalyzeRequest } from '../lib/validate.js';
import { parseAIResponse, renderAIHtml } from '../lib/ai-schema.js';

const CORS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Request-ID',
  'Cache-Control': 'no-store',
};

async function callOpenAI({ apiKey, model, prompt }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: 700,
        temperature: 0.35,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: controller.signal,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data?.error?.message || `OpenAI HTTP ${response.status}`);
      error.status = response.status;
      throw error;
    }
    return data;
  } finally {
    clearTimeout(timeout);
  }
}

function applyHeaders(res) {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
  return res;
}

function requestId(req) {
  return req.headers['x-request-id'] || globalThis.crypto?.randomUUID?.() || Date.now().toString();
}

function errorResponse(res, status, error, id) {
  Object.entries(CORS).forEach(([k,v]) => res.setHeader(k,v)); return res.status(status).json({ success: false, error, requestId: id });
}

function buildPromptFromAnalysis(analysis, horizon = 20) {
  const s = analysis.stock || {};
  const f = analysis.fundamentals || {};
  const r = f.ratios || {};
  const g = f.growth || {};
  const d = f.derived || {};
  const v = analysis.valuation || {};
  const t = analysis.technical || {};
  const score = analysis.score || {};
  const dq = analysis.dataQuality || {};
  const unavailable = (value) => value == null ? 'Not Available' : value;

  return `You are a senior equity research analyst specializing in Indian long-term investing.
You are an interpretation layer only. NEVER invent, estimate, or alter financial facts.
Use only the structured StockSamjho analysis below. If a fact is unavailable, explicitly say "Not Available".
Do not give a price target or guarantee returns.
Return JSON only with exactly these string fields:
- businessQuality
- numbersValuation
- risks
- thesis
- whatToMonitor
Keep each field concise and evidence-based.

COMPANY
Name: ${unavailable(s.name)}
Symbol: ${unavailable(s.symbol)}
Sector: ${unavailable(s.sector)}
Industry: ${unavailable(s.industry)}
Price: ${unavailable(s.price)} ${unavailable(s.currency)}

FUNDAMENTALS
ROE: ${unavailable(r.roe)}%
ROCE (simplified): ${unavailable(d.roceFromStatements)}%
Debt/Equity: ${unavailable(r.debtToEquity)}x
Interest Coverage: ${unavailable(d.interestCoverage)}x
Revenue Growth: ${unavailable(r.revenueGrowth)}%
Earnings Growth: ${unavailable(r.earningsGrowth)}%
5Y Revenue CAGR: ${unavailable(g.revenue5yCagr)}%
5Y EPS CAGR: ${unavailable(g.eps5yCagr)}%
5Y PAT CAGR: ${unavailable(g.pat5yCagr)}%
FCF Margin: ${unavailable(d.fcfMargin)}%
FCF Conversion: ${unavailable(d.fcfConversion)}%
Net Debt/EBITDA: ${unavailable(d.netDebtToEbitda)}x

VALUATION
Trailing P/E: ${unavailable(v.trailingPE)}x
Forward P/E: ${unavailable(v.forwardPE)}x
P/B: ${unavailable(v.priceToBook)}x
Fair Value Framework: ${unavailable(v.fairValue)}
Valuation Verdict: ${unavailable(v.verdict)}

TECHNICAL
Trend: ${unavailable(t.trend)}
RSI14: ${unavailable(t.rsi)}
Price vs 200DMA: ${unavailable(t.distanceFrom200DMA)}%
Relative Volume: ${unavailable(t.relativeVolume)}x

RISK / DATA QUALITY
Risk Score: ${unavailable(score.risk)}/100 (higher = more risk)
Overall Score: ${unavailable(score.overall)}/100
Data Confidence: ${unavailable(dq.confidence)}/100
Warnings: ${dq.warnings?.length ? dq.warnings.join(' | ') : 'None reported'}
Decision: ${unavailable(analysis.decision?.action)}
Investment Horizon: ${horizon} years`;
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

  const { symbol, horizon = 20 } = body;
  const normalizedSymbol = String(symbol).trim().toUpperCase();
  const cacheKey = `analyze:${normalizedSymbol}:${horizon}`;
  const cached = cacheGet(cacheKey);
  if (cached) {
    return applyHeaders(res).status(200).json({ success: true, verdict: cached.verdict, cached: true, cachedAt: cached.generatedAt, generatedAt: cached.generatedAt, tokensUsed: 0, requestId: id });
  }

  try {
    const key = process.env.OPENAI_API_KEY;
    if (!key || !key.startsWith('sk-')) throw new Error('OPENAI_API_KEY not configured on server');

    const analysisCacheKey = `market:${normalizedSymbol}`;
    let analysis = cacheGet(analysisCacheKey);
    if (!analysis) {
      analysis = await analyzeStock(normalizedSymbol);
      cacheSet(analysisCacheKey, analysis, 10 * 60 * 1000);
    }

    const completion = await callOpenAI({
      apiKey: key,
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      prompt: buildPromptFromAnalysis(analysis, horizon),
    });
    const content = completion.choices?.[0]?.message?.content?.trim() || '';
    if (!content) throw new Error('OpenAI returned empty response');
    const parsed = parseAIResponse(content);
    const verdict = renderAIHtml(parsed);
    const generatedAt = new Date().toISOString();
    const tokensUsed = completion.usage?.total_tokens || 0;
    cacheSet(cacheKey, { verdict, generatedAt });
    return applyHeaders(res).status(200).json({ success: true, verdict, cached: false, generatedAt, tokensUsed, requestId: id, cacheStats: cacheStats(), model: process.env.OPENAI_MODEL || 'gpt-4o-mini' });
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

    const cacheKey = `market:${symbol.toUpperCase()}`;
    const cached = cacheGet(cacheKey);
    if (cached) {
      Object.entries(CORS).forEach(([k,v]) => res.setHeader(k,v));
      return res.status(200).json({ ...cached, meta: { ...(cached.meta || {}), cached: true } });
    }

    try {
      const result = await analyzeStock(symbol);
      cacheSet(cacheKey, result, 10 * 60 * 1000);
      Object.entries(CORS).forEach(([k,v]) => res.setHeader(k,v)); return res.status(200).json({ ...result, meta: { cached: false } });
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
