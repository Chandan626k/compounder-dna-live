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
for (const field of ['s20', 's50', 's200', 'e20', 'e50', 'e200', 'rsi', 'atr', 'adx', 'relativeVolume', 'volumeTrend', 'support', 'resistance', 'high52Week', 'low52Week', 'trend', 'trendStrength']) {
  assert.deepEqual(result.technical[field], canonical[field], `${field} must come from canonical engine`);
}
assert.deepEqual(result.technical.macd, canonical.macd);
assert.deepEqual(result.technical.canonicalEvidence.macd, canonical.macd);
assert.equal(result.technical.canonicalEvidence.vwapSemantics, 'CUMULATIVE_PERIOD_VWAP; NOT_INTRADAY_SESSION_VWAP');
assert.equal(result.trade.action, 'NO TRADE');
assert.ok(!['BUY', 'SELL', 'BUY ON PULLBACK'].includes(result.trade.action));
assert.ok(result.meta.technicalEngine.includes('canonical-technical-engine-v1'));

console.log('trading-engine-canonical-consumer.unit: PASS');
