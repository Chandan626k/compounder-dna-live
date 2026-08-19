import { verifiedHistory } from '../lib/market-data-provider.js';
import { runValidationBacktest } from '../lib/strategy-validation.js';
import { buyAndHoldBenchmark } from '../lib/predictive-research.js';
import { buildResearchArtifact, FROZEN_PROTOCOL_ID, FROZEN_COSTS, stableHash } from '../lib/final-holdout-artifact-v2.js';
import { getLedger, setLedger, claimHoldoutOnce, completeHoldoutOnce } from '../lib/holdout-ledger.js';
import { PROMOTION_CRITERIA } from '../lib/validation-gate.js';

const SYMBOLS = Object.freeze(['TCS', 'ICICIBANK', 'HDFCBANK', 'INFY']);
const ARTIFACT_PREFIX = `stocksamjho:holdout:${FROZEN_PROTOCOL_ID}:artifact:`;
const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,OPTIONS', 'Cache-Control': 'no-store' };

function parseState(raw) { try { return raw ? JSON.parse(raw) : null; } catch { return null; } }
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
  const current = parseState(await import('../lib/holdout-ledger.js').then(({ durableHoldoutState }) => durableHoldoutState(FROZEN_PROTOCOL_ID)));
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
    const after = parseState(await import('../lib/holdout-ledger.js').then(({ durableHoldoutState }) => durableHoldoutState(FROZEN_PROTOCOL_ID)));
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
    if (mode === 'status') {
      const state = parseState(await import('../lib/holdout-ledger.js').then(({ durableHoldoutState }) => durableHoldoutState(FROZEN_PROTOCOL_ID)));
      return res.status(200).json({ success:true, protocolId:FROZEN_PROTOCOL_ID, status:state?.status || 'NOT_STARTED', finalHoldoutOpened:Boolean(state && state.status === 'COMPLETED') });
    }
    if (mode === 'prepare') return res.status(200).json({ success:true, ...(await prepare()) });
    if (mode === 'execute') { const out = await executeOnce(); return res.status(out.http).json(out.body); }
    return res.status(400).json({ success:false, error:'mode must be status, prepare, or execute' });
  } catch (e) {
    const msg = String(e?.message || e);
    console.error('[FINAL HOLDOUT]', msg);
    const status = /HOLDOUT_LEDGER_NOT_CONFIGURED|HOLDOUT_LEDGER_HTTP/.test(msg) ? 503 : 409;
    return res.status(status).json({ success:false, status:'SAFE_BLOCK', error:msg });
  }
}
