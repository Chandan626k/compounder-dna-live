export const PAPER_PORTFOLIO_VERSION = 1;
export const DEFAULT_VIRTUAL_CAPITAL = 500000;

const SYMBOL_PATTERN = /^[A-Z0-9][A-Z0-9&_-]{0,23}\.(?:NS|BO)$/;
const ISO_UTC_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

const MAX_SAFE_PAISE = BigInt(Number.MAX_SAFE_INTEGER);

function moneyToPaise(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError('Money amount must be a finite number.');
  }
  const match = /^(-?)([0-9]+)(?:[.]([0-9]*))?(?:e([+-]?[0-9]+))?$/i.exec(value.toString());
  if (!match) throw new TypeError('Money amount must have a finite decimal representation.');
  const negative = match[1] === '-';
  const fraction = match[3] || '';
  const digits = (match[2] + fraction).replace(/^0+(?=[0-9])/, '') || '0';
  const decimalShift = 2 + Number(match[4] || 0) - fraction.length;
  let absolute = BigInt(digits);
  if (decimalShift >= 0) {
    absolute *= 10n ** BigInt(decimalShift);
  } else {
    const divisor = 10n ** BigInt(-decimalShift);
    const quotient = absolute / divisor;
    const remainder = absolute % divisor;
    absolute = quotient + (remainder * 2n >= divisor ? 1n : 0n);
  }
  const paise = negative ? -absolute : absolute;
  if (paise > MAX_SAFE_PAISE || paise < -MAX_SAFE_PAISE) {
    throw new RangeError('Money calculation exceeds the supported INR paise precision.');
  }
  return paise;
}

function moneyFromPaise(paise) {
  if (typeof paise !== 'bigint' || paise > MAX_SAFE_PAISE || paise < -MAX_SAFE_PAISE) {
    throw new RangeError('Money calculation exceeds the supported INR paise precision.');
  }
  const value = Number(paise) / 100;
  if (moneyToPaise(value) !== paise) {
    throw new RangeError('Money amount cannot be represented exactly at INR paise precision.');
  }
  return value;
}

function roundMoney(value) {
  return moneyFromPaise(moneyToPaise(value));
}

function addMoney(left, right) {
  return moneyFromPaise(moneyToPaise(left) + moneyToPaise(right));
}

function subtractMoney(left, right) {
  return moneyFromPaise(moneyToPaise(left) - moneyToPaise(right));
}

function multiplyMoney(quantity, price) {
  if (!Number.isSafeInteger(quantity) || quantity < 0) {
    throw new TypeError('Money multiplication quantity must be a non-negative safe whole number.');
  }
  return moneyFromPaise(moneyToPaise(price) * BigInt(quantity));
}

function allocateMoney(total, quantity, totalQuantity) {
  if (!Number.isSafeInteger(quantity) || quantity <= 0
      || !Number.isSafeInteger(totalQuantity) || totalQuantity <= 0
      || quantity > totalQuantity) {
    throw new TypeError('Average-cost allocation quantities must be valid positive whole numbers.');
  }
  const totalPaise = moneyToPaise(total);
  if (totalPaise < 0n) throw new RangeError('Average-cost allocation cannot use negative cost basis.');
  const numerator = totalPaise * BigInt(quantity);
  const denominator = BigInt(totalQuantity);
  const quotient = numerator / denominator;
  const remainder = numerator % denominator;
  const allocatedPaise = quotient + (remainder * 2n >= denominator ? 1n : 0n);
  return moneyFromPaise(allocatedPaise);
}

function canonicalSymbol(value) {
  if (typeof value !== 'string') throw new TypeError('Symbol must be text.');
  const symbol = value.trim().toUpperCase();
  if (!SYMBOL_PATTERN.test(symbol)) {
    throw new TypeError('Use an explicit NSE or BSE symbol ending in .NS or .BO.');
  }
  return symbol;
}

function validIsoUtc(value) {
  if (typeof value !== 'string' || !ISO_UTC_PATTERN.test(value)) return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp)
    && timestamp <= Date.now()
    && new Date(timestamp).toISOString() === value;
}

