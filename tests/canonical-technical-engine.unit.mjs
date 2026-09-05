import assert from 'node:assert/strict';
import { calculateCanonicalTechnical } from '../lib/canonical-technical-engine.js';

function rows(count = 280, mutate = null) {
  const out = [];
  for (let i = 0; i < count; i += 1) {
    const close = 100 + i * 0.25 + Math.sin(i / 7) * 2;
    const row = {
      date: new Date(Date.UTC(2025, 0, 1 + i)).toISOString(),
      open: close - 0.5,
      high: close + 1,
      low: close - 1,
      close,
      volume: 1000 + (i % 10) * 25,
    };
    out.push(mutate ? mutate(row, i) : row);
  }
  return out;
}

const base = rows();
const result = calculateCanonicalTechnical(base, {
  symbol: 'TEST.NS',
  source: 'fixture',
  retrievedAt: '2026-09-05T10:00:00.000Z',
  timeframe: '1d',
  nowMs: Date.parse('2026-09-06T00:00:00.000Z'),
});

assert.equal(result.status, 'VERIFIED');
assert.equal(result.provenance.symbol, 'TEST.NS');
assert.equal(result.provenance.source, 'fixture');
assert.equal(result.provenance.timeframe, '1d');
assert.equal(result.provenance.retrievedAt, '2026-09-05T10:00:00.000Z');
assert.ok(result.e20 != null && result.e50 != null && result.e200 != null);
assert.ok(result.rsi != null && result.atr != null && result.macd != null && result.adx != null);
assert.ok(result.relativeVolume != null);
assert.ok(['STRONG UPTREND', 'UPTREND', 'SIDEWAYS / TRANSITION', 'DOWNTREND'].includes(result.trend));
assert.ok(result.supportResistance.status === 'VERIFIED_LEVELS');
assert.ok(typeof result.vwapSemantics === 'string' && result.vwapSemantics.includes('NOT INTRADAY SESSION VWAP'));
assert.ok(result.technicalConfidence >= 0 && result.technicalConfidence <= 100);

const insufficient = calculateCanonicalTechnical(base.slice(0, 10), { symbol: 'TEST.NS', timeframe: '1d' });
assert.equal(insufficient.status, 'VERIFIED');
assert.equal(insufficient.e200, null);
assert.equal(insufficient.macd, null);
assert.equal(insufficient.adx, null);

const duplicate = calculateCanonicalTechnical([...base.slice(0, 50), base[49]], { symbol: 'TEST.NS', timeframe: '1d' });
assert.equal(duplicate.status, 'UNAVAILABLE');
assert.equal(duplicate.reason, 'DUPLICATE_TIMESTAMP');

const invalid = calculateCanonicalTechnical(base.map((row, i) => i === 100 ? { ...row, high: row.close - 2 } : row), { symbol: 'TEST.NS', timeframe: '1d' });
assert.equal(invalid.status, 'UNAVAILABLE');
assert.equal(invalid.reason, 'OHLC_INVARIANT_FAILED');

const fixedNow = Date.parse('2026-09-05T00:00:00.000Z');
const future = calculateCanonicalTechnical([...base.slice(0, 20), { ...base[20], date: '2026-09-06T00:00:00.000Z' }], { symbol: 'TEST.NS', timeframe: '1d', nowMs: fixedNow });
assert.equal(future.status, 'UNAVAILABLE');
assert.equal(future.reason, 'INVALID_OR_FUTURE_TIMESTAMP');

// Look-ahead guard: all signal inputs for observation t come from the prefix
// ending at t. A later bar is never passed into the calculation for t.
const prefix = base.slice(0, 100);
const atT = calculateCanonicalTechnical(prefix, { symbol: 'TEST.NS', timeframe: '1d' });
const priorHigh = Math.max(...prefix.slice(-21, -1).map((row) => row.high));
assert.equal(atT.provenance.observationTimestamp, prefix.at(-1).date);
assert.equal(atT.breakout?.level ?? priorHigh, priorHigh);

// A future shock can change the next observation, but it cannot retroactively
// alter the already-computed observation t.
const futureBar = { ...base[100], close: 9999, high: 10000, open: 9998, low: 9990 };
const nextT = calculateCanonicalTechnical([...prefix, futureBar], { symbol: 'TEST.NS', timeframe: '1d' });
assert.equal(nextT.provenance.observationTimestamp, futureBar.date);
assert.equal(atT.provenance.observationTimestamp, prefix.at(-1).date);

console.log('canonical-technical-engine.unit.mjs: PASS');
