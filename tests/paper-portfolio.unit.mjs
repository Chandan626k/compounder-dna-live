import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  DEFAULT_VIRTUAL_CAPITAL,
  applyPaperTrade,
  createPaperPortfolio,
  derivePaperPortfolio,
  parsePaperPortfolioBackup,
  setPaperMark,
  writePaperPortfolioSnapshot
} from '../public/paper-portfolio.js';

const at = '2026-11-12T00:00:00.000Z';
const initial = createPaperPortfolio();
assert.equal(initial.initialCapital, 500000);
assert.equal(DEFAULT_VIRTUAL_CAPITAL, 500000);
assert.equal(derivePaperPortfolio(initial).cash, 500000);
assert.equal(derivePaperPortfolio(initial).totalEquity, 500000);

const buyOne = applyPaperTrade(initial, {
  id: 'buy-1', symbol: 'infy.ns', side: 'BUY', quantity: 10, price: 100, fees: 20, executedAt: at
});
assert.equal(initial.trades.length, 0, 'ledger operations must not mutate the original portfolio');
assert.equal(derivePaperPortfolio(buyOne).cash, 498980);
assert.equal(derivePaperPortfolio(buyOne).totalEquity, null, 'equity is incomplete until every open position has a manual mark');

const buyTwo = applyPaperTrade(buyOne, {
  id: 'buy-2', symbol: 'INFY.NS', side: 'BUY', quantity: 5, price: 110, fees: 10, executedAt: at
});
const marked = setPaperMark(buyTwo, 'INFY.NS', 120, at);
const beforeSell = derivePaperPortfolio(marked);
assert.equal(beforeSell.cash, 498420);
assert.equal(beforeSell.totalInvestedCost, 1580);
assert.equal(beforeSell.totalMarketValue, 1800);
assert.equal(beforeSell.unrealizedPnl, 220);

const sold = applyPaperTrade(marked, {
  id: 'sell-1', symbol: 'INFY.NS', side: 'SELL', quantity: 5, price: 130, fees: 5, executedAt: at
});
const markedAfterSell = setPaperMark(sold, 'INFY.NS', 125, at);
const result = derivePaperPortfolio(markedAfterSell);
assert.equal(result.cash, 499065);
assert.equal(result.positions[0].quantity, 10);
assert.equal(result.totalInvestedCost, 1053.33);
assert.equal(result.totalMarketValue, 1250);
assert.equal(result.realizedPnl, 118.33);
assert.equal(result.unrealizedPnl, 196.67);
assert.equal(result.totalFees, 35);
assert.equal(result.totalEquity, 500315);
assert.equal(result.totalPnl, 315);
assert.equal(result.marketValueComplete, true);

const closed = applyPaperTrade(markedAfterSell, {
  id: 'sell-2', symbol: 'INFY.NS', side: 'SELL', quantity: 10, price: 126, fees: 0, executedAt: at
});
assert.equal(derivePaperPortfolio(closed).positions.length, 0);
assert.equal(closed.marks['INFY.NS'], undefined, 'closing a position must clear its old manual mark');
const reopened = applyPaperTrade(closed, {
  id: 'buy-3', symbol: 'INFY.NS', side: 'BUY', quantity: 1, price: 100, fees: 0, executedAt: at
});
assert.equal(derivePaperPortfolio(reopened).positions[0].markPrice, null, 'a reopened position must not inherit an old mark');

assert.throws(() => applyPaperTrade(initial, {
  id: 'too-large', symbol: 'TCS.NS', side: 'BUY', quantity: 1, price: 500001, fees: 0, executedAt: at
}), /Insufficient virtual cash/);
assert.throws(() => applyPaperTrade(initial, {
  id: 'oversell', symbol: 'TCS.NS', side: 'SELL', quantity: 1, price: 100, fees: 0, executedAt: at
}), /open long position/);
assert.throws(() => applyPaperTrade(initial, {
  id: 'short', symbol: 'TCS.NS', side: 'SHORT', quantity: 1, price: 100, fees: 0, executedAt: at
}), /BUY or SELL/);
assert.throws(() => applyPaperTrade(initial, {
  id: 'bad-symbol', symbol: 'TCS', side: 'BUY', quantity: 1, price: 100, fees: 0, executedAt: at
}), /\.NS or \.BO/);
assert.throws(() => applyPaperTrade(initial, {
  id: 'fractional', symbol: 'TCS.NS', side: 'BUY', quantity: 1.5, price: 100, fees: 0, executedAt: at
}), /whole number/);
assert.throws(() => applyPaperTrade(initial, {
  id: 'unsafe-quantity', symbol: 'TCS.NS', side: 'BUY', quantity: Number.MAX_SAFE_INTEGER + 1, price: 1, fees: 0, executedAt: at
}), /safe whole number/);
assert.throws(() => applyPaperTrade(initial, {
  id: 'rounded-zero', symbol: 'TCS.NS', side: 'BUY', quantity: 1, price: 0.001, fees: 0, executedAt: at
}), /INR precision/);
assert.throws(() => applyPaperTrade(initial, {
  id: 'negative-fee', symbol: 'TCS.NS', side: 'BUY', quantity: 1, price: 100, fees: -1, executedAt: at
}), /greater than or equal to zero/);
assert.throws(() => applyPaperTrade(initial, {
  id: 'bad-time', symbol: 'TCS.NS', side: 'BUY', quantity: 1, price: 100, fees: 0, executedAt: 'yesterday'
}), /UTC ISO timestamp/);
assert.throws(() => applyPaperTrade(buyOne, {
  id: 'buy-1', symbol: 'INFY.NS', side: 'BUY', quantity: 1, price: 100, fees: 0, executedAt: at
}), /Duplicate paper trade ID/);
assert.throws(() => setPaperMark(initial, 'TCS.NS', 100, at), /open paper position/);
assert.throws(() => derivePaperPortfolio({ ...initial, initialCapital: 100000 }), /₹5,00,000/);