function positiveNumber(value, label) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new TypeError(label + ' must be a finite number greater than zero.');
  }
  const rounded = roundMoney(value);
  if (rounded <= 0) throw new TypeError(label + ' must remain greater than zero at INR precision.');
  return rounded;
}

function nonNegativeNumber(value, label) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new TypeError(label + ' must be a finite number greater than or equal to zero.');
  }
  return roundMoney(value);
}

function assertPortfolioShape(portfolio) {
  if (!portfolio || typeof portfolio !== 'object' || Array.isArray(portfolio)) {
    throw new TypeError('Paper portfolio must be an object.');
  }
  if (portfolio.version !== PAPER_PORTFOLIO_VERSION) {
    throw new TypeError('Unsupported paper portfolio version.');
  }
  if (portfolio.initialCapital !== DEFAULT_VIRTUAL_CAPITAL) {
    throw new TypeError('Virtual capital must remain ₹5,00,000 for this portfolio.');
  }
  if (!Array.isArray(portfolio.trades)) {
    throw new TypeError('Paper trade ledger must be an array.');
  }
  if (!portfolio.marks || typeof portfolio.marks !== 'object' || Array.isArray(portfolio.marks)) {
    throw new TypeError('Manual price marks must be an object.');
  }
  if (portfolio.storageRevision !== undefined
      && (typeof portfolio.storageRevision !== 'string' || !/^[a-f0-9]{32}$/.test(portfolio.storageRevision))) {
    throw new TypeError('Paper portfolio storage revision must be 32 lowercase hexadecimal characters.');
  }
}

function validateTrade(trade, index) {
  if (!trade || typeof trade !== 'object' || Array.isArray(trade)) {
    throw new TypeError('Invalid paper trade at ledger row ' + (index + 1) + '.');
  }
  if (typeof trade.id !== 'string' || !trade.id.trim()) {
    throw new TypeError('Every paper trade needs a text ID.');
  }
  const symbol = canonicalSymbol(trade.symbol);
  if (symbol !== trade.symbol) throw new TypeError('Stored trade symbols must be uppercase canonical exchange symbols.');
  if (trade.side !== 'BUY' && trade.side !== 'SELL') {
    throw new TypeError('Paper trade side must be BUY or SELL.');
  }
  if (!Number.isSafeInteger(trade.quantity) || trade.quantity <= 0) {
    throw new TypeError('Paper trade quantity must be a positive whole number.');
  }
  const price = positiveNumber(trade.price, 'Trade price');
  const fees = nonNegativeNumber(trade.fees, 'Trade fees');
  if (!validIsoUtc(trade.executedAt)) {
    throw new TypeError('Trade time must be a canonical UTC ISO timestamp no later than now.');
  }
  if (trade.note !== undefined && (typeof trade.note !== 'string' || trade.note.length > 240)) {
    throw new TypeError('Trade note must be text up to 240 characters.');
  }
  return {
    id: trade.id.trim(),
    symbol,
    side: trade.side,
    quantity: trade.quantity,
    price,
    fees,
    executedAt: trade.executedAt,
    note: typeof trade.note === 'string' ? trade.note.trim() : ''
  };
}

function validateMarks(marks) {
  const validated = {};
  for (const [rawSymbol, rawMark] of Object.entries(marks)) {
    const symbol = canonicalSymbol(rawSymbol);
    if (symbol !== rawSymbol) throw new TypeError('Manual mark symbols must be uppercase canonical exchange symbols.');
    if (!rawMark || typeof rawMark !== 'object' || Array.isArray(rawMark)) {
      throw new TypeError('Invalid manual mark for ' + symbol + '.');
    }
    if (!validIsoUtc(rawMark.markedAt)) {
      throw new TypeError('Manual mark time must be a canonical UTC ISO timestamp no later than now.');
    }
    validated[symbol] = {
      price: positiveNumber(rawMark.price, 'Manual mark price'),
      markedAt: rawMark.markedAt
    };
  }
  return validated;
}

export function createPaperPortfolio() {
  return {
    version: PAPER_PORTFOLIO_VERSION,
    initialCapital: DEFAULT_VIRTUAL_CAPITAL,
    trades: [],
    marks: {}
  };
}

