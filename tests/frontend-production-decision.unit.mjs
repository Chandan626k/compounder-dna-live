import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../public/terminal.html', import.meta.url), 'utf8');

// The previous regression calculated short-term BUY/SELL locally from technical score.
assert.equal(html.includes("const shortAction=t.score>=72"), false, 'frontend must not calculate BUY from technical score');
assert.equal(html.includes("t.score<=30?'SELL'"), false, 'frontend must not calculate SELL from technical score');

// The terminal client keeps production actions disabled even if a response omits or contradicts backend gate metadata.
assert.match(html, /const productionBlocked=true;/);
assert.doesNotMatch(html, /const productionBlocked=tr\?/);
assert.match(html, /const backendAction=a=>productionBlocked\?'NO TRADE':String\(a\|\|'NO TRADE'\)/);
assert.match(html, /const shortAction=backendAction\(tr\.trade\?\.action\)/);

// All three decision cards must use the backend-derived action, not independent UI logic.
assert.match(html, /\['LONG TERM',longTerm\.action,longTerm\.reason\],\['SWING',swing\.action,swing\.reason\],\['SHORT TERM',shortTrade\.action,shortTrade\.reason\]/);

console.log('PASS frontend-production-decision.unit.mjs');
