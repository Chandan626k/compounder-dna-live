import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  DEFAULT_VIRTUAL_CAPITAL,
  applyPaperTrade,
  createPaperPortfolio,
  derivePaperPortfolio,
  parsePaperPortfolioBackup,
  serializePaperPortfolioStorageSnapshot,
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
const laterAt = '2026-11-12T00:00:01.000Z';
const futureAt = new Date(Date.now() + 60_000).toISOString();
const newerManualMark = setPaperMark(buyOne, 'INFY.NS', 125, laterAt);
assert.throws(
  () => setPaperMark(newerManualMark, 'INFY.NS', 110, at),
  /must not move backwards/,
  'a manual mark update must not replace a newer mark with an older timestamp'
);
const latestManualMark = setPaperMark(newerManualMark, 'INFY.NS', 126, '2026-11-12T00:00:02.000Z');
assert.equal(latestManualMark.marks['INFY.NS'].price, 126,
  'a manual mark update with a non-decreasing timestamp remains valid');

const chronologyBuy = applyPaperTrade(initial, {
  id: 'chronology-buy', symbol: 'TCS.NS', side: 'BUY', quantity: 2, price: 100, fees: 0, executedAt: laterAt
});
assert.throws(
  () => applyPaperTrade(chronologyBuy, {
    id: 'backdated-sell', symbol: 'TCS.NS', side: 'SELL', quantity: 1, price: 110, fees: 0, executedAt: at
  }),
  /non-decreasing execution-time order/,
  'a SELL must not be backdated before the BUY that creates its position'
);
assert.throws(
  () => parsePaperPortfolioBackup(JSON.stringify({
    ...chronologyBuy,
    trades: [...chronologyBuy.trades, {
      id: 'backdated-buy', symbol: 'INFY.NS', side: 'BUY', quantity: 1, price: 100, fees: 0, executedAt: at
    }]
  })),
  /non-decreasing execution-time order/,
  'backup restore must reject an out-of-order append-only trade ledger'
);
assert.throws(
  () => setPaperMark(chronologyBuy, 'TCS.NS', 105, at),
  /must not predate the latest trade/,
  'a manual mark must not predate the latest trade for its open position'
);
assert.throws(
  () => parsePaperPortfolioBackup(JSON.stringify({
    ...chronologyBuy,
    marks: { 'TCS.NS': { price: 105, markedAt: at } }
  })),
  /must not predate the latest trade/,
  'backup restore must reject a stale mark older than the latest position trade'
);
const chronologyFreshMark = setPaperMark(chronologyBuy, 'TCS.NS', 105, laterAt);
assert.equal(derivePaperPortfolio(chronologyFreshMark).positions[0].markPrice, 105,
  'a mark at the latest trade timestamp remains valid');
