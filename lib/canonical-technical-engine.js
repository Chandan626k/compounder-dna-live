import { calculateReactionSupportResistance } from './canonical-support-resistance.js';
import { calculateCanonicalMarketStructure } from './canonical-market-structure.js';
import { calculateCanonicalBreakoutLifecycle } from './canonical-breakout-lifecycle.js';

const finite = (v) => typeof v === 'number' && Number.isFinite(v);
const clamp = (v, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, finite(v) ? v : lo));

function sma(values, period) {
  if (!Array.isArray(values) || values.length < period) return null;
  return values.slice(-period).reduce((sum, value) => sum + value, 0) / period;
}
function ema(values, period) {
  if (!Array.isArray(values) || values.length < period) return null;
  let value = sma(values.slice(0, period), period); const k = 2 / (period + 1);
  for (let i = period; i < values.length; i += 1) value = values[i] * k + value * (1 - k);
  return value;
}
function rsi(values, period = 14) {
  if (!Array.isArray(values) || values.length <= period) return null;
  let gain = 0, loss = 0;
  for (let i = 1; i <= period; i += 1) { const delta = values[i] - values[i - 1]; gain += Math.max(delta, 0); loss += Math.max(-delta, 0); }
  gain /= period; loss /= period;
  for (let i = period + 1; i < values.length; i += 1) { const delta = values[i] - values[i - 1]; gain = (gain * (period - 1) + Math.max(delta, 0)) / period; loss = (loss * (period - 1) + Math.max(-delta, 0)) / period; }
  return loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
}
function atr(rows, period = 14) {
  if (!Array.isArray(rows) || rows.length <= period) return null;
  const ranges = [];
  for (let i = 1; i < rows.length; i += 1) { const row = rows[i], previous = rows[i - 1]; ranges.push(Math.max(row.high - row.low, Math.abs(row.high - previous.close), Math.abs(row.low - previous.close))); }
  if (ranges.length < period) return null;
  let value = sma(ranges.slice(0, period), period);
  for (let i = period; i < ranges.length; i += 1) value = ((value * (period - 1)) + ranges[i]) / period;
  return value;
}
function macd(values, fast = 12, slow = 26, signalPeriod = 9) {
  if (!Array.isArray(values) || values.length < slow + signalPeriod - 1) return null;
  const lines = [];
  for (let end = slow; end <= values.length; end += 1) { const sample = values.slice(0, end); const fastEma = ema(sample, fast); const slowEma = ema(sample, slow); if (fastEma != null && slowEma != null) lines.push(fastEma - slowEma); }
  const line = lines.at(-1), signal = ema(lines, signalPeriod); return { line, signal, histogram: signal == null ? null : line - signal };
}
function adx(rows, period = 14) {
  if (!Array.isArray(rows) || rows.length < period * 2 + 1) return null;
  const tr = [], plusDm = [], minusDm = [];
  for (let i = 1; i < rows.length; i += 1) { const current = rows[i], previous = rows[i - 1]; const upMove = current.high - previous.high, downMove = previous.low - current.low; tr.push(Math.max(current.high - current.low, Math.abs(current.high - previous.close), Math.abs(current.low - previous.close))); plusDm.push(upMove > downMove && upMove > 0 ? upMove : 0); minusDm.push(downMove > upMove && downMove > 0 ? downMove : 0); }
  if (tr.length < period * 2) return null;
  let trSmooth = tr.slice(0, period).reduce((a, b) => a + b, 0), plusSmooth = plusDm.slice(0, period).reduce((a, b) => a + b, 0), minusSmooth = minusDm.slice(0, period).reduce((a, b) => a + b, 0); const dx = [];
  for (let i = period; i < tr.length; i += 1) { trSmooth = trSmooth - trSmooth / period + tr[i]; plusSmooth = plusSmooth - plusSmooth / period + plusDm[i]; minusSmooth = minusSmooth - minusSmooth / period + minusDm[i]; if (trSmooth <= 0) continue; const plusDi = 100 * plusSmooth / trSmooth, minusDi = 100 * minusSmooth / trSmooth, denominator = plusDi + minusDi; dx.push(denominator > 0 ? 100 * Math.abs(plusDi - minusDi) / denominator : 0); }
  if (dx.length < period) return null;
  let value = sma(dx.slice(0, period), period); for (let i = period; i < dx.length; i += 1) value = ((value * (period - 1)) + dx[i]) / period; return value;
}
function bollinger(values, period = 20, deviations = 2) {
  if (values.length < period) return null; const middle = sma(values, period), variance = values.slice(-period).reduce((sum, value) => sum + (value - middle) ** 2, 0) / period, standardDeviation = Math.sqrt(variance), upper = middle + deviations * standardDeviation, lower = middle - deviations * standardDeviation;
  return { middle, upper, lower, width: middle ? ((upper - lower) / middle) * 100 : null, percentB: upper === lower ? null : (values.at(-1) - lower) / (upper - lower) };
}
function relativeVolume(volumes, period = 20) { const average = sma(volumes, period); return average != null && average > 0 ? volumes.at(-1) / average : null; }
function validateRows(rows, nowMs = Date.now()) {
  if (!Array.isArray(rows)) return { rows: [], status: 'UNAVAILABLE', reason: 'ROWS_NOT_ARRAY' }; const seen = new Set(), valid = [];
  for (const row of rows) { const time = new Date(row?.date).getTime(), values = [row?.open, row?.high, row?.low, row?.close, row?.volume]; if (!Number.isFinite(time) || time > nowMs + 5 * 60 * 1000) return { rows: [], status: 'UNAVAILABLE', reason: 'INVALID_OR_FUTURE_TIMESTAMP' }; if (seen.has(time)) return { rows: [], status: 'UNAVAILABLE', reason: 'DUPLICATE_TIMESTAMP' }; if (!values.every(finite) || row.open <= 0 || row.high <= 0 || row.low <= 0 || row.close <= 0 || row.volume < 0) return { rows: [], status: 'UNAVAILABLE', reason: 'INVALID_OHLCV' }; if (row.high < Math.max(row.open, row.close) || row.low > Math.min(row.open, row.close) || row.high < row.low) return { rows: [], status: 'UNAVAILABLE', reason: 'OHLC_INVARIANT_FAILED' }; seen.add(time); valid.push({ ...row, date: new Date(time).toISOString() }); }
  for (let i = 1; i < valid.length; i += 1) if (new Date(valid[i].date) <= new Date(valid[i - 1].date)) return { rows: [], status: 'UNAVAILABLE', reason: 'NON_CHRONOLOGICAL' };
  return { rows: valid, status: 'VERIFIED', reason: null };
}
const structure = calculateCanonicalMarketStructure;
const supportResistance = calculateReactionSupportResistance;
function setupClassification({ trend, structureState, breakout, breakdown, momentum, volatility }) { if (breakout?.confirmed) return 'BREAKOUT'; if (breakdown?.confirmed) return 'BREAKDOWN'; if (trend.includes('UPTREND') && structureState === 'UPTREND_STRUCTURE') return 'BULLISH'; if (trend === 'DOWNTREND' && structureState === 'DOWNTREND_STRUCTURE') return 'BEARISH'; if (volatility === 'EXPANDING' && Math.abs(momentum || 0) < 2) return 'REVERSAL_RISK'; if (trend === 'RANGE' || structureState === 'RANGE_OR_TRANSITION') return 'RANGE'; return 'NEUTRAL'; }
export function calculateCanonicalTechnical(inputRows, context = {}) {
  const validation = validateRows(inputRows, context.nowMs ?? Date.now()), timeframe = context.timeframe || '1d', symbol = context.symbol || null, provenance = { symbol, source: context.source || null, retrievedAt: context.retrievedAt || null, observationTimestamp: validation.rows.at(-1)?.date || null, timeframe, dataQuality: validation.status, validation: validation.status === 'VERIFIED' ? 'OHLCV invariants, chronology, duplicate and future-timestamp checks passed' : validation.reason };
  if (validation.status !== 'VERIFIED') return { status: 'UNAVAILABLE', reason: validation.reason, provenance, evidence: null };
  const rows = validation.rows, closes = rows.map((row) => row.close), volumes = rows.map((row) => row.volume), last = closes.at(-1), e20 = ema(closes, 20), e50 = ema(closes, 50), e100 = ema(closes, 100), e200 = ema(closes, 200), s20 = sma(closes, 20), s50 = sma(closes, 50), s200 = sma(closes, 200), rsi14 = rsi(closes, 14), atr14 = atr(rows, 14), macdValue = macd(closes), adx14 = adx(rows, 14), rv20 = relativeVolume(volumes, 20), structureValue = structure(rows, 20), levels = supportResistance(rows), breakoutLifecycle = calculateCanonicalBreakoutLifecycle(rows, { ...context, timeframe, symbol, source: provenance.source, retrievedAt: provenance.retrievedAt }), year = rows.slice(-Math.min(252, rows.length)), high52 = year.length ? Math.max(...year.map((row) => row.high)) : null, low52 = year.length ? Math.min(...year.map((row) => row.low)) : null;
  const trend = e200 != null ? last > e20 && e20 > e50 && e50 > e200 ? 'STRONG UPTREND' : last > e50 && e50 > e200 ? 'UPTREND' : last < e50 && e50 < e200 ? 'DOWNTREND' : 'SIDEWAYS / TRANSITION' : e50 != null && last > e50 ? 'UPTREND' : e50 != null && last < e50 ? 'DOWNTREND' : 'SIDEWAYS / TRANSITION';
  const momentum = closes.length > 20 ? ((last / closes.at(-21)) - 1) * 100 : null, atrPct = atr14 != null && last > 0 ? atr14 / last * 100 : null, previousAtr = rows.length >= 28 ? atr(rows.slice(0, -14), 14) : null, volatility = atrPct == null ? 'UNAVAILABLE' : previousAtr == null ? 'NORMAL' : atr14 > previousAtr * 1.15 ? 'EXPANDING' : atr14 < previousAtr * 0.85 ? 'CONTRACTING' : 'NORMAL';
  const vwapNumerator = rows.reduce((sum, row) => sum + ((row.high + row.low + row.close) / 3) * row.volume, 0), volumeTotal = volumes.reduce((sum, value) => sum + value, 0), periodVwap = volumeTotal > 0 ? vwapNumerator / volumeTotal : null, breakoutVolumeConfirmed = structureValue.breakout?.confirmed === true && rv20 != null && rv20 >= 1.2, breakdownVolumeConfirmed = structureValue.breakdown?.confirmed === true && rv20 != null && rv20 >= 1.2, classification = setupClassification({ trend, structureState: structureValue.state, breakout: breakoutVolumeConfirmed ? structureValue.breakout : null, breakdown: breakdownVolumeConfirmed ? structureValue.breakdown : null, momentum, volatility }), components = [trend !== 'SIDEWAYS / TRANSITION', structureValue.state !== 'RANGE_OR_TRANSITION', rsi14 != null, macdValue?.histogram != null, adx14 != null, rv20 != null, atr14 != null, levels.status === 'VERIFIED_REACTION_ZONES'].filter(Boolean).length, confidence = Math.round(clamp((components / 8) * 100));
  return { status: 'VERIFIED', prices: closes, last, s20, s50, s200, e20, e50, e100, e200, rsi: rsi14, atr: atr14, atrPct, adx: adx14, macd: macdValue, bollinger: bollinger(closes), volume: volumes.at(-1), avgVolume: sma(volumes, 20), volumeSpike: rv20, relativeVolume: rv20, high: high52, low: low52, high52Week: high52, low52Week: low52, support: levels.support, resistance: levels.resistance, supportResistance: levels, periodVwap, vwapSemantics: 'CUMULATIVE_PERIOD_VWAP; NOT_INTRADAY_SESSION_VWAP', trend, trendStrength: adx14, trendStrengthBasis: 'ADX14; direction is determined separately from EMA/price structure', structure: structureValue, breakout: structureValue.breakout ? { ...structureValue.breakout, volumeConfirmed: breakoutVolumeConfirmed } : null, breakdown: structureValue.breakdown ? { ...structureValue.breakdown, volumeConfirmed: breakdownVolumeConfirmed } : null, breakoutLifecycle, momentum, momentum20d: momentum, volatility, setup: classification, technicalConfidence: confidence, confidenceBasis: { availableComponents: components, totalComponents: 8, missingEvidenceDoesNotCreateDirectionalBias: true }, has52WeekHistory: rows.length >= 252, historyBars: rows.length, change1d: closes.length > 1 ? ((last / closes.at(-2)) - 1) * 100 : null, change20d: closes.length > 20 ? ((last / closes.at(-21)) - 1) * 100 : null, change3m: closes.length > 63 ? ((last / closes.at(-64)) - 1) * 100 : null, change6m: closes.length > 126 ? ((last / closes.at(-127)) - 1) * 100 : null, change1y: closes.length > 252 ? ((last / closes.at(-253)) - 1) * 100 : null, distanceFrom200DMA: s200 != null ? ((last / s200) - 1) * 100 : null, distanceFrom52WHigh: high52 ? ((last / high52) - 1) * 100 : null, distanceFrom52WLow: low52 ? ((last / low52) - 1) * 100 : null, drawdown: high52 ? Math.max(0, (1 - last / high52) * 100) : null, rangePosition: high52 != null && low52 != null && high52 > low52 ? ((last - low52) / (high52 - low52)) * 100 : null, provenance };
}
