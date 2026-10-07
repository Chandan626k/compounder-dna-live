import assert from 'node:assert/strict';
import fs from 'node:fs';

const terminal=fs.readFileSync('public/terminal.html','utf8');
const universe=fs.readFileSync('public/stock-universe.js','utf8');
const search=fs.readFileSync('public/stock-search.js','utf8');

assert.match(universe,/RELIANCE.*Reliance Industries/s);
assert.match(universe,/TCS.*Tata Consultancy Services/s);
assert.match(universe,/INFY.*Infosys Ltd/s);
assert.match(search,/StockSamjhoUniverse/);
assert.match(search,/symbol\.includes\(needle\)\|\|name\.includes\(needle\)/);
assert.match(search,/input\.placeholder='Search company or stock'/);
assert.match(search,/localStorage/);
assert.match(search,/ArrowDown/);
assert.match(search,/ArrowUp/);
assert.match(search,/},true\);/);
assert.match(search,/No matching company or stock found/);
assert.match(search,/input\.value=item\.symbol/);
assert.match(search,/KeyboardEvent\('keydown'/);
assert.match(terminal,/stock-universe\.js/);
assert.match(terminal,/stock-search\.js/);
assert.match(terminal,/id="symbol"/);
assert.match(terminal,/fetch\('\/api\/analyze\?symbol=/);
assert.match(terminal,/fetch\('\/api\/trading\?symbol=/);

console.log('stock-search.unit: PASS');