assert.throws(
  () => setPaperMark(buyOne, 'INFY.NS', 110, futureAt),
  /canonical UTC ISO timestamp no later than now/,
  'a future manual mark must not be accepted as current valuation evidence'
);
assert.throws(
  () => applyPaperTrade(buyOne, {
    id: 'future-buy', symbol: 'INFY.NS', side: 'BUY', quantity: 1, price: 105, fees: 0, executedAt: futureAt
  }),
  /canonical UTC ISO timestamp no later than now/,
  'a paper trade must not be recorded with a future execution time'
);
assert.throws(
  () => parsePaperPortfolioBackup(JSON.stringify({
    ...buyOne,
    marks: { 'INFY.NS': { price: 110, markedAt: futureAt } }
  })),
  /Manual mark time must be a canonical UTC ISO timestamp no later than now/,
  'backup restore must reject future-dated manual marks'
);
assert.throws(
  () => parsePaperPortfolioBackup(JSON.stringify({
    ...buyOne,
    trades: buyOne.trades.map((trade, index) => index === 0 ? { ...trade, executedAt: futureAt } : trade)
  })),
  /Trade time must be a canonical UTC ISO timestamp no later than now/,
  'backup restore must reject future-dated paper trades'
);
const markedBeforeLaterBuy = setPaperMark(buyOne, 'INFY.NS', 110, at);
const boughtAfterMark = applyPaperTrade(markedBeforeLaterBuy, {
  id: 'buy-after-mark', symbol: 'INFY.NS', side: 'BUY', quantity: 1, price: 105, fees: 0, executedAt: laterAt
});
assert.equal(boughtAfterMark.marks['INFY.NS'], undefined, 'a later BUY must invalidate an older manual mark for the changed position');
assert.equal(derivePaperPortfolio(boughtAfterMark).positions[0].markPrice, null);
assert.equal(derivePaperPortfolio(boughtAfterMark).totalEquity, null, 'equity must remain incomplete until the updated position is re-marked');
const soldAfterMark = applyPaperTrade(marked, {
  id: 'sell-after-mark', symbol: 'INFY.NS', side: 'SELL', quantity: 1, price: 125, fees: 0, executedAt: laterAt
});
assert.equal(soldAfterMark.marks['INFY.NS'], undefined, 'a later partial SELL must invalidate an older manual mark too');
assert.equal(derivePaperPortfolio(soldAfterMark).positions[0].markPrice, null);
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
assert.throws(
  () => setPaperMark(buyOne, 'INFY.NS', 90_071_992_547_410, at),
  /supported INR paise precision/,
  'manual marks must not exceed JavaScript safe-integer paise precision'
);
const precisionSellBase = applyPaperTrade(initial, {
  symbol: 'INFY.NS', side: 'BUY', quantity: 2, price: 100, fees: 0, executedAt: at
});
assert.throws(
  () => applyPaperTrade(precisionSellBase, {
    symbol: 'INFY.NS', side: 'SELL', quantity: 2, price: 50_000_000_000_000, fees: 0, executedAt: at
  }),
  /supported INR paise precision/,
  'aggregate sale proceeds must remain exactly representable at paise precision'
);
const exactProductBase = applyPaperTrade(initial, {
  id: 'large-buy', symbol: 'INFY.NS', side: 'BUY', quantity: 10_287_043, price: 0.01, fees: 0, executedAt: at
});
const exactProductMarked = setPaperMark(exactProductBase, 'INFY.NS', 8_729_815.89, at);
assert.equal(
  derivePaperPortfolio(exactProductMarked).positions[0].marketValue,
  89_803_991_442_513.27,
  'quantity times a paise-denominated price must preserve the exact integer-paise product'
);
const exactProductSold = applyPaperTrade(exactProductBase, {
  id: 'large-sell', symbol: 'INFY.NS', side: 'SELL', quantity: 10_287_043, price: 8_729_815.89, fees: 0, executedAt: at
});
const exactProductSoldState = derivePaperPortfolio(exactProductSold);
assert.equal(exactProductSoldState.cash, 89_803_991_839_642.84);
assert.equal(exactProductSoldState.realizedPnl, 89_803_991_339_642.84);

let aggregatePrecision = createPaperPortfolio();
aggregatePrecision = applyPaperTrade(aggregatePrecision, {
  id: 'aggregate-infy-buy', symbol: 'INFY.NS', side: 'BUY', quantity: 1, price: 1, fees: 0, executedAt: at
});
aggregatePrecision = applyPaperTrade(aggregatePrecision, {
  id: 'aggregate-tcs-buy', symbol: 'TCS.NS', side: 'BUY', quantity: 1, price: 1, fees: 0, executedAt: at
});
aggregatePrecision = setPaperMark(aggregatePrecision, 'INFY.NS', 24_930_856_864_454.58, at);
aggregatePrecision = setPaperMark(aggregatePrecision, 'TCS.NS', 20_997_005_779_327.77, at);
const aggregatePrecisionState = derivePaperPortfolio(aggregatePrecision);
assert.equal(
  aggregatePrecisionState.totalMarketValue,
  45_927_862_643_782.35,
  'portfolio aggregation must add exact paise values without a one-paise floating-point loss'
);
assert.equal(aggregatePrecisionState.totalEquity, 45_927_863_143_780.35);

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

