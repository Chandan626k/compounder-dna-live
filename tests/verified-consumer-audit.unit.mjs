import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

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

for (const [name, source] of Object.entries({ analyze, actionability, trading, investmentReadiness, scan })) {
  assert.match(source, /analyzeVerified|verifiedHistory|scanSymbols/, `${name} must consume verified market/data path`);
}
assert.doesNotMatch(actionability, /fetchStatementEvidence\(/, 'actionability must not create a duplicate statement fetch path');
assert.match(actionability, /analysis\.fundamentals\?\.statementEvidence/);

console.log('verified-consumer-audit.unit: PASS');
