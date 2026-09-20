import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../public/terminal.html', import.meta.url), 'utf8');
assert.match(html, /Recommendation readiness/);
assert.match(html, /Evidence readiness by horizon/);
assert.match(html, /renderReadiness\(readiness\)/);
assert.match(html, /LONG_TERM:'Long Term'/);
assert.match(html, /SWING:'Swing'/);
assert.match(html, /SHORT_TERM:'Short Term'/);
assert.match(html, /INTRADAY:'Intraday'/);
assert.match(html, /RECOMMENDATION ENGINE OFF/);
assert.equal(/readiness[^\n]*BUY|readiness[^\n]*SELL/i.test(html), false, 'readiness UI must not generate BUY/SELL');
console.log('frontend recommendation readiness: PASS');
