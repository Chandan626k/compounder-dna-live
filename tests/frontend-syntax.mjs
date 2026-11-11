import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';

const html = fs.readFileSync(new URL('../public/terminal.html', import.meta.url), 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
if (!scripts.length) throw new Error('No inline frontend script found in public/terminal.html');

const readinessSource = fs.readFileSync(new URL('../public/recommendation-readiness-ui.js', import.meta.url), 'utf8');
if (!/<script src=["']\/recommendation-readiness-ui\.js["']><\/script>/.test(html)) {
  throw new Error('Recommendation readiness asset must be loaded as the expected classic script.');
}
if (/^\s*(?:import|export)\s/m.test(readinessSource)) {
  throw new Error('Classic recommendation readiness script must not contain ESM import/export syntax.');
}
if (!/window\.renderReadiness\s*=\s*renderReadiness\s*;/.test(readinessSource)) {
  throw new Error('Classic recommendation readiness script must expose window.renderReadiness.');
}

const nodes = {
  readinessGrid: { innerHTML: '' },
  readinessDetails: { innerHTML: '' },
  readinessPolicy: { textContent: '' }
};
const browserWindow = {};
vm.runInNewContext(readinessSource, {
  window: browserWindow,
  document: { getElementById: (id) => nodes[id] || null }
});
if (typeof browserWindow.renderReadiness !== 'function') {
  throw new Error('Classic browser execution did not expose window.renderReadiness.');
}
browserWindow.renderReadiness({
  horizons: {
    LONG_TERM: { state: 'PARTIALLY_READY', recommendationEligible: false, availableEvidence: [], missingEvidence: ['currency'], blockers: [{ reason: 'Evidence incomplete' }], nextRequiredEvidence: ['verified currency'] },
    SWING: { state: 'NOT_READY', recommendationEligible: false, availableEvidence: [], missingEvidence: ['stop'], blockers: [{ reason: 'Risk evidence missing' }], nextRequiredEvidence: ['invalidation stop'] },
    SHORT_TERM: { state: 'NOT_READY', recommendationEligible: false, availableEvidence: [], missingEvidence: ['intraday'], blockers: [], nextRequiredEvidence: [] },
    INTRADAY: { state: 'NOT_AVAILABLE', recommendationEligible: false, availableEvidence: [], missingEvidence: ['provider'], blockers: [], nextRequiredEvidence: [] }
  },
  policy: { recommendationEnginePresent: false }
});
if (!nodes.readinessGrid.innerHTML.includes('PARTIALLY_READY')) {
  throw new Error('Readiness renderer did not populate horizon cards.');
}
if (!nodes.readinessDetails.innerHTML.includes('verified currency')) {
  throw new Error('Readiness renderer did not populate next-required-evidence details.');
}
if (nodes.readinessPolicy.textContent !== 'RECOMMENDATION ENGINE OFF') {
  throw new Error('Readiness renderer changed the recommendation-engine safety label.');
}

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'stocksamjho-ui-'));
try {
  const inlineFile = path.join(dir, 'frontend.mjs');
  fs.writeFileSync(inlineFile, scripts.at(-1));
  const inlineResult = spawnSync(process.execPath, ['--check', inlineFile], { encoding: 'utf8' });
  if (inlineResult.status !== 0) {
    process.stderr.write(inlineResult.stderr || inlineResult.stdout || 'Inline frontend syntax check failed.');
    process.exit(inlineResult.status || 1);
  }

  const readinessFile = path.join(dir, 'recommendation-readiness.cjs');
  fs.writeFileSync(readinessFile, readinessSource);
  const readinessResult = spawnSync(process.execPath, ['--check', readinessFile], { encoding: 'utf8' });
  if (readinessResult.status !== 0) {
    process.stderr.write(readinessResult.stderr || readinessResult.stdout || 'Classic readiness script syntax check failed.');
    process.exit(readinessResult.status || 1);
  }
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}
console.log('frontend syntax/runtime: PASS (inline frontend + classic readiness renderer execution)');
