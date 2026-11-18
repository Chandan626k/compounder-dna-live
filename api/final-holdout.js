import { sendMarketDataUnavailable } from '../lib/market-data-access-policy.js';
import { verifiedHistory } from '../lib/market-data-provider.js';
import { runValidationBacktest } from '../lib/strategy-validation.js';
import { buyAndHoldBenchmark, RESEARCH_CANDIDATES } from '../lib/predictive-research.js';
import { buildResearchArtifact, FROZEN_PROTOCOL_ID, FROZEN_COSTS, FROZEN_HORIZON, FROZEN_HOLDOUT_FRACTION, stableHash } from '../lib/final-holdout-artifact-v2.js';
import { getLedger, setLedger, claimHoldoutOnce, completeHoldoutOnce, classifyHoldoutLedgerFailure } from '../lib/holdout-ledger.js';
import { PROMOTION_CRITERIA } from '../lib/validation-gate.js';

const SYMBOLS = Object.freeze(['TCS', 'ICICIBANK', 'HDFCBANK', 'INFY']);
const ARTIFACT_PREFIX = `stocksamjho:holdout:${FROZEN_PROTOCOL_ID}:artifact:`;
const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,OPTIONS', 'Cache-Control': 'no-store' };

function parseState(raw) {
  if (raw === null) return null;
  if (typeof raw !== 'string' || raw.length === 0) throw new Error('HOLDOUT_LEDGER_STATE_INVALID');
  try {
    const state = JSON.parse(raw);
    if (!state || typeof state !== 'object' || Array.isArray(state)) throw new Error('HOLDOUT_LEDGER_STATE_INVALID');
    return state;
  } catch {
    throw new Error('HOLDOUT_LEDGER_STATE_INVALID');
  }
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isIsoTimestamp(value) {
  if (typeof value !== 'string') return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value;
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function isNullableFiniteNumber(value) {
  return value === null || isFiniteNumber(value);
}

function isNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0;
}

function isRate(value) {
  return value === null || (isFiniteNumber(value) && value >= 0 && value <= 100);
}

function isSha256(value) {
  return typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
}

function isBacktestMetrics(value) {
  return isRecord(value)
    && isNonNegativeInteger(value.trades)
    && isNonNegativeInteger(value.wins)
    && isNonNegativeInteger(value.losses)
    && value.wins + value.losses === value.trades
    && (value.trades === 0 ? value.winRate === null : isRate(value.winRate) && value.winRate !== null)
    && isFiniteNumber(value.totalReturnPct)
    && isNullableFiniteNumber(value.avgTradePct)
    && isNullableFiniteNumber(value.medianTradePct)
    && (value.profitFactor === null || (isFiniteNumber(value.profitFactor) && value.profitFactor >= 0))
    && isFiniteNumber(value.maxDrawdownPct)
    && value.maxDrawdownPct >= 0
    && isNonNegativeInteger(value.recoveryBars)
    && isNullableFiniteNumber(value.expectancyPct)
    && (value.stdevTradePct === null || (isFiniteNumber(value.stdevTradePct) && value.stdevTradePct >= 0))
    && isNullableFiniteNumber(value.tStat)
    && (value.approx95CI === null || (Array.isArray(value.approx95CI)
      && value.approx95CI.length === 2 && value.approx95CI.every(isFiniteNumber)))
    && (value.avgWinPct === null || (isFiniteNumber(value.avgWinPct) && value.avgWinPct >= 0))
    && (value.avgLossPct === null || (isFiniteNumber(value.avgLossPct) && value.avgLossPct <= 0))
    && isRate(value.targetRate)
    && isRate(value.stopRate)
    && isRate(value.timeExitRate);
}

function isBenchmarkMetrics(value) {
  return isRecord(value)
    && value.status === 'COMPLETED'
    && isFiniteNumber(value.totalReturnPct)
    && isFiniteNumber(value.maxDrawdownPct)
    && value.maxDrawdownPct >= 0
    && isFiniteNumber(value.entryRaw)
    && value.entryRaw > 0
    && isFiniteNumber(value.exitRaw)
    && value.exitRaw > 0;
}

function isCompletedStock(stock, index) {
  if (!isRecord(stock) || stock.symbol !== SYMBOLS[index]
    || !isSha256(stock.artifactHash) || !isSha256(stock.historyFingerprint)
    || !isBacktestMetrics(stock.holdout) || !isBenchmarkMetrics(stock.benchmark)
    || !isRecord(stock.comparison)
    || !isFiniteNumber(stock.comparison.excessReturnPct)
    || !isRecord(stock.statisticalEvidence)) return false;

  const expectedExcessReturn = stock.holdout.totalReturnPct - stock.benchmark.totalReturnPct;
  const evidence = stock.statisticalEvidence;
  const confidenceIntervalMatches = evidence.confidenceInterval95 === null
    ? stock.holdout.approx95CI === null
    : Array.isArray(evidence.confidenceInterval95)
      && JSON.stringify(evidence.confidenceInterval95) === JSON.stringify(stock.holdout.approx95CI);

  return Math.abs(stock.comparison.excessReturnPct - expectedExcessReturn) <= 1e-9
    && isNullableFiniteNumber(evidence.tStat)
    && evidence.tStat === stock.holdout.tStat
    && confidenceIntervalMatches
    && evidence.pValue === null
    && typeof evidence.significanceNote === 'string'
    && evidence.significanceNote.trim().length > 0;
}

function sameNullableNumber(actual, expected) {
  if (expected === null) return actual === null;
  return isFiniteNumber(actual) && isFiniteNumber(expected) && Math.abs(actual - expected) <= 1e-9;
}

function isCompletedAggregate(value, stocks) {
  const trades = stocks.reduce((total, stock) => total + stock.holdout.trades, 0);
  const wins = stocks.reduce((total, stock) => total + stock.holdout.wins, 0);
  const grossWins = stocks.reduce((total, stock) => total + (stock.holdout.avgWinPct || 0) * (stock.holdout.wins || 0), 0);
  const grossLoss = stocks.reduce((total, stock) => total + Math.abs((stock.holdout.avgLossPct || 0) * (stock.holdout.losses || 0)), 0);
  const expected = {
    stocks: stocks.length,
    trades,
    winRate: trades ? wins / trades * 100 : null,
    expectancyPct: trades ? stocks.reduce((total, stock) => total + (stock.holdout.expectancyPct || 0) * (stock.holdout.trades || 0), 0) / trades : null,
    profitFactor: grossLoss ? grossWins / grossLoss : null,
    maxDrawdownPct: Math.max(...stocks.map(stock => stock.holdout.maxDrawdownPct || 0)),
    benchmarkMeanReturnPct: stocks.reduce((total, stock) => total + (stock.benchmark.totalReturnPct || 0), 0) / stocks.length,
    strategyMeanReturnPct: stocks.reduce((total, stock) => total + (stock.holdout.totalReturnPct || 0), 0) / stocks.length,
  };

  return isRecord(value)
    && value.stocks === expected.stocks
    && isNonNegativeInteger(value.trades)
    && value.trades === expected.trades
    && sameNullableNumber(value.winRate, expected.winRate)
    && sameNullableNumber(value.expectancyPct, expected.expectancyPct)
    && sameNullableNumber(value.profitFactor, expected.profitFactor)
    && sameNullableNumber(value.maxDrawdownPct, expected.maxDrawdownPct)
    && sameNullableNumber(value.benchmarkMeanReturnPct, expected.benchmarkMeanReturnPct)
    && sameNullableNumber(value.strategyMeanReturnPct, expected.strategyMeanReturnPct);
}

function isGateResult(value, aggregate) {
  const keys = ['winRate', 'profitFactor', 'expectancy', 'rollingStability', 'drawdown', 'survivorship', 'marketImpact'];
  if (!isRecord(value) || !isRecord(value.checks)
    || Object.keys(value.checks).length !== keys.length
    || !keys.every(key => typeof value.checks[key] === 'boolean')
    || !Array.isArray(value.blockers)) return false;

  const expectedChecks = {
    winRate: aggregate.winRate >= PROMOTION_CRITERIA.minOutOfSampleWinRatePct,
    profitFactor: aggregate.profitFactor != null && aggregate.profitFactor >= PROMOTION_CRITERIA.minOutOfSampleProfitFactor,
    expectancy: aggregate.expectancyPct != null && aggregate.expectancyPct > PROMOTION_CRITERIA.minOutOfSampleExpectancyPct,
    rollingStability: false,
    drawdown: aggregate.maxDrawdownPct <= PROMOTION_CRITERIA.maxRollingWorstDrawdownPct,
    survivorship: false,
    marketImpact: false,
  };
  const expectedBlockers = keys.filter(key => !expectedChecks[key]);
  return keys.every(key => value.checks[key] === expectedChecks[key])
    && value.classification === (expectedBlockers.length === 0 ? 'PASS' : 'NO VALID SIGNAL')
    && value.blockers.length === expectedBlockers.length
    && value.blockers.every((blocker, index) => blocker === expectedBlockers[index]);
}

function parseHoldoutRunState(raw) {
  const state = parseState(raw);
  if (!state) return null;

  const metadata = state.metadata;
  const validRunning = state.protocolId === FROZEN_PROTOCOL_ID
    && state.status === 'RUNNING'
    && isIsoTimestamp(state.claimedAt)
    && isRecord(metadata)
    && Array.isArray(metadata.symbols)
    && metadata.symbols.length === SYMBOLS.length
    && metadata.symbols.every((symbol, index) => symbol === SYMBOLS[index])
    && Array.isArray(metadata.artifactHashes)
    && metadata.artifactHashes.length === SYMBOLS.length
    && metadata.artifactHashes.every(isSha256);

  const result = state.result;
  const validCompleted = state.protocolId === FROZEN_PROTOCOL_ID
    && state.status === 'COMPLETED'
    && isIsoTimestamp(state.completedAt)
    && isRecord(result)
    && result.protocolId === FROZEN_PROTOCOL_ID
    && result.status === 'COMPLETED'
    && result.finalHoldout === 'EXECUTED_ONCE'
    && result.protocolFrozen === true
    && result.selectionUsedHoldout === false
    && result.parameterChangesAfterFreeze === false
    && Array.isArray(result.stocks)
    && result.stocks.length === SYMBOLS.length
    && result.stocks.every(isCompletedStock)
    && isCompletedAggregate(result.aggregate, result.stocks)
    && isGateResult(result.gate, result.aggregate)
    && Array.isArray(result.limitations)
    && result.limitations.length > 0
    && result.limitations.every(item => typeof item === 'string' && item.trim().length > 0);

  if (!validRunning && !validCompleted) throw new Error('HOLDOUT_LEDGER_STATE_INVALID');
  return state;
}

function isCanonicalFrozenArtifact(artifact) {
  const selection = artifact?.modelSelection;
  const candidate = RESEARCH_CANDIDATES.find(item => item.id === selection?.chosenCandidateId);
  const trace = artifact?.selectionTrace;
  const finalWindow = Array.isArray(trace) ? trace.at(-1) : null;
  const costs = artifact?.costs;
  const totalBars = artifact?.totalBars;
  const expectedHoldoutStart = isNonNegativeInteger(totalBars)
    ? Math.floor(totalBars * (1 - FROZEN_HOLDOUT_FRACTION))
    : null;

  return artifact.protocolVersion === 1
    && artifact.candidateFamilyHash === stableHash(RESEARCH_CANDIDATES)
    && artifact.candidateFamilySize === RESEARCH_CANDIDATES.length
    && artifact.horizon === FROZEN_HORIZON
    && isRecord(costs)
    && Object.keys(costs).length === Object.keys(FROZEN_COSTS).length
    && Object.entries(FROZEN_COSTS).every(([key, value]) => costs[key] === value)
    && artifact.holdoutFraction === FROZEN_HOLDOUT_FRACTION
    && isNonNegativeInteger(totalBars)
    && totalBars > 0
    && expectedHoldoutStart > 0
    && expectedHoldoutStart < totalBars
    && artifact.holdoutStart === expectedHoldoutStart
    && artifact.researchBars === expectedHoldoutStart
    && artifact.holdoutBars === totalBars - expectedHoldoutStart
    && isSha256(artifact.historyFingerprint)
    && isRecord(selection)
    && selection.method === 'FINAL_RESEARCH_WALK_FORWARD_WINDOW'
    && Number.isInteger(selection.window)
    && Number.isInteger(selection.trainStart)
    && Number.isInteger(selection.trainEnd)
    && Number.isInteger(selection.testStart)
    && Number.isInteger(selection.testEnd)
    && candidate !== undefined
    && isRecord(selection.candidateParameters)
    && stableHash(selection.candidateParameters) === stableHash(candidate)
    && Array.isArray(trace)
    && trace.length > 0
    && isRecord(finalWindow)
    && finalWindow.window === selection.window
    && finalWindow.trainStart === selection.trainStart
    && finalWindow.trainEnd === selection.trainEnd
    && finalWindow.testStart === selection.testStart
    && finalWindow.testEnd === selection.testEnd
    && finalWindow.chosen === selection.chosenCandidateId;
}

function isStoredFrozenArtifact(artifact, stock, symbol) {
  if (!isRecord(artifact)
    || artifact.protocolId !== FROZEN_PROTOCOL_ID
    || artifact.symbol !== symbol
    || !isSha256(artifact.artifactHash)
    || !isSha256(artifact.historyFingerprint)
    || artifact.artifactHash !== stock.artifactHash
    || artifact.historyFingerprint !== stock.historyFingerprint
    || !isRecord(artifact.finalHoldout)
    || artifact.finalHoldout.status !== 'UNTOUCHED'
    || artifact.finalHoldout.evaluated !== false
    || artifact.finalHoldout.selectionUsed !== false
    || !isCanonicalFrozenArtifact(artifact)) return false;

  const { artifactHash, ...identity } = artifact;
  return stableHash(identity) === artifactHash;
}

async function verifyCompletedArtifacts(result) {
  const artifacts = await Promise.all(SYMBOLS.map(async symbol => (
    parseState(await getLedger(ARTIFACT_PREFIX + symbol))
  )));
  const valid = artifacts.every((artifact, index) => (
    isStoredFrozenArtifact(artifact, result.stocks[index], SYMBOLS[index])
  ));
  if (!valid) throw new Error('HOLDOUT_LEDGER_STATE_INVALID');
}

async function fetchFrozenRows(symbol) { return (await verifiedHistory(`${symbol}.NS`, { interval: '1d', days: 2500, minBars: 300 })).rows; }

async function prepare() {
  const artifacts = [];
  for (const symbol of SYMBOLS) {
    const rows = await fetchFrozenRows(symbol);
    const artifact = buildResearchArtifact(symbol, rows);
    const key = `${ARTIFACT_PREFIX}${symbol}`;
    const existingRaw = await getLedger(key);
    if (existingRaw) {
      const existing = parseState(existingRaw);
      if (!existing || existing.artifactHash !== artifact.artifactHash || existing.historyFingerprint !== artifact.historyFingerprint) {
        throw new Error(`FROZEN_ARTIFACT_CONFLICT:${symbol}`);
      }
      artifacts.push(existing);
      continue;
    }
    const stored = await import('../lib/holdout-ledger.js').then(({ claimExactlyOnce }) => claimExactlyOnce(key, artifact));
    if (!stored) {
      const after = parseState(await getLedger(key));
      if (!after || after.artifactHash !== artifact.artifactHash) throw new Error(`FROZEN_ARTIFACT_RACE:${symbol}`);
      artifacts.push(after);
    } else artifacts.push(artifact);
  }
  return { status: 'PREPARED', protocolId: FROZEN_PROTOCOL_ID, holdoutExecuted: false, artifacts: artifacts.map(a => ({ symbol: a.symbol, artifactHash: a.artifactHash, historyFingerprint: a.historyFingerprint, holdoutStart: a.holdoutStart, holdoutBars: a.holdoutBars, chosenCandidateId: a.modelSelection.chosenCandidateId })) };
}

function gate(result) {
  const checks = {
    winRate: result.winRate >= PROMOTION_CRITERIA.minOutOfSampleWinRatePct,
    profitFactor: result.profitFactor != null && result.profitFactor >= PROMOTION_CRITERIA.minOutOfSampleProfitFactor,
    expectancy: result.expectancyPct != null && result.expectancyPct > PROMOTION_CRITERIA.minOutOfSampleExpectancyPct,
    rollingStability: false,
    drawdown: result.maxDrawdownPct <= PROMOTION_CRITERIA.maxRollingWorstDrawdownPct,
    survivorship: false,
    marketImpact: false,
  };
  return { checks, classification: Object.values(checks).every(Boolean) ? 'PASS' : 'NO VALID SIGNAL', blockers: Object.entries(checks).filter(([,v]) => !v).map(([k]) => k) };
}

async function executeOnce() {
  const current = parseHoldoutRunState(await import('../lib/holdout-ledger.js').then(({ durableHoldoutState }) => durableHoldoutState(FROZEN_PROTOCOL_ID)));
  if (current?.status === 'COMPLETED') return { http: 409, body: { success: false, status: 'ALREADY_EXECUTED', protocolId: FROZEN_PROTOCOL_ID, result: current.result } };
  if (current?.status === 'RUNNING') return { http: 409, body: { success: false, status: 'ALREADY_RUNNING', protocolId: FROZEN_PROTOCOL_ID } };

  const artifacts = [];
  for (const symbol of SYMBOLS) {
    const raw = await getLedger(`${ARTIFACT_PREFIX}${symbol}`);
    const artifact = parseState(raw);
    if (!artifact || artifact.protocolId !== FROZEN_PROTOCOL_ID || artifact.finalHoldout?.evaluated) throw new Error(`FROZEN_ARTIFACT_MISSING_OR_OPENED:${symbol}`);
    const rows = await fetchFrozenRows(symbol);
    if (stableHash(rows) !== artifact.historyFingerprint) throw new Error(`HOLDOUT_DATA_CHANGED_AFTER_FREEZE:${symbol}`);
    artifacts.push({ artifact, rows });
  }

  const claimed = await claimHoldoutOnce(FROZEN_PROTOCOL_ID, { symbols: SYMBOLS, artifactHashes: artifacts.map(x => x.artifact.artifactHash) });
  if (!claimed) {
    const after = parseHoldoutRunState(await import('../lib/holdout-ledger.js').then(({ durableHoldoutState }) => durableHoldoutState(FROZEN_PROTOCOL_ID)));
    return { http: 409, body: { success: false, status: after?.status === 'COMPLETED' ? 'ALREADY_EXECUTED' : 'ALREADY_RUNNING', protocolId: FROZEN_PROTOCOL_ID, result: after?.result || null } };
  }

  const stockResults = artifacts.map(({ artifact, rows }) => {
    const result = runValidationBacktest(rows, { horizon: artifact.horizon, params: artifact.modelSelection.candidateParameters, costs: FROZEN_COSTS, start: artifact.holdoutStart, end: rows.length - 1 });
    const benchmark = buyAndHoldBenchmark(rows, { costs: FROZEN_COSTS, start: artifact.holdoutStart, end: rows.length - 1 });
    return { symbol: artifact.symbol, artifactHash: artifact.artifactHash, historyFingerprint: artifact.historyFingerprint, holdout: result, benchmark, comparison: { excessReturnPct: result.totalReturnPct - benchmark.totalReturnPct }, statisticalEvidence: { tStat: result.tStat, confidenceInterval95: result.approx95CI, pValue: null, significanceNote: 'No p-value is asserted; the stored t-statistic/CI are descriptive and promotion does not depend on an invented significance threshold.' } };
  });

  const totalTrades = stockResults.reduce((s,x) => s + (x.holdout.trades || 0), 0);
  const wins = stockResults.reduce((s,x) => s + (x.holdout.wins || 0), 0);
  const grossWins = stockResults.reduce((s,x) => s + (x.holdout.avgWinPct || 0) * (x.holdout.wins || 0), 0);
  const grossLoss = stockResults.reduce((s,x) => s + Math.abs((x.holdout.avgLossPct || 0) * (x.holdout.losses || 0)), 0);
  const weightedExpectancy = totalTrades ? stockResults.reduce((s,x) => s + (x.holdout.expectancyPct || 0) * (x.holdout.trades || 0), 0) / totalTrades : null;
  const aggregate = { stocks: stockResults.length, trades: totalTrades, winRate: totalTrades ? wins / totalTrades * 100 : null, expectancyPct: weightedExpectancy, profitFactor: grossLoss ? grossWins / grossLoss : null, maxDrawdownPct: Math.max(...stockResults.map(x => x.holdout.maxDrawdownPct || 0)), benchmarkMeanReturnPct: stockResults.reduce((s,x) => s + (x.benchmark.totalReturnPct || 0), 0) / stockResults.length, strategyMeanReturnPct: stockResults.reduce((s,x) => s + (x.holdout.totalReturnPct || 0), 0) / stockResults.length };
  const result = { protocolId: FROZEN_PROTOCOL_ID, status: 'COMPLETED', finalHoldout: 'EXECUTED_ONCE', protocolFrozen: true, selectionUsedHoldout: false, parameterChangesAfterFreeze: false, stocks: stockResults, aggregate, gate: gate(aggregate), limitations: ['Survivorship bias remains unresolved: no point-in-time historical universe snapshots are available.', 'Market-impact data remains unresolved: no order-size/order-book/impact evidence is available; only the frozen transaction/slippage costs are applied.'] };
  await completeHoldoutOnce(FROZEN_PROTOCOL_ID, result);
  return { http: 200, body: { success: true, ...result } };
}

export default async function handler(req, res) {
  Object.entries(headers).forEach(([k,v]) => res.setHeader(k,v));
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ success:false, error:'Method not allowed' });
  try {
    const mode = String(req.query?.mode || 'status').toLowerCase();
    if (mode === 'prepare' || mode === 'execute') return sendMarketDataUnavailable(res);
    if (mode === 'status') {
      const state = parseHoldoutRunState(await import('../lib/holdout-ledger.js').then(({ durableHoldoutState }) => durableHoldoutState(FROZEN_PROTOCOL_ID)));
      if (state?.status === 'COMPLETED') await verifyCompletedArtifacts(state.result);
      return res.status(200).json({ success:true, protocolId:FROZEN_PROTOCOL_ID, status:state?.status || 'NOT_STARTED', finalHoldoutOpened:Boolean(state && state.status === 'COMPLETED') });
    }
    if (mode === 'prepare') return res.status(200).json({ success:true, ...(await prepare()) });
    if (mode === 'execute') { const out = await executeOnce(); return res.status(out.http).json(out.body); }
    return res.status(400).json({ success:false, error:'mode must be status, prepare, or execute' });
  } catch (e) {
    const failure = classifyHoldoutLedgerFailure(e);
    console.error('[FINAL HOLDOUT]', failure.code, failure.diagnosticCode);
    return res.status(failure.httpStatus).json({
      success:false,
      status:'SAFE_BLOCK',
      code:failure.code,
      error:failure.message,
      retryable:failure.retryable,
    });
  }
}
