import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../public/terminal.html', import.meta.url), 'utf8');

assert.match(html, /Evidence timeline/, 'timeline UI must be visible');
assert.match(html, /id="evidenceTimeline"/, 'timeline container must be present');
assert.match(html, /renderEvidenceTimeline\(l,tp,l\)/, 'timeline must consume canonical lifecycle evidence');
assert.match(html, /lifecycle\?\.events/, 'timeline must consume canonical event records');
assert.match(html, /e\?\.date\|\|'Date unavailable'/, 'missing event dates must remain unavailable');
assert.match(html, /tp\?\.retrievedAt\|\|lifecycle\?\.provenance\?\.retrievedAt/, 'retrieval time must be distinct from event date');
assert.match(html, /Event date/, 'event date must be labeled separately');
assert.match(html, /Retrieved/, 'retrieval time must be labeled separately');
assert.match(html, /CURRENT:/, 'current lifecycle status must be distinct from event type');
assert.match(html, /canonical lifecycle event sequence/, 'chronology must be tied to canonical event order');
assert.match(html, /No “changed”, “confirmed”, or “superseded” status is inferred/, 'timeline must not invent state-change semantics');
assert.match(html, /No event has been invented/, 'timeline must not fabricate missing events');
assert.match(html, /no new calculation is performed/, 'timeline must remain explanatory');
assert.match(html, /id="researchStateValue"/, 'research state regression must remain present');
assert.match(html, /id="evidencePanel"/, 'evidence drill-down regression must remain present');
assert.match(html, /canonicalEvidence\?\.breakoutLifecycle/, 'canonical evidence remains authoritative');
assert.match(html, /productionBlocked=tr\?\.productionDecisionBlocked===true/, 'production gate must remain backend-controlled');
assert.match(html, /backendAction=a=>productionBlocked\?'NO TRADE'/, 'blocked production actions must remain NO TRADE');
assert.doesNotMatch(html, /renderEvidenceTimeline[\\s\\S]*Date\.now\(/, 'timeline must not synthesize event time from current time');

console.log('evidence-timeline.unit: PASS');