const snapshot = revision => JSON.stringify({
  version: 1,
  initialCapital: 500000,
  trades: [],
  marks: {},
  storageRevision: revision
});
const baseSnapshot = snapshot('a'.repeat(32));
const tabASnapshot = snapshot('b'.repeat(32));
const tabBSnapshot = snapshot('c'.repeat(32));
const concurrentStorage = memoryStorage(baseSnapshot);
const locks = serialLockManager();
const concurrentResults = await Promise.all([
  writePaperPortfolioSnapshot(concurrentStorage, locks, 'paper-key', baseSnapshot, tabASnapshot),
  writePaperPortfolioSnapshot(concurrentStorage, locks, 'paper-key', baseSnapshot, tabBSnapshot)
]);
assert.equal(concurrentResults.filter(result => result.saved).length, 1, 'serialized tabs must not both overwrite the same base snapshot');
const savedConcurrentResult = concurrentResults.find(result => result.saved);
const savedConcurrentInput = concurrentResults[0].saved ? tabASnapshot : tabBSnapshot;
assert.equal(concurrentStorage.raw, savedConcurrentResult.currentRaw);
assert.deepEqual(parsePaperPortfolioBackup(concurrentStorage.raw), parsePaperPortfolioBackup(savedConcurrentInput));
assert.notEqual(
  JSON.parse(concurrentStorage.raw).storageRevision,
  JSON.parse(savedConcurrentInput).storageRevision,
  'the storage writer must replace caller-supplied revisions'
);
const staleWrite = await writePaperPortfolioSnapshot(concurrentStorage, locks, 'paper-key', baseSnapshot, snapshot('d'.repeat(32)));
assert.equal(staleWrite.saved, false, 'stale tabs must be rejected instead of overwriting a newer ledger');
assert.equal(staleWrite.currentRaw, concurrentStorage.raw);
assert.equal(staleWrite.usedLock, true);

const fallbackBase = snapshot('e'.repeat(32));
const fallbackNext = snapshot('f'.repeat(32));
const fallbackStorage = memoryStorage(fallbackBase);
const fallbackWrite = await writePaperPortfolioSnapshot(fallbackStorage, null, 'paper-key', fallbackBase, fallbackNext);
assert.equal(fallbackWrite.saved, true, 'single-tab fallback should still save when the snapshot matches');
assert.equal(fallbackWrite.usedLock, false);
assert.equal(fallbackStorage.raw, fallbackWrite.currentRaw);
assert.deepEqual(parsePaperPortfolioBackup(fallbackStorage.raw), parsePaperPortfolioBackup(fallbackNext));
assert.notEqual(JSON.parse(fallbackStorage.raw).storageRevision, 'f'.repeat(32));
assert.notEqual(JSON.parse(fallbackStorage.raw).storageRevision, 'e'.repeat(32));

const invalidWriterBase = snapshot('9'.repeat(32));
const invalidWriterNext = JSON.stringify({
  version: 1,
  initialCapital: 500000,
  trades: [{ id: 'orphan-write', symbol: 'TCS.NS', side: 'SELL', quantity: 1, price: 100, fees: 0, executedAt: at }],
  marks: {},
  storageRevision: 'a'.repeat(32)
});
const invalidWriterStorage = memoryStorage(invalidWriterBase);
await assert.rejects(
  () => writePaperPortfolioSnapshot(invalidWriterStorage, locks, 'paper-key', invalidWriterBase, invalidWriterNext),
  /open long position/
);
assert.equal(invalidWriterStorage.raw, invalidWriterBase, 'invalid writer snapshots must never replace stored data');

// A corrupted saved ledger must remain replaceable by a validated backup after explicit confirmation.
const invalidStoredSnapshot = JSON.stringify({
  version: 1,
  initialCapital: 500000,
  trades: [{ id: 'orphan-stored', symbol: 'TCS.NS', side: 'SELL', quantity: 1, price: 100, fees: 0, executedAt: at }],
  marks: {},
  storageRevision: '8'.repeat(32)
});
const corruptedStorage = memoryStorage(invalidStoredSnapshot);
const capturedInvalidRaw = corruptedStorage.raw;
assert.throws(() => derivePaperPortfolio(JSON.parse(capturedInvalidRaw)), /open long position/);
const recoveryWrite = await writePaperPortfolioSnapshot(
  corruptedStorage,
  locks,
  'paper-key',
  capturedInvalidRaw,
  serializePaperPortfolioStorageSnapshot(initial)
);
assert.equal(recoveryWrite.saved, true, 'a confirmed valid backup must replace an unchanged invalid stored snapshot');
assert.deepEqual(parsePaperPortfolioBackup(corruptedStorage.raw), initial);

