import assert from 'node:assert/strict';
import { resolveHorizonFreshness, HORIZON_FRESHNESS_STATES } from '../lib/horizon-freshness.js';
import { buildMultiHorizonIntelligence } from '../lib/multi-horizon-intelligence.js';

const base = {
  ticker: 'TCS.NS', source: 'TEST', issuer: 'TCS', asOf: '2026-09-10T12:00:00Z',
  evidence: { verified: true }, evidenceReferences: ['ev_test'], historicalValidity: 'VALID',
};
const annual = {
  ...base, horizon: 'LONG_TERM', domain: 'financial', reportingPeriod: 'FY2026', periodType: 'ANNUAL', reportingDate: '2026-05-01',
};
const daily = {
  ...base, horizon: 'SWING', domain: 'technical', observationTimestamp: '2026-09-11T10:00:00Z',
  timeframe: '1d', exchange: 'NSE', session: 'CLOSED', calendarContext: 'EXCHANGE_CALENDAR',
};

assert.deepEqual(HORIZON_FRESHNESS_STATES, ['FRESH', 'STALE', 'EXPIRED', 'UNKNOWN']);
assert.equal(resolveHorizonFreshness({ ...annual, reportingCycleStatus: 'CURRENT' }).state, 'FRESH');
assert.equal(resolveHorizonFreshness({ ...annual, reportingCycleStatus: 'NO_LONGER_CURRENT' }).state, 'STALE');
assert.equal(resolveHorizonFreshness({ ...annual, reportingCycleStatus: 'SUPERSEDED', currentEvidenceAvailable: false }).state, 'EXPIRED');
assert.equal(resolveHorizonFreshness({ ...annual, reportingCycleStatus: 'UNKNOWN' }).state, 'UNKNOWN');
assert.equal(resolveHorizonFreshness({ ...annual, reportingDate: null }).state, 'UNKNOWN');

// Quarterly evidence may be a current cycle without destroying annual history; freshness is per evidence contract.
assert.equal(resolveHorizonFreshness({ ...annual, reportingPeriod: 'FY2026', periodType: 'ANNUAL', reportingCycleStatus: 'CURRENT' }).state, 'FRESH');
assert.equal(resolveHorizonFreshness({ ...annual, reportingPeriod: 'Q1FY2027', periodType: 'QUARTERLY', reportingDate: '2026-07-31', reportingCycleStatus: 'CURRENT' }).state, 'FRESH');
assert.equal(resolveHorizonFreshness({ ...annual, reportingCycleStatus: 'SUPERSEDED', currentEvidenceAvailable: true }).state, 'STALE');

assert.equal(resolveHorizonFreshness({ ...daily, observationTimestamp: '2026-09-04T10:00:00Z', asOf: '2026-09-05T10:00:00Z', observationBoundaryStatus: 'NON_TRADING_DAY_LATEST_COMPLETED' }).state, 'FRESH');
assert.equal(resolveHorizonFreshness({ ...daily, observationTimestamp: '2026-09-04T10:00:00Z', asOf: '2026-09-07T09:00:00Z', observationBoundaryStatus: 'NEXT_EXPECTED_NOT_COMPLETE' }).state, 'FRESH');
assert.equal(resolveHorizonFreshness({ ...daily, observationTimestamp: '2026-09-04T10:00:00Z', asOf: '2026-09-07T16:00:00Z', observationBoundaryStatus: 'MISSING_EXPECTED' }).state, 'STALE');
assert.equal(resolveHorizonFreshness({ ...daily, observationBoundaryStatus: 'SUPERSEDED', currentEvidenceAvailable: false }).state, 'EXPIRED');
assert.equal(resolveHorizonFreshness({ ...daily, exchange: null }).state, 'UNKNOWN');

// A fresh quote is irrelevant to daily technical freshness because it is not part of the evidence contract.
assert.equal(resolveHorizonFreshness({ ...daily, observationBoundaryStatus: 'MISSING_EXPECTED', currentQuote: { freshnessStatus: 'PROVIDER_QUOTE' } }).state, 'STALE');
assert.equal(resolveHorizonFreshness({ ...daily, observationBoundaryStatus: 'COMPLETED_EXPECTED', currentQuote: { freshnessStatus: 'STALE_DURING_REGULAR_SESSION' } }).state, 'FRESH');

