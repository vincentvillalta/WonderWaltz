/**
 * SOLV-05: Meal insertion into constructed day plans.
 *
 * - Table-service reservations are hard pins at their reserved time;
 *   conflicting attractions are removed.
 * - Quick-service meals are inserted in rides-free windows (>60-min gap)
 *   in lunch (11:00-13:30) and dinner (17:00-19:30) windows.
 *
 * Pure, deterministic, no side effects.
 */

import { createHash } from 'node:crypto';
import type { PlanItem, TableServiceReservation, SolverGuest, BudgetTier } from './types.js';

// ─── Constants ──────────────────────────────────────────────────────────────

/** Quick-service meal duration in minutes. */
const QS_DURATION_MINUTES = 30;

/** Minimum gap (minutes) required for a quick-service meal insertion. */
const MIN_GAP_FOR_QS = 60;

/** Lunch window (wall-clock hours). */
const LUNCH_START_HOUR = 11;
const LUNCH_END_HOUR = 13.5; // 13:30

/** Dinner window (wall-clock hours). */
const DINNER_START_HOUR = 17;
const DINNER_END_HOUR = 19.5; // 19:30

// ─── Input type ─────────────────────────────────────────────────────────────

export type InsertMealsInput = {
  items: PlanItem[];
  tableServiceReservations: TableServiceReservation[];
  guests: SolverGuest[];
  budgetTier: BudgetTier;
};

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Parse hour as decimal from ISO time string (e.g., '2026-06-01T13:30:00' → 13.5). */
function parseHour(iso: string): number {
  const match = iso.match(/T(\d{2}):(\d{2})/);
  if (!match) return 0;
  return parseInt(match[1]!, 10) + parseInt(match[2]!, 10) / 60;
}

/** Extract date prefix from ISO string. */
function datePrefix(iso: string): string {
  return iso.slice(0, 10);
}

