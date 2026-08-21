import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).send('Method not allowed');
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const html = await fs.readFile(path.join(__dirname, '..', 'public', 'terminal.html'), 'utf8');
    if (!process.env.CLERK_PUBLISHABLE_KEY) return res.status(503).send('Authentication is not configured for this preview.');
    const injected = '<script src="/security-bootstrap.js" defer></script>';
    const output = html.includes('</body>') ? html.replace('</body>', `${injected}</body>`) : `${html}${injected}`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(output);
  } catch (error) {
    console.error('[api/terminal]', { message: error?.message });
    return res.status(500).send('Research terminal unavailable');
  }
}
