import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../public/terminal.html', import.meta.url), 'utf8');

assert.match(html, /id="researchStateValue"/, 'research state must be visible');
assert.match(html, /id="researchEvidence"/, 'evidence status must be visible');
assert.match(html, /id="researchSetup"/, 'technical setup must be visible');
assert.match(html, /id="researchRisk"/, 'risk evidence status must be visible');
assert.match(html, /id="researchQuality"/, 'data quality must be visible');
assert.match(html, /id="researchWatch"/, 'watch-next guidance must be visible');
assert.match(html, /canonicalEvidence?.breakoutLifecycle/, 'UI must consume canonical lifecycle evidence');
assert.match(html, /riskEvidence?.status/, 'UI must consume canonical risk evidence');
assert.match(html, /d?.decision?.gate?.status/, 'UI must consume the backend evidence gate');
assert.match(html, /productionBlocked=tr?.productionDecisionBlocked===true/, 'production gate must remain backend-controlled');
assert.match(html, /backendAction=a=>productionBlocked?'NO TRADE'/, 'blocked production actions must remain NO TRADE');
assert.match(html, /Research state is based on the existing evidence gate; no new calculation is performed/, 'UI must not introduce a second decision engine');

console.log('research-journey-ui.unit: PASS');