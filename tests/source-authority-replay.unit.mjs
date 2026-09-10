import assert from 'node:assert/strict';
import {
  SOURCE_ACCESS_MODES,
  createExchangeSession,
  createReportingEvent,
  replayAuthorityAt,
  resolveReportingSupersession,
  selectCalendarVersion,
  selectHistoricalRecords,
} from '../lib/source-authority-adapter.js';

const base = {
  authorityClass: 'NSE_EXCHANGE_FILING', issuer: 'TESTCO', ticker: 'TEST', exchange: 'NSE', source: 'NSE_FIXTURE',
  reportingPeriod: '2026-06-30', periodType: 'QUARTER', statementScope: 'CONSOLIDATED', metricScope: 'FULL_STATEMENT',
  eventType: 'FINANCIAL_RESULT', publishedAt: '2026-07-31T17:36:11Z', retrievedAt: '2026-09-10T12:00:00Z',
  accessMode: SOURCE_ACCESS_MODES.DEVELOPMENT_FIXTURE,
};

const original = createReportingEvent({ ...base, sourceDocumentId: 'doc-original', documentVersion: '1', eventTimestamp: '2026-07-31T17:30:00Z' });
const revision = createReportingEvent({ ...base, sourceDocumentId: 'doc-revision', documentVersion: '2', publishedAt: '2026-08-15T10:00:00Z', relationship: 'REVISED', supersedesDocumentId: 'doc-original' });
const amendment = createReportingEvent({ ...base, sourceDocumentId: 'doc-amendment', documentVersion: '3', publishedAt: '2026-08-20T10:00:00Z', relationship: 'AMENDED', supersedesDocumentId: 'doc-revision' });
const correction = createReportingEvent({ ...base, sourceDocumentId: 'doc-correction', documentVersion: '4', publishedAt: '2026-08-25T10:00:00Z', relationship: 'CORRECTED', supersedesDocumentId: 'doc-amendment' });
const restatement = createReportingEvent({ ...base, sourceDocumentId: 'doc-restatement', documentVersion: '5', publishedAt: '2026-09-01T10:00:00Z', relationship: 'RESTATED', supersedesDocumentId: 'doc-correction' });
const duplicate = createReportingEvent({ ...base, sourceDocumentId: 'doc-duplicate', documentVersion: '1', publishedAt: '2026-08-02T10:00:00Z' });
const annual = createReportingEvent({ ...base, sourceDocumentId: 'doc-annual', reportingPeriod: '2026-03-31', periodType: '12M', publishedAt: '2026-05-30T10:00:00Z' });
const future = createReportingEvent({ ...base, sourceDocumentId: 'doc-future', publishedAt: '2026-10-01T10:00:00Z' });
const missingPublished = createReportingEvent({ ...base, sourceDocumentId: 'doc-missing-published', publishedAt: '2026-07-31T17:36:11Z' });
const sameDayLater = createReportingEvent({ ...base, sourceDocumentId: 'doc-same-day', publishedAt: '2026-07-31T20:00:00Z' });

assert.equal(selectHistoricalRecords([original, revision, future], '2026-08-01T00:00:00Z').length, 1);
assert.equal(selectHistoricalRecords([original, revision, future], '2026-08-16T00:00:00Z').length, 2);
assert.equal(selectHistoricalRecords([original, sameDayLater], '2026-07-31T19:00:00Z').length, 1);
assert.equal(selectHistoricalRecords([missingPublished], '2026-07-31T00:00:00Z').length, 0);

const resolved = resolveReportingSupersession([original, revision, amendment, correction, restatement, duplicate, annual]);
assert.equal(resolved.find((r) => r.sourceDocumentId === 'doc-original').supersededByDocumentId, 'doc-revision');
assert.equal(resolved.find((r) => r.sourceDocumentId === 'doc-revision').supersededByDocumentId, 'doc-amendment');
assert.equal(resolved.find((r) => r.sourceDocumentId === 'doc-restatement').supersessionStatus, 'ACTIVE');
assert.equal(resolved.find((r) => r.sourceDocumentId === 'doc-duplicate').supersessionStatus, 'ACTIVE');
assert.equal(resolved.find((r) => r.sourceDocumentId === 'doc-annual').supersessionStatus, 'ACTIVE');

const conflictingScope = createReportingEvent({ ...base, sourceDocumentId: 'doc-bad-scope', publishedAt: '2026-08-16T10:00:00Z', relationship: 'REVISED', supersedesDocumentId: 'doc-original', reportingPeriod: '2025-12-31' });
assert.equal(resolveReportingSupersession([original, conflictingScope]).find((r) => r.sourceDocumentId === 'doc-original').supersededByDocumentId, null);

const invalidRelationship = () => createReportingEvent({ ...base, sourceDocumentId: 'bad-rel', relationship: 'NEWER' });
assert.throws(invalidRelationship, /REPORTING_EVENT_RELATIONSHIP_INVALID/);
assert.throws(() => createReportingEvent({ ...base, sourceDocumentId: null }), /REPORTING_EVENT_IDENTITY_INCOMPLETE/);

const calendarV1 = createExchangeSession({ exchange: 'NSE', timezone: 'Asia/Kolkata', tradingDate: '2026-08-01', tradingDay: true, session: 'NORMAL', calendarDocumentId: 'cal-2026-v1', calendarVersion: '1', publishedAt: '2026-01-01T10:00:00Z', effectiveFrom: '2026-01-01T00:00:00Z', retrievedAt: '2026-09-10T12:00:00Z', accessMode: SOURCE_ACCESS_MODES.DEVELOPMENT_FIXTURE });
const calendarV2 = createExchangeSession({ exchange: 'NSE', timezone: 'Asia/Kolkata', tradingDate: '2026-08-01', tradingDay: true, session: 'SPECIAL', calendarDocumentId: 'cal-2026-v2', calendarVersion: '2', publishedAt: '2026-08-10T10:00:00Z', effectiveFrom: '2026-08-10T00:00:00Z', retrievedAt: '2026-09-10T12:00:00Z', accessMode: SOURCE_ACCESS_MODES.DEVELOPMENT_FIXTURE });
const futureCalendar = createExchangeSession({ exchange: 'NSE', timezone: 'Asia/Kolkata', tradingDate: '2026-08-01', tradingDay: true, session: 'FUTURE', calendarDocumentId: 'cal-future', calendarVersion: '3', publishedAt: '2026-12-01T10:00:00Z', effectiveFrom: '2026-12-01T00:00:00Z', retrievedAt: '2026-09-10T12:00:00Z', accessMode: SOURCE_ACCESS_MODES.DEVELOPMENT_FIXTURE });
assert.equal(selectCalendarVersion([calendarV1, calendarV2, futureCalendar], '2026-08-01T12:00:00Z')?.calendarVersion, '1');
assert.equal(selectCalendarVersion([calendarV1, calendarV2, futureCalendar], '2026-08-11T12:00:00Z')?.calendarVersion, '2');
assert.equal(selectCalendarVersion([calendarV1, calendarV2, futureCalendar], '2026-07-01T12:00:00Z')?.calendarVersion, '1');

const replay = replayAuthorityAt({ records: [original, revision], calendars: [calendarV1, calendarV2], evaluationAsOf: '2026-08-01T00:00:00Z' });
assert.equal(replay.reportingEvents.length, 1);
assert.equal(replay.reportingEvents[0].sourceDocumentId, 'doc-original');
assert.equal(replay.calendar.calendarVersion, '1');

console.log('source-authority-replay.unit: PASS');
