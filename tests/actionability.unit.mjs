import assert from 'node:assert/strict';
import { buildActionability } from '../lib/actionability.js';

const analysis = {
  stock: { symbol: 'ICICIBANK', price: 1412, dataLimited: true },
  dataLimited: true,
  dataQuality: {
    confidence: 65,
    warnings: ['Critical data unavailable'],
    sectorFramework: { available: 2, total: 8 },
  },
  score: {
    financialStrengthCoverage: 'CURRENT_FIELDS_ONLY',
    sectorFramework: { available: 2, total: 8 },
    overall: 82,
  },
  valuation: {
    verdict: 'UNDERVALUED',
    fairValue: 2135.62,
    marginOfSafety: 33.88,
    conservativeFairValue: 1829.20,
    baseFairValue: 2135.62,
    optimisticFairValue: 2339.90,
  },
  decision: { blockers: ['Critical data missing: Debt/Equity'] },
};

const trading = {
  technical: {
    last: 1412,
    e20: 1425.36,
    e50: 1399.35,
    e200: 1358.91,
    rsi: 46.66,
    relativeVolume: 0.759,
    macd: { histogram: -6.848 },
    support: 1401,
    resistance: 1466.4,
    atr: 21.93,
    vwap: 1434.07,
    trend: 'UPTREND',
  },
};

const out = buildActionability(analysis, trading);
assert.equal(out.overallStance, 'WAIT — EVIDENCE FIRST');
assert.equal(out.horizons.longTerm.action, 'WATCH / WAIT FOR EVIDENCE');
assert.equal(out.horizons.swing.action, 'WAIT — DATA / VALIDATION');
assert.equal(out.horizons.shortTerm.action, 'WAIT / NO FRESH LONG');
assert.equal(out.sectorCoverage, 25);
assert.equal(out.technical.triggers.reclaim, 1425.36);
assert.equal(out.technical.triggers.breakdown, 1401);
assert.ok(out.technical.triggers.stop < 1401);
assert.equal(out.productionTradingEnabled, false);

const readyAnalysis = {
  ...analysis,
  dataLimited: false,
  stock: { ...analysis.stock, dataLimited: false },
  valuation: { ...analysis.valuation, verdict: 'FAIRLY VALUED' },
  decision: { action: 'BUY / ACCUMULATE', blockers: [] }, // synthetic fixture only
  sectorFramework: { classificationStatus: 'INDEPENDENTLY_VERIFIED' }, // synthetic fixture only
  dataQuality: { confidence: 82, warnings: [], sectorFramework: { available: 7, total: 8, classificationStatus: 'INDEPENDENTLY_VERIFIED' } },
  score: { financialStrengthCoverage: 'FULL', sectorFramework: { available: 7, total: 8, classificationStatus: 'INDEPENDENTLY_VERIFIED' }, overall: 84 },
};
const readyTrading = {
  technical: {
    ...trading.technical,
    last: 1435,
    rsi: 60,
    relativeVolume: 1.35,
    macd: { histogram: 4.2 },
  },
};
const ready = buildActionability(readyAnalysis, readyTrading);
assert.equal(ready.horizons.longTerm.action, 'STAGED ACCUMULATION CANDIDATE');
assert.equal(ready.horizons.swing.action, 'CONDITIONAL BUY SETUP');

// Long-term actionability must not upgrade the primary engine's explicit WAIT.
// A very expensive valuation is a concrete case where the primary decision
// returns WAIT / WATCH even when the synthetic evidence-quality fields are high.
const primaryWaitAnalysis = {
  ...readyAnalysis,
  valuation: { ...readyAnalysis.valuation, verdict: 'VERY EXPENSIVE' },
  decision: { action: 'WAIT / WATCH', blockers: ['Valuation is very expensive.'] },
};
const primaryWait = buildActionability(primaryWaitAnalysis, readyTrading);
assert.equal(primaryWait.horizons.longTerm.action, 'WATCH / WAIT FOR EVIDENCE');
assert.match(primaryWait.horizons.longTerm.reason, /Primary investment decision is WAIT \/ WATCH/);

