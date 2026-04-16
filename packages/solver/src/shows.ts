/**
 * SOLV-06: Show/parade/fireworks insertion into constructed day plans.
 *
 * - Preferred shows with fixed schedules are scored as optional blocks.
 * - A preferred show is kept only if showScore > displacementCost
 *   (sum of scores of attractions displaced by the show window).
 * - Non-preferred shows are skipped entirely.
 *
 * Pure, deterministic, no side effects.
 */

import { createHash } from 'node:crypto';
import type { CatalogShow, PlanItem } from './types.js';

// ─── Constants ──────────────────────────────────────────────────────────────

/**
 * Base enjoyment weight for shows. Parallels the attraction scoring:
 * shows are treated as non-headliner equivalents.
 * The plan specifies showScore = show.enjoymentWeight; since CatalogShow
 * doesn't have an explicit score, we use a fixed value (like deriveEnjoymentWeight).
 */
const SHOW_ENJOYMENT_WEIGHT = 60;

/**
 * Per-attraction displacement cost — each displaced attraction counts as
 * this score penalty. This is a simplification: ideally we'd use the
 * actual score of each displaced attraction, but that requires the full
 * scoring context (walk graph, forecasts). Using a fixed cost per displaced
 * item is sufficient for the construction pass; local search (03-08) can
 * refine.
 */
const DISPLACEMENT_COST_PER_ITEM = 40;

// ─── Input type ─────────────────────────────────────────────────────────────

export type ParkHours = {
  open: string;
  close: string;
};

export type InsertShowsInput = {
  items: PlanItem[];
  showsInPark: CatalogShow[];
  preferredShowIds: string[];
  parkHours: ParkHours;
};

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Extract date prefix from ISO string. */
function datePrefix(iso: string): string {
  return iso.slice(0, 10);
}

/** Build ISO from date prefix + HH:MM showtime. */
function buildShowIso(prefix: string, hhmm: string): string {
  return `${prefix}T${hhmm}:00`;
}

/** Build ISO from date prefix + decimal hour. */
function buildFromMinutes(prefix: string, totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${prefix}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
}

/** Parse HH:MM to minutes since midnight. */
function parseHhMm(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number) as [number, number];
  return h * 60 + m;
}

/** Parse ISO to minutes since midnight. */
function parseIsoMinutes(iso: string): number {
  const match = iso.match(/T(\d{2}):(\d{2})/);
  if (!match) return 0;
  return parseInt(match[1]!, 10) * 60 + parseInt(match[2]!, 10);
}

/** Generate a deterministic show item ID. */
function makeShowId(showId: string, startTime: string): string {
  return createHash('sha256')
    .update('show:' + showId + startTime)
    .digest('hex')
    .slice(0, 16);
}

/** Check if two time ranges overlap. */
function overlaps(aStartMin: number, aEndMin: number, bStartMin: number, bEndMin: number): boolean {
  return aStartMin < bEndMin && bStartMin < aEndMin;
}

// ─── Main function ──────────────────────────────────────────────────────────

/**
 * Inserts preferred shows into the plan if their score exceeds displacement cost.
 *
 * For each preferred show:
 * 1. Find the best showtime (earliest with least conflict).
 * 2. Calculate displacement cost (number of conflicting items * cost per item).
 * 3. If showScore > displacementCost, insert the show and remove conflicting items.
 * 4. Non-preferred shows are skipped.
 *
 * Returns PlanItem[] sorted by startTime.
 */
export function insertShows(input: InsertShowsInput): PlanItem[] {
  const { items, showsInPark, preferredShowIds, parkHours } = input;

  // Deep copy to avoid mutating input.
  let result = items.map((i) => ({ ...i }));

  const preferredSet = new Set(preferredShowIds);
  const prefix = result.length > 0 ? datePrefix(result[0]!.startTime) : datePrefix(parkHours.open);

  const { minutes: closeMin } = { minutes: parseIsoMinutes(parkHours.close) };

  // Process shows in deterministic order (by show ID).
  const sortedShows = [...showsInPark]
    .filter((s) => preferredSet.has(s.id))
    .sort((a, b) => a.id.localeCompare(b.id));

  for (const show of sortedShows) {
    // Try each showtime, pick the one with the least displacement.
    let bestShowtime: string | null = null;
    let bestDisplacedCount = Infinity;
    let bestDisplacedItems: PlanItem[] = [];

    for (const hhmm of show.showtimes) {
      const showStartMin = parseHhMm(hhmm);
      const showEndMin = showStartMin + show.durationMinutes;

      // Show must fit within park hours.
      if (showEndMin > closeMin) continue;

      // Find displaced items.
      const displaced = result.filter((item) => {
        const itemStartMin = parseIsoMinutes(item.startTime);
        const itemEndMin = parseIsoMinutes(item.endTime);
        return overlaps(showStartMin, showEndMin, itemStartMin, itemEndMin);
      });

      if (displaced.length < bestDisplacedCount) {
        bestDisplacedCount = displaced.length;
        bestShowtime = hhmm;
        bestDisplacedItems = displaced;
      }
    }

    if (!bestShowtime) continue;

    // Score comparison: show enjoyment vs displacement cost.
    const showScore = SHOW_ENJOYMENT_WEIGHT;
    const displacementCost = bestDisplacedCount * DISPLACEMENT_COST_PER_ITEM;

    if (showScore <= displacementCost) continue; // skip show

    // Insert show, remove displaced items.
    const displacedIds = new Set(bestDisplacedItems.map((i) => i.id));
    result = result.filter((i) => !displacedIds.has(i.id));

    const showStartIso = buildShowIso(prefix, bestShowtime);
    const showStartMin = parseHhMm(bestShowtime);
    const showEndIso = buildFromMinutes(prefix, showStartMin + show.durationMinutes);

    result.push({
      id: makeShowId(show.id, showStartIso),
      type: 'show',
      refId: show.id,
      name: show.name,
      startTime: showStartIso,
      endTime: showEndIso,
    });
  }

  // ─── Final sort ───────────────────────────────────────────────────────

  result.sort((a, b) => a.startTime.localeCompare(b.startTime));
  return result;
}
