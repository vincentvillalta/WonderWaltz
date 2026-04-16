// Pure TypeScript solver — zero NestJS dependencies, zero I/O side effects.
// Type contract + deterministic hash are complete (plan 03-04).
// The `solve()` implementation lands across plans 03-07..03-10.

export * from './types.js';
export * from './hash.js';
export * from './walkingGraph.js';
export * from './filter.js';
export * from './score.js';
export * from './construct.js';
export * from './meals.js';
export * from './shows.js';
export * from './localSearch.js';
export * from './resources.js';
export * from './lightningLane.js';
export * from './parkHours.js';
export * from './rules.js';
export * from './fatigue.js';

import { createHash } from 'node:crypto';
import type {
  SolverInput,
  DayPlan,
  PlanItem,
  CatalogAttraction,
  ForecastConfidence,
} from './types.js';
import { buildWalkingGraph, shortestPath } from './walkingGraph.js';
import type { WalkingGraph } from './walkingGraph.js';
import { filterAttractionsForParty } from './filter.js';
import { constructDay } from './construct.js';
import type { ForecastFn } from './construct.js';
import { insertMeals } from './meals.js';
import { insertShows } from './shows.js';
import { adjacentPairSwap } from './localSearch.js';
import { allocateLL } from './lightningLane.js';
import { insertRestBlocks } from './fatigue.js';
import { resolveParkHours } from './parkHours.js';
import type { LodgingType } from './parkHours.js';
// score.js re-exported via barrel; used by constructDay internally

// ─── Date helpers (timezone-naive) ─────────────────────────────────────────

/** Generate inclusive date range from startDate to endDate (YYYY-MM-DD). */
function generateDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const [sy, sm, sd] = startDate.split('-').map(Number);
  const [ey, em, ed] = endDate.split('-').map(Number);
  const start = Date.UTC(sy, sm - 1, sd);
  const end = Date.UTC(ey, em - 1, ed);

  for (let ts = start; ts <= end; ts += 86_400_000) {
    const d = new Date(ts);
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    dates.push(`${yyyy}-${mm}-${dd}`);
  }
  return dates;
}

/** Deterministic park assignment: round-robin across unique parkIds in catalog order. */
function assignParksToDays(dates: string[], attractions: CatalogAttraction[]): Map<string, string> {
  // Collect unique park IDs in stable order (first occurrence in sorted attractions)
  const seen = new Set<string>();
  const parks: string[] = [];
  const sorted = [...attractions].sort((a, b) => a.parkId.localeCompare(b.parkId));
  for (const a of sorted) {
    if (!seen.has(a.parkId)) {
      seen.add(a.parkId);
      parks.push(a.parkId);
    }
  }
  if (parks.length === 0) return new Map();

  const map = new Map<string, string>();
  for (let i = 0; i < dates.length; i++) {
    map.set(dates[i], parks[i % parks.length]);
  }
  return map;
}

/** Build a ForecastFn from the input's forecast buckets, with baseline fallback. */
function buildForecastFn(
  input: SolverInput,
  attractionMap: Map<string, CatalogAttraction>,
): ForecastFn {
  // Index forecasts by attractionId + bucketStart for O(1) lookup
  const forecastIndex = new Map<
    string,
    { predictedWaitMinutes: number; confidence: ForecastConfidence }
  >();
  for (const bucket of input.forecasts.buckets) {
    forecastIndex.set(`${bucket.attractionId}|${bucket.bucketStart}`, {
      predictedWaitMinutes: bucket.predictedWaitMinutes,
      confidence: bucket.confidence,
    });
  }

  return (attractionId: string, slotStart: string) => {
    // Try exact bucket match first
    const exact = forecastIndex.get(`${attractionId}|${slotStart}`);
    if (exact) return exact;

    // Fallback to deterministic hash-based forecast (no real data)
    const attraction = attractionMap.get(attractionId);
    if (attraction) {
      // Use a deterministic hash to generate a wait time
      const hash = createHash('sha256')
        .update(attractionId + slotStart)
        .digest();
      return {
        predictedWaitMinutes: (hash[0] % 60) + Math.max(10, attraction.baselineWaitMinutes / 2),
        confidence: 'low' as const,
      };
    }

    return { predictedWaitMinutes: 30, confidence: 'low' as const };
  };
}

/** Compute a total day score for local search scoring. */
function makeTotalScoreFn(
  walkingGraph: WalkingGraph,
  forecastFn: ForecastFn,
): (items: PlanItem[]) => number {
  return (items: PlanItem[]) => {
    let total = 0;
    let lastNodeId = 'entrance';
    for (const item of items) {
      if (item.type !== 'attraction' || !item.refId) continue;
      const walkSec = shortestPath(walkingGraph, lastNodeId, item.refId);
      const forecast = forecastFn(item.refId, item.startTime);
      // Simple scoring: inverse of wait + walk
      total += 1 / (1 + (forecast.predictedWaitMinutes || 0) + walkSec / 60);
      lastNodeId = item.refId;
    }
    return total;
  };
}

// ─── Main solve function ───────────────────────────────────────────────────