const abaBasePortfolio = createPaperPortfolio();
const abaBase = serializePaperPortfolioStorageSnapshot(abaBasePortfolio, '1'.repeat(32));
const abaChangedPortfolio = applyPaperTrade(abaBasePortfolio, {
  symbol: 'INFY.NS', side: 'BUY', quantity: 1, price: 100, fees: 0, executedAt: at
});
const abaChanged = serializePaperPortfolioStorageSnapshot(abaChangedPortfolio, '2'.repeat(32));
const restoredBackup = parsePaperPortfolioBackup(abaBase);
assert.equal(Object.hasOwn(restoredBackup, 'storageRevision'), false, 'backup import must not reuse an old storage revision');
const abaStorage = memoryStorage(abaBase);
const changedWrite = await writePaperPortfolioSnapshot(abaStorage, locks, 'paper-key', abaBase, abaChanged);
assert.equal(changedWrite.saved, true);
assert.notEqual(changedWrite.currentRaw, abaChanged, 'the storage writer must issue its own fresh revision');
const restoredWrite = await writePaperPortfolioSnapshot(abaStorage, locks, 'paper-key', changedWrite.currentRaw, abaBase);
assert.equal(restoredWrite.saved, true, 'restoring a backup with an old revision must still be allowed');
assert.notEqual(restoredWrite.currentRaw, abaBase, 'restoring identical contents must not restore an old storage revision');
assert.deepEqual(parsePaperPortfolioBackup(restoredWrite.currentRaw), restoredBackup);
const abaStaleWrite = await writePaperPortfolioSnapshot(abaStorage, locks, 'paper-key', abaBase, snapshot('4'.repeat(32)));
assert.equal(abaStaleWrite.saved, false, 'a stale tab must not overwrite a restore even when the caller reuses the old revision');
assert.equal(abaStaleWrite.currentRaw, restoredWrite.currentRaw);

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
assert.match(pageScript[1], /serializePaperPortfolioStorageSnapshot\(next\)/, 'the page must delegate revision creation to the storage writer');
assert.doesNotMatch(pageScript[1], /createStorageRevision/, 'the page must not supply storage revisions');
const loadPortfolioStart = pageScript[1].indexOf('async function loadPortfolio() {');
const loadPortfolioEnd = pageScript[1].indexOf('\n}\n\nwindow.addEventListener', loadPortfolioStart);
assert.ok(loadPortfolioStart >= 0 && loadPortfolioEnd > loadPortfolioStart,
  'paper page must keep its storage loading path testable');
const loadPortfolioBody = pageScript[1].slice(loadPortfolioStart, loadPortfolioEnd);
const rawCaptureIndex = loadPortfolioBody.indexOf('lastPersistedRaw = raw;');
const rawParseIndex = loadPortfolioBody.indexOf('const saved = JSON.parse(raw);');
assert.ok(rawCaptureIndex >= 0 && rawParseIndex >= 0 && rawCaptureIndex < rawParseIndex,
  'the exact raw snapshot must be captured before validation so a confirmed backup can recover invalid storage');
const storageUnavailableCatch = loadPortfolioBody.match(/try \{\s*raw = localStorage\.getItem\(STORAGE_KEY\);\s*\} catch \{([\s\S]*?)\n  \}/);
assert.ok(storageUnavailableCatch, 'initial storage access failure must remain covered by the page regression');
assert.match(storageUnavailableCatch[1], /portfolio = createPaperPortfolio\(\);[\s\S]*?storageAvailable = false;[\s\S]*?enablePortfolioEditing\(\);[\s\S]*?render\(\);[\s\S]*?return;/,
  'the empty in-memory portfolio must render its summary and empty tables when localStorage is unavailable');
const enableHelper = pageScript[1].match(/function enablePortfolioEditing\(\) \{([\s\S]*?)\n\}/);
assert.ok(enableHelper, 'paper page must provide a way to re-enable editing after a validated recovery');
assert.match(enableHelper[1], /tradeForm[\s\S]*?disabled = false/);
assert.match(enableHelper[1], /markForm[\s\S]*?disabled = false/);
assert.match(enableHelper[1], /exportButton[\s\S]*?disabled = false/);
assert.match(pageScript[1], /portfolio = latest;[\s\S]*?storageAvailable = true;[\s\S]*?enablePortfolioEditing\(\);/,
  'a valid snapshot adopted from another tab must restore editing controls');
assert.match(pageScript[1], /portfolio = JSON\.parse\(result\.currentRaw\);[\s\S]*?storageAvailable = true;[\s\S]*?enablePortfolioEditing\(\);/,
  'a successful backup restore must restore editing controls');
assert.match(pageScript[1], /portfolio = next;[\s\S]*?storageAvailable = false;[\s\S]*?enablePortfolioEditing\(\);/,
  'a validated in-memory recovery must remain editable when browser storage is unavailable');
assert.doesNotMatch(compilableScript, /^\s*import\s/m, 'no module import may remain in the compiled inline script');
assert.doesNotThrow(() => new Function(compilableScript), 'paper page module must parse as JavaScript');

console.log('PASS paper-portfolio.unit.mjs');
