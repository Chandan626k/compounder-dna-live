function finite(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function clusterPivotLevels(pivots, tolerancePct, toleranceAbs) {
  const clusters = [];
  for (const pivot of pivots.sort((a, b) => a.price - b.price)) {
    const existing = clusters.find((cluster) =>
      Math.abs(cluster.price - pivot.price) <= Math.max(toleranceAbs, cluster.price * tolerancePct)
    );
    if (!existing) {
      clusters.push({
        price: pivot.price,
        touches: 1,
        firstIndex: pivot.index,
        lastIndex: pivot.index,
        lastDate: pivot.date,
        type: pivot.type,
      });
    } else {
      existing.price = (existing.price * existing.touches + pivot.price) / (existing.touches + 1);
      existing.touches += 1;
      existing.firstIndex = Math.min(existing.firstIndex, pivot.index);
      existing.lastIndex = Math.max(existing.lastIndex, pivot.index);
      existing.lastDate = pivot.date;
      if (existing.type !== pivot.type) existing.type = 'MIXED';
    }
  }
  return clusters;
}

/**
 * Reaction-based daily support/resistance.
 *
 * Only bars strictly before the current bar are eligible as pivots. A pivot
 * needs two completed bars on each side, so every reaction used here is fully
 * confirmed by historical data and cannot depend on the current/future bar.
 */
export function calculateReactionSupportResistance(rows, { pivotSpan = 2, lookback = 120 } = {}) {
  if (!Array.isArray(rows) || rows.length < Math.max(20, pivotSpan * 2 + 5)) {
    return { support: null, resistance: null, levels: [], zones: [], status: 'UNAVAILABLE' };
  }

  const current = rows.at(-1);
  const historyStart = Math.max(0, rows.length - lookback - 1);
  const history = rows.slice(historyStart, -1);
  if (history.length < pivotSpan * 2 + 1) {
    return { support: null, resistance: null, levels: [], zones: [], status: 'UNAVAILABLE' };
  }

  const pivots = [];
  for (let i = pivotSpan; i < history.length - pivotSpan; i += 1) {
    const row = history[i];
    const before = history.slice(i - pivotSpan, i);
    const after = history.slice(i + 1, i + 1 + pivotSpan);
    const isHigh = row.high >= Math.max(...before.map((item) => item.high)) && row.high >= Math.max(...after.map((item) => item.high));
    const isLow = row.low <= Math.min(...before.map((item) => item.low)) && row.low <= Math.min(...after.map((item) => item.low));
    if (isHigh) pivots.push({ index: historyStart + i, date: row.date, price: row.high, type: 'RESISTANCE' });
    if (isLow) pivots.push({ index: historyStart + i, date: row.date, price: row.low, type: 'SUPPORT' });
  }

  if (!pivots.length) {
    return { support: null, resistance: null, levels: [], zones: [], status: 'NO_REACTION_LEVELS' };
  }

  const currentPrice = current.close;
  const tolerancePct = 0.01;
  const atrProxy = history.length >= 14
    ? history.slice(-14).reduce((sum, row) => sum + (row.high - row.low), 0) / 14
    : 0;
  const toleranceAbs = Math.max(0, atrProxy * 0.5);
  const clusters = clusterPivotLevels(pivots, tolerancePct, toleranceAbs);
  const zones = clusters.map((cluster) => ({
    price: Number(cluster.price.toFixed(6)),
    touches: cluster.touches,
    type: cluster.type,
    firstIndex: cluster.firstIndex,
    lastIndex: cluster.lastIndex,
    lastDate: cluster.lastDate,
    strength: Math.min(100, 30 + cluster.touches * 20),
  })).sort((a, b) => a.price - b.price);

  const below = zones.filter((zone) => zone.price < currentPrice);
  const above = zones.filter((zone) => zone.price > currentPrice);
  const rank = (zone) => {
    const distancePct = Math.abs((currentPrice - zone.price) / currentPrice) * 100;
    return (zone.touches * 2) - distancePct;
  };
  const support = below.length ? below.sort((a, b) => rank(b) - rank(a))[0] : null;
  const resistance = above.length ? above.sort((a, b) => rank(b) - rank(a))[0] : null;

  return {
    support: support?.price ?? null,
    resistance: resistance?.price ?? null,
    levels: zones.map((zone) => zone.price),
    zones,
    status: 'VERIFIED_REACTION_ZONES',
    evidence: {
      pivotSpan,
      lookback: history.length,
      currentExcluded: true,
      pivotConfirmation: `completed ${pivotSpan}-bar confirmation on both sides`,
      tolerancePct,
      toleranceAbs,
    },
  };
}
