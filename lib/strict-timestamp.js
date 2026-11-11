const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?(Z|[+-]\d{2}:\d{2})$/;

function validCalendarDate(year, month, day) {
  if (!Number.isInteger(year) || month < 1 || month > 12 || day < 1 || day > 31) return false;
  const probe = new Date(0);
  probe.setUTCHours(0, 0, 0, 0);
  probe.setUTCFullYear(year, month - 1, day);
  return probe.getUTCFullYear() === year
    && probe.getUTCMonth() === month - 1
    && probe.getUTCDate() === day;
}

/**
 * Parse only explicit ISO calendar dates/date-times, valid Date objects, or
 * finite numeric epoch milliseconds. Ambiguous strings such as "1", locale
 * dates, and impossible calendar dates are deliberately rejected.
 */
export function timestampMs(value) {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    const ms = new Date(value).getTime();
    return Number.isFinite(ms) ? ms : null;
  }

  if (value instanceof Date) {
    const ms = value.getTime();
    return Number.isFinite(ms) ? ms : null;
  }

  if (typeof value !== 'string') return null;
  const input = value.trim();
  if (!input) return null;

  const dateOnly = DATE_ONLY.exec(input);
  if (dateOnly) {
    const year = Number(dateOnly[1]);
    const month = Number(dateOnly[2]);
    const day = Number(dateOnly[3]);
    if (!validCalendarDate(year, month, day)) return null;
    const ms = Date.parse(`${input}T00:00:00.000Z`);
    return Number.isFinite(ms) ? ms : null;
  }

  const dateTime = DATE_TIME.exec(input);
  if (!dateTime) return null;
  const year = Number(dateTime[1]);
  const month = Number(dateTime[2]);
  const day = Number(dateTime[3]);
  const hour = Number(dateTime[4]);
  const minute = Number(dateTime[5]);
  const second = Number(dateTime[6]);
  const zone = dateTime[8];

  if (!validCalendarDate(year, month, day) || hour > 23 || minute > 59 || second > 59) return null;
  if (zone === '-00:00') return null;
  if (zone !== 'Z') {
    const offsetHour = Number(zone.slice(1, 3));
    const offsetMinute = Number(zone.slice(4, 6));
    if (offsetHour > 23 || offsetMinute > 59) return null;
  }

  const ms = Date.parse(input);
  return Number.isFinite(ms) ? ms : null;
}
