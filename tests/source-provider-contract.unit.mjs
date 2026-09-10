import assert from 'node:assert/strict';
import {
  assertCalendarSessionProvider,
  assertReportingEventProvider,
  assertSourceProviderPair,
  PROVIDER_CONTRACT_VERSION,
} from '../lib/source-provider-contract.js';

const provider = {
  fetchReportingArtifacts() {},
  normalizeReportingArtifact() {},
  fetchCalendarArtifacts() {},
  normalizeCalendarArtifact() {},
};

assert.equal(PROVIDER_CONTRACT_VERSION, '1.0.0');
assert.equal(assertReportingEventProvider(provider), true);
assert.equal(assertCalendarSessionProvider(provider), true);
assert.equal(assertSourceProviderPair(provider), true);
assert.throws(() => assertReportingEventProvider({}), /SOURCE_PROVIDER_METHOD_MISSING:fetchReportingArtifacts/);
assert.throws(() => assertCalendarSessionProvider({ fetchCalendarArtifacts() {} }), /SOURCE_PROVIDER_METHOD_MISSING:normalizeCalendarArtifact/);

console.log('source-provider-contract.unit: PASS');
