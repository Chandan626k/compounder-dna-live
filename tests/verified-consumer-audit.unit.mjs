import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
  const full = path.join(dir, entry.name);
  if (entry.isDirectory()) return walk(full);
  return /\.(?:js|mjs|html)$/.test(entry.name) ? [full] : [];
});

const server = read('server.js');
assert.match(server, /import \{ analyzeVerified \} from ['"]\.\/lib\/verified-analysis\.js['"]/);
assert.doesNotMatch(server, /import \{ analyze \} from ['"]\.\/lib\/market-engine\.js['"]/);
assert.match(server, /await analyzeVerified\(symbol\)/);

const autoMode = read('public/auto-mode.js');
assert.match(autoMode, /fetch\(['"]\/api\/scan\?deep=false/);
assert.doesNotMatch(autoMode, /fetch\(['"]\/api\/data/);

const analyze = read('api/analyze.js');
const actionability = read('api/actionability.js');
const trading = read('api/trading.js');
const investmentReadiness = read('api/investment-readiness.js');
const scan = read('api/scan.js');
const legacyData = read('api/data.js');
const foundation = read('api/data-foundation.js');

for (const [name, source] of Object.entries({ analyze, actionability, trading, investmentReadiness, scan })) {
  assert.match(source, /analyzeVerified|verifiedHistory|scanSymbols/, `${name} must consume verified market/data path`);
}
assert.match(legacyData, /verifiedHistory/);
assert.match(legacyData, /verifiedQuote/);
assert.match(legacyData, /scanSymbols/);
assert.doesNotMatch(legacyData, /function ema\(|function rsi\(|function atr\(|function technicalSignal\(/, 'legacy /api/data must not own duplicate technical calculations');
assert.doesNotMatch(actionability, /fetchStatementEvidence\(/, 'actionability must not create a duplicate statement fetch path');
assert.match(actionability, /analysis\.fundamentals\?\.statementEvidence/);
assert.match(foundation, /periodType !== expectedPeriod/);
assert.match(foundation, /verifiedQuote\(symbol\)/);
assert.match(foundation, /annualPeriod:'explicit 12M only'/);
assert.match(foundation, /quarterlyPeriod:'explicit 3M only'/);

const productionFiles = walk(path.join(root, 'api')).concat(walk(path.join(root, 'public')), [path.join(root, 'server.js')]);
for (const file of productionFiles) {
  const relative = path.relative(root, file);
  const source = fs.readFileSync(file, 'utf8');
  assert.doesNotMatch(source, /import\s*\{\s*analyze\s*(?:as\s+\w+)?\s*\}\s*from\s*['"][^'"]*market-engine\.js['"]/, `${relative} must not import legacy market-engine analyze()`);
  assert.doesNotMatch(source, /fetch\(['"]\/api\/data(?:['"]|[?])/, `${relative} must not consume legacy /api/data`);
}

console.log('verified-consumer-audit.unit: PASS');