assert.equal(resolveHorizonFreshness({ ...base, horizon: 'SHORT_TERM', domain: 'technical', observationTimestamp: '2026-09-10T10:00:00Z', expiryBoundaryStatus: 'ESTABLISHED', currentnessStatus: 'CURRENT' }).state, 'FRESH');
assert.equal(resolveHorizonFreshness({ ...base, horizon: 'SHORT_TERM', domain: 'technical', observationTimestamp: '2026-09-10T10:00:00Z', expiryBoundaryStatus: 'UNRESOLVED', currentnessStatus: 'CURRENT' }).state, 'UNKNOWN');
assert.equal(resolveHorizonFreshness({ ...base, horizon: 'SHORT_TERM', domain: 'technical', observationTimestamp: '2026-09-10T10:00:00Z', expiryBoundaryStatus: 'ESTABLISHED', currentnessStatus: 'NO_LONGER_CURRENT' }).state, 'STALE');
assert.equal(resolveHorizonFreshness({ ...base, horizon: 'SHORT_TERM', domain: 'technical', observationTimestamp: '2026-09-10T10:00:00Z', expiryBoundaryStatus: 'ESTABLISHED', currentnessStatus: 'SUPERSEDED', currentEvidenceAvailable: false }).state, 'EXPIRED');

assert.equal(resolveHorizonFreshness({ ...base, horizon: 'INTRADAY', domain: 'technical', timeframe: '1d', observationTimestamp: '2026-09-10T10:00:00Z', exchange: 'NSE', session: 'REGULAR', calendarContext: 'EXCHANGE_CALENDAR', observationBoundaryStatus: 'COMPLETED_EXPECTED' }).state, 'UNKNOWN');
assert.equal(resolveHorizonFreshness({ ...base, horizon: 'INTRADAY', domain: 'technical', timeframe: '5m', observationTimestamp: '2026-09-10T10:00:00Z', exchange: 'NSE', session: 'REGULAR', calendarContext: 'EXCHANGE_CALENDAR', observationBoundaryStatus: 'CURRENT_BAR' }).state, 'FRESH');
assert.equal(resolveHorizonFreshness({ ...base, horizon: 'INTRADAY', domain: 'technical', timeframe: '5m', observationTimestamp: '2026-09-10T10:00:00Z' }).state, 'UNKNOWN');

// Historical P0: future filing/bar/supersession cannot change a past evaluation.
assert.equal(resolveHorizonFreshness({ ...annual, asOf: '2026-06-01T00:00:00Z', reportingDate: '2026-05-01', reportingCycleStatus: 'CURRENT', nextExpectedCycle: '2026-09-30' }).state, 'FRESH');
assert.equal(resolveHorizonFreshness({ ...daily, asOf: '2026-09-05T00:00:00Z', observationTimestamp: '2026-09-06T00:00:00Z', observationBoundaryStatus: 'COMPLETED_EXPECTED' }).state, 'UNKNOWN');
assert.equal(resolveHorizonFreshness({ ...annual, asOf: '2026-06-01T00:00:00Z', reportingCycleStatus: 'SUPERSEDED', supersededAt: '2026-06-02T00:00:00Z', currentEvidenceAvailable: false }).state, 'UNKNOWN');

// Freshness never becomes directional or a production action.
for (const state of ['FRESH', 'STALE', 'EXPIRED', 'UNKNOWN']) {
  const result = resolveHorizonFreshness({ ...annual, reportingCycleStatus: state === 'FRESH' ? 'CURRENT' : state === 'STALE' ? 'HISTORICAL' : state === 'EXPIRED' ? 'SUPERSEDED' : 'UNKNOWN', currentEvidenceAvailable: false });
  assert.ok(!/BUY|SELL|BEARISH|BULLISH/i.test(JSON.stringify(result)));
}

// Cross-horizon isolation: a valid Swing contract does not inherit into other horizons.
const analysis = {
  stock: { symbol: 'TCS', yahooSymbol: 'TCS.NS', name: 'TCS' },
  technical: { status: 'VERIFIED', setup: 'BULLISH', breakoutLifecycle: { status: 'CONTINUATION', direction: 'UP', riskEvidence: { status: 'VERIFIED', riskReward: 2, targetEvidence: ['target'], invalidationLevel: 100 } }, provenance: { source: 'test', timeframe: '1d', observationTimestamp: '2026-09-10T10:00:00Z', retrievedAt: '2026-09-10T10:01:00Z' } },
  provenance: { marketData: { asOf: '2026-09-10T10:00:00Z' }, technical: { source: 'test', timeframe: '1d', observationTimestamp: '2026-09-10T10:00:00Z', retrievedAt: '2026-09-10T10:01:00Z' }, annualFundamentals: { asOf: '2026-05-01', period: 'annual / 12M' } },
};
const multi = buildMultiHorizonIntelligence(analysis);
assert.equal(multi.swing.freshness, 'UNKNOWN');
assert.equal(multi.swing.state, 'UNKNOWN');
assert.equal(multi.longTerm.freshness, 'UNKNOWN');
assert.equal(multi.longTerm.state, 'INSUFFICIENT_EVIDENCE');
assert.equal(multi.horizonFreshness.longTerm.state, 'UNKNOWN');
assert.equal(multi.horizonFreshness.swing.state, 'UNKNOWN');
assert.equal(multi.horizonFreshness.shortTerm.state, 'UNKNOWN');
assert.equal(multi.horizonFreshness.intraday.state, 'UNKNOWN');

console.log('horizon-freshness.unit.mjs: all tests passed');
