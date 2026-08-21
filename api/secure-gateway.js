import { guardRequest } from '../lib/security.js';

const HANDLERS = {
  analyze: () => import('./analyze.js'),
  'analyze-gated': () => import('./analyze-gated.js'),
  actionability: () => import('./actionability.js'),
  trading: () => import('./trading.js'),
  scan: () => import('./scan.js'),
  'data-foundation': () => import('./data-foundation.js'),
  data: () => import('./data.js'),
  'investment-readiness': () => import('./investment-readiness.js'),
  backtest: () => import('./backtest.js'),
  'validate-strategy': () => import('./validate-strategy.js'),
  'final-holdout': () => import('./final-holdout.js'),
  health: () => import('./health.js'),
};

const POLICY = {
  health: { auth: false, policy: 'health' },
  'data/health': { auth: false, policy: 'health' },
  analyze: { policy: 'normal' },
  'analyze-gated': { policy: 'normal' },
  actionability: { policy: 'normal' },
  trading: { policy: 'normal' },
  data: { policy: 'normal' },
  'investment-readiness': { policy: 'normal' },
  scan: { policy: 'expensive' },
  'data-foundation': { policy: 'expensive' },
  backtest: { role: 'research', policy: 'research' },
  'validate-strategy': { role: 'research', policy: 'research' },
  'final-holdout': { role: 'admin', policy: 'research' },
};

export default async function handler(req, res) {
  const route = String(req.query?.route || '').replace(/^\/+|\/+$/g, '');
  if (!route) return res.status(404).json({ success: false, error: 'NOT_FOUND' });

  if (route === 'data/health') {
    const identity = await guardRequest(req, res, POLICY['data/health']);
    if (!identity) return;
    return res.status(200).json({ ok: true });
  }

  const loader = HANDLERS[route];
  if (!loader) return res.status(404).json({ success: false, error: 'NOT_FOUND' });

  try {
    const identity = await guardRequest(req, res, POLICY[route] || { policy: 'normal' });
    if (!identity) return;
    const module = await loader();
    if (typeof module.default !== 'function') return res.status(500).json({ success: false, error: 'SERVER_ERROR' });
    return module.default(req, res);
  } catch (error) {
    console.error('[api/secure-gateway]', { route, message: error?.message });
    if (!res.headersSent) return res.status(503).json({ success: false, error: 'SECURITY_SERVICE_UNAVAILABLE' });
    return undefined;
  }
}
