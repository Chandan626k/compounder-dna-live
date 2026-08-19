import express from 'express';
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { analyze } from './lib/market-engine.js';

const app = express();
const PORT = process.env.PORT || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, 'public');

app.use(express.json({ limit: '1mb' }));
app.use(express.static(publicDir, { extensions: ['html'], index: false }));
// Keep the full research terminal as the primary product surface. The
// backend decision-authority bridge is injected without replacing the terminal.
app.get('/', async (req, res) => {
  try {
    const html = await fs.readFile(path.join(publicDir, 'terminal.html'), 'utf8');
    const bridge = '<script src="/decision-authority.js" defer></script>';
    const output = html.includes('</body>') ? html.replace('</body>', `${bridge}</body>`) : `${html}${bridge}`;
    res.type('html').send(output);
  } catch (e) {
    console.error('[root]', e);
    res.status(500).send('Research terminal unavailable');
  }
});

app.get('/api/health', (req, res) => res.json({
  ok: true,
  time: new Date().toISOString(),
  provider: 'Yahoo Finance via yahoo-finance2'
}));

app.get('/api/analyze', async (req, res) => {
  const symbol = String(req.query?.symbol || '').trim();
  if (!symbol) return res.status(400).json({ error: 'symbol required' });
  try {
    return res.status(200).json(await analyze(symbol));
  } catch (e) {
    console.error('[api/analyze]', e);
    return res.status(502).json({
      error: 'Live market data unavailable',
      detail: String(e?.message || e),
      symbol: symbol.toUpperCase()
    });
  }
});

app.get('/api/data/health', (req, res) => res.json({ ok: true }));

export default app;

if (!process.env.VERCEL) {
  app.listen(PORT, () => console.log(`Compounder DNA LIVE running at http://localhost:${PORT}`));
}