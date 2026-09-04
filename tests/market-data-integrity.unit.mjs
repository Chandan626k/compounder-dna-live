import assert from 'node:assert/strict';
import { normalizeQuote, validateMarketRows } from '../lib/market-data-provider.js';

const now = Date.parse('2026-09-05T12:00:00.000Z');
const rows = [
  { date: '2026-09-04T00:00:00.000Z', o: 100, h: 110, l: 95, c: 105, v: 1000 },
  { date: '2026-09-03T00:00:00.000Z', o: 90, h: 95, l: 85, c: 92, v: 900 },
  { date: '2026-09-02T00:00:00.000Z', o: 80, h: 84, l: 79, c: 82, v: 800 },
];
const valid = validateMarketRows(rows, now);
assert.equal(valid.length, 3);
assert.deepEqual(valid.map(x => x.date), ['2026-09-02T00:00:00.000Z', '2026-09-03T00:00:00.000Z', '2026-09-04T00:00:00.000Z']);

assert.equal(validateMarketRows([{ date: '2026-09-04T00:00:00.000Z', o: 100, h: 99, l: 95, c: 98, v: 100 }], now).length, 0);
assert.equal(validateMarketRows([{ date: '2026-09-04T00:00:00.000Z', o: 100, h: 110, l: 101, c: 99, v: 100 }], now).length, 0);
assert.equal(validateMarketRows([{ date: '2026-09-04T00:00:00.000Z', o: 100, h: 110, l: 95, c: 105, v: -1 }], now).length, 0);
assert.equal(validateMarketRows([{ date: '2026-09-05T13:00:00.000Z', o: 100, h: 110, l: 95, c: 105, v: 100 }], now).length, 0);
assert.equal(validateMarketRows([{ date: '2026-09-04T00:00:00.000Z', o: 100, h: 110, l: 95, c: 105, v: 100 }, { date: '2026-09-04T00:00:00.000Z', o: 100, h: 111, l: 94, c: 106, v: 101 }], now).length, 1);

const q = normalizeQuote({ regularMarketPrice: 123.45, regularMarketTime: 1788600000, marketState: 'REGULAR', exchangeDataDelayedBy: 0, quoteSourceName: 'Nasdaq Real Time Price', sourceInterval: 15, currency: 'INR', exchange: 'NSI' }, '2026-09-05T12:00:00.000Z');
assert.equal(q.price, 123.45);
assert.equal(q.marketState, 'REGULAR');
assert.equal(q.exchangeDataDelayedBy, 0);
assert.equal(q.quoteSourceName, 'Nasdaq Real Time Price');
assert.equal(q.retrievedAt, '2026-09-05T12:00:00.000Z');
assert.equal(q.status, 'PROVIDER_QUOTE');
assert.equal(q.freshnessStatus, 'STALE_DURING_REGULAR_SESSION');
assert.ok(q.observedAt);
assert.ok(q.ageSeconds > 0);

const closed = normalizeQuote({ regularMarketPrice: 123.45, regularMarketTime: 1788600000, marketState: 'CLOSED', exchangeDataDelayedBy: 0, sourceInterval: 15 }, '2026-09-05T12:00:00.000Z');
assert.equal(closed.status, 'PROVIDER_QUOTE');
assert.equal(closed.freshnessStatus, 'LAST_REGULAR_OR_EXTENDED_QUOTE');

const unavailable = normalizeQuote({ regularMarketPrice: null, regularMarketTime: null }, '2026-09-05T12:00:00.000Z');
assert.equal(unavailable.status, 'UNAVAILABLE');
assert.equal(unavailable.freshnessStatus, 'UNAVAILABLE');
assert.equal(unavailable.price, null);

console.log('market-data-integrity.unit: PASS');
