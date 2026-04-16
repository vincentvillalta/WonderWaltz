/**
 * SOLV-03: Greedy construction pass with must-do hard pinning.
 *
 * Algorithm:
 * 1. Generate 30-min time slots across park hours.
 * 2. Pin must-do attractions at their forecast-optimal slots.
 * 3. Greedy fill: at each free slot, pick the highest-scoring remaining
 *    attraction that fits (including walk time from previous item).
 * 4. Return PlanItem[] sorted by startTime, no overlaps.
 *
 * Deterministic: same inputs → byte-identical output.
 * Tie-breaking by attraction.id lexicographic.
 *
 * All time arithmetic uses minutes-since-midnight on a date prefix string
 * to avoid Date-object timezone surprises. The solver is timezone-agnostic —
 * callers pass park-local wall-clock times as ISO strings.
 *
 * Pure — no randomness, no side effects, no I/O.
 */

import { createHash } from 'node:crypto';
import type { CatalogAttraction, ForecastConfidence, PlanItem } from './types.js';
import type { WalkingGraph } from './walkingGraph.js';
import { shortestPath } from './walkingGraph.js';
import { score } from './score.js';

// ─── Constants ──────────────────────────────────────────────────────────────

/** Slot granularity in minutes for time-window scanning. */
const SLOT_GRANULARITY = 30; // minutes

/** Staging buffer added to ride duration (must match score.ts). */
const STAGING_MINUTES = 5;

// ─── Input type ─────────────────────────────────────────────────────────────

export type ForecastFn = (
  attractionId: string,
  slotStart: string,
) => { predictedWaitMinutes: number; confidence: ForecastConfidence };

export type ParkHours = {
  /** ISO 8601 datetime string for park open (timezone-naive or with offset). */
  open: string;
  /** ISO 8601 datetime string for park close. */
  close: string;
};

export type ConstructDayInput = {
  filteredAttractions: CatalogAttraction[];
  mustDoAttractionIds: string[];
  parkHours: ParkHours;
  walkingGraph: WalkingGraph;
  forecastFn: ForecastFn;
  /** Node ID for starting position (e.g., 'entrance'). */
  startNodeId: string;
};

// ─── Time helpers (timezone-naive) ──────────────────────────────────────────

/** Parse ISO string into date prefix + minutes since midnight. */
function parseIso(iso: string): { datePrefix: string; minutes: number } {
  const match = iso.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})/);
  if (!match) throw new Error(`Invalid ISO string: ${iso}`);
  const [, datePrefix, hh, mm] = match as [string, string, string, string, string];
  return { datePrefix, minutes: parseInt(hh, 10) * 60 + parseInt(mm, 10) };
}

/** Build ISO string from date prefix + minutes since midnight (rounds to nearest integer). */
function buildIso(datePrefix: string, minutes: number): string {
  const roundedMin = Math.round(minutes);
  const h = Math.floor(roundedMin / 60);
  const m = roundedMin % 60;
  return `${datePrefix}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
}

/** Generate deterministic plan item ID from attraction ID + start time. */
function makePlanItemId(attractionId: string, startTime: string): string {
  return createHash('sha256')
    .update(attractionId + startTime)
    .digest('hex')
    .slice(0, 16);
}

/** Generate 30-min slot start times (as minutes since midnight). */
function generateSlotMinutes(openMin: number, closeMin: number): number[] {
  const slots: number[] = [];
  for (let t = openMin; t < closeMin; t += SLOT_GRANULARITY) {
    slots.push(t);
  }
  return slots;
}

// ─── Main construction function ─────────────────────────────────────────────

/**
 * Constructs a day plan using greedy scoring with must-do hard pinning.
 *
 * Returns PlanItem[] sorted by startTime ascending, no overlapping items.
 * Deterministic: same inputs produce identical output.
 */
export function constructDay(input: ConstructDayInput): PlanItem[] {
  const {
    filteredAttractions,
    mustDoAttractionIds,
    parkHours,
    walkingGraph,
    forecastFn,
    startNodeId,
  } = input;

  if (filteredAttractions.length === 0) return [];

  const { datePrefix, minutes: openMin } = parseIso(parkHours.open);
  const { minutes: closeMin } = parseIso(parkHours.close);
  const slotMinutes = generateSlotMinutes(openMin, closeMin);
  if (slotMinutes.length === 0) return [];

  // Build a lookup map for attractions by ID.
  const attractionMap = new Map<string, CatalogAttraction>();
  for (const a of filteredAttractions) {
    attractionMap.set(a.id, a);
  }

  // Set of occupied slot-start minutes (each slot is SLOT_GRANULARITY wide).
  const occupiedSlots = new Set<number>();
  const placedItems: PlanItem[] = [];
  const placedIds = new Set<string>();

  // ─── Helper: check if a range of minutes overlaps occupied slots ───────

  function isRangeOccupied(startMin: number, durationMin: number): boolean {
    const endMin = startMin + durationMin;
    for (let t = startMin; t < endMin; t += SLOT_GRANULARITY) {
      if (occupiedSlots.has(t)) return true;
    }
    return false;
  }

  function markRange(startMin: number, durationMin: number): void {
    const endMin = startMin + durationMin;
    for (let t = startMin; t < endMin; t += SLOT_GRANULARITY) {
      occupiedSlots.add(t);
    }
  }

  // ─── Phase 1: Pin must-do attractions at forecast-optimal slots ─────────

  for (const mustDoId of mustDoAttractionIds) {
    const attraction = attractionMap.get(mustDoId);
    if (!attraction) continue; // silently skip if not in filtered set

    const totalDurationMin = attraction.durationMinutes + STAGING_MINUTES;

    // Find the slot with the minimum predicted wait that is available.
    let bestSlotMin: number | null = null;
    let bestWait = Infinity;

    for (const slotMin of slotMinutes) {
      if (isRangeOccupied(slotMin, totalDurationMin)) continue;
      if (slotMin + totalDurationMin > closeMin) continue;

      const slotIso = buildIso(datePrefix, slotMin);
      const forecast = forecastFn(mustDoId, slotIso);
      if (forecast.predictedWaitMinutes < bestWait) {
        bestWait = forecast.predictedWaitMinutes;
        bestSlotMin = slotMin;
      }
    }

    if (bestSlotMin === null) continue; // no available slot

    const slotIso = buildIso(datePrefix, bestSlotMin);
    const forecast = forecastFn(mustDoId, slotIso);
    const waitMin = forecast.predictedWaitMinutes;
    const fullDurationMin = waitMin + attraction.durationMinutes + STAGING_MINUTES;
    const endMin = bestSlotMin + fullDurationMin;

    markRange(bestSlotMin, fullDurationMin);

    placedItems.push({
      id: makePlanItemId(mustDoId, slotIso),
      type: 'attraction',
      refId: mustDoId,
      name: attraction.name,
      startTime: slotIso,
      endTime: buildIso(datePrefix, endMin),
      waitMinutes: waitMin,
    });
    placedIds.add(mustDoId);
  }

  // ─── Phase 2: Greedy fill remaining slots ───────────────────────────────

  // Sort remaining attractions by ID for deterministic tie-breaking.
  const remaining = filteredAttractions
    .filter((a) => !placedIds.has(a.id))
    .sort((a, b) => a.id.localeCompare(b.id));

  let cursorMin = openMin;
  let lastNodeId = startNodeId;

  while (remaining.length > 0 && cursorMin < closeMin) {
    // Advance cursor past occupied slots.
    while (occupiedSlots.has(cursorMin) && cursorMin < closeMin) {
      cursorMin += SLOT_GRANULARITY;
    }
    if (cursorMin >= closeMin) break;

    const slotIso = buildIso(datePrefix, cursorMin);

    // Score each remaining attraction at this slot.
    let bestIdx = -1;
    let bestScore = -Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const a = remaining[i]!;
      const walkSec = shortestPath(walkingGraph, lastNodeId, a.id);
      const walkMin = walkSec / 60;
      const forecast = forecastFn(a.id, slotIso);
      const totalMin =
        walkMin + forecast.predictedWaitMinutes + a.durationMinutes + STAGING_MINUTES;

      // Check if this attraction fits before park close.
      if (cursorMin + totalMin > closeMin) continue;

      const s = score({
        attraction: a,
        predictedWaitMinutes: forecast.predictedWaitMinutes,
        walkSeconds: walkSec,
        confidence: forecast.confidence,
      });

      // Tie-break: higher score wins. On equal score, earlier index wins
      // (remaining is pre-sorted by ID lexicographic).
      if (s > bestScore) {
        bestScore = s;
        bestIdx = i;
      }
    }

    if (bestIdx === -1) {
      // No attraction fits at this cursor position, advance.
      cursorMin += SLOT_GRANULARITY;
      continue;
    }

    const chosen = remaining[bestIdx]!;
    const walkSec = shortestPath(walkingGraph, lastNodeId, chosen.id);
    const walkMin = walkSec / 60;
    const forecast = forecastFn(chosen.id, slotIso);
    const waitMin = forecast.predictedWaitMinutes;

    // Effective start after walk.
    const effectiveStartMin = cursorMin + walkMin;
    const totalAfterArrivalMin = waitMin + chosen.durationMinutes + STAGING_MINUTES;
    const endMin = effectiveStartMin + totalAfterArrivalMin;

    markRange(cursorMin, endMin - cursorMin);

    const effectiveStartIso = buildIso(datePrefix, effectiveStartMin);

    placedItems.push({
      id: makePlanItemId(chosen.id, effectiveStartIso),
      type: 'attraction',
      refId: chosen.id,
      name: chosen.name,
      startTime: effectiveStartIso,
      endTime: buildIso(datePrefix, endMin),
      waitMinutes: waitMin,
    });

    placedIds.add(chosen.id);
    remaining.splice(bestIdx, 1);
    lastNodeId = chosen.id;
    cursorMin = Math.ceil(endMin / SLOT_GRANULARITY) * SLOT_GRANULARITY; // snap to next slot boundary
  }

  // ─── Sort by startTime and return ───────────────────────────────────────

  placedItems.sort((a, b) => a.startTime.localeCompare(b.startTime));
  return placedItems;
}
