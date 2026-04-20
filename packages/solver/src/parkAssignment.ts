/**
 * Park-to-day assignment (revised 2026-04).
 *
 * Replaces the earlier alphabetical round-robin. The goal is to produce a
 * park-per-day sequence that feels good to a real traveller:
 *
 *   1. Must-dos are the dominant signal. A park with 4 user must-dos
 *      outweighs any fatigue/popularity heuristic — we schedule the park
 *      with the most must-dos on an early day so the trip's "most wanted"
 *      rides aren't stranded on day 4.
 *   2. Intensity-balanced. Back-to-back big parks (MK + EPCOT) is
 *      exhausting; we penalise consecutive high-intensity days.
 *   3. Trip-length aware. Short trips (1–3 days) avoid repeats; long
 *      trips (5+) allow them but keep them spaced.
 *   4. On-property EEH placement. Guests on Disney property get extra
 *      evening hours at specific parks — if EEH data is present, bias
 *      those parks onto days that align with the EEH schedule. With no
 *      EEH data yet, this is a no-op.
 *
 * The output is deterministic — same inputs produce byte-identical
 * assignment. Tie-breaks by park ID lexicographic.
 *
 * Pure — no randomness, no I/O.
 */

import type { CatalogAttraction } from './types.js';

// ─── Intensity taxonomy ─────────────────────────────────────────────────────

/**
 * Intensity score per park, on an ordinal scale (1..3). Bigger number =
 * more walking and more mental load. Hand-calibrated for Walt Disney World.
 *
 * Keys use the `parkId` convention that shows up in our catalog. We
 * support both the external-id form (e.g. `wdw-mk`) and the pure-UUID
 * form, but fall back to an attraction-count heuristic when the park ID
 * is unrecognised.
 */
const PARK_INTENSITY_BY_EXTERNAL_ID: Record<string, number> = {
  'wdw-mk': 3,
  'wdw-epcot': 3,
  'wdw-hs': 2,
  'wdw-ak': 1,
  // Friendly short-name aliases used in fixtures/tests.
  mk: 3,
  epcot: 3,
  hs: 2,
  dhs: 2,
  ak: 1,
};

/** Two consecutive parks summing to this score trigger the fatigue penalty. */
const BACK_TO_BACK_HEAVY_THRESHOLD = 6;

// ─── Input / output ─────────────────────────────────────────────────────────

export type ParkAssignmentInput = {
  /** Inclusive list of YYYY-MM-DD strings, one per trip day. */
  dates: readonly string[];
  /** Full attraction catalog. We derive park IDs and attraction counts from here. */
  attractions: readonly CatalogAttraction[];
  /** Must-do attraction IDs from user preferences. Dominant scoring signal. */
  mustDoAttractionIds: readonly string[];
  /**
   * Optional lodging hint. 'deluxe' / 'deluxe_villa' / 'moderate' / 'value'
   * (on-property) get EEH-eligible biasing when EEH data arrives. Anything
   * else (incl. 'off_site') is treated as off-property.
   */
  lodgingType?: string | undefined;
};

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Pure-UUID test — matches the 8-4-4-4-12 hex shape Supabase uses. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resolve an intensity score for a park ID. External-id match wins; falls
 * back to a size-based heuristic keyed on how many attractions the park
 * has in the catalog (a reasonable proxy when IDs are UUIDs).
 */
function intensityFor(
  parkId: string,
  attractionsInPark: number,
  fallbackMap: Map<string, number>,
): number {
  if (fallbackMap.has(parkId)) return fallbackMap.get(parkId)!;
  if (!UUID_RE.test(parkId)) {
    // Try lookup against our known-parks table.
    const direct = PARK_INTENSITY_BY_EXTERNAL_ID[parkId];
    if (direct !== undefined) return direct;
  }
  // Fallback: bucket by catalog size.
  if (attractionsInPark >= 20) return 3;
  if (attractionsInPark >= 10) return 2;
  return 1;
}

/** Stable set-ordering from the input catalog. Ties broken by park ID. */
function collectParks(attractions: readonly CatalogAttraction[]): Array<{
  parkId: string;
  attractionCount: number;
}> {
  const count = new Map<string, number>();
  for (const a of attractions) {
    count.set(a.parkId, (count.get(a.parkId) ?? 0) + 1);
  }
  return Array.from(count.entries())
    .map(([parkId, attractionCount]) => ({ parkId, attractionCount }))
    .sort((a, b) => a.parkId.localeCompare(b.parkId));
}

/** Count must-do attractions belonging to each park. */
function mustDoPerPark(
  attractions: readonly CatalogAttraction[],
  mustDoIds: readonly string[],
): Map<string, number> {
  const byAttractionId = new Map<string, CatalogAttraction>();
  for (const a of attractions) byAttractionId.set(a.id, a);

  const counts = new Map<string, number>();
  for (const id of mustDoIds) {
    const a = byAttractionId.get(id);
    if (!a) continue;
    counts.set(a.parkId, (counts.get(a.parkId) ?? 0) + 1);
  }
  return counts;
}