const backupRoundTrip = parsePaperPortfolioBackup(JSON.stringify(markedAfterSell));
assert.deepEqual(backupRoundTrip, markedAfterSell, 'valid backups must round-trip without changing the ledger');
assert.equal(derivePaperPortfolio(backupRoundTrip).totalEquity, 500315);
assert.throws(() => parsePaperPortfolioBackup('{invalid json'), /valid JSON/);
assert.throws(() => parsePaperPortfolioBackup(JSON.stringify({ ...initial, version: 99 })), /Unsupported paper portfolio version/);
assert.throws(() => parsePaperPortfolioBackup(JSON.stringify({ ...initial, initialCapital: 100000 })), /₹5,00,000/);
assert.throws(() => parsePaperPortfolioBackup(JSON.stringify({
  ...initial,
  trades: [{ id: 'orphan-sell', symbol: 'TCS.NS', side: 'SELL', quantity: 1, price: 100, fees: 0, executedAt: at }]
})), /open long position/);
assert.throws(() => parsePaperPortfolioBackup(JSON.stringify({
  ...initial,
  marks: { 'TCS.NS': { price: 100, markedAt: at } }
})), /without an open position/);



function memoryStorage(initialRaw) {
  let raw = initialRaw;
  return {
    getItem() { return raw; },
    setItem(_key, value) { raw = value; },
    get raw() { return raw; }
  };
}

function serialLockManager() {
  let tail = Promise.resolve();
  return {
    request(_name, callback) {
      const pending = tail.then(callback, callback);
      tail = pending.then(() => undefined, () => undefined);
      return pending;
    }
  };
}

const concurrentStorage = memoryStorage('base-snapshot');
const locks = serialLockManager();
const concurrentResults = await Promise.all([
  writePaperPortfolioSnapshot(concurrentStorage, locks, 'paper-key', 'base-snapshot', 'tab-a-snapshot'),
  writePaperPortfolioSnapshot(concurrentStorage, locks, 'paper-key', 'base-snapshot', 'tab-b-snapshot')
]);
assert.equal(concurrentResults.filter(result => result.saved).length, 1, 'serialized tabs must not both overwrite the same base snapshot');
assert.ok(['tab-a-snapshot', 'tab-b-snapshot'].includes(concurrentStorage.raw));
const staleWrite = await writePaperPortfolioSnapshot(concurrentStorage, locks, 'paper-key', 'base-snapshot', 'stale-snapshot');
assert.equal(staleWrite.saved, false, 'stale tabs must be rejected instead of overwriting a newer ledger');
assert.equal(staleWrite.currentRaw, concurrentStorage.raw);
assert.equal(staleWrite.usedLock, true);

const fallbackStorage = memoryStorage('fallback-base');
const fallbackWrite = await writePaperPortfolioSnapshot(fallbackStorage, null, 'paper-key', 'fallback-base', 'fallback-next');
assert.equal(fallbackWrite.saved, true, 'single-tab fallback should still save when the snapshot matches');
assert.equal(fallbackWrite.usedLock, false);
assert.equal(fallbackStorage.raw, 'fallback-next');

const paperPage = fs.readFileSync(new URL('../public/paper-trading.html', import.meta.url), 'utf8');
assert.match(paperPage, /PAPER MODE ONLY/);
assert.match(paperPage, /No broker connection/);
assert.match(paperPage, /localStorage/);
assert.match(paperPage, /Import portfolio backup/);
assert.match(paperPage, /parsePaperPortfolioBackup/);
assert.match(paperPage, /window\.confirm/);
assert.match(paperPage, /Promise\.allSettled/);
assert.match(paperPage, /No real order was sent/);
assert.doesNotMatch(paperPage, /\/api\/orders?/i);
const pageScript = paperPage.match(/<script type="module">([\s\S]*?)<\/script>/);
assert.ok(pageScript, 'paper trading page must contain its client module');
const compilableScript = pageScript[1].replace(/^\s*import\s*\{[\s\S]*?\}\s*from\s*['"]\.\/paper-portfolio\.js['"];\s*/, '');
assert.match(compilableScript, /^const STORAGE_KEY/, 'module import must be stripped before the inline-script syntax check');
assert.doesNotMatch(compilableScript, /^\s*import\s/m, 'no module import may remain in the compiled inline script');
assert.doesNotThrow(() => new Function(compilableScript), 'paper page module must parse as JavaScript');

console.log('PASS paper-portfolio.unit.mjs');
