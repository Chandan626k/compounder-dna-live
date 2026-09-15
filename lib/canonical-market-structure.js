function confirmedPivots(rows, { pivotSpan = 2, lookback = 120 } = {}) {
  const historyStart = Math.max(0, rows.length - lookback - 1);
  const history = rows.slice(historyStart, -1);
  const highs = [];
  const lows = [];
  for (let i = pivotSpan; i < history.length - pivotSpan; i += 1) {
    const row = history[i];
    const before = history.slice(i - pivotSpan, i);
    const after = history.slice(i + 1, i + 1 + pivotSpan);
    if (row.high >= Math.max(...before.map((item) => item.high)) && row.high >= Math.max(...after.map((item) => item.high))) {
      highs.push({ index: historyStart + i, date: row.date, price: row.high });
    }
    if (row.low <= Math.min(...before.map((item) => item.low)) && row.low <= Math.min(...after.map((item) => item.low))) {
      lows.push({ index: historyStart + i, date: row.date, price: row.low });
    }
  }
  return { highs, lows };
}

export function calculateCanonicalMarketStructure(rows, options = {}) {
  if (!Array.isArray(rows) || rows.length < 10) {
    return { state: 'INSUFFICIENT_DATA', lastEvent: null, breakout: null, breakdown: null, pivots: { highs: [], lows: [] }, evidence: { currentExcluded: true } };
  }

  const current = rows.at(-1);
  const pivots = confirmedPivots(rows, options);
  const highA = pivots.highs.at(-2);
  const highB = pivots.highs.at(-1);
  const lowA = pivots.lows.at(-2);
  const lowB = pivots.lows.at(-1);

  const higherHigh = highA && highB ? highB.price > highA.price : false;
  const higherLow = lowA && lowB ? lowB.price > lowA.price : false;
  const lowerHigh = highA && highB ? highB.price < highA.price : false;
  const lowerLow = lowA && lowB ? lowB.price < lowA.price : false;

  const state = higherHigh && higherLow
    ? 'UPTREND_STRUCTURE'
    : lowerHigh && lowerLow
      ? 'DOWNTREND_STRUCTURE'
      : 'RANGE_OR_TRANSITION';

  const lastEvent = higherHigh && higherLow
    ? 'HIGHER_HIGH_HIGHER_LOW'
    : lowerHigh && lowerLow
      ? 'LOWER_HIGH_LOWER_LOW'
      : higherHigh
        ? 'HIGHER_HIGH'
        : lowerHigh
          ? 'LOWER_HIGH'
          : higherLow
            ? 'HIGHER_LOW'
            : lowerLow
              ? 'LOWER_LOW'
              : null;

  const breakout = highB && current.close > highB.price
    ? { confirmed: true, level: highB.price, type: 'UPSIDE_CLOSE_ABOVE_LAST_CONFIRMED_SWING_HIGH', pivotDate: highB.date }
    : null;
  const breakdown = lowB && current.close < lowB.price
    ? { confirmed: true, level: lowB.price, type: 'DOWNSIDE_CLOSE_BELOW_LAST_CONFIRMED_SWING_LOW', pivotDate: lowB.date }
    : null;

  return {
    state,
    lastEvent,
    breakout,
    breakdown,
    pivots,
    evidence: {
      currentExcluded: true,
      pivotSpan: options.pivotSpan ?? 2,
      lookback: options.lookback ?? 120,
      pivotConfirmation: 'completed bars on both sides; current bar excluded',
    },
  };
}
