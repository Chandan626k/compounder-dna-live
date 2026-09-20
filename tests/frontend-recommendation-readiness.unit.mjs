import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const html = fs.readFileSync(new URL('../public/terminal.html', import.meta.url), 'utf8');
const ui = fs.readFileSync(new URL('../public/recommendation-readiness-ui.js', import.meta.url), 'utf8');
assert.match(html, /Recommendation readiness/);
assert.match(html, /Evidence readiness by horizon/);
assert.match(html, /recommendation-readiness-ui\.js/);
assert.match(html, /window\.renderReadiness\(readiness\)/);
assert.match(html, /LONG_TERM:'Long Term'/);
assert.match(html, /SWING:'Swing'/);
assert.match(html, /SHORT_TERM:'Short Term'/);
assert.match(html, /INTRADAY:'Intraday'/);
assert.match(html, /RECOMMENDATION ENGINE OFF/);
assert.equal(/BUY|SELL/i.test(ui), false, 'readiness renderer must not generate BUY/SELL');
const check = spawnSync(process.execPath, ['--check', new URL('../public/recommendation-readiness-ui.js', import.meta.url)], { encoding: 'utf8' });
assert.equal(check.status, 0, check.stderr || 'readiness UI syntax failed');
console.log('frontend recommendation readiness: PASS');