// Missing primary decision authority is not permission to create a long-term candidate.
const missingPrimaryDecision = buildActionability({
  ...readyAnalysis,
  decision: { blockers: [] },
}, readyTrading);
assert.equal(missingPrimaryDecision.horizons.longTerm.action, 'WATCH / WAIT FOR EVIDENCE');

// The existing positive primary decision remains eligible for the existing
// long-term actionability path; no score or threshold math is changed.
const weaknessHold = buildActionability({
  ...readyAnalysis,
  decision: { action: 'BUY ON WEAKNESS / HOLD', blockers: [] },
}, readyTrading);
assert.equal(weaknessHold.horizons.longTerm.action, 'STAGED ACCUMULATION CANDIDATE');

// A high heuristic confidence and strong sector KPI coverage cannot override
// provider-only sector classification at the separate actionability boundary.
const supplementalSectorAnalysis = {
  ...readyAnalysis,
  sectorFramework: { classificationStatus: 'SUPPLEMENTAL_ONLY' },
  dataQuality: {
    ...readyAnalysis.dataQuality,
    sectorFramework: { ...readyAnalysis.dataQuality.sectorFramework, classificationStatus: 'SUPPLEMENTAL_ONLY' },
  },
  score: {
    ...readyAnalysis.score,
    sectorFramework: { ...readyAnalysis.score.sectorFramework, classificationStatus: 'SUPPLEMENTAL_ONLY' },
  },
  decision: { action: 'DATA INSUFFICIENT', blockers: ['Sector classification is not independently verified'] },
};
const supplementalSector = buildActionability(supplementalSectorAnalysis, readyTrading);
assert.equal(supplementalSector.horizons.longTerm.action, 'WATCH / WAIT FOR EVIDENCE');
assert.equal(supplementalSector.horizons.swing.action, 'WAIT — DATA / VALIDATION');
assert.equal(supplementalSector.overallStance, 'WAIT — EVIDENCE FIRST');

// Missing classification provenance also fails closed rather than inheriting
// an apparently high confidence score from another analysis path.
const unknownSectorAnalysis = {
  ...readyAnalysis,
  sectorFramework: undefined,
  dataQuality: { ...readyAnalysis.dataQuality, sectorFramework: { available: 7, total: 8 } },
  score: { ...readyAnalysis.score, sectorFramework: { available: 7, total: 8 } },
};
const unknownSector = buildActionability(unknownSectorAnalysis, readyTrading);
assert.equal(unknownSector.horizons.longTerm.action, 'WATCH / WAIT FOR EVIDENCE');
assert.equal(unknownSector.horizons.swing.action, 'WAIT — DATA / VALIDATION');

const technicalOnlyAnalysis = {
  ...readyAnalysis,
  fundamentals: undefined,
  valuation: { verdict: 'FAIRLY VALUED', fairValue: null },
};
const technicalOnly = buildActionability(technicalOnlyAnalysis, readyTrading);
assert.equal(technicalOnly.horizons.swing.action, 'CONDITIONAL BUY SETUP', 'missing fundamentals do not automatically block Swing');
assert.equal(technicalOnly.horizons.shortTerm.action, 'WAIT', 'missing fundamentals do not automatically block Short-Term');

const evidenceLimited = buildActionability({
  ...technicalOnlyAnalysis,
  dataLimited: true,
  stock: { ...technicalOnlyAnalysis.stock, dataLimited: true },
}, readyTrading);
assert.equal(evidenceLimited.horizons.longTerm.action, 'WATCH / WAIT FOR EVIDENCE', 'Long-Term remains evidence-limited');

const actionabilitySource = await import('node:fs/promises');
const actionabilitySourceText = await actionabilitySource.readFile(new URL('../api/actionability.js', import.meta.url), 'utf8');
assert.equal((actionabilitySourceText.match(/fetchStatementEvidence/g) || []).length, 0, 'actionability must not fetch statement evidence independently');
assert.equal((actionabilitySourceText.match(/mergeStatementEvidence/g) || []).length, 0, 'actionability must not merge statement evidence independently');
assert.match(actionabilitySourceText, /analysis\.fundamentals\?\.statementEvidence/);


 // Public provider-backed API routes must fail closed before invoking providers.
