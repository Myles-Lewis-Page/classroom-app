// Date-only helpers used throughout the Pacing Guide.
//
// THE BUG THIS FIXES: a plain `new Date("2026-07-01")` is parsed as UTC
// midnight. Reading it back with local-timezone getters/formatters
// (`.getDay()`, `.getDate()`, `.toLocaleDateString()`) on a machine west of
// UTC (e.g. any US timezone) rolls it back to the previous calendar day,
// because UTC midnight is still "yesterday evening" locally. That's what
// made unit start dates and week-table weekday labels look shifted by a
// day. Every date in the Pacing Guide is a *calendar date* with no
// meaningful time-of-day, so every read and write below is pinned to UTC
// getters/setters instead of local ones, which makes the calendar date
// identical no matter what timezone the browser or server happens to be in.

// The browser's actual local calendar date as "YYYY-MM-DD", using LOCAL
// getters (not UTC ones) - this is the one place we deliberately want the
// viewer's own timezone, for capturing "what day is it for the person right
// now" (e.g. when they mark something handed in). Everywhere else in this
// file is about *storing and displaying* a date-only value without drift;
// this is about *reading* one from the moment it's happening.
export function todayLocalDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseDateOnly(input: string | Date): Date {
  if (input instanceof Date) return atUtcMidnight(input);
  // "YYYY-MM-DD" (what <input type="date"> gives us) - build directly from
  // the parts so there's no implicit timezone conversion at all.
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(input);
  if (match) {
    const [, y, m, d] = match;
    return new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  }
  return atUtcMidnight(new Date(input));
}

function atUtcMidnight(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** "YYYY-MM-DD" for pre-filling an <input type="date">, in UTC (no drift). */
export function toDateInputValue(d: Date | string): string {
  const date = typeof d === "string" ? parseDateOnly(d) : d;
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 0 = Sunday ... 6 = Saturday, using the UTC calendar date. */
export function utcDayOfWeek(d: Date): number {
  return d.getUTCDay();
}

export function addUtcDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setUTCDate(copy.getUTCDate() + n);
  return copy;
}

export function isWeekend(d: Date): boolean {
  const dow = utcDayOfWeek(d);
  return dow === 0 || dow === 6;
}

/** The Monday (UTC) of the calendar week containing d. */
export function mondayOfUtc(d: Date): Date {
  const dow = utcDayOfWeek(d);
  const diff = dow === 0 ? -6 : 1 - dow;
  return addUtcDays(d, diff);
}

/** The Sunday (UTC) of the calendar week containing d - for rendering a Sun-Sat month grid (mondayOfUtc is for Mon-Fri week grouping, a different use case). */
export function sundayOfUtc(d: Date): Date {
  return addUtcDays(d, -utcDayOfWeek(d));
}

export function isSameUtcDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

/** Inclusive overlap check between two [start, end] UTC calendar-date ranges. */
export function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const MONTH_LONG = [
  "January", "February", "March", "April", "May", "June", "July", "August",
  "September", "October", "November", "December",
];

/** e.g. "Tue, Jul 1" - always the UTC calendar date, regardless of viewer's timezone. */
export function formatShortWeekday(d: Date | string): string {
  const date = typeof d === "string" ? parseDateOnly(d) : d;
  return `${WEEKDAY_SHORT[date.getUTCDay()]}, ${MONTH_SHORT[date.getUTCMonth()]} ${date.getUTCDate()}`;
}

/** e.g. "7/1/2026" */
export function formatShortDate(d: Date | string): string {
  const date = typeof d === "string" ? parseDateOnly(d) : d;
  return `${date.getUTCMonth() + 1}/${date.getUTCDate()}/${date.getUTCFullYear()}`;
}

/** e.g. "July 2026" */
export function formatMonthYear(year: number, month: number): string {
  return `${MONTH_LONG[month]} ${year}`;
}
