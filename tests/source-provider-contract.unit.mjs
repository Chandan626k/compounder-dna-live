import assert from 'node:assert/strict';
import {
  assertCalendarSessionProvider,
  assertReportingEventProvider,
  assertSourceProviderPair,
  assertTransportProvider,
  PROVIDER_CONTRACT_VERSION,
} from '../lib/source-provider-contract.js';

const provider = {
  request() {},
  fetchReportingArtifacts() {},
  normalizeReportingArtifact() {},
  fetchCalendarArtifacts() {},
  normalizeCalendarArtifact() {},
};

assert.equal(PROVIDER_CONTRACT_VERSION, '1.1.0');
assert.equal(assertTransportProvider(provider), true);
assert.equal(assertReportingEventProvider(provider), true);
assert.equal(assertCalendarSessionProvider(provider), true);
assert.equal(assertSourceProviderPair(provider), true);
assert.throws(() => assertTransportProvider({}), /SOURCE_PROVIDER_METHOD_MISSING:request/);
assert.throws(() => assertReportingEventProvider({}), /SOURCE_PROVIDER_METHOD_MISSING:fetchReportingArtifacts/);
assert.throws(() => assertCalendarSessionProvider({ fetchCalendarArtifacts() {} }), /SOURCE_PROVIDER_METHOD_MISSING:normalizeCalendarArtifact/);

console.log('source-provider-contract.unit: PASS');
