import assert from 'node:assert/strict';
import { calculateCanonicalTechnical } from '../lib/canonical-technical-engine.js';

function rows(count = 280, mutate = null) {
  const out = [];
  for (let i = 0; i < count; i += 1) {
    const close = 100 + i * 0.25 + Math.sin(i / 7) * 2;
    const row = { date: new Date(Date.UTC(2025, 0, 1 + i)).toISOString(), open: close - 0.5, high: close + 1, low: close - 1, close, volume: 1000 + (i % 10) * 25 };
    out.push(mutate ? mutate(row, i) : row);
  }
  return out;
}
const base = rows();
const result = calculateCanonicalTechnical(base, { symbol: 'TEST.NS', source: 'fixture', retrievedAt: '2026-09-05T10:00:00.000Z', timeframe: '1d', nowMs: Date.parse('2026-09-06T00:00:00.000Z') });
assert.equal(result.status, 'VERIFIED');
assert.equal(result.provenance.symbol, 'TEST.NS');
assert.equal(result.provenance.source, 'fixture');
assert.equal(result.provenance.timeframe, '1d');
assert.equal(result.provenance.retrievedAt, '2026-09-05T10:00:00.000Z');
assert.equal(result.provenance.observationTimestamp, base.at(-1).date);
assert.equal(result.provenance.dataQuality, 'VERIFIED');
assert.ok(result.e20 != null && result.e50 != null && result.e200 != null);
assert.ok(result.rsi != null && result.atr != null && result.macd != null && result.adx != null);
assert.ok(result.relativeVolume != null);
assert.ok(['STRONG UPTREND', 'UPTREND', 'SIDEWAYS / TRANSITION', 'DOWNTREND'].includes(result.trend));
assert.equal(result.supportResistance.status, 'VERIFIED_REACTION_ZONES');
assert.equal(result.supportResistance.evidence.currentExcluded, true);
assert.ok(Array.isArray(result.supportResistance.zones));
assert.equal(result.vwapSemantics, 'CUMULATIVE_PERIOD_VWAP; NOT_INTRADAY_SESSION_VWAP');
assert.ok(result.technicalConfidence >= 0 && result.technicalConfidence <= 100);

const intraday = calculateCanonicalTechnical(base, { symbol: 'TEST.NS', source: 'fixture', timeframe: '1h' });
assert.equal(intraday.status, 'VERIFIED');
assert.equal(intraday.provenance.timeframe, '1h');
assert.equal(intraday.vwapSemantics, 'CUMULATIVE_PERIOD_VWAP; NOT_INTRADAY_SESSION_VWAP');

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

const prefix = base.slice(0, 100);
const atT = calculateCanonicalTechnical(prefix, { symbol: 'TEST.NS', timeframe: '1d' });
const confirmedSwingHigh = atT.structure.pivots.highs.at(-1)?.price;
assert.equal(atT.provenance.observationTimestamp, prefix.at(-1).date);
assert.equal(atT.breakout?.level ?? confirmedSwingHigh, confirmedSwingHigh);
assert.equal(atT.structure.evidence.currentExcluded, true);
const futureBar = { ...base[100], close: 9999, high: 10000, open: 9998, low: 9990 };
const nextT = calculateCanonicalTechnical([...prefix, futureBar], { symbol: 'TEST.NS', timeframe: '1d' });
assert.equal(nextT.provenance.observationTimestamp, futureBar.date);
assert.equal(atT.provenance.observationTimestamp, prefix.at(-1).date);

console.log('canonical-technical-engine.unit.mjs: PASS');