import { describe, it, expect } from 'vitest';
import { adjacentPairSwap } from '../src/localSearch.js';
import type { PlanItem } from '../src/types.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeItem(overrides: Partial<PlanItem> & { id: string; name: string }): PlanItem {
  return {
    type: 'attraction',
    startTime: '2026-06-01T09:00:00',
    endTime: '2026-06-01T09:30:00',
    ...overrides,
  };
}

/**
 * Simple total score function: sum of numeric "score" values encoded in item
 * notes field. Items placed earlier with higher scores = better total.
 *
 * For testing: score = sum of (n - index) * noteScore for each item.
 * This incentivises high-score items being placed first.
 */
function positionalScoreFn(items: PlanItem[]): number {
  let total = 0;
  const n = items.length;
  for (let i = 0; i < n; i++) {
    const noteScore = parseInt(items[i]!.notes ?? '1', 10);
    total += (n - i) * noteScore;
  }
  return total;
}

// ─── adjacentPairSwap ──────────────────────────────────────────────────────

describe('adjacentPairSwap', () => {
  it('swaps adjacent items when total score improves', () => {
    // A(low score=1) then B(high score=10) then C(mid score=5)
    // Positional: (3*1 + 2*10 + 1*5) = 28
    // After swap A,B: (3*10 + 2*1 + 1*5) = 37 → better, kept
    const items: PlanItem[] = [
      makeItem({
        id: 'a',
        name: 'A-low',
        notes: '1',
        startTime: '2026-06-01T09:00:00',
        endTime: '2026-06-01T09:30:00',
      }),
      makeItem({
        id: 'b',
        name: 'B-high',
        notes: '10',
        startTime: '2026-06-01T09:30:00',
        endTime: '2026-06-01T10:00:00',
      }),
      makeItem({
        id: 'c',
        name: 'C-mid',
        notes: '5',
        startTime: '2026-06-01T10:00:00',
        endTime: '2026-06-01T10:30:00',
      }),
    ];

    const result = adjacentPairSwap(items, positionalScoreFn);
    // After pass: i=0 swaps A,B → [B,A,C] (score 37>28); i=1 swaps A,C → [B,C,A] (score 41>37)
    expect(result[0]!.id).toBe('b');
    expect(result[1]!.id).toBe('c');
    expect(result[2]!.id).toBe('a');
  });

  it('does not swap pinned dining items with table service reservations', () => {
    // Dining item at index 0 with type=dining should not move
    const items: PlanItem[] = [
      makeItem({
        id: 'dinner',
        name: 'BOG Dinner',
        type: 'dining',
        notes: '1',
        startTime: '2026-06-01T13:00:00',
        endTime: '2026-06-01T14:00:00',
      }),
      makeItem({
        id: 'ride',
        name: 'High-score ride',
        notes: '100',
        startTime: '2026-06-01T14:00:00',
        endTime: '2026-06-01T14:30:00',
      }),
    ];

    const result = adjacentPairSwap(items, positionalScoreFn);
    // Dining stays at index 0 despite swap being "better"
    expect(result[0]!.id).toBe('dinner');
    expect(result[1]!.id).toBe('ride');
  });

  it('does not swap items when custom isPinned marks them', () => {
    // Non-dining item that is pinned via custom callback
    const items: PlanItem[] = [
      makeItem({
        id: 'pinned-a',
        name: 'Pinned A',
        notes: '1',
        startTime: '2026-06-01T09:00:00',
        endTime: '2026-06-01T09:30:00',
      }),
      makeItem({
        id: 'b',
        name: 'Better B',
        notes: '100',
        startTime: '2026-06-01T09:30:00',
        endTime: '2026-06-01T10:00:00',
      }),
    ];

    // Custom isPinned: 'pinned-a' is pinned
    const result = adjacentPairSwap(items, positionalScoreFn, {
      isPinned: (item) => item.id === 'pinned-a',
    });

    // Pinned item must stay at its position
    expect(result[0]!.id).toBe('pinned-a');
    expect(result[1]!.id).toBe('b');
  });

  it('produces identical output on repeated calls (determinism)', () => {
    const items: PlanItem[] = [
      makeItem({
        id: 'a',
        name: 'A',
        notes: '3',
        startTime: '2026-06-01T09:00:00',
        endTime: '2026-06-01T09:30:00',
      }),
      makeItem({
        id: 'b',
        name: 'B',
        notes: '7',
        startTime: '2026-06-01T09:30:00',
        endTime: '2026-06-01T10:00:00',
      }),
      makeItem({
        id: 'c',
        name: 'C',
        notes: '2',
        startTime: '2026-06-01T10:00:00',
        endTime: '2026-06-01T10:30:00',
      }),
    ];

    const run1 = adjacentPairSwap(items, positionalScoreFn);
    const run2 = adjacentPairSwap(items, positionalScoreFn);

    expect(run1.map((i) => i.id)).toEqual(run2.map((i) => i.id));
    expect(JSON.stringify(run1)).toBe(JSON.stringify(run2));
  });

  it('returns items unchanged when already optimal', () => {
    // Items already in descending score order — no swap improves
    const items: PlanItem[] = [
      makeItem({
        id: 'a',
        name: 'A-best',
        notes: '10',
        startTime: '2026-06-01T09:00:00',
        endTime: '2026-06-01T09:30:00',
      }),
      makeItem({
        id: 'b',
        name: 'B-mid',
        notes: '5',
        startTime: '2026-06-01T09:30:00',
        endTime: '2026-06-01T10:00:00',
      }),
      makeItem({
        id: 'c',
        name: 'C-low',
        notes: '1',
        startTime: '2026-06-01T10:00:00',
        endTime: '2026-06-01T10:30:00',
      }),
    ];

    const result = adjacentPairSwap(items, positionalScoreFn);
    expect(result.map((i) => i.id)).toEqual(['a', 'b', 'c']);
  });

  it('handles empty input', () => {
    const result = adjacentPairSwap([], positionalScoreFn);
    expect(result).toEqual([]);
  });

  it('handles single item input', () => {
    const items: PlanItem[] = [
      makeItem({
        id: 'solo',
        name: 'Solo',
        notes: '5',
        startTime: '2026-06-01T09:00:00',
        endTime: '2026-06-01T09:30:00',
      }),
    ];
    const result = adjacentPairSwap(items, positionalScoreFn);
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe('solo');
  });

  it('does not mutate the input array', () => {
    const items: PlanItem[] = [
      makeItem({
        id: 'a',
        name: 'A',
        notes: '1',
        startTime: '2026-06-01T09:00:00',
        endTime: '2026-06-01T09:30:00',
      }),
      makeItem({
        id: 'b',
        name: 'B',
        notes: '10',
        startTime: '2026-06-01T09:30:00',
        endTime: '2026-06-01T10:00:00',
      }),
    ];

    const originalIds = items.map((i) => i.id);
    adjacentPairSwap(items, positionalScoreFn);
    expect(items.map((i) => i.id)).toEqual(originalIds);
  });

  it('accepts a custom isPinned callback', () => {
    const items: PlanItem[] = [
      makeItem({
        id: 'pinned',
        name: 'Pinned',
        notes: '1',
        startTime: '2026-06-01T09:00:00',
        endTime: '2026-06-01T09:30:00',
      }),
      makeItem({
        id: 'better',
        name: 'Better',
        notes: '100',
        startTime: '2026-06-01T09:30:00',
        endTime: '2026-06-01T10:00:00',
      }),
    ];

    // Custom isPinned: item with id 'pinned' is pinned
    const result = adjacentPairSwap(items, positionalScoreFn, {
      isPinned: (item) => item.id === 'pinned',
    });

    // Pinned item must not move
    expect(result[0]!.id).toBe('pinned');
    expect(result[1]!.id).toBe('better');
  });

  it('skips swap when either neighbor is pinned (dining)', () => {
    const items: PlanItem[] = [
      makeItem({
        id: 'a',
        name: 'A',
        notes: '1',
        startTime: '2026-06-01T09:00:00',
        endTime: '2026-06-01T09:30:00',
      }),
      makeItem({
        id: 'ts-dinner',
        name: 'TS Dinner',
        type: 'dining',
        notes: '2',
        startTime: '2026-06-01T12:00:00',
        endTime: '2026-06-01T13:00:00',
      }),
      makeItem({
        id: 'c',
        name: 'C',
        notes: '100',
        startTime: '2026-06-01T13:00:00',
        endTime: '2026-06-01T13:30:00',
      }),
    ];

    const result = adjacentPairSwap(items, positionalScoreFn);
    // Dining at index 1 blocks swap with index 0 and swap with index 2
    expect(result[1]!.id).toBe('ts-dinner');
  });
});
