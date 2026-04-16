/**
 * SOLV-04: Lightning Lane allocation.
 * SOLV-08: DAS as LL-equivalent resource.
 *
 * Selection rule (from CONTEXT.md Area 6):
 * - Filter to top-N scored rides in the day plan.
 * - Assign LL slots to the longest-wait rides within that filtered set.
 * - Respect per-tier budgets: Pixie=0 LLSP, Fairy=1 LLSP, Royal=2 LLSP.
 * - LLMP capacity: 3 for all tiers.
 * - DAS (when enabled): separate pool with capacity 3, any ride eligible.
 *
 * 90-minute fixed return-window offset from booking time.
 *
 * Pure — no randomness, no side effects, no I/O.
 */

import type { CatalogAttraction, PlanItem, BudgetTier } from './types.js';
import { ResourcePool } from './resources.js';

// ─── Constants ──────────────────────────────────────────────────────────────

/** Top-N scored rides to consider for LL allocation. */
const TOP_N = 10;

/** LLMP capacity per day (all tiers). */
const LLMP_CAPACITY = 3;

/** LLSP capacity per tier. */
const LLSP_CAPACITY: Record<BudgetTier, number> = {
  pixie: 0,
  fairy: 1,
  royal: 2,
};

/** DAS capacity per day (when enabled). */
const DAS_CAPACITY = 3;

// ─── Input type ─────────────────────────────────────────────────────────────

export type AllocateLLInput = {
  dayItems: PlanItem[];
  attractions: CatalogAttraction[];
  budgetTier: BudgetTier;
  dasEnabled: boolean;
  /** ISO 8601 booking time (pre-park; return window = booking + 90min). */
  bookingTime: string;
  /** Optional must-do IDs for upgrade warning generation. */
  mustDoIds?: string[];
};

export type AllocateLLResult = {
  itemsWithLL: PlanItem[];
  warnings: string[];
};

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Build a lookup map from attraction ID to CatalogAttraction. */
function buildAttractionMap(attractions: CatalogAttraction[]): Map<string, CatalogAttraction> {
  const map = new Map<string, CatalogAttraction>();
  for (const a of attractions) {
    map.set(a.id, a);
  }
  return map;
}

/**
 * Next tier recommendation for upgrade warnings.
 */
function nextTier(tier: BudgetTier): string | null {
  if (tier === 'pixie') return 'Fairy Tale';
  if (tier === 'fairy') return 'Royal Treatment';
  return null;
}

// ─── Main allocator ─────────────────────────────────────────────────────────

/**
 * Allocates Lightning Lane (LLMP + LLSP) and optionally DAS slots to day items.
 *
 * Selection: top-N scored rides (by wait time descending as proxy — higher wait =
 * more time saved = higher effective score) → assign LL to longest-wait rides
 * within that set, respecting per-pool capacity and LL type eligibility.
 *
 * Returns a new items array with lightningLaneType and notes set on allocated
 * items, plus warnings for must-do rides that didn't receive LL.
 */
