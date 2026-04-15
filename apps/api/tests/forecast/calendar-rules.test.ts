import { describe, it, expect } from 'vitest';
import { getRuleBucket } from '../../src/forecast/calendar-rules.js';

/**
 * Table-driven tests for the pure rule engine.
 *
 * Rules (codified here so drift is immediately visible):
 *   - PEAK: Christmas week (Dec 23 – Jan 2), Spring Break two weeks (mid-Mar),
 *     July 4 week (Jun 30 – Jul 6), Thanksgiving week (Wed-Sun of week 48).
 *   - HIGH: weekends (Sat/Sun), US federal holidays, marathon weekend
 *     (first weekend of January), Food & Wine weeks (Sep 1 – Nov 15).
 *   - MEDIUM: weekdays May–August (summer non-holiday).
 *   - LOW: weekdays Jan–Feb (excluding holidays), Sep–early-Dec weekdays.
 */
describe('getRuleBucket (pure calendar rule engine)', () => {
  const cases: Array<[string, 'low' | 'medium' | 'high' | 'peak', string]> = [
    // PEAK — Christmas week
    ['2026-12-25', 'peak', 'Christmas Day'],
    ['2026-12-28', 'peak', 'Christmas week weekday'],
    ['2027-01-01', 'peak', "New Year's Day"],

    // PEAK — July 4 week
    ['2026-07-04', 'peak', 'Independence Day'],
    ['2026-07-02', 'peak', 'July 4 week (Thu)'],

    // PEAK — Thanksgiving week (2026-11-26 is Thursday Thanksgiving)
    ['2026-11-26', 'peak', 'Thanksgiving Day'],
    ['2026-11-27', 'peak', 'Black Friday'],

    // PEAK — Spring Break (mid-March, 2 weeks around)
    ['2026-03-17', 'peak', 'Spring Break weekday'],

    // HIGH — Food & Wine festival weekday (mid-Sep to mid-Nov)
    ['2026-09-15', 'high', 'Food & Wine weekday (Tue)'],
    ['2026-10-13', 'high', 'Food & Wine weekday (Tue)'],

    // HIGH — weekends (non-holiday)
    ['2026-05-16', 'high', 'Saturday in May'],
    ['2026-05-17', 'high', 'Sunday in May'],

    // HIGH — federal holiday weekday (Memorial Day = 2026-05-25)
    ['2026-05-25', 'high', 'Memorial Day'],

    // HIGH — marathon weekend (first weekend of Jan 2026 = Jan 3-4)
    ['2026-01-03', 'high', 'Marathon Sat'],
    ['2026-01-04', 'high', 'Marathon Sun'],

    // MEDIUM — weekdays May-Aug non-holiday
    ['2026-06-15', 'medium', 'Monday in June'],
    ['2026-08-11', 'medium', 'Tuesday in August'],

    // LOW — weekdays Jan-Feb excluding holidays
    ['2026-02-10', 'low', 'Tuesday in February'],
    ['2027-01-13', 'low', 'Tuesday mid-January (post-holidays)'],

    // LOW — Sep-early-Dec weekdays (excluded from Food & Wine)
    ['2026-12-08', 'low', 'Tuesday early December (pre-Christmas-week)'],
  ];

  for (const [iso, expected, label] of cases) {
    it(`${iso} → ${expected} (${label})`, () => {
      const d = new Date(`${iso}T12:00:00Z`);
      expect(getRuleBucket(d)).toBe(expected);
    });
  }

  it('is deterministic (same input → same output across 10 runs)', () => {
    const d = new Date('2026-07-04T12:00:00Z');
    const results = new Set<string>();
    for (let i = 0; i < 10; i += 1) results.add(getRuleBucket(d));
    expect(results.size).toBe(1);
  });
});