export function derivePaperPortfolio(portfolio) {
  assertPortfolioShape(portfolio);
  const trades = portfolio.trades.map(validateTrade);
  const marks = validateMarks(portfolio.marks);
  const ids = new Set();
  const positions = new Map();
  let cash = DEFAULT_VIRTUAL_CAPITAL;
  let realizedPnl = 0;
  let totalFees = 0;
  let previousExecutionTimestamp = -Infinity;
  const latestTradeTimestampBySymbol = new Map();

  for (const trade of trades) {
    const executionTimestamp = Date.parse(trade.executedAt);
    if (executionTimestamp < previousExecutionTimestamp) {
      throw new TypeError('Paper trades must be in non-decreasing execution-time order.');
    }
    previousExecutionTimestamp = executionTimestamp;
    latestTradeTimestampBySymbol.set(trade.symbol, executionTimestamp);
    if (ids.has(trade.id)) throw new TypeError('Duplicate paper trade ID: ' + trade.id);
    ids.add(trade.id);
    const gross = multiplyMoney(trade.quantity, trade.price);
    totalFees = addMoney(totalFees, trade.fees);
    const position = positions.get(trade.symbol) || { symbol: trade.symbol, quantity: 0, costBasis: 0 };

    if (trade.side === 'BUY') {
      const totalCost = addMoney(gross, trade.fees);
      if (totalCost > cash) throw new RangeError('Insufficient virtual cash for this paper BUY.');
      cash = subtractMoney(cash, totalCost);
      position.quantity += trade.quantity;
      position.costBasis = addMoney(position.costBasis, totalCost);
      positions.set(trade.symbol, position);
      continue;
    }

    if (moneyToPaise(trade.fees) > moneyToPaise(gross)) throw new RangeError('Paper SELL fees cannot exceed gross sale proceeds.');
    if (position.quantity < trade.quantity) {
      throw new RangeError('Paper SELL quantity exceeds the open long position.');
    }
    const averageCost = position.costBasis / position.quantity;
    const allocatedCost = allocateMoney(position.costBasis, trade.quantity, position.quantity);
    const netProceeds = subtractMoney(gross, trade.fees);
    realizedPnl = addMoney(realizedPnl, subtractMoney(netProceeds, allocatedCost));
    cash = addMoney(cash, netProceeds);
    position.quantity -= trade.quantity;
    position.costBasis = subtractMoney(position.costBasis, allocatedCost);
    if (position.quantity === 0) {
      positions.delete(trade.symbol);
      if (marks[trade.symbol] && Date.parse(marks[trade.symbol].markedAt) <= executionTimestamp) {
        delete marks[trade.symbol];
      }
    } else {
      positions.set(trade.symbol, position);
    }
  }

  for (const [symbol, mark] of Object.entries(marks)) {
    if (!positions.has(symbol)) throw new TypeError('Manual mark exists without an open position: ' + symbol);
    const latestTradeTimestamp = latestTradeTimestampBySymbol.get(symbol);
    if (latestTradeTimestamp !== undefined && Date.parse(mark.markedAt) < latestTradeTimestamp) {
      throw new TypeError('Manual mark time must not predate the latest trade for ' + symbol + '.');
    }
  }

  const positionRows = [...positions.values()]
    .sort((a, b) => a.symbol.localeCompare(b.symbol))
    .map(position => {
      const mark = marks[position.symbol] || null;
      const marketValue = mark ? multiplyMoney(position.quantity, mark.price) : null;
      return {
        symbol: position.symbol,
        quantity: position.quantity,
        costBasis: roundMoney(position.costBasis),
        averageCost: position.costBasis / position.quantity,
        markPrice: mark ? mark.price : null,
        markedAt: mark ? mark.markedAt : null,
        marketValue,
        unrealizedPnl: mark ? subtractMoney(marketValue, position.costBasis) : null
      };
    });

  const marketValueComplete = positionRows.every(position => position.markPrice !== null);
  const totalInvestedCost = positionRows.reduce((sum, position) => addMoney(sum, position.costBasis), 0);
  const markedMarketValue = positionRows.reduce((sum, position) => addMoney(sum, position.marketValue || 0), 0);
  const totalMarketValue = marketValueComplete ? markedMarketValue : null;
  const unrealizedPnl = marketValueComplete
    ? positionRows.reduce((sum, position) => addMoney(sum, position.unrealizedPnl), 0)
    : null;
  const totalEquity = marketValueComplete ? addMoney(cash, markedMarketValue) : null;

  return {
    initialCapital: DEFAULT_VIRTUAL_CAPITAL,
    cash: roundMoney(cash),
    totalInvestedCost,
    totalMarketValue,
    markedMarketValue,
    marketValueComplete,
    totalEquity,
    realizedPnl: roundMoney(realizedPnl),
    unrealizedPnl,
    totalPnl: totalEquity === null ? null : subtractMoney(totalEquity, DEFAULT_VIRTUAL_CAPITAL),
    totalFees: roundMoney(totalFees),
    tradeCount: trades.length,
    positions: positionRows
  };
}

