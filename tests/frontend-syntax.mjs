import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const html = fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
if (!scripts.length) throw new Error('No inline frontend script found');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'stocksamjho-ui-'));
const file = path.join(dir, 'frontend.mjs');
fs.writeFileSync(file, scripts.at(-1));
const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
fs.rmSync(dir, { recursive: true, force: true });
if (result.status !== 0) {
  process.stderr.write(result.stderr || result.stdout || 'Frontend syntax check failed.');
  process.exit(result.status || 1);
}
console.log('frontend syntax: PASS');
