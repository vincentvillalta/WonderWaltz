/**
 * Pure calendar rule engine — deterministic crowd-bucket classification
 * for any date, based purely on calendar heuristics.
 *
 * No network, no DB, no mutable state. Output is a function of the
 * input date only. Safe to import from any module in either the HTTP
 * process or the BullMQ worker.
 *
 * **Location note (03-11 deviation):** The plan originally called for
 * this to live in `packages/content/wdw/calendar-rules.ts`. The
 * `@wonderwaltz/content` package is pure-ESM (`"type": "module"`) and
 * this file needs to be imported *synchronously* by the CJS `apps/api`
 * package — mixing module systems across that boundary means either a
 * dynamic `await import(...)` (awkward for a pure function) or a
 * `createRequire` shim. We keep the rule engine CJS-compatible inside
 * `apps/api/src/forecast/` instead, mirroring the existing inline
 * pattern used for `DISCLAIMER` in `response-envelope.interceptor.ts`.
 * If the solver package ever needs rule-engine access, it will
 * re-derive the heuristics itself (the logic is ~100 lines of pure
 * arithmetic — no cross-package dep needed).
 *
 * Used by: apps/api/src/forecast/calendar.service.ts
 *
 * Rule precedence (first match wins, top-down):
 *   1. PEAK:
 *      - Christmas week: Dec 23 – Jan 2
 *      - Thanksgiving week: Wed before → Sunday after (4th Thu of Nov)
 *      - July 4 week: Jun 30 – Jul 6
 *      - Spring Break: Mar 10 – Mar 24 (conservative superset of most
 *        US public school calendars; DB override layer handles
 *        year-specific adjustments).
 *   2. HIGH:
 *      - Marathon weekend: first Saturday + Sunday of January
 *      - US federal holidays (via date-holidays npm)
 *      - Food & Wine Festival weekday: Sep 1 through Nov 15
 *      - Weekends (Sat/Sun) not caught above
 *   3. MEDIUM:
 *      - May–August weekdays not caught above
 *   4. LOW:
 *      - everything else (weekdays outside peak/holiday/summer windows)
 */
// date-holidays ships no bundled types — suppress the implicit-any import.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — no types available
import Holidays from 'date-holidays';

export type CrowdBucket = 'low' | 'medium' | 'high' | 'peak';

interface HolidayEntry {
  type: string;
}

interface HolidaysLike {
  isHoliday(d: Date): false | HolidayEntry[];
}

// Cached US-federal holidays instance — date-holidays is heavyweight
// (~250KB), so allocate once. Constructor is synchronous.

const hd: HolidaysLike = new Holidays('US') as HolidaysLike;

/** Return UTC date parts so rules are timezone-stable. */
function parts(date: Date): { y: number; m: number; d: number; dow: number } {
  return {
    y: date.getUTCFullYear(),
    m: date.getUTCMonth() + 1, // 1-12
    d: date.getUTCDate(),
    dow: date.getUTCDay(), // 0 = Sunday
  };
}

/** Inclusive `MM-DD` date-range check (wraps year-end). */
function inMonthDayRange(
  m: number,
  d: number,
  start: [number, number],
  end: [number, number],
): boolean {
  const [sm, sd] = start;
  const [em, ed] = end;
  const asNum = m * 100 + d;
  const s = sm * 100 + sd;
  const e = em * 100 + ed;
  if (s <= e) return asNum >= s && asNum <= e;
  // Wraps year-end (e.g. Dec 23 → Jan 2)
  return asNum >= s || asNum <= e;
}

/** Thanksgiving Day = 4th Thursday of November. */
function thanksgivingDay(year: number): number {
  const nov1 = new Date(Date.UTC(year, 10, 1));
  const dow = nov1.getUTCDay(); // 0=Sun, 4=Thu
  const firstThu = 1 + ((4 - dow + 7) % 7);
  return firstThu + 21;
}

function isThanksgivingWeek(year: number, month: number, day: number): boolean {
  if (month !== 11) return false;
  const tg = thanksgivingDay(year);
  // Wednesday before through Sunday after
  return day >= tg - 1 && day <= tg + 3;
}

function isChristmasWeek(month: number, day: number): boolean {
  return inMonthDayRange(month, day, [12, 23], [1, 2]);
}

function isJuly4Week(month: number, day: number): boolean {
  return inMonthDayRange(month, day, [6, 30], [7, 6]);
}

function isSpringBreak(month: number, day: number): boolean {
  return inMonthDayRange(month, day, [3, 10], [3, 24]);
}

/** Marathon weekend: first Saturday & Sunday of January. */
function isMarathonWeekend(year: number, month: number, day: number): boolean {
  if (month !== 1) return false;
  const jan1 = new Date(Date.UTC(year, 0, 1));
  const dow = jan1.getUTCDay();
  const firstSat = 1 + ((6 - dow + 7) % 7);
  const firstSun = firstSat + 1;
  return day === firstSat || day === firstSun;
}

function isFoodAndWineWeekday(month: number, day: number, dow: number): boolean {
  if (dow === 0 || dow === 6) return false;
  return inMonthDayRange(month, day, [9, 1], [11, 15]);
}

/** US federal holiday (public type only). */
function isUSFederalHoliday(date: Date): boolean {
  const r = hd.isHoliday(date);
  if (!r) return false;
  return r.some((x) => x.type === 'public');
}

export function getRuleBucket(date: Date): CrowdBucket {
  const { y, m, d, dow } = parts(date);

  // 1. PEAK windows
  if (isChristmasWeek(m, d)) return 'peak';
  if (isThanksgivingWeek(y, m, d)) return 'peak';
  if (isJuly4Week(m, d)) return 'peak';
  if (isSpringBreak(m, d)) return 'peak';

  // 2. HIGH
  if (isMarathonWeekend(y, m, d)) return 'high';
  if (isUSFederalHoliday(date)) return 'high';
  if (isFoodAndWineWeekday(m, d, dow)) return 'high';
  if (dow === 0 || dow === 6) return 'high';

  // 3. MEDIUM — summer weekdays (May-Aug), non-holiday
  if (m >= 5 && m <= 8) return 'medium';

  // 4. LOW — everything else
  return 'low';
}