export function parsePaperPortfolioBackup(raw) {
  if (typeof raw !== 'string') throw new TypeError('Portfolio backup must be text.');
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new TypeError('Portfolio backup must contain valid JSON.');
  }
  assertPortfolioShape(parsed);
  const normalized = {
    version: PAPER_PORTFOLIO_VERSION,
    initialCapital: DEFAULT_VIRTUAL_CAPITAL,
    trades: parsed.trades.map(validateTrade),
    marks: validateMarks(parsed.marks)
  };
  derivePaperPortfolio(normalized);
  return normalized;
}

export function serializePaperPortfolioStorageSnapshot(portfolio, revisionId) {
  const normalized = parsePaperPortfolioBackup(JSON.stringify(portfolio));
  if (revisionId === undefined) return JSON.stringify(normalized);
  if (typeof revisionId !== 'string' || !/^[a-f0-9]{32}$/.test(revisionId)) {
    throw new TypeError('Paper portfolio storage revision must be 32 lowercase hexadecimal characters.');
  }
  return JSON.stringify({ ...normalized, storageRevision: revisionId });
}

function createPaperPortfolioStorageRevision() {
  const cryptoApi = globalThis.crypto;
  if (!cryptoApi || typeof cryptoApi.getRandomValues !== 'function') {
    throw new Error('Secure random storage revisions are unavailable; this portfolio cannot be saved safely.');
  }
  const bytes = new Uint8Array(16);
  cryptoApi.getRandomValues(bytes);
  return Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
}

function readPaperPortfolioStorageRevision(raw) {
  if (typeof raw !== 'string') return null;
  try {
    const parsed = JSON.parse(raw);
    const revision = parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed.storageRevision
      : null;
    return typeof revision === 'string' && /^[a-f0-9]{32}$/.test(revision) ? revision : null;
  } catch {
    return null;
  }
}

export async function writePaperPortfolioSnapshot(storage, lockManager, key, expectedRaw, nextRaw) {
  if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') {
    throw new TypeError('Paper portfolio storage must support getItem and setItem.');
  }
  if (typeof key !== 'string' || !key.trim()) {
    throw new TypeError('Paper portfolio storage key must be non-empty text.');
  }
  if (expectedRaw !== null && typeof expectedRaw !== 'string') {
    throw new TypeError('Expected paper portfolio snapshot must be text or null.');
  }
  if (typeof nextRaw !== 'string') {
    throw new TypeError('Next paper portfolio snapshot must be text.');
  }
  // Validate and normalize the complete ledger at the storage boundary. Never trust a
  // caller-supplied revision: a stale caller could reuse an older revision and recreate
  // the ABA snapshot. Issue a fresh cryptographic revision for every actual write.
  const normalizedNext = parsePaperPortfolioBackup(nextRaw);
  const expectedRevision = readPaperPortfolioStorageRevision(expectedRaw);
  let nextRevision = createPaperPortfolioStorageRevision();
  while (nextRevision === expectedRevision) {
    nextRevision = createPaperPortfolioStorageRevision();
  }
  const persistedRaw = JSON.stringify({ ...normalizedNext, storageRevision: nextRevision });

  const write = () => {
    const currentRaw = storage.getItem(key);
    if (currentRaw !== expectedRaw) return { saved: false, currentRaw };
    storage.setItem(key, persistedRaw);
    return { saved: true, currentRaw: persistedRaw };
  };

  if (lockManager && typeof lockManager.request === 'function') {
    const result = await lockManager.request(key + ':write', write);
    return { ...result, usedLock: true };
  }
  return { ...write(), usedLock: false };
}

