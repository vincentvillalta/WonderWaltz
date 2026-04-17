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

// 5 candidate attractions with varying LL types and wait times
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
    waitMinutes: 20,
    startTime: '2026-06-01T14:00:00',
    endTime: '2026-06-01T14:20:00',
  }),
];

// ─── allocateLL ────────────────────────────────────────────────────────────

describe('allocateLL', () => {
  it('fairy tier: assigns 3 LLMP + 1 LLSP; one ride left without LL', () => {
    const result = allocateLL({
      dayItems,
      attractions,
      budgetTier: 'fairy',
      dasEnabled: false,
      bookingTime: '2026-06-01T07:00:00',
    });

    const llItems = result.itemsWithLL.filter((i) => i.lightningLaneType != null);

    // 3 LLMP rides (r1, r2, r4 are multi_pass; top by wait: r1=60, r2=45, r4=30)
    const llmpItems = llItems.filter((i) => i.lightningLaneType === 'multi_pass');
    expect(llmpItems.length).toBe(3);

    // 1 LLSP ride (r3 is single_pass; fairy gets 1)
    const llspItems = llItems.filter((i) => i.lightningLaneType === 'single_pass');
    expect(llspItems.length).toBe(1);

    // r5 (Pirates, no LL type) should not get LL
    const piratesItem = result.itemsWithLL.find((i) => i.refId === 'r5');
    expect(piratesItem?.lightningLaneType).toBeUndefined();
  });

  it('pixie tier: 3 LLMP + 0 LLSP', () => {
    const result = allocateLL({
      dayItems,
      attractions,
      budgetTier: 'pixie',
      dasEnabled: false,
      bookingTime: '2026-06-01T07:00:00',
    });

    const llItems = result.itemsWithLL.filter((i) => i.lightningLaneType != null);
    const llmpItems = llItems.filter((i) => i.lightningLaneType === 'multi_pass');
    const llspItems = llItems.filter((i) => i.lightningLaneType === 'single_pass');

    expect(llmpItems.length).toBe(3);
    expect(llspItems.length).toBe(0);
  });

  it('royal tier: 3 LLMP + up to 2 LLSP', () => {
    // Add a second single_pass attraction
    const extAttrs = [
      ...attractions,
      makeAttraction({
        id: 'r6',
        name: 'Tron',
        lightningLaneType: 'single_pass',
        isHeadliner: true,
      }),
    ];
    const extItems = [
      ...dayItems,
      makeItem({
        id: 'i6',
        refId: 'r6',
        name: 'Tron',
        waitMinutes: 80,
        startTime: '2026-06-01T15:00:00',
        endTime: '2026-06-01T16:20:00',
      }),
    ];

    const result = allocateLL({
      dayItems: extItems,
      attractions: extAttrs,
      budgetTier: 'royal',
      dasEnabled: false,
      bookingTime: '2026-06-01T07:00:00',
    });

    const llItems = result.itemsWithLL.filter((i) => i.lightningLaneType != null);
    const llspItems = llItems.filter((i) => i.lightningLaneType === 'single_pass');
    expect(llspItems.length).toBe(2);
  });

  it('must-do without budget emits warning with tier-upgrade text', () => {
    // Pixie tier with Seven Dwarfs as must-do (single_pass, no LLSP budget)
    const result = allocateLL({
      dayItems,
      attractions,
      budgetTier: 'pixie',
      dasEnabled: false,
      bookingTime: '2026-06-01T07:00:00',
      mustDoIds: ['r3'],
    });

    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain('Seven Dwarfs');
    expect(result.warnings[0]).toMatch(/upgrade/i);
  });

  it('assigns LL to longest-wait rides within top-N scored set', () => {
    const result = allocateLL({
      dayItems,
      attractions,
      budgetTier: 'fairy',
      dasEnabled: false,
      bookingTime: '2026-06-01T07:00:00',
    });

    // Space Mountain (wait=60) should get LLMP before Haunted Mansion (wait=30)
    const spaceMtn = result.itemsWithLL.find((i) => i.refId === 'r1');
    expect(spaceMtn?.lightningLaneType).toBe('multi_pass');
  });

  it('computes 90-min return window offset from booking time', () => {
    const result = allocateLL({
      dayItems: [dayItems[0]!], // Space Mountain only
      attractions: [attractions[0]!],
      budgetTier: 'fairy',
      dasEnabled: false,
      bookingTime: '2026-06-01T07:00:00',
    });

    const spaceMtn = result.itemsWithLL.find((i) => i.refId === 'r1');
    // Return window should be noted; booking at 07:00 → return 08:30
    expect(spaceMtn?.notes).toContain('08:30');
  });
});
