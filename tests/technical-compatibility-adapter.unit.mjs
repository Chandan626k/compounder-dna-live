import assert from 'node:assert/strict';
import { technicalCompatibility } from '../lib/technical-compatibility-adapter.js';
import { calculateCanonicalTechnical } from '../lib/canonical-technical-engine.js';

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
const longCanonical = calculateCanonicalTechnical(longRows, { symbol: 'TEST', source: 'fixture', timeframe: '1d', nowMs: Date.now() });
const tech = technicalCompatibility(longRows, { symbol: 'TEST', source: 'fixture', timeframe: '1d', nowMs: Date.now() });
assert.equal(tech.trend, longCanonical.trend);
assert.equal(tech.trendStrength, longCanonical.trendStrength);
assert.equal(tech.trendStrengthBasis, longCanonical.trendStrengthBasis);
assert.equal(tech.has52WeekHistory, longCanonical.has52WeekHistory);
assert.equal(tech.high52Week, longCanonical.high52Week);
assert.equal(tech.low52Week, longCanonical.low52Week);
assert.equal(tech.support, longCanonical.support);
assert.equal(tech.resistance, longCanonical.resistance);
assert.equal(tech.volumeTrend, longCanonical.volumeTrend);
assert.equal(tech.provenance.timeframe, '1d');
assert.equal(tech.provenance.source, 'fixture');
assert.equal(tech.provenance.retrievedAt, '2026-09-05T18:00:00.000Z');
assert.equal(tech.provenance.adapter, 'legacy-market-engine-technical-v2');
assert.equal(tech.provenance.compatibility.semantics, 'NO_RECALCULATION; CANONICAL_VALUES_ONLY');
assert.equal(tech.canonicalEvidence.provenance.timeframe, '1d');
assert.equal(tech.canonicalEvidence.provenance.dataQuality, 'VERIFIED');
assert.equal(tech.canonicalEvidence.high52Week, longCanonical.high52Week);
assert.equal(tech.canonicalEvidence.volumeTrend, longCanonical.volumeTrend);

const shortRows = rows(251);
const shortCanonical = calculateCanonicalTechnical(shortRows, { symbol: 'TEST', source: 'fixture', timeframe: '1d' });
const shortTech = technicalCompatibility(shortRows, { symbol: 'TEST', source: 'fixture', timeframe: '1d' });
assert.equal(shortTech.has52WeekHistory, false);
assert.equal(shortTech.high52Week, shortCanonical.high52Week);
assert.equal(shortTech.low52Week, shortCanonical.low52Week);
assert.equal(shortTech.drawdown, shortCanonical.drawdown);
assert.equal(shortTech.rangePosition, shortCanonical.rangePosition);

const downRows = rows(100, -1);
const downCanonical = calculateCanonicalTechnical(downRows, { symbol: 'TEST', source: 'fixture', timeframe: '1d' });
const downTech = technicalCompatibility(downRows, { symbol: 'TEST', source: 'fixture', timeframe: '1d' });
assert.equal(downTech.trend, downCanonical.trend);
assert.equal(downTech.canonicalEvidence.trend, downCanonical.trend);
assert.equal(downTech.trendStrength, downCanonical.trendStrength);

const breakoutCloses = [100, 99, 102, 98, 105, 100, 110, 103, 115, 108, 120, 112, 125, 119, 130, 123, 135, 128, 140, 135, 138, 136, 145];
const breakoutRows = breakoutCloses.map((close, i) => ({ date: new Date(Date.UTC(2025, 0, 1 + i)).toISOString(), open: close, high: close + 1, low: close - 1, close, volume: 1000 }));
const breakoutCanonical = calculateCanonicalTechnical(breakoutRows, { symbol: 'TEST', source: 'fixture', timeframe: '1d' });
const breakoutTech = technicalCompatibility(breakoutRows, { symbol: 'TEST', source: 'fixture', timeframe: '1d' });
assert.deepEqual(breakoutTech.canonicalEvidence.breakout, breakoutCanonical.breakout);
assert.equal(breakoutTech.canonicalEvidence.breakout.level, 141);
assert.ok(breakoutTech.canonicalEvidence.breakout.level < breakoutRows.at(-1).close);

const malformed = rows(30);
delete malformed.at(-1).open;
assert.throws(() => technicalCompatibility(malformed, { symbol: 'TEST', source: 'fixture', timeframe: '1d' }), /No usable market prices returned by provider: INVALID_OHLCV/);

console.log('technical-compatibility-adapter.unit: PASS');

assert.equal(tech.e100, longCanonical.e100, 'compatibility adapter must expose canonical EMA100');
assert.equal(tech.canonicalEvidence.e100, longCanonical.e100, 'canonical evidence must expose EMA100');
