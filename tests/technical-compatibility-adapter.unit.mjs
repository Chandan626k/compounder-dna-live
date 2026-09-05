import assert from 'node:assert/strict';
import { technicalCompatibility } from '../lib/technical-compatibility-adapter.js';

function rows(count, direction = 1) {
  return Array.from({ length: count }, (_, i) => {
    const close = 100 + direction * i * 0.5;
    return {
      date: new Date(Date.UTC(2025, 0, 1 + i)).toISOString(),
      open: close - 0.2,
      high: close + 1,
      low: close - 1,
      close,
      volume: 1000 + i,
      retrievedAt: '2026-09-05T18:00:00.000Z',
    };
  });
}

const longRows = rows(252);
const tech = technicalCompatibility(longRows, { symbol: 'TEST', source: 'fixture', timeframe: '1d', nowMs: Date.now() });

assert.equal(tech.trend, 'STRONG UPTREND');
assert.equal(tech.trendStrength, Math.abs(tech.distanceFrom200DMA));
assert.equal(tech.trendStrengthBasis, 'absolute percentage distance from SMA200; not a statistical trend-strength score');
assert.equal(tech.has52WeekHistory, true);
assert.equal(tech.high52Week, Math.max(...longRows.slice(-252).map((row) => row.high)));
assert.equal(tech.low52Week, Math.min(...longRows.slice(-252).map((row) => row.low)));
assert.equal(tech.support, Math.min(...longRows.slice(-20).map((row) => row.low)));
assert.equal(tech.resistance, Math.max(...longRows.slice(-20).map((row) => row.high)));
assert.equal(tech.provenance.timeframe, '1d');
assert.equal(tech.provenance.source, 'fixture');
assert.equal(tech.provenance.retrievedAt, '2026-09-05T18:00:00.000Z');
assert.equal(tech.provenance.adapter, 'legacy-market-engine-technical-v1');
assert.equal(tech.canonicalEvidence.provenance.timeframe, '1d');
assert.equal(tech.canonicalEvidence.provenance.dataQuality, 'VERIFIED');

const shortRows = rows(251);
const shortTech = technicalCompatibility(shortRows, { symbol: 'TEST', source: 'fixture', timeframe: '1d' });
assert.equal(shortTech.has52WeekHistory, false);
assert.equal(shortTech.high52Week, null);
assert.equal(shortTech.low52Week, null);
assert.equal(shortTech.drawdown, null);
assert.equal(shortTech.rangePosition, null);

const downRows = rows(100, -1);
const downTech = technicalCompatibility(downRows, { symbol: 'TEST', source: 'fixture', timeframe: '1d' });
assert.equal(downTech.trend, 'RECOVERING / MIXED');
assert.equal(downTech.canonicalEvidence.trend, 'DOWNTREND');

const breakoutCloses = [100, 99, 102, 98, 105, 100, 110, 103, 115, 108, 120, 112, 125, 119, 130, 123, 135, 128, 140, 135, 145];
const breakoutRows = breakoutCloses.map((close, i) => ({
  date: new Date(Date.UTC(2025, 0, 1 + i)).toISOString(),
  open: close,
  high: close + 1,
  low: close - 1,
  close,
  volume: 1000,
}));
const breakoutTech = technicalCompatibility(breakoutRows, { symbol: 'TEST', source: 'fixture', timeframe: '1d' });
assert.equal(breakoutTech.canonicalEvidence.breakout.confirmed, true);
assert.equal(breakoutTech.canonicalEvidence.breakout.level, 131);
assert.ok(breakoutTech.canonicalEvidence.breakout.level < breakoutRows.at(-1).close);

const malformed = rows(30);
delete malformed.at(-1).open;
assert.throws(
  () => technicalCompatibility(malformed, { symbol: 'TEST', source: 'fixture', timeframe: '1d' }),
  /No usable market prices returned by provider: INVALID_OHLCV/,
);

console.log('technical-compatibility-adapter.unit: ok');
