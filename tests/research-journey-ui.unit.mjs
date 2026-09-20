import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../public/terminal.html', import.meta.url), 'utf8');

assert.match(html, /id="researchStateValue"/, 'research state must be visible');
assert.match(html, /id="researchEvidence"/, 'evidence status must be visible');
assert.match(html, /id="researchSetup"/, 'technical setup must be visible');
assert.match(html, /id="researchRisk"/, 'risk evidence status must be visible');
assert.match(html, /id="researchQuality"/, 'data quality must be visible');
assert.match(html, /id="researchWatch"/, 'watch-next guidance must be visible');
assert.match(html, /canonicalEvidence\?\.breakoutLifecycle/, 'UI must consume canonical lifecycle evidence');
assert.match(html, /riskEvidence\.status/, 'UI must consume canonical risk evidence');
assert.match(html, /d\?\.decision\?\.gate\?\.status/, 'UI must consume the backend evidence gate');
assert.match(html, /productionBlocked=tr\?\.productionDecisionBlocked===true/, 'production gate must remain backend-controlled');
assert.match(html, /backendAction=a=>productionBlocked\?'NO TRADE'/, 'blocked production actions must remain NO TRADE');
assert.match(html, /id="evidencePanel"/, 'evidence drill-down panel must be present');
assert.match(html, /id="evidenceSupport"/, 'supporting evidence section must be present');
assert.match(html, /id="evidenceProvenance"/, 'evidence provenance section must be present');
assert.match(html, /id="evidenceMissing"/, 'missing evidence section must be present');
assert.match(html, /id="evidenceRisk"/, 'risk evidence explanation section must be present');
assert.match(html, /evidenceTextRow\('Primary source'/, 'drill-down must expose source when available');
assert.match(html, /evidenceTextRow\('Analysis as-of'/, 'drill-down must expose observation time when available');
assert.match(html, /evidenceTextRow\('Technical provenance'/, 'drill-down must expose canonical technical provenance when available');
assert.match(html, /no new calculation is performed/, 'drill-down must remain explanatory only');
assert.match(html, /Back to research state/, 'user must be able to return to research state');
assert.match(html, /canonicalEvidence\?\.provenance/, 'drill-down must consume canonical evidence provenance');
assert.match(html, /re\.invalidationLevel/, 'drill-down must not invent risk invalidation');
assert.match(html, /productionBlocked=tr\?\.productionDecisionBlocked===true/, 'production gate must remain backend-controlled');
assert.match(html, /backendAction=a=>productionBlocked\?'NO TRADE'/, 'blocked production actions must remain NO TRADE');

console.log('research-journey-ui.unit: PASS');
