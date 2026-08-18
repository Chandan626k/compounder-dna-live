import express from 'express';
import path from 'node:path';
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
// decision center remains available explicitly at /decision.html.
app.get('/', (req, res) => res.sendFile(path.join(publicDir, 'terminal.html')));

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