/** Build ISO from date prefix + decimal hours. */
function buildFromHour(prefix: string, hour: number): string {
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60);
  return `${prefix}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
}

/** Generate a deterministic meal item ID. */
function makeMealId(name: string, startTime: string): string {
  return createHash('sha256')
    .update('meal:' + name + startTime)
    .digest('hex')
    .slice(0, 16);
}

/** Check if two time ranges overlap. */
function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart < bEnd && bStart < aEnd;
}

// ─── Main function ──────────────────────────────────────────────────────────

/**
 * Inserts meal items into the plan:
 * 1. Table-service reservations are hard-pinned; conflicting items removed.
 * 2. Quick-service meals inserted in the largest gap within lunch/dinner windows.
 *
 * Returns PlanItem[] sorted by startTime.
 */
export function insertMeals(input: InsertMealsInput): PlanItem[] {
  const { items, tableServiceReservations } = input;
  // guests and budgetTier reserved for future dietary-aware QS selection and
  // budget-tier-dependent meal count. Currently unused but part of the contract.

  // Deep copy to avoid mutating input.
  let result = items.map((i) => ({ ...i }));

  // ─── Phase 1: Hard-pin table-service reservations ─────────────────────

  const tsItems: PlanItem[] = [];

  for (const res of tableServiceReservations) {
    // Remove conflicting items.
    result = result.filter(
      (item) => !overlaps(item.startTime, item.endTime, res.startTime, res.endTime),
    );

    tsItems.push({
      id: makeMealId(res.venueName, res.startTime),
      type: 'dining',
      ...(res.attractionRefId != null ? { refId: res.attractionRefId } : {}),
      name: res.venueName,
      startTime: res.startTime,
      endTime: res.endTime,
    });
  }

  result.push(...tsItems);

  // ─── Phase 2: Quick-service meals in gaps ─────────────────────────────

  // Sort items by startTime for gap analysis.
  result.sort((a, b) => a.startTime.localeCompare(b.startTime));

  const prefix = result.length > 0 ? datePrefix(result[0]!.startTime) : '2026-06-01';

  // Check if lunch/dinner already covered by TS reservations.
  const hasLunchTs = tsItems.some((ts) => {
    const h = parseHour(ts.startTime);
    return h >= LUNCH_START_HOUR && h < LUNCH_END_HOUR;
  });

  const hasDinnerTs = tsItems.some((ts) => {
    const h = parseHour(ts.startTime);
    return h >= DINNER_START_HOUR && h < DINNER_END_HOUR;
  });

  // Find the best gap for each meal window.
  if (!hasLunchTs) {
    const lunchSlot = findBestGap(result, prefix, LUNCH_START_HOUR, LUNCH_END_HOUR);
    if (lunchSlot) {
      result.push({
        id: makeMealId('Quick-Service Lunch', lunchSlot),
        type: 'dining',
        name: 'Quick-Service Lunch',
        startTime: lunchSlot,
        endTime: buildFromHour(prefix, parseHour(lunchSlot) + QS_DURATION_MINUTES / 60),
        notes: 'Mobile order recommended',
      });
    }
  }

  if (!hasDinnerTs) {
    const dinnerSlot = findBestGap(result, prefix, DINNER_START_HOUR, DINNER_END_HOUR);
    if (dinnerSlot) {
      result.push({
        id: makeMealId('Quick-Service Dinner', dinnerSlot),
        type: 'dining',
        name: 'Quick-Service Dinner',
        startTime: dinnerSlot,
        endTime: buildFromHour(prefix, parseHour(dinnerSlot) + QS_DURATION_MINUTES / 60),
        notes: 'Mobile order recommended',
      });
    }
  }

  // ─── Final sort ───────────────────────────────────────────────────────

  result.sort((a, b) => a.startTime.localeCompare(b.startTime));
  return result;
}

/**
 * Find the largest gap in the items list that falls within a meal window.
 * Returns the ISO start time for the QS meal, or null if no suitable gap.
 */
function findBestGap(
  items: PlanItem[],
  prefix: string,
  windowStartHour: number,
  windowEndHour: number,
): string | null {
  const sorted = [...items].sort((a, b) => a.startTime.localeCompare(b.startTime));

  let bestGapMinutes = 0;
  let bestGapStart: string | null = null;

  // Virtual boundaries: window start and window end.
  const windowStart = buildFromHour(prefix, windowStartHour);
  const windowEnd = buildFromHour(prefix, windowEndHour);

  // Build time boundaries within the window.
  const boundaries: Array<{ start: string; end: string }> = [];

  // Items that overlap with the window.
  for (const item of sorted) {
    if (item.endTime > windowStart && item.startTime < windowEnd) {
      boundaries.push({ start: item.startTime, end: item.endTime });
    }
  }

  // Gaps between window start and first item, between items, and between last item and window end.
  let prevEnd = windowStart;
  for (const b of boundaries) {
    const gapStartStr = prevEnd > windowStart ? prevEnd : windowStart;
    const gapEndStr = b.start < windowEnd ? b.start : windowEnd;

    if (gapEndStr > gapStartStr) {
      const gapMinutes = (parseHour(gapEndStr) - parseHour(gapStartStr)) * 60;
      if (gapMinutes >= MIN_GAP_FOR_QS && gapMinutes > bestGapMinutes) {
        bestGapMinutes = gapMinutes;
        bestGapStart = gapStartStr;
      }
    }

    if (b.end > prevEnd) prevEnd = b.end;
  }

  // Gap between last boundary and window end.
  if (prevEnd < windowEnd) {
    const gapMinutes = (parseHour(windowEnd) - parseHour(prevEnd)) * 60;
    if (gapMinutes >= MIN_GAP_FOR_QS && gapMinutes > bestGapMinutes) {
      bestGapMinutes = gapMinutes;
      bestGapStart = prevEnd;
    }
  }

  return bestGapStart;
}
