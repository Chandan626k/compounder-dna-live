export const PROVIDER_CONTRACT_VERSION = '1.0.0';

export const REPORTING_EVENT_PROVIDER_CONTRACT = Object.freeze({
  version: PROVIDER_CONTRACT_VERSION,
  methods: Object.freeze(['fetchReportingArtifacts', 'normalizeReportingArtifact']),
  output: 'canonical reporting events and immutable source snapshots',
});

export const CALENDAR_SESSION_PROVIDER_CONTRACT = Object.freeze({
  version: PROVIDER_CONTRACT_VERSION,
  methods: Object.freeze(['fetchCalendarArtifacts', 'normalizeCalendarArtifact']),
  output: 'canonical exchange calendar/session records and immutable source snapshots',
});

function assertFunction(provider, method) {
  if (typeof provider?.[method] !== 'function') throw new Error(`SOURCE_PROVIDER_METHOD_MISSING:${method}`);
}

export function assertReportingEventProvider(provider) {
  for (const method of REPORTING_EVENT_PROVIDER_CONTRACT.methods) assertFunction(provider, method);
  return true;
}

export function assertCalendarSessionProvider(provider) {
  for (const method of CALENDAR_SESSION_PROVIDER_CONTRACT.methods) assertFunction(provider, method);
  return true;
}

export function assertSourceProviderPair(provider) {
  assertReportingEventProvider(provider);
  assertCalendarSessionProvider(provider);
  return true;
}
