import assert from 'node:assert/strict';
import { buildTrading } from '../lib/trading-engine.js';
import { calculateCanonicalTechnical } from '../lib/canonical-technical-engine.js';

const rows = Array.from({ length: 260 }, (_, i) => {
  const close = 100 + i * 0.5;
  return { date: new Date(Date.UTC(2025, 0, 1 + i)).toISOString(), open: close - 0.2, high: close + 1, low: close - 1, close, volume: 1000 + i };
});
const context = { symbol: 'TEST', source: 'fixture', timeframe: '1d', nowMs: Date.now() };
const canonical = calculateCanonicalTechnical(rows, context);
const result = buildTrading({
  stock: { symbol: 'TEST' }, fundamentals: { ratios: {} }, valuation: {},
  score: { overall: 50, risk: 50 }, dataQuality: { confidence: 100 },
}, rows, context);

assert.equal(result.technical.canonicalEvidence.status, 'VERIFIED');
assert.equal(result.technical.canonicalEvidence.provenance.timeframe, '1d');
assert.equal(result.technical.s20, canonical.s20);
assert.equal(result.technical.s50, canonical.s50);
assert.equal(result.technical.s200, canonical.s200);
assert.equal(result.technical.e20, canonical.e20);
assert.equal(result.technical.e50, canonical.e50);
assert.equal(result.technical.e200, canonical.e200);
assert.equal(result.technical.rsi, canonical.rsi);
assert.equal(result.technical.atr, canonical.atr);
assert.deepEqual(result.technical.macd, canonical.macd);
assert.equal(result.technical.adx, canonical.adx);
assert.equal(result.technical.relativeVolume, canonical.relativeVolume);
assert.equal(result.technical.high52Week, Math.max(...rows.slice(-252).map((row) => row.high)));
assert.equal(result.technical.low52Week, Math.min(...rows.slice(-252).map((row) => row.low)));
assert.equal(result.technical.canonicalEvidence.vwapSemantics, 'CUMULATIVE_PERIOD_VWAP; NOT_INTRADAY_SESSION_VWAP');
assert.equal(result.trade.action, 'NO TRADE');
assert.ok(!['BUY', 'SELL', 'BUY ON PULLBACK'].includes(result.trade.action));
assert.ok(result.meta.technicalEngine.includes('canonical-technical-engine-v1'));

console.log('trading-engine-canonical-consumer.unit: PASS');
