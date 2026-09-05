import fs from 'node:fs';
const path = 'tests/canonical-market-structure.unit.mjs';
const source = fs.readFileSync(path, 'utf8');
const old = "const closes = [100, 99, 102, 98, 105, 100, 110, 103, 115, 108, 120, 112, 125, 119, 130, 123, 135, 128, 140, 134, 142, 136, 145];";
const replacement = "const closes = [100, 99, 102, 98, 105, 100, 110, 103, 115, 108, 120, 112, 125, 119, 130, 123, 135, 128, 140, 134, 138, 132, 145, 137, 143, 139, 150];";
if (!source.includes(old)) throw new Error('Expected stale fixture not found');
fs.writeFileSync(path, source.replace(old, replacement).replace("assert.equal(structure.breakout.level, 143);", "assert.equal(structure.breakout.level, 146);"));
