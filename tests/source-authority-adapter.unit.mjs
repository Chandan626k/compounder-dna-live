import assert from 'node:assert/strict';
import {
  SOURCE_ACCESS_MODES,
  assessHistoricalValidity,
  createImmutableSourceSnapshot,
  hashSourceContent,
  isProductionAuthoritative,
  qualifySourceArtifact,
} from '../lib/source-authority-adapter.js';

const payloadA = { eventType: 'FINANCIAL_RESULT', period: '2026-06-30', issuer: 'TESTCO' };
const payloadB = { issuer: 'TESTCO', period: '2026-06-30', eventType: 'FINANCIAL_RESULT' };
assert.equal(hashSourceContent(payloadA), hashSourceContent(payloadB), 'source hashing must be deterministic for equivalent objects');

const fixture = createImmutableSourceSnapshot({
  source: 'NSE_FIXTURE',
  sourceDocumentId: 'fixture-001',
  publishedAt: '2026-07-31T17:36:11Z',
  retrievedAt: '2026-09-10T12:00:00Z',
  payload: payloadA,
  authorityClass: 'NSE_EXCHANGE_FILING',
  accessMode: SOURCE_ACCESS_MODES.DEVELOPMENT_FIXTURE,
});

assert.equal(isProductionAuthoritative(fixture), false, 'development fixtures must never be production-authoritative');
assert.equal(assessHistoricalValidity(fixture, '2026-08-01T00:00:00Z').status, 'VALID');
assert.equal(assessHistoricalValidity(fixture, '2026-07-01T00:00:00Z').status, 'INVALID');

const blocked = qualifySourceArtifact({
  snapshot: fixture,
  normalized: true,
  identityValid: true,
  semanticValid: true,
  provenanceVerified: true,
  freshnessEligible: true,
  horizonUsable: true,
  evaluationAsOf: '2026-08-01T00:00:00Z',
});
assert.equal(blocked.status, 'NOT_READY');
assert.equal(blocked.stage, 'SEMANTICALLY_VALIDATED');

const authoritative = createImmutableSourceSnapshot({
  source: 'NSE_PRODUCTION',
  sourceDocumentId: 'nse-doc-001',
  sourceVersion: 'v1',
  publishedAt: '2026-07-31T17:36:11Z',
  retrievedAt: '2026-09-10T12:00:00Z',
  payload: payloadA,
  authorityClass: 'NSE_EXCHANGE_FILING',
  accessMode: SOURCE_ACCESS_MODES.AUTHORITATIVE,
});
assert.equal(isProductionAuthoritative(authoritative), true);

const ready = qualifySourceArtifact({
  snapshot: authoritative,
  normalized: true,
  identityValid: true,
  semanticValid: true,
  provenanceVerified: true,
  freshnessEligible: true,
  horizonUsable: true,
  evaluationAsOf: '2026-08-01T00:00:00Z',
});
assert.deepEqual(ready, {
  stage: 'USABLE_FOR_HORIZON',
  status: 'READY',
  historicalValidity: 'VALID',
  reason: 'All supplied qualification gates passed.',
});

const future = qualifySourceArtifact({
  snapshot: authoritative,
  normalized: true,
  identityValid: true,
  semanticValid: true,
  provenanceVerified: true,
  freshnessEligible: true,
  horizonUsable: true,
  evaluationAsOf: '2026-07-01T00:00:00Z',
});
assert.equal(future.status, 'BLOCKED');
assert.equal(future.historicalValidity, 'INVALID');

console.log('source-authority-adapter.unit: PASS');
