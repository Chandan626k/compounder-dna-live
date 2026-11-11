import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const loaderSource = fs.readFileSync('public/stock-data-loader.js', 'utf8');
const context = { window: {}, Promise, Error, encodeURIComponent };
vm.runInNewContext(loaderSource, context, { filename: 'public/stock-data-loader.js' });
const { loadStockData } = context.window.StockSamjhoStockDataLoader;

const response = (status, body, invalidJson = false) => ({
  ok: status >= 200 && status < 300,
  status,
  async json() {
    if (invalidJson) throw new Error('provider response was not JSON');
    return body;
  },
});

const calls = [];
const complete = await loadStockData(' infy ', async (url, options) => {
  calls.push({ url, options });
  return url.startsWith('/api/analyze')
    ? response(200, { stock: { symbol: 'INFY' }, meta: { cached: false } })
    : response(200, { technical: { trend: 'UPTREND' }, recommendationReadiness: { state: 'UNKNOWN' } });
});
assert.equal(complete.analysis.stock.symbol, 'INFY');
assert.equal(complete.trading.technical.trend, 'UPTREND');
assert.equal(complete.tradingError, null);
assert.equal(calls.length, 2);
assert.deepEqual(calls.map((call) => call.url).sort(), [
  '/api/analyze?symbol=INFY',
  '/api/trading?symbol=INFY',
]);
assert.ok(calls.every((call) => call.options.headers.Accept === 'application/json'));

const partial = await loadStockData('RELIANCE', async (url) => (
  url.startsWith('/api/analyze')
    ? response(200, { stock: { symbol: 'RELIANCE' }, meta: { cached: true } })
    : response(502, { error: 'Trading data temporarily unavailable. Please try again.' })
));
assert.equal(partial.analysis.stock.symbol, 'RELIANCE');
assert.equal(partial.trading, null);
assert.equal(partial.tradingError, 'Trading data temporarily unavailable. Please try again.');

await assert.rejects(
  loadStockData('UNKNOWN', async (url) => (
    url.startsWith('/api/analyze')
      ? response(404, { error: 'Verified market data is unavailable for this symbol.' })
      : response(200, { technical: {} })
  )),
  /Analysis data unavailable: Verified market data is unavailable for this symbol\./,
);

const invalidTrading = await loadStockData('TCS', async (url) => (
  url.startsWith('/api/analyze')
    ? response(200, { stock: { symbol: 'TCS' } })
    : response(200, {}, true)
));
assert.equal(invalidTrading.trading, null);
assert.match(invalidTrading.tradingError, /invalid JSON/);

const networkFailure = await loadStockData('TCS', async (url) => {
  if (url.startsWith('/api/analyze')) return response(200, { stock: { symbol: 'TCS' } });
  throw new Error('Failed to fetch');
});
assert.equal(networkFailure.trading, null);
assert.match(networkFailure.tradingError, /\/api\/trading\?symbol=TCS request failed: Failed to fetch/);

await assert.rejects(loadStockData('   ', async () => response(200, {})), /Stock symbol is required/);

const terminal = fs.readFileSync('public/terminal.html', 'utf8');
assert.match(terminal, /stock-data-loader\.js/);
assert.match(terminal, /StockSamjhoStockDataLoader\.loadStockData\(sym\)/);
assert.match(terminal, /ANALYSIS LOADED • TRADING DATA UNAVAILABLE/);
assert.match(terminal, /productionBlocked=!tradingAvailable/);
assert.match(terminal, /API CACHE/);
assert.match(terminal, /API FETCH/);

console.log('stock-data-loader.unit: PASS');
