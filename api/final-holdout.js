import { sendMarketDataUnavailable } from '../lib/market-data-access-policy.js';
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
      if (!existing || existing.artifactH���q�^