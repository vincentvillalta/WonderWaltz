/**
 * SOLV-03 (revised 2026-04): Greedy construction pass with must-do *scoring*
 * boost (not hard pinning).
 *
 * Algorithm:
 *   1. Generate 30-min time slots across park hours.
 *   2. Greedy fill: at each free slot, pick the highest-scoring remaining
 *      attraction that fits (including walk time from previous item).
 *      Must-dos receive a 5x multiplier in score() so they dominate
 *      comparisons but will still defer to a much better time slot when
 *      the forecast says the morning is 180min vs a 30min evening slot.
 *   3. Rescue pass: any must-do not placed by the greedy fill is force-
 *      inserted at its best remaining slot (a warning is attached to the
 *      plan item's notes when the wait exceeds 90min).
 *
 * Return: PlanItem[] sorted by startTime, no overlaps. Deterministic —
 * same inputs → byte-identical output. Tie-breaking by attraction.id
 * lexicographic.
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

/** Wait threshold above which rescued must-dos get a warning note. */
const MUST_DO_WARN_WAIT_MIN = 90;

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
 * Constructs a day plan using greedy scoring with a must-do rescue pass.
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

  const mustDoSet = new Set(mustDoAttractionIds);

  // Set of occupied slot-start minutes (each slot is SLOT_GRANULARITY wide).
  const occupiedSlots = new Set<number>();
  const placedItems: PlanItem[] = [];
  const placedIds = new Set<string>();

  // ─── Helpers: occupancy tracking ───────────────────────────────────────

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

  // ─── Phase 1: Greedy fill with must-do scoring boost ────────────────────

  // Sort candidates by ID for deterministic tie-breaking.
  const remaining = [...filteredAttractions].sort((a, b) => a.id.localeCompare(b.id));

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
        isMustDo: mustDoSet.has(a.id),
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

  // ─── Phase 2: Rescue pass for unplaced must-dos ─────────────────────────
  // The scoring-based greedy can legitimately skip a must-do if every slot
  // is dominated by other rides. Walk back through and force-insert at the
  // best remaining slot per must-do ID. Emits a warning note if the wait
  // exceeds MUST_DO_WARN_WAIT_MIN.

  for (const mustDoId of mustDoAttractionIds) {
    if (placedIds.has(mustDoId)) continue;
    const attraction = attractionMap.get(mustDoId);
    if (!attraction) continue; // not in filtered set (height, etc.)

    let bestSlotMin: number | null = null;
    let bestWait = Infinity;
    const durationNoWaitMin = attraction.durationMinutes + STAGING_MINUTES;

    for (const slotMin of slotMinutes) {
      const slotIso = buildIso(datePrefix, slotMin);
      const forecast = forecastFn(mustDoId, slotIso);
      const totalMin = forecast.predictedWaitMinutes + durationNoWaitMin;
      if (slotMin + totalMin > closeMin) continue;
      if (isRangeOccupied(slotMin, totalMin)) continue;

      if (forecast.predictedWaitMinutes < bestWait) {
        bestWait = forecast.predictedWaitMinutes;
        bestSlotMin = slotMin;
      }
    }

    if (bestSlotMin === null) continue; // nothing fits — solver output will be missing this must-do

    const slotIso = buildIso(datePrefix, bestSlotMin);
    const waitMin = bestWait;
    const endMin = bestSlotMin + waitMin + durationNoWaitMin;
    markRange(bestSlotMin, endMin - bestSlotMin);

    const item: PlanItem = {
      id: makePlanItemId(mustDoId, slotIso),
      type: 'attraction',
      refId: mustDoId,
      name: attraction.name,
      startTime: slotIso,
      endTime: buildIso(datePrefix, endMin),
      waitMinutes: waitMin,
    };
    if (waitMin > MUST_DO_WARN_WAIT_MIN) {
      item.notes = `Must-do rescued at high wait (${Math.round(waitMin)}min) — consider Lightning Lane.`;
    }
    placedItems.push(item);
    placedIds.add(mustDoId);
  }

  // ─── Sort by startTime and return ───────────────────────────────────────

  placedItems.sort((a, b) => a.startTime.localeCompare(b.startTime));
  return placedItems;
}
