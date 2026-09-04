import assert from 'node:assert/strict';

const originalFetch = globalThis.fetch;
const now = Math.floor(Date.now() / 1000);
const timestamps = Array.from({ length: 90 }, (_, i) => now - (89 - i) * 86400);
const closes = timestamps.map((_, i) => 100 + i * 0.2);

globalThis.fetch = async (url) => {
  if (String(url).includes('/v8/finance/chart/')) {
    return {
      ok: true,
      status: 200,
      async json() {
        return {
          chart: {
            result: [{
              timestamp: timestamps,
              indicators: {
                quote: [{
                  open: closes,
                  high: closes.map(v => v + 1),
                  low: closes.map(v => v - 1),
                  close: closes,
                  volume: timestamps.map(() => 1_000_000),
                }],
              },
              meta: { currency: 'INR', exchangeName: 'NSE', regularMarketPrice: closes.at(-1) },
            }],
          },
        };
      },
    };
  }
  return { ok: false, status: 503, async json() { return {}; }, async text() { return ''; } };
};

try {
  const { analyzeVerified } = await import('../lib/verified-analysis.js');
  const analysis = await analyzeVerified('TCS.NS');

  assert.equal(analysis.technical.last, closes.at(-1));
  assert.deepEqual(analysis.fundamentals.statementEvidence.coverage, {
    income: false,
    balanceSheet: false,
    cashFlow: false,
  });
  assert.equal(analysis.fundamentals.current.totalDebt, null);
  assert.equal(analysis.fundamentals.current.revenue, null);
  assert.equal(analysis.score.financialStrengthCoverage, 'CURRENT_FIELDS_ONLY');
  assert.notEqual(analysis.decision.action, 'BUY');
  assert.notEqual(analysis.decision.action, 'ACCUMULATE');
} finally {
  globalThis.fetch = originalFetch;
}

console.log('verified-statement-failure.integration: PASS');