export function allocateLL(input: AllocateLLInput): AllocateLLResult {
  const { dayItems, attractions, budgetTier, dasEnabled, bookingTime, mustDoIds } = input;

  const attractionMap = buildAttractionMap(attractions);
  const warnings: string[] = [];

  // Create resource pools.
  const llmpPool = new ResourcePool('LLMP', LLMP_CAPACITY);
  const llspPool = new ResourcePool('LLSP', LLSP_CAPACITY[budgetTier]);
  const dasPool = dasEnabled ? new ResourcePool('DAS', DAS_CAPACITY) : null;

  // Filter to attraction items only, with catalog match.
  const candidateItems = dayItems
    .filter((item) => item.type === 'attraction' && item.refId && attractionMap.has(item.refId))
    .map((item) => ({
      item,
      attraction: attractionMap.get(item.refId!)!,
      waitMinutes: item.waitMinutes ?? 0,
    }));

  // Sort by wait time descending (longest wait first = most time saved).
  const sortedCandidates = [...candidateItems].sort((a, b) => b.waitMinutes - a.waitMinutes);

  // Take top-N.
  const topN = sortedCandidates.slice(0, TOP_N);

  // Track which ride IDs have been allocated (across all pools).
  const allocatedRideIds = new Set<string>();

  // Build the output items map (keyed by item.id for easy lookup).
  const itemUpdates = new Map<
    string,
    { lightningLaneType?: 'multi_pass' | 'single_pass' | null; notes?: string }
  >();

  // ─── Phase 1: LLMP allocation (longest-wait multi_pass rides) ───────────

  const llmpCandidates = topN.filter((c) => c.attraction.lightningLaneType === 'multi_pass');

  for (const candidate of llmpCandidates) {
    if (allocatedRideIds.has(candidate.attraction.id)) continue;
    const returnWindow = llmpPool.allocate(candidate.attraction.id, bookingTime);
    if (returnWindow) {
      allocatedRideIds.add(candidate.attraction.id);
      itemUpdates.set(candidate.item.id, {
        lightningLaneType: 'multi_pass',
        notes: `LL Multi Pass — return window ${formatTime(returnWindow.start)}–${formatTime(returnWindow.end)}`,
      });
    }
  }

  // ─── Phase 2: LLSP allocation (longest-wait single_pass rides) ──────────

  const llspCandidates = topN.filter((c) => c.attraction.lightningLaneType === 'single_pass');

  for (const candidate of llspCandidates) {
    if (allocatedRideIds.has(candidate.attraction.id)) continue;
    const returnWindow = llspPool.allocate(candidate.attraction.id, bookingTime);
    if (returnWindow) {
      allocatedRideIds.add(candidate.attraction.id);
      itemUpdates.set(candidate.item.id, {
        lightningLaneType: 'single_pass',
        notes: `LL Single Pass — return window ${formatTime(returnWindow.start)}–${formatTime(returnWindow.end)}`,
      });
    }
  }

  // ─── Phase 3: DAS allocation (any ride, longest-wait first) ─────────────

  if (dasPool) {
    // DAS can apply to any ride not already allocated.
    const dasCandidates = topN.filter((c) => !allocatedRideIds.has(c.attraction.id));

    for (const candidate of dasCandidates) {
      const returnWindow = dasPool.allocate(candidate.attraction.id, bookingTime);
      if (returnWindow) {
        allocatedRideIds.add(candidate.attraction.id);
        itemUpdates.set(candidate.item.id, {
          notes: `DAS return time — ${formatTime(returnWindow.start)}–${formatTime(returnWindow.end)}`,
        });
      }
    }
  }

  // ─── Phase 4: Warnings for must-do rides without LL ─────────────────────

  if (mustDoIds) {
    for (const mustDoId of mustDoIds) {
      if (allocatedRideIds.has(mustDoId)) continue;

      const attraction = attractionMap.get(mustDoId);
      if (!attraction) continue;

      const next = nextTier(budgetTier);
      if (next && attraction.lightningLaneType) {
        warnings.push(`Upgrade to ${next} for LL access on ${attraction.name}`);
      }
    }
  }

  // ─── Build result items ─────────────────────────────────────────────────

  const itemsWithLL: PlanItem[] = dayItems.map((item) => {
    const update = itemUpdates.get(item.id);
    if (!update) return { ...item };
    return {
      ...item,
      ...(update.lightningLaneType !== undefined
        ? { lightningLaneType: update.lightningLaneType }
        : {}),
      notes: update.notes,
    };
  });

  return { itemsWithLL, warnings };
}

// ─── Time formatting helper ─────────────────────────────────────────────────

/** Extract HH:MM from ISO string for display. */
function formatTime(iso: string): string {
  const match = iso.match(/T(\d{2}:\d{2})/);
  return match ? match[1] : iso;
}
