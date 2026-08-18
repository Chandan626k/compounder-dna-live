import { analyze } from '../lib/market-engine.js';
import { buildInvestmentReadiness } from '../lib/investment-readiness.js';

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-store',
};

export default async function handler(req, res) {
  Object.entries(HEADERS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const symbol = String(req.query?.symbol || '').trim().toUpperCase();
  if (!/^[A-Za-z0-9.&_-]{1,25}(?:\.(?:NS|BO))?$/i.test(symbol)) {
    return res.status(400).json({ success: false, error: 'Valid stock symbol is required' });
  }

  try {
    const analysis = await analyze(symbol);
    const result = buildInvestmentReadiness(analysis);
    return res.status(200).json({ symbol: symbol.replace(/\.(?:NS|BO)$/i, ''), ...result });
  } catch (error) {
    const message = String(error?.message || error || '');
    const unavailable = /no data found|symbol may be delisted|insufficient market data|no usable market prices/i.test(message);
    if (unavailable) {
      return res.status(404).json({
        success: false,
        status: 'DATA_UNAVAILABLE',
        classification: 'RESEARCH ONLY',
        action: 'NO ACTION',
        error: 'Verified market/fundamental data is unavailable; no synthetic fallback used.',
      });
    }
    console.error('[INVESTMENT READINESS ERROR]', { symbol, message, stack: error?.stack });
    return res.status(502).json({
      success: false,
      status: 'UNAVAILABLE',
      classification: 'RESEARCH ONLY',
      action: 'NO ACTION',
      error: 'Investment readiness could not be computed from verified data.',
    });
  }
}
