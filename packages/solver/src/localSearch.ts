/**
 * SOLV-03 continuation: Adjacent-pair swap local search.
 *
 * Algorithm:
 * - Single linear pass: for i in 0..n-2, try swapping items[i] and items[i+1].
 * - Keep the swap if totalScoreFn(swapped) > totalScoreFn(original).
 * - Hard-pinned items (dining with TS reservation, or custom isPinned) never move.
 * - No recursion, no multi-pass — deterministic and fast.
 *
 * Pure — no randomness, no side effects, no I/O.
 */

import type { PlanItem } from './types.js';

// ─── Options ───────────────────────────────────────────────────────────────

export type AdjacentPairSwapOptions = {
  /**
   * Custom predicate to determine if an item is pinned (cannot be swapped).
   * Defaults to pinning items with type === 'dining'.
   */
  isPinned?: (item: PlanItem) => boolean;
};

// ─── Default pinning ───────────────────────────────────────────────────────

/**
 * Default isPinned: dining items are always pinned (table-service reservations
 * have fixed times). Must-do attractions placed by forecast are NOT pinned —
 * they can shift during local search.
 */
function defaultIsPinned(item: PlanItem): boolean {
  return item.type === 'dining';
}

// ─── Main function ─────────────────────────────────────────────────────────

/**
 * Adjacent-pair swap local search.
 *
 * Single linear pass through the items array. For each adjacent pair (i, i+1),
 * if neither item is pinned, try swapping. Keep the swap if the total score
 * improves. This is deterministic: same inputs always produce the same output.
 *
 * Does NOT mutate the input array — returns a new array.
 *
 * @param items - Plan items in current order
 * @param totalScoreFn - Computes total day score for an ordering
 * @param options - Optional configuration (custom isPinned)
 * @returns Improved item ordering (or same ordering if no improvement found)
 */
export function adjacentPairSwap(
  items: PlanItem[],
  totalScoreFn: (items: PlanItem[]) => number,
  options?: AdjacentPairSwapOptions,
): PlanItem[] {
  if (items.length <= 1) return [...items];

  const isPinned = options?.isPinned ?? defaultIsPinned;

  // Work on a shallow copy to avoid mutating input.
  const current = [...items];

  for (let i = 0; i < current.length - 1; i++) {
    // Skip if either item in the pair is pinned.
    if (isPinned(current[i]!) || isPinned(current[i + 1]!)) {
      continue;
    }

    const currentScore = totalScoreFn(current);

    // Try the swap.
    const temp = current[i]!;
    current[i] = current[i + 1]!;
    current[i + 1] = temp;

    const swappedScore = totalScoreFn(current);

    if (swappedScore > currentScore) {
      // Keep the swap — score improved.
    } else {
      // Revert the swap — no improvement.
      current[i + 1] = current[i]!;
      current[i] = temp;
    }
  }

  return current;
}
