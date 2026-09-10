const STATES = Object.freeze(['FRESH', 'STALE', 'EXPIRED', 'UNKNOWN']);
const HORIZONS = Object.freeze(['LONG_TERM', 'SWING', 'SHORT_TERM', 'INTRADAY']);

const asIso = (value) => {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const validEvidence = (evidence) => evidence?.verified === true || evidence?.status === 'VERIFIED' || evidence?.validationState === 'VERIFIED';
const refs = (value) => Array.isArray(value) ? value.filter(Boolean) : [];
const hasAnyFutureInput = (cutoff, values) => {
  const cutoffMs = new Date(cutoff).getTime();
  if (!Number.isFinite(cutoffMs)) return false;
  return values.some((value) => {
    const ms = value ? new Date(value).getTime() : NaN;
    return Number.isFinite(ms) && ms > cutoffMs;
  });
};

function baseResult(input, state, rationale, limitations = []) {
  const evaluationAsOf = asIso(input.evaluationAsOf || input.asOf);
  const observationTimestamp = asIso(input.observationTimestamp);
  const retrievedAt = asIso(input.retrievedAt);
  const historicalValidity = input.historicalValidity ?? (evaluationAsOf ? 'UNASSESSED' : 'UNKNOWN');
  return {
    horizon: input.horizon,
    domain: input.domain || null,
    state,
    source: input.source || null,
    issuer: input.issuer || null,
    ticker: input.ticker || null,
    asOf: evaluationAsOf,
    observationTimestamp,
    retrievedAt,
    reportingPeriod: input.reportingPeriod || null,
    periodType: input.periodType || null,
    timeframe: input.timeframe || null,
    exchange: input.exchange || null,
    session: input.session || null,
    calendarContext: input.calendarContext || null,
    evidenceReferences: refs(input.evidenceReferences),
    status: state,
    rationale,
    limitations,
    historicalValidity,
    currentUsability: state === 'FRESH',
  };
}

export function resolveHorizonFreshness(input = {}) {
  const horizon = String(input.horizon || '').trim().toUpperCase();
  if (!HORIZONS.includes(horizon)) return baseResult(input, 'UNKNOWN', 'Horizon is not supported by the freshness contract.', ['Unsupported horizon.']);

  const limitations = [];
  if (!validEvidence(input.evidence)) limitations.push('Evidence is not explicitly verified.');
  if (!input.observationTimestamp && horizon !== 'LONG_TERM') limitations.push('Observation timestamp is unavailable.');
  if (!refs(input.evidenceReferences).length) limitations.push('Evidence references are unavailable.');

  const evaluationAsOf = asIso(input.evaluationAsOf || input.asOf);
  if (!evaluationAsOf) return baseResult(input, 'UNKNOWN', 'Freshness evaluation boundary is unavailable.', [...limitations, 'No evaluation timestamp.']);

  if (hasAnyFutureInput(evaluationAsOf, [input.observationTimestamp, input.reportingDate, input.supersededAt])) {
    return baseResult(input, 'UNKNOWN', 'Future information is not permitted to determine historical freshness.', [...limitations, 'Look-ahead input detected.']);
  }

  if (!validEvidence(input.evidence) || !refs(input.evidenceReferences).length) {
    return baseResult(input, 'UNKNOWN', 'Freshness cannot be established without verified evidence and canonical references.', limitations);
  }

  if (horizon === 'LONG_TERM') {
    const cycle = String(input.reportingCycleStatus || '').toUpperCase();
    if (!input.reportingPeriod || !input.periodType || !input.reportingDate) {
      return baseResult(input, 'UNKNOWN', 'Long-Term freshness requires authoritative reporting-cycle metadata.', [...limitations, 'Reporting period/cycle metadata is incomplete.']);
    }
    if (cycle === 'CURRENT') return baseResult(input, 'FRESH', 'Authoritative evidence is current for the supplied reporting cycle.', limitations);
    if (cycle === 'NO_LONGER_CURRENT' || cycle === 'HISTORICAL') return baseResult(input, 'STALE', 'Evidence remains historically valid but is no longer current for the supplied reporting cycle.', limitations);
    if (cycle === 'SUPERSEDED') return baseResult(input, input.currentEvidenceAvailable === false ? 'EXPIRED' : 'STALE', input.currentEvidenceAvailable === false ? 'Authoritative evidence has been superseded and current evidence is unavailable.' : 'This evidence has been superseded; current evidence exists separately.', limitations);
    return baseResult(input, 'UNKNOWN', 'Reporting-cycle currentness cannot be established from the supplied authoritative event metadata.', [...limitations, 'Reporting-cycle status is unresolved.']);
  }

  if (horizon === 'INTRADAY' && String(input.timeframe || '').toLowerCase() === '1d') {
    return baseResult(input, 'UNKNOWN', 'Daily evidence cannot satisfy Intraday freshness.', [...limitations, 'Intraday timeframe is unavailable.']);
  }

  const boundary = String(input.observationBoundaryStatus || '').toUpperCase();
  if (horizon === 'SWING') {
    if (!input.exchange || !input.calendarContext || !input.session) return baseResult(input, 'UNKNOWN', 'Swing freshness requires exchange session/calendar context; wall-clock age is insufficient.', [...limitations, 'Exchange/session calendar contract is incomplete.']);
    if (boundary === 'COMPLETED_EXPECTED' || boundary === 'NEXT_EXPECTED_NOT_COMPLETE' || boundary === 'NON_TRADING_DAY_LATEST_COMPLETED') return baseResult(input, 'FRESH', 'The latest completed expected observation is current for the supplied exchange/session boundary.', limitations);
    if (boundary === 'MISSING_EXPECTED') return baseResult(input, 'STALE', 'An expected completed trading-session observation is missing; the prior observation remains historical context.', limitations);
    if (boundary === 'SUPERSEDED') return baseResult(input, input.currentEvidenceAvailable === false ? 'EXPIRED' : 'STALE', input.currentEvidenceAvailable === false ? 'Technical evidence is superseded and required current evidence is unavailable.' : 'Technical evidence is superseded by newer evidence.', limitations);
    return baseResult(input, 'UNKNOWN', 'Swing observation boundary cannot be established safely.', [...limitations, 'Observation boundary status is unresolved.']);
  }

  if (horizon === 'SHORT_TERM') {
    if (String(input.expiryBoundaryStatus || '').toUpperCase() !== 'ESTABLISHED') return baseResult(input, 'UNKNOWN', 'Short-Term expiry boundary is not contractually established; no numeric age threshold is inferred.', [...limitations, 'Expiry boundary is unresolved.']);
    const currentness = String(input.currentnessStatus || '').toUpperCase();
    if (currentness === 'CURRENT') return baseResult(input, 'FRESH', 'Short-Term evidence is current under the explicitly supplied expiry/currentness contract.', limitations);
    if (currentness === 'NO_LONGER_CURRENT') return baseResult(input, 'STALE', 'Short-Term evidence remains valid but is outside the explicitly supplied currentness boundary.', limitations);
    if (currentness === 'SUPERSEDED') return baseResult(input, input.currentEvidenceAvailable === false ? 'EXPIRED' : 'STALE', input.currentEvidenceAvailable === false ? 'Short-Term evidence is superseded and current evidence is unavailable.' : 'Short-Term evidence is superseded by newer evidence.', limitations);
    return baseResult(input, 'UNKNOWN', 'Short-Term currentness cannot be established from the supplied contract.', [...limitations, 'Currentness status is unresolved.']);
  }

  if (horizon === 'INTRADAY') {
    if (!input.exchange || !input.calendarContext || !input.session || !input.timeframe) return baseResult(input, 'UNKNOWN', 'Intraday freshness requires explicit timeframe, exchange session and calendar context.', [...limitations, 'Intraday session contract is incomplete.']);
    if (String(input.timeframe).toLowerCase() === '1d') return baseResult(input, 'UNKNOWN', 'Daily evidence cannot satisfy Intraday freshness.', [...limitations, 'Daily timeframe is not intraday.']);
    if (boundary === 'COMPLETED_EXPECTED' || boundary === 'CURRENT_BAR') return baseResult(input, 'FRESH', 'Intraday observation is current for the supplied session/bar boundary.', limitations);
    if (boundary === 'MISSING_EXPECTED') return baseResult(input, 'STALE', 'An expected intraday observation is missing.', limitations);
    if (boundary === 'SUPERSEDED') return baseResult(input, input.currentEvidenceAvailable === false ? 'EXPIRED' : 'STALE', input.currentEvidenceAvailable === false ? 'Intraday evidence is superseded and current evidence is unavailable.' : 'Intraday evidence is superseded by newer evidence.', limitations);
    return baseResult(input, 'UNKNOWN', 'Intraday observation boundary cannot be established safely.', [...limitations, 'Intraday boundary is unresolved.']);
  }

  return baseResult(input, 'UNKNOWN', 'Freshness contract could not resolve a supported state.', limitations);
}

export const HORIZON_FRESHNESS_STATES = STATES;
export const HORIZON_FRESHNESS_HORIZONS = HORIZONS;
