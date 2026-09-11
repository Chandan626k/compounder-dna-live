import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync(new URL('../lib/market-data-provider.js', import.meta.url), 'utf8');

test('Yahoo market history is explicitly secondary and non-authoritative', () => {
  assert.match(source, /authority: 'NON_AUTHORITATIVE_SECONDARY'/);
  assert.match(source, /status, authority: 'NON_AUTHORITATIVE_SECONDARY', verified: true/);
  assert.match(source, /'SECONDARY'/);
  assert.match(source, /'SECONDARY_FALLBACK'/);
  assert.doesNotMatch(source, /return result\([^\n]*'PRIMARY'/);
});

test('Yahoo quote is explicitly non-authoritative', () => {
  assert.match(source, /provider: 'Yahoo Finance quote API', authority: 'NON_AUTHORITATIVE_SECONDARY'/);
});
