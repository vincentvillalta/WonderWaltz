import { describe, it, expect } from 'vitest';
import { insertShows } from '../src/shows.js';
import type { PlanItem, CatalogShow } from '../src/types.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeItem(overrides: Partial<PlanItem> = {}): PlanItem {
  return {
    id: 'item-1',
    type: 'attraction',
    refId: 'a-test',
    name: 'Test Ride',
    startTime: '2026-06-01T09:00:00',
    endTime: '2026-06-01T09:30:00',
    ...overrides,
  };
}

function makeShow(overrides: Partial<CatalogShow> = {}): CatalogShow {
  return {
    id: 's-test',
    parkId: 'mk',
    name: 'Test Show',
    durationMinutes: 30,
    showtimes: ['14:00'],
    ...overrides,
  };
}

/** Date prefix for all times in these tests. */
const DATE = '2026-06-01';

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('insertShows', () => {
  it('preferred fireworks at 21:00 → kept in plan', () => {
    const items: PlanItem[] = [
      makeItem({ id: 'i1', startTime: `${DATE}T09:00:00`, endTime: `${DATE}T09:30:00` }),
      makeItem({ id: 'i2', startTime: `${DATE}T14:00:00`, endTime: `${DATE}T14:30:00` }),
    ];

    const shows: CatalogShow[] = [
      makeShow({
        id: 's-happily-ever-after',
        name: 'Happily Ever After',
        durationMinutes: 20,
        showtimes: ['21:00'],
      }),
    ];

    const result = insertShows({
      items,
      showsInPark: shows,
      preferredShowIds: ['s-happily-ever-after'],
      parkHours: { open: `${DATE}T09:00:00`, close: `${DATE}T22:00:00` },
    });

    const fireworks = result.find((i) => i.refId === 's-happily-ever-after');
    expect(fireworks).toBeDefined();
    expect(fireworks!.type).toBe('show');
    expect(fireworks!.startTime).toBe(`${DATE}T21:00:00`);
  });

  it('non-preferred show → skipped', () => {
    const items: PlanItem[] = [
      makeItem({ id: 'i1', startTime: `${DATE}T09:00:00`, endTime: `${DATE}T09:30:00` }),
    ];

    const shows: CatalogShow[] = [
      makeShow({ id: 's-parade', name: 'Festival of Fantasy Parade', showtimes: ['15:00'] }),
    ];

    const result = insertShows({
      items,
      showsInPark: shows,
      preferredShowIds: [], // not preferred
      parkHours: { open: `${DATE}T09:00:00`, close: `${DATE}T22:00:00` },
    });

    // Parade should not be in the result.
    expect(result.find((i) => i.refId === 's-parade')).toBeUndefined();
  });

  it('preferred show displaced by high-scoring attractions → show skipped if net cost > benefit', () => {
    // Create items that heavily overlap with the show's time window.
    const items: PlanItem[] = [
      makeItem({
        id: 'i-headliner-1',
        refId: 'a-headliner-1',
        name: 'Headliner 1',
        startTime: `${DATE}T13:45:00`,
        endTime: `${DATE}T14:30:00`,
      }),
      makeItem({
        id: 'i-headliner-2',
        refId: 'a-headliner-2',
        name: 'Headliner 2',
        startTime: `${DATE}T14:30:00`,
        endTime: `${DATE}T15:15:00`,
      }),
    ];

    const shows: CatalogShow[] = [
      makeShow({
        id: 's-low-value',
        name: 'Low Value Show',
        durationMinutes: 45, // 14:00 to 14:45 — displaces both headliners
        showtimes: ['14:00'],
      }),
    ];

    // The show (enjoymentWeight derived from non-headliner = 50) would displace
    // two attractions. insertShows should skip it if displacement cost exceeds show score.
    const result = insertShows({
      items,
      showsInPark: shows,
      preferredShowIds: ['s-low-value'],
      parkHours: { open: `${DATE}T09:00:00`, close: `${DATE}T22:00:00` },
    });

    // With 2 displaced attractions, the show should be skipped.
    expect(result.find((i) => i.refId === 's-low-value')).toBeUndefined();
    // Original items should remain.
    expect(result.find((i) => i.id === 'i-headliner-1')).toBeDefined();
    expect(result.find((i) => i.id === 'i-headliner-2')).toBeDefined();
  });

  it('preferred show with no conflicts → kept', () => {
    const items: PlanItem[] = [
      makeItem({ id: 'i1', startTime: `${DATE}T09:00:00`, endTime: `${DATE}T09:30:00` }),
    ];

    const shows: CatalogShow[] = [
      makeShow({
        id: 's-parade',
        name: 'Festival of Fantasy Parade',
        durationMinutes: 20,
        showtimes: ['15:00'],
      }),
    ];

    const result = insertShows({
      items,
      showsInPark: shows,
      preferredShowIds: ['s-parade'],
      parkHours: { open: `${DATE}T09:00:00`, close: `${DATE}T22:00:00` },
    });

    const parade = result.find((i) => i.refId === 's-parade');
    expect(parade).toBeDefined();
    expect(parade!.type).toBe('show');
    expect(parade!.startTime).toBe(`${DATE}T15:00:00`);
  });

  it('result is sorted by startTime', () => {
    const items: PlanItem[] = [
      makeItem({ id: 'i1', startTime: `${DATE}T09:00:00`, endTime: `${DATE}T09:30:00` }),
      makeItem({ id: 'i2', startTime: `${DATE}T14:00:00`, endTime: `${DATE}T14:30:00` }),
    ];

    const shows: CatalogShow[] = [
      makeShow({ id: 's-show', name: 'A Show', durationMinutes: 20, showtimes: ['11:00'] }),
    ];

    const result = insertShows({
      items,
      showsInPark: shows,
      preferredShowIds: ['s-show'],
      parkHours: { open: `${DATE}T09:00:00`, close: `${DATE}T22:00:00` },
    });

    for (let i = 1; i < result.length; i++) {
      expect(result[i]!.startTime >= result[i - 1]!.startTime).toBe(true);
    }
  });

  it('deterministic: same inputs → identical output', () => {
    const items: PlanItem[] = [
      makeItem({ id: 'i1', startTime: `${DATE}T09:00:00`, endTime: `${DATE}T09:30:00` }),
    ];
    const shows: CatalogShow[] = [
      makeShow({ id: 's-show', name: 'A Show', durationMinutes: 20, showtimes: ['15:00'] }),
    ];
    const input = {
      items,
      showsInPark: shows,
      preferredShowIds: ['s-show'],
      parkHours: { open: `${DATE}T09:00:00`, close: `${DATE}T22:00:00` },
    };

    const first = insertShows(input);
    for (let i = 0; i < 5; i++) {
      expect(insertShows(input)).toEqual(first);
    }
  });
});
