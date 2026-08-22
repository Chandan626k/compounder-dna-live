import { analyzeVerified } from '../lib/verified-analysis.js';
import { applyDecisionEvidenceGate } from '../lib/decision-evidence-gate.js';

const CORS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Request-ID',
  'Cache-Control': 'no-store',
};

export default async function handler(req, res) {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const raw = req.query?.symbol;
  const symbol = String(Array.isArray(raw) ? raw[0] : raw || '').trim();
  if (!symbol) return res.status(400).json({ success: false, error: 'Stock symbol is required.' });

  try {
    const analysis = await analyzeVerified(symbol);
    return res.status(200).json(applyDecisionEvidenceGate(analysis));
  } catch (error) {
    console.error('[api/analyze-gated]', { symbol, message: error?.message });
    return res.status(502).json({ success: false, error: 'Verified market data is temporarily unavailable.' });
  }
}
