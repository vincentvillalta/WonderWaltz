import { describe, it, expect } from 'vitest';
import { allocateLL } from '../src/lightningLane.js';
import type { CatalogAttraction, PlanItem } from '../src/types.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeAttraction(
  overrides: Partial<CatalogAttraction> & { id: string; name: string },
): CatalogAttraction {
  return {
    parkId: 'mk',
    tags: [],
    baselineWaitMinutes: 30,
    lightningLaneType: null,
    isHeadliner: false,
    durationMinutes: 10,
    ...overrides,
  };
}

function makeItem(
  overrides: Partial<PlanItem> & { id: string; refId: string; name: string },
): PlanItem {
  return {
    type: 'attraction',
    startTime: '2026-06-01T09:00:00',
    endTime: '2026-06-01T09:30:00',
    waitMinutes: 30,
    ...overrides,
  };
}

// 6 rides: mix of LLMP, LLSP, and none — enough to exercise DAS pool
const attractions: CatalogAttraction[] = [
  makeAttraction({
    id: 'r1',
    name: 'Space Mountain',
    lightningLaneType: 'multi_pass',
    isHeadliner: true,
  }),
  makeAttraction({
    id: 'r2',
    name: 'Big Thunder',
    lightningLaneType: 'multi_pass',
    isHeadliner: true,
  }),
  makeAttraction({
    id: 'r3',
    name: 'Seven Dwarfs',
    lightningLaneType: 'single_pass',
    isHeadliner: true,
  }),
  makeAttraction({
    id: 'r4',
    name: 'Haunted Mansion',
    lightningLaneType: 'multi_pass',
    isHeadliner: false,
  }),
  makeAttraction({ id: 'r5', name: 'Pirates', lightningLaneType: null, isHeadliner: false }),
  makeAttraction({
    id: 'r6',
    name: 'Jungle Cruise',
    lightningLaneType: 'multi_pass',
    isHeadliner: false,
  }),
];

const dayItems: PlanItem[] = [
  makeItem({
    id: 'i1',
    refId: 'r1',
    name: 'Space Mountain',
    waitMinutes: 60,
    startTime: '2026-06-01T09:00:00',
    endTime: '2026-06-01T10:00:00',
  }),
  makeItem({
    id: 'i2',
    refId: 'r2',
    name: 'Big Thunder',
    waitMinutes: 45,
    startTime: '2026-06-01T10:00:00',
    endTime: '2026-06-01T10:45:00',
  }),
  makeItem({
    id: 'i3',
    refId: 'r3',
    name: 'Seven Dwarfs',
    waitMinutes: 90,
    startTime: '2026-06-01T11:00:00',
    endTime: '2026-06-01T12:30:00',
  }),
  makeItem({
    id: 'i4',
    refId: 'r4',
    name: 'Haunted Mansion',
    waitMinutes: 30,
    startTime: '2026-06-01T13:00:00',
    endTime: '2026-06-01T13:30:00',
  }),
  makeItem({
    id: 'i5',
    refId: 'r5',
    name: 'Pirates',
    waitMinutes: 50,
    startTime: '2026-06-01T14:00:00',
    endTime: '2026-06-01T14:50:00',
  }),
  makeItem({
    id: 'i6',
    refId: 'r6',
    name: 'Jungle Cruise',
    waitMinutes: 40,
    startTime: '2026-06-01T15:00:00',
    endTime: '2026-06-01T15:40:00',
  }),
];

// ─── DAS tests ─────────────────────────────────────────────────────────────

describe('DAS allocation', () => {
  it('dasEnabled: true + fairy tier → DAS pool + LLMP pool both used; more resources total', () => {
    const withDas = allocateLL({
      dayItems,
      attractions,
      budgetTier: 'fairy',
      dasEnabled: true,
      bookingTime: '2026-06-01T07:00:00',
    });

    const withoutDas = allocateLL({
      dayItems,
      attractions,
      budgetTier: 'fairy',
      dasEnabled: false,
      bookingTime: '2026-06-01T07:00:00',
    });

    // With DAS, total LL-assigned items should be greater
    const dasLLCount = withDas.itemsWithLL.filter(
      (i) => i.lightningLaneType != null || i.notes?.includes('DAS'),
    ).length;
    const noDasLLCount = withoutDas.itemsWithLL.filter((i) => i.lightningLaneType != null).length;

    expect(dasLLCount).toBeGreaterThan(noDasLLCount);
  });

  it('dasEnabled: false → no DAS pool used', () => {
    const result = allocateLL({
      dayItems,
      attractions,
      budgetTier: 'fairy',
      dasEnabled: false,
      bookingTime: '2026-06-01T07:00:00',
    });

    // No item should have DAS notation
    const dasItems = result.itemsWithLL.filter((i) => i.notes?.includes('DAS'));
    expect(dasItems.length).toBe(0);
  });

  it('DAS items have distinct label from regular LL items', () => {
    const result = allocateLL({
      dayItems,
      attractions,
      budgetTier: 'fairy',
      dasEnabled: true,
      bookingTime: '2026-06-01T07:00:00',
    });

    const dasItems = result.itemsWithLL.filter((i) => i.notes?.includes('DAS'));
    const llItems = result.itemsWithLL.filter(
      (i) => i.lightningLaneType != null && !i.notes?.includes('DAS'),
    );

    // At least one DAS item and one LL item should exist
    expect(dasItems.length).toBeGreaterThan(0);
    expect(llItems.length).toBeGreaterThan(0);

    // DAS items should have a DAS-specific note
    for (const item of dasItems) {
      expect(item.notes).toMatch(/DAS/);
    }
  });

  it('DAS pool has capacity 3', () => {
    const result = allocateLL({
      dayItems,
      attractions,
      budgetTier: 'fairy',
      dasEnabled: true,
      bookingTime: '2026-06-01T07:00:00',
    });

    const dasItems = result.itemsWithLL.filter((i) => i.notes?.includes('DAS'));
    expect(dasItems.length).toBeLessThanOrEqual(3);
  });
});
