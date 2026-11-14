import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const pages = [
  ['public/terminal.html', fs.readFileSync(new URL('../public/terminal.html', import.meta.url), 'utf8')],
  ['public/decision.html', fs.readFileSync(new URL('../public/decision.html', import.meta.url), 'utf8')],
];
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'stocksamjho-ui-'));
try {
  for (const [pageIndex, [page, html]] of pages.entries()) {
    const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
    if (!scripts.length) throw new Error('No inline frontend script found in ' + page);
    for (const [index, script] of scripts.entries()) {
      const tempFile = path.join(dir, `frontend-${pageIndex}-${index}.mjs`);
      fs.writeFileSync(tempFile, script);
      const result = spawnSync(process.execPath, ['--check', tempFile], { encoding: 'utf8' });
      if (result.status !== 0) {
        process.stderr.write(result.stderr || result.stdout || 'Frontend syntax check failed for ' + page);
        throw new Error('Frontend syntax check failed for ' + page);
      }
    }
  }
  const terminal = pages[0][1];
  const decision = pages[1][1];
  if (!terminal.includes('health.marketDataAccess?.status') || terminal.includes('● ENGINE OK')) {
    throw new Error('Terminal must display explicit market-data access status, not a generic green engine state.');
  }
  if (!decision.includes('id="dataAccessStatus"') || !decision.includes('health.marketDataAccess?.status')
    || decision.includes('● LIVE DATA</div>')) {
    throw new Error('Decision page must display the explicit market-data access state, not a static live-data badge.');
  }
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}
console.log('frontend syntax and market-data status UI: PASS (terminal + decision pages)');