/**
 * Runs the full solver pipeline for a trip.
 *
 * Pipeline per day:
 * 1. resolveParkHours() -- extended day window
 * 2. filterAttractionsForParty() -- eligible attractions
 * 3. constructDay() -- must-do pins + greedy fill
 * 4. insertMeals() -- table-service hard pins + QS gaps
 * 5. insertShows() -- preferred shows with displacement scoring
 * 6. adjacentPairSwap() -- local search
 * 7. allocateLL() -- LL/DAS assignment + warnings
 * 8. insertRestBlocks() -- fatigue-based rest
 *
 * For multi-day: iterate per day, passing forward which rides were done.
 *
 * Pure -- no Math.random, no Date.now; deterministic.
 */
export function solve(input: SolverInput): DayPlan[] {
  const dates = generateDateRange(input.dateStart, input.dateEnd);
  if (dates.length === 0) return [];

  // Build walking graph from catalog edges
  const walkingGraph = buildWalkingGraph(
    input.catalog.walkingGraph.edges.map((e) => ({
      fromNodeId: e.fromNodeId,
      toNodeId: e.toNodeId,
      seconds: e.walkSeconds,
    })),
  );

  // Build attraction lookup
  const attractionMap = new Map<string, CatalogAttraction>();
  for (const a of input.catalog.attractions) {
    attractionMap.set(a.id, a);
  }

  // Build forecast function
  const forecastFn = buildForecastFn(input, attractionMap);

  // Assign parks to days deterministically
  const parkAssignment = assignParksToDays(dates, input.catalog.attractions);

  // Determine lodging type
  const lodgingType: LodgingType = (input.trip.lodgingType as LodgingType) || 'off_property';

  // Track visited attraction IDs across days for deduplication
  const visitedAttractionIds = new Set<string>();

  const dayPlans: DayPlan[] = [];

  for (let dayIndex = 0; dayIndex < dates.length; dayIndex++) {
    const date = dates[dayIndex];
    const parkId = parkAssignment.get(date);
    if (!parkId) continue;

    // 1. Resolve park hours
    const resolvedHours = resolveParkHours({
      date,
      parkId,
      lodgingType,
      baseHours: {
        open: `${date}T09:00:00`,
        close: `${date}T21:00:00`,
      },
      eehNights: [], // Default: no EEH nights unless specified
    });

    // 2. Filter attractions for this park + party
    const parkAttractions = input.catalog.attractions.filter((a) => a.parkId === parkId);
    const eligible = filterAttractionsForParty(parkAttractions, input.guests);

    // Deprioritize previously visited attractions by sorting them after new ones
    // but still including them (visitor might want to re-ride)
    const prioritized = [...eligible].sort((a, b) => {
      const aVisited = visitedAttractionIds.has(a.id) ? 1 : 0;
      const bVisited = visitedAttractionIds.has(b.id) ? 1 : 0;
      if (aVisited !== bVisited) return aVisited - bVisited;
      return a.id.localeCompare(b.id);
    });

    // Must-do IDs for this day: filter to attractions in this park
    const parkMustDoIds = input.preferences.mustDoAttractionIds.filter(
      (id) => attractionMap.get(id)?.parkId === parkId && !visitedAttractionIds.has(id),
    );

    // 3. Construct day (greedy + pinning)
    let items = constructDay({
      filteredAttractions: prioritized,
      mustDoAttractionIds: parkMustDoIds,
      parkHours: resolvedHours,
      walkingGraph,
      forecastFn,
      startNodeId: 'entrance',
    });

    // 4. Insert meals
    // Filter table-service reservations to this date
    const dayTsReservations = input.preferences.tableServiceReservations.filter((r) =>
      r.startTime.startsWith(date),
    );
    items = insertMeals({
      items,
      tableServiceReservations: dayTsReservations,
      guests: input.guests,
      budgetTier: input.preferences.budgetTier,
    });

    // 5. Insert shows
    const parkShows = input.catalog.shows.filter((s) => s.parkId === parkId);
    items = insertShows({
      items,
      showsInPark: parkShows,
      preferredShowIds: input.preferences.preferredShows,
      parkHours: resolvedHours,
    });

    // 6. Local search (adjacent pair swap)
    const totalScoreFn = makeTotalScoreFn(walkingGraph, forecastFn);
    items = adjacentPairSwap(items, totalScoreFn);

    // 7. Allocate LL + DAS
    const { itemsWithLL, warnings } = allocateLL({
      dayItems: items,
      attractions: parkAttractions,
      budgetTier: input.preferences.budgetTier,
      dasEnabled: input.trip.hasDas,
      bookingTime: `${date}T07:00:00`, // Pre-park booking time
      mustDoIds: parkMustDoIds,
    });
    items = itemsWithLL;

    // 8. Insert fatigue rest blocks
    items = insertRestBlocks(items, input.guests, input.preferences.budgetTier, {
      mustDoIds: parkMustDoIds,
      lodgingType: input.trip.lodgingType,
    });

    // Track visited attractions for multi-day dedup
    for (const item of items) {
      if (item.type === 'attraction' && item.refId) {
        visitedAttractionIds.add(item.refId);
      }
    }

    dayPlans.push({
      dayIndex,
      date,
      parkId,
      items,
      warnings,
    });
  }

  return dayPlans;
}
