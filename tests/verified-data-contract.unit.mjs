import assert from 'node:assert/strict';

const originalFetch = globalThis.fetch;

globalThis.fetch = async () => ({
  ok: true,
  status: 200,
  async json() {
    return {
      chart: {
        result: [{
          timestamp: [1_700_000_000, 1_700_086_400],
          indicators: {
            quote: [{
              open: [100, 101],
              high: [102, 103],
              low: [99, 100],
              close: [101, 102],
              volume: [1_000_000, 1_100_000],
            }],
            adjclose: [{ adjclose: [101, 102] }],
          },
        }],
      },
    };
  },
});

const { verifiedHistory } = await import('../lib/market-data-provider.js');
const { buildVerifiedDataQualityProvenance } = await import('../lib/verified-analysis.js');

const history = await verifiedHistory('TCS.NS', { interval: '1d', days: 10, minBars: 2 });
assert.equal(history.verified, true);
assert.equal(history.source, 'Yahoo Finance chart API');
assert.equal(history.rows.length, 2);
assert.equal(history.rows.at(-1).c, 102);
assert.equal(history.rows.at(-1).v, 1_100_000);
assert.ok(history.latest);

const provenance = buildVerifiedDataQualityProvenance({
  dataQuality: {
    confidence: 65,
    completeness: 72,
    confidenceModel: { components: { freshness: 90 } },
  },
  marketAsOf: '2026-08-21T10:00:00.000Z',
  fundamentalsAsOf: '2026-08-20T10:00:00.000Z',
});
assert.deepEqual(provenance, {
  asOf: '2026-08-21T10:00:00.000Z',
  freshness: 'FRESH',
  freshnessScore: 90,
  coveragePct: 72,
  confidence: 65,
  provider: 'Yahoo Finance',
  source: 'Yahoo Finance chart API + quoteSummary + fundamentalsTimeSeries',
});

globalThis.fetch = originalFetch;
console.log('verified data contract tests passed');