export function applyPaperTrade(portfolio, input) {
  const current = derivePaperPortfolio(portfolio);
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('Paper trade input must be an object.');
  }
  const symbol = canonicalSymbol(input.symbol);
  const side = input.side;
  if (side !== 'BUY' && side !== 'SELL') throw new TypeError('Paper trade side must be BUY or SELL.');
  const quantity = input.quantity;
  if (!Number.isSafeInteger(quantity) || quantity <= 0) throw new TypeError('Quantity must be a positive safe whole number.');
  const price = positiveNumber(input.price, 'Trade price');
  const fees = input.fees === undefined ? 0 : nonNegativeNumber(input.fees, 'Trade fees');
  const gross = multiplyMoney(quantity, price);
  const executedAt = input.executedAt === undefined ? new Date().toISOString() : input.executedAt;
  if (!validIsoUtc(executedAt)) throw new TypeError('Trade time must be a canonical UTC ISO timestamp no later than now.');
  const note = input.note === undefined ? '' : input.note;
  if (typeof note !== 'string' || note.length > 240) throw new TypeError('Trade note must be text up to 240 characters.');
  const id = input.id === undefined ? 'paper-' + (portfolio.trades.length + 1) : input.id;
  if (typeof id !== 'string' || !id.trim()) throw new TypeError('Paper trade ID must be non-empty text.');
  if (portfolio.trades.some(trade => trade && trade.id === id.trim())) throw new TypeError('Duplicate paper trade ID: ' + id);

  let closesPosition = false;
  if (side === 'BUY') {
    const requiredCash = addMoney(gross, fees);
    if (requiredCash > current.cash) throw new RangeError('Insufficient virtual cash for this paper BUY.');
  } else {
    const position = current.positions.find(item => item.symbol === symbol);
    if (!position || position.quantity < quantity) {
      throw new RangeError('Paper SELL quantity exceeds the open long position.');
    }
    if (moneyToPaise(fees) > moneyToPaise(gross)) {
      throw new RangeError('Paper SELL fees cannot exceed gross sale proceeds.');
    }
    closesPosition = position.quantity === quantity;
  }

  // A manual mark is only valid until a later trade changes this symbol's position.
  // A full close always clears the mark; other trades clear marks no newer than execution.
  const nextMarks = { ...portfolio.marks };
  if (closesPosition || (nextMarks[symbol] && nextMarks[symbol].markedAt <= executedAt)) delete nextMarks[symbol];
  const next = {
    version: PAPER_PORTFOLIO_VERSION,
    initialCapital: DEFAULT_VIRTUAL_CAPITAL,
    trades: [...portfolio.trades, {
      id: id.trim(),
      symbol,
      side,
      quantity,
      price,
      fees,
      executedAt,
      note: note.trim()
    }],
    marks: nextMarks
  };
  const nextState = derivePaperPortfolio(next);
  if (!nextState.positions.some(position => position.symbol === symbol)) delete next.marks[symbol];
  derivePaperPortfolio(next);
  return next;
}

export function setPaperMark(portfolio, symbolInput, priceInput, markedAt = new Date().toISOString()) {
  const current = derivePaperPortfolio(portfolio);
  const symbol = canonicalSymbol(symbolInput);
  if (!current.positions.some(position => position.symbol === symbol)) {
    throw new RangeError('A manual mark can only be added for an open paper position.');
  }
  const price = positiveNumber(priceInput, 'Manual mark price');
  if (!validIsoUtc(markedAt)) throw new TypeError('Manual mark time must be a canonical UTC ISO timestamp no later than now.');
  const existingMark = portfolio.marks[symbol];
  if (existingMark && Date.parse(markedAt) < Date.parse(existingMark.markedAt)) {
    throw new TypeError('Manual mark time must not move backwards for ' + symbol + '.');
  }
  const next = {
    version: PAPER_PORTFOLIO_VERSION,
    initialCapital: DEFAULT_VIRTUAL_CAPITAL,
    trades: [...portfolio.trades],
    marks: { ...portfolio.marks, [symbol]: { price, markedAt } }
  };
  derivePaperPortfolio(next);
  return next;
}
