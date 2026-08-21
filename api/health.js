import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
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

async function serveTerminal(req, res) {
  if (!process.env.CLERK_PUBLISHABLE_KEY) return res.status(503).send('Authentication is not configured for this preview.');
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const html = await fs.readFile(path.join(__dirname, '..', 'public', 'terminal.html'), 'utf8');
  const config = `<script>window.__STOCKSAMJHO_CLERK_PUBLISHABLE_KEY__=${JSON.stringify(process.env.CLERK_PUBLISHABLE_KEY)};</script>`;
  const injected = '<script src="/security-bootstrap.js" defer></script>';
  const output = html.includes('</body>') ? html.replace('</body>', `${config}${injected}</body>`) : `${html}${config}${injected}`;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).send(output);
}

export default async function handler(req, res) {
  const route = String(req.query?.route || 'health').replace(/^\/+|\/+$/g, '');
  try {
    if (route === 'terminal') return serveTerminal(req, res);
    if (route === 'data/health') {
      const identity = await guardRequest(req, res, POLICY['data/health']);
      if (!identity) return;
      return res.status(200).json({ ok: true });
    }
    if (route === 'auth/config') {
      const identity = await guardRequest(req, res, { auth: false, policy: 'health', route: 'auth-config' });
      if (!identity) return;
      if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'METHOD_NOT_ALLOWED' });
      return res.status(200).json({ publishableKey: String(process.env.CLERK_PUBLISHABLE_KEY || '') });
    }
    if (route === 'health') {
      const identity = await guardRequest(req, res, POLICY.health);
      if (!identity) return;
      return res.status(200).json({
        ok: true,
        service: 'compounder-dna',
        marketEngine: 'available',
        yahooFinance: { usedByMarketEngine: true, liveCheck: 'not_performed' },
        openai: { configured: Boolean(process.env.OPENAI_API_KEY) },
        timestamp: new Date().toISOString(),
      });
    }
    const loader = HANDLERS[route];
    if (!loader) return res.status(404).json({ success: false, error: 'NOT_FOUND' });
    const identity = await guardRequest(req, res, POLICY[route] || { policy: 'normal' });
    if (!identity) return;
    const module = await loader();
    if (typeof module.default !== 'function') return res.status(500).json({ success: false, error: 'SERVER_ERROR' });
    return module.default(req, res);
  } catch (error) {
    console.error('[api/security-gateway]', { route, message: error?.message });
    if (!res.headersSent) return res.status(503).json({ success: false, error: 'SECURITY_SERVICE_UNAVAILABLE' });
    return undefined;
  }
}