const policyCode = 'AUTHORIZED_MARKET_DATA_SOURCE_NOT_CONFIGURED';
const routeCases = [
  ['actionability', (await import('../api/actionability.js')).default, { method: 'GET', query: { symbol: 'TCS.NS' }, headers: {} }],
  ['analyze GET', (await import('../api/analyze.js')).default, { method: 'GET', query: { symbol: 'TCS.NS' }, headers: {} }],
  ['analyze POST', (await import('../api/analyze.js')).default, { method: 'POST', body: { symbol: 'TCS.NS' }, query: {}, headers: {} }],
  ['analyze-gated', (await import('../api/analyze-gated.js')).default, { method: 'GET', query: { symbol: 'TCS.NS' }, headers: {} }],
  ['backtest', (await import('../api/backtest.js')).default, { method: 'GET', query: { symbol: 'TCS.NS' }, headers: {} }],
  ['data-foundation', (await import('../api/data-foundation.js')).default, { method: 'GET', query: { symbol: 'TCS.NS' }, headers: {} }],
  ['data', (await import('../api/data.js')).default, { method: 'POST', body: { type: 'quote', symbol: 'TCS.NS' }, query: {}, headers: {} }],
  ['investment-readiness', (await import('../api/investment-readiness.js')).default, { method: 'GET', query: { symbol: 'TCS.NS' }, headers: {} }],
  ['scan GET', (await import('../api/scan.js')).default, { method: 'GET', query: { symbols: 'TCS.NS' }, headers: {} }],
  ['scan POST', (await import('../api/scan.js')).default, { method: 'POST', body: { symbols: ['TCS.NS'] }, query: {}, headers: {} }],
  ['trading', (await import('../api/trading.js')).default, { method: 'GET', query: { symbol: 'TCS.NS' }, headers: {} }],
  ['validate-strategy', (await import('../api/validate-strategy.js')).default, { method: 'GET', query: { symbol: 'TCS.NS' }, headers: {} }],
  ['holdout prepare', (await import('../api/final-holdout.js')).default, { method: 'GET', query: { mode: 'prepare' }, headers: {} }],
  ['holdout execute', (await import('../api/final-holdout.js')).default, { method: 'GET', query: { mode: 'execute' }, headers: {} }],
];
for (const [name, handler, req] of routeCases) {
  const res = {
    statusCode: null, headers: {}, body: null,
    setHeader(key, value) { this.headers[key] = value; return this; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    end() { this.ended = true; return this; },
  };
  await handler(req, res);
  assert.equal(res.statusCode, 503, name + ' must return HTTP 503');
  assert.equal(res.body?.code, policyCode, name + ' must return the shared access-policy code');
  assert.equal(res.body?.policy?.providerRequestMade, false, name + ' must not call a provider');
}
const finalHoldoutSource = await (await import('node:fs/promises')).readFile(new URL('../api/final-holdout.js', import.meta.url), 'utf8');
assert.match(finalHoldoutSource, /if \(mode === 'status'\)/, 'read-only final-holdout status mode must remain available');

// A read-only status lookup must report ledger network failure as unavailable, not conflict.
const holdoutHandler = (await import('../api/final-holdout.js')).default;
const previousFetch = globalThis.fetch;
const previousUpstashUrl = process.env.UPSTASH_REDIS_REST_URL;
const previousUpstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;
process.env.UPSTASH_REDIS_REST_URL = 'https://ledger.invalid';
process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';
globalThis.fetch = async () => { throw new TypeError('fetch failed'); };
const holdoutStatusResponse = {
  statusCode: null, body: null,
  setHeader() { return this; },
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
};
const originalConsoleError = console.error;
const holdoutLogs = [];
console.error = (...args) => holdoutLogs.push(args);
try {
  await holdoutHandler({ method: 'GET', query: { mode: 'status' }, headers: {} }, holdoutStatusResponse);
} finally {
  console.error = originalConsoleError;
}
assert.deepEqual(holdoutLogs, [['[FINAL HOLDOUT]', 'HOLDOUT_LEDGER_UNAVAILABLE', 'NETWORK_FAILURE']], 'only safe diagnostic categories are logged');
assert.doesNotMatch(JSON.stringify(holdoutLogs), /fetch failed|ledger\.invalid|test-token/i, 'raw error details and credentials must not be logged');
assert.equal(holdoutStatusResponse.statusCode, 503, 'ledger network failure must return HTTP 503');
assert.equal(holdoutStatusResponse.body?.code, 'HOLDOUT_LEDGER_UNAVAILABLE');
assert.equal(holdoutStatusResponse.body?.retryable, true);
assert.match(holdoutStatusResponse.body?.error || '', /could not be verified/i);
assert.doesNotMatch(holdoutStatusResponse.body?.error || '', /fetch failed/i, 'raw network errors must not leak to clients');
globalThis.fetch = previousFetch;
if (previousUpstashUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
else process.env.UPSTASH_REDIS_REST_URL = previousUpstashUrl;
if (previousUpstashToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
else process.env.UPSTASH_REDIS_REST_TOKEN = previousUpstashToken;


// Corrupt or structurally invalid durable state must never be reported as NOT_STARTED.
const previousFetchForInvalidState = globalThis.fetch;
const previousUrlForInvalidState = process.env.UPSTASH_REDIS_REST_URL;
const previousTokenForInvalidState = process.env.UPSTASH_REDIS_REST_TOKEN;
process.env.UPSTASH_REDIS_REST_URL = 'https://ledger.invalid';
process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';
const { FROZEN_PROTOCOL_ID: invalidStateProtocolId } = await import('../lib/final-holdout-artifact-v2.js');
const invalidLedgerPayloads = [
  { result: '{invalid-json' },
  { result: 'null' },
  { result: '[]' },
  { result: '{}' },
  { result: JSON.stringify({ protocolId: 'OTHER_PROTOCOL', status: 'COMPLETED', result: {} }) },
  { result: JSON.stringify({ protocolId: invalidStateProtocolId, status: 'RUNNING', claimedAt: '2026-11-18T00:00:00.000Z', metadata: {} }) },
  { result: JSON.stringify({ protocolId: invalidStateProtocolId, status: 'COMPLETED', completedAt: '2026-11-18T00:00:00.000Z', result: {} }) },
  {},
];
for (const payload of invalidLedgerPayloads) {
  globalThis.fetch = async () => ({ ok: true, json: async () => payload });
  const invalidStateResponse = {
    statusCode: null, body: null,
    setHeader() { return this; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
  const invalidStateLogs = [];
  const originalConsoleErrorForInvalidState = console.error;
  console.error = (...args) => invalidStateLogs.push(args);
  try {
    await holdoutHandler({ method: 'GET', query: { mode: 'status' }, headers: {} }, invalidStateResponse);
  } finally {
    console.error = originalConsoleErrorForInvalidState;
  }
  assert.equal(invalidStateResponse.statusCode, 409, 'corrupt durable state must be a safe conflict, not NOT_STARTED');
  assert.equal(invalidStateResponse.body?.code, 'HOLDOUT_SAFE_BLOCK');
  assert.equal(invalidStateResponse.body?.retryable, false);
  assert.equal(invalidStateResponse.body?.error, 'Holdout ledger state is invalid; read-only state could not be verified.');
  assert.deepEqual(invalidStateLogs, [['[FINAL HOLDOUT]', 'HOLDOUT_SAFE_BLOCK', 'LEDGER_STATE_INVALID']]);
  assert.doesNotMatch(invalidStateResponse.body?.error || '', /invalid-json|OTHER_PROTOCOL|ledger\.invalid|test-token/i);
  assert.doesNotMatch(JSON.stringify(invalidStateLogs), /invalid-json|OTHER_PROTOCOL|ledger\.invalid|test-token/i);
}
globalThis.fetch = async () => ({ ok: true, json: async () => ({ result: null }) });
const notStartedResponse = {
  statusCode: null, body: null,
  setHeader() { return this; },
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
};
await holdoutHandler({ method: 'GET', query: { mode: 'status' }, headers: {} }, notStartedResponse);
assert.equal(notStartedResponse.statusCode, 200, 'a genuinely absent ledger key remains NOT_STARTED');
assert.equal(notStartedResponse.body?.status, 'NOT_STARTED');

const holdoutSymbolsForState = ['TCS', 'ICICIBANK', 'HDFCBANK', 'INFY'];
const validRunningState = {
  protocolId: invalidStateProtocolId,
  status: 'RUNNING',
  claimedAt: '2026-11-18T00:00:00.000Z',
  metadata: {
    symbols: holdoutSymbolsForState,
    artifactHashes: holdoutSymbolsForState.map(symbol => 'artifact-' + symbol),
  },
};
globalThis.fetch = async () => ({ ok: true, json: async () => ({ result: JSON.stringify(validRunningState) }) });
const validRunningResponse = {
  statusCode: null, body: null,
  setHeader() { return this; },
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
};
await holdoutHandler({ method: 'GET', query: { mode: 'status' }, headers: {} }, validRunningResponse);
assert.equal(validRunningResponse.statusCode, 200, 'a structurally valid RUNNING state remains readable');
assert.equal(validRunningResponse.body?.status, 'RUNNING');
assert.equal(validRunningResponse.body?.finalHoldoutOpened, false);

const validCompletedResult = {
  protocolId: invalidStateProtocolId,
  status: 'COMPLETED',
  finalHoldout: 'EXECUTED_ONCE',
  protocolFrozen: true,
  selectionUsedHoldout: false,
  parameterChangesAfterFreeze: false,
  stocks: holdoutSymbolsForState.map(symbol => ({
    symbol,
    artifactHash: 'artifact-' + symbol,
    historyFingerprint: 'fingerprint-' + symbol,
    holdout: {},
    benchmark: {},
    comparison: {},
    statisticalEvidence: {},
  })),
  aggregate: {},
  gate: {},
  limitations: [],
};
const validCompletedState = {
  protocolId: invalidStateProtocolId,
  status: 'COMPLETED',
  completedAt: '2026-11-18T00:00:00.000Z',
  result: validCompletedResult,
};
globalThis.fetch = async () => ({ ok: true, json: async () => ({ result: JSON.stringify(validCompletedState) }) });
const validCompletedResponse = {
  statusCode: null, body: null,
  setHeader() { return this; },
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
};
await holdoutHandler({ method: 'GET', query: { mode: 'status' }, headers: {} }, validCompletedResponse);
assert.equal(validCompletedResponse.statusCode, 200, 'a structurally valid COMPLETED state remains readable');
assert.equal(validCompletedResponse.body?.status, 'COMPLETED');
assert.equal(validCompletedResponse.body?.finalHoldoutOpened, true);

globalThis.fetch = previousFetchForInvalidState;
if (previousUrlForInvalidState === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
else process.env.UPSTASH_REDIS_REST_URL = previousUrlForInvalidState;
if (previousTokenForInvalidState === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
else process.env.UPSTASH_REDIS_REST_TOKEN = previousTokenForInvalidState;


 // Holdout ledger HTTP failures must distinguish transient outages from permanent rejections.
const { classifyHoldoutLedgerFailure } = await import('../lib/holdout-ledger.js');
const invalidLedgerStateFailure = classifyHoldoutLedgerFailure(new Error('HOLDOUT_LEDGER_STATE_INVALID'));
assert.equal(invalidLedgerStateFailure.httpStatus, 409);
assert.equal(invalidLedgerStateFailure.code, 'HOLDOUT_SAFE_BLOCK');
assert.equal(invalidLedgerStateFailure.retryable, false);
assert.equal(invalidLedgerStateFailure.diagnosticCode, 'LEDGER_STATE_INVALID');
for (const status of [400, 401, 403, 404, 409, 501, 505]) {
  const failure = classifyHoldoutLedgerFailure(new Error(`HOLDOUT_LEDGER_HTTP_${status}`));
  assert.equal(failure.httpStatus, 503, `upstream HTTP ${status} must keep state verification unavailable`);
  assert.equal(failure.code, 'HOLDOUT_LEDGER_REJECTED');
  assert.equal(failure.retryable, false, `upstream HTTP ${status} must not trigger blind retries`);
  assert.doesNotMatch(failure.message, /HOLDOUT_LEDGER_HTTP_/);
}
for (const status of [408, 425, 429, 500, 502, 503, 504, 599]) {
  const failure = classifyHoldoutLedgerFailure(new Error(`HOLDOUT_LEDGER_HTTP_${status}`));
  assert.equal(failure.httpStatus, 503);
  assert.equal(failure.code, 'HOLDOUT_LEDGER_UNAVAILABLE');
  assert.equal(failure.retryable, true, `upstream HTTP ${status} is transient`);
}
const unconfiguredLedger = classifyHoldoutLedgerFailure(new Error('HOLDOUT_LEDGER_NOT_CONFIGURED'));
assert.equal(unconfiguredLedger.httpStatus, 503);
assert.equal(unconfiguredLedger.code, 'HOLDOUT_LEDGER_UNAVAILABLE');
assert.equal(unconfiguredLedger.retryable, false, 'configuration errors require intervention, not retries');
const frozenArtifactConflict = classifyHoldoutLedgerFailure(new Error('FROZEN_ARTIFACT_CONFLICT:TCS'));
assert.equal(frozenArtifactConflict.httpStatus, 409);
assert.equal(frozenArtifactConflict.code, 'HOLDOUT_SAFE_BLOCK');
assert.equal(frozenArtifactConflict.retryable, false);
const networkFailure = classifyHoldoutLedgerFailure(new TypeError('fetch failed'));
assert.equal(networkFailure.httpStatus, 503);
assert.equal(networkFailure.code, 'HOLDOUT_LEDGER_UNAVAILABLE');
assert.equal(networkFailure.retryable, true);
assert.equal(networkFailure.diagnosticCode, 'NETWORK_FAILURE');

const dnsCause = Object.assign(new Error('getaddrinfo ENOTFOUND private-host.example'), { code: 'ENOTFOUND' });
const dnsFailure = classifyHoldoutLedgerFailure(new TypeError('fetch failed', { cause: dnsCause }));
assert.equal(dnsFailure.diagnosticCode, 'NETWORK_DNS_FAILURE');
const refusedCause = Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' });
const refusedFailure = classifyHoldoutLedgerFailure(new TypeError('fetch failed', { cause: refusedCause }));
assert.equal(refusedFailure.diagnosticCode, 'NETWORK_CONNECTION_REFUSED');
const resetCause = Object.assign(new Error('socket reset'), { code: 'ECONNRESET' });
const resetFailure = classifyHoldoutLedgerFailure(new TypeError('fetch failed', { cause: resetCause }));
assert.equal(resetFailure.diagnosticCode, 'NETWORK_CONNECTION_RESET');
const timeoutFailureInput = new Error('The operation was aborted due to timeout');
timeoutFailureInput.name = 'TimeoutError';
const timeoutFailure = classifyHoldoutLedgerFailure(timeoutFailureInput);
assert.equal(timeoutFailure.diagnosticCode, 'NETWORK_TIMEOUT');
assert.equal(classifyHoldoutLedgerFailure(new Error('HOLDOUT_LEDGER_HTTP_503')).diagnosticCode, 'UPSTREAM_HTTP_503');
assert.equal(unconfiguredLedger.diagnosticCode, 'LEDGER_CONFIG_MISSING');
assert.equal(frozenArtifactConflict.diagnosticCode, 'FROZEN_ARTIFACT_CONFLICT');
assert.equal(classifyHoldoutLedgerFailure(new Error('unexpected ledger exception')).diagnosticCode, 'UNCLASSIFIED_LEDGER_ERROR');

console.log('actionability unit tests passed');
