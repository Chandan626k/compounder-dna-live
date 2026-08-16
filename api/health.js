const CORS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Request-ID',
  'Cache-Control': 'no-store',
};

export default function handler(req, res) {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method not allowed.' });
  return res.status(200).json({
    ok: true,
    service: 'compounder-dna',
    marketEngine: 'live',
    yahooFinance: 'configured',
    openai: { configured: Boolean(process.env.OPENAI_API_KEY) },
    timestamp: new Date().toISOString(),
  });
}