// ─── Core scorer ────────────────────────────────────────────────────────────

type ParkMeta = {
  parkId: string;
  attractionCount: number;
  intensity: number;
  mustDoCount: number;
};

/**
 * Score a candidate park for a specific day index.
 *
 * Signals (in decreasing dominance):
 *   +1000 × mustDoCount   — must-dos dominate every other heuristic
 *   +50   × intensity     — heavier parks get early-day bias
 *   −300  if parkId == yesterday's parkId and we still have unvisited parks
 *   −150  if intensity + prevIntensity >= BACK_TO_BACK_HEAVY_THRESHOLD
 *   +10   if day index is 0 and park has highest intensity (cold, fresh legs)
 */
function scoreCandidate(opts: {
  park: ParkMeta;
  dayIndex: number;
  totalDays: number;
  prev: ParkMeta | null;
  assignmentsSoFar: Map<string, number>;
  unvisitedParkCount: number;
}): number {
  const { park, dayIndex, prev, assignmentsSoFar, unvisitedParkCount } = opts;
  let score = 0;

  // Must-dos dominate. Weighted heavily so even 1 must-do in a park beats
  // intensity heuristics.
  score += park.mustDoCount * 1000;

  // Intensity bias: heavier parks earlier in the trip when legs are fresh.
  // Diminishes over the trip so day 0 benefits most.
  const intensityBonusScale = Math.max(0, 1 - dayIndex * 0.15);
  score += park.intensity * 50 * intensityBonusScale;

  // Coverage mandate — when unvisited parks remain, we MUST pick one of
  // them, even if an already-visited park has more must-dos. This prevents
  // a high-must-do park from hoarding every day and leaving parks untouched
  // on a trip that's long enough to visit them all at least once.
  const visitedTimes = assignmentsSoFar.get(park.parkId) ?? 0;
  if (visitedTimes > 0 && unvisitedParkCount > 0) {
    // Scale larger than the must-do weight (1000) × realistic max must-dos
    // per park (~6) so coverage wins against the strongest must-do pull.
    score -= 10_000 * visitedTimes;
  }

  // Consecutive-day penalty: discourage two of the same park in a row.
  if (prev !== null && prev.parkId === park.parkId) {
    score -= 300;
  }

  // Back-to-back heavy parks — EPCOT followed by MK etc.
  if (prev !== null && prev.intensity + park.intensity >= BACK_TO_BACK_HEAVY_THRESHOLD) {
    score -= 150;
  }

  // Day 0 small bonus for the heaviest park.
  if (dayIndex === 0 && park.intensity === 3) {
    score += 10;
  }

  return score;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Assign a park to each date. Returns a Map<date, parkId>.
 *
 * Guaranteed:
 *   - Every date gets a park (if the catalog has at least one).
 *   - No ties between parks result in non-determinism (ties break by parkId).
 *   - Must-dos steer assignment: a park with more must-dos beats one
 *     without, regardless of intensity.
 */
export function assignParksToDays(input: ParkAssignmentInput): Map<string, string> {
  const { dates, attractions, mustDoAttractionIds } = input;
  if (dates.length === 0) return new Map();

  const parkRows = collectParks(attractions);
  if (parkRows.length === 0) return new Map();

  // Build intensity map once.
  const intensityMap = new Map<string, number>();
  for (const row of parkRows) {
    intensityMap.set(row.parkId, intensityFor(row.parkId, row.attractionCount, new Map()));
  }

  const mustDos = mustDoPerPark(attractions, mustDoAttractionIds);

  const parks: ParkMeta[] = parkRows.map((row) => ({
    parkId: row.parkId,
    attractionCount: row.attractionCount,
    intensity: intensityMap.get(row.parkId) ?? 1,
    mustDoCount: mustDos.get(row.parkId) ?? 0,
  }));

  const result = new Map<string, string>();
  const assignments = new Map<string, number>();
  let prev: ParkMeta | null = null;

  for (let dayIndex = 0; dayIndex < dates.length; dayIndex++) {
    const unvisitedParkCount = parks.filter((p) => (assignments.get(p.parkId) ?? 0) === 0).length;

    let bestPark: ParkMeta | null = null;
    let bestScore = -Infinity;

    for (const park of parks) {
      const score = scoreCandidate({
        park,
        dayIndex,
        totalDays: dates.length,
        prev,
        assignmentsSoFar: assignments,
        unvisitedParkCount,
      });
      if (score > bestScore) {
        bestScore = score;
        bestPark = park;
      }
      // Ties already broken by parkRows sort order (lex); first iteration wins.
    }

    if (bestPark === null) continue;

    result.set(dates[dayIndex]!, bestPark.parkId);
    assignments.set(bestPark.parkId, (assignments.get(bestPark.parkId) ?? 0) + 1);
    prev = bestPark;
  }

  return result;
}
