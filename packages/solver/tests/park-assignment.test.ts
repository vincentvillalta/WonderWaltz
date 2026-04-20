/**
 * Tests for the must-do-dominant, intensity-balanced park assignment.
 */
import { describe, it, expect } from 'vitest';
import { assignParksToDays } from '../src/parkAssignment.js';
import type { CatalogAttraction } from '../src/types.js';

function attraction(id: string, parkId: string, isHeadliner = false): CatalogAttraction {
  return {
    id,
    parkId,
    name: id,
    tags: [],
    baselineWaitMinutes: 30,
    lightningLaneType: null,
    isHeadliner,
    durationMinutes: 15,
  };
}

// Small synthetic catalog with 4 parks, differing sizes to trigger the
// intensity heuristic when no explicit external-id mapping applies.
const CATALOG: CatalogAttraction[] = [
  ...Array.from({ length: 22 }, (_, i) => attraction(`mk-a${i}`, 'mk')),
  ...Array.from({ length: 15 }, (_, i) => attraction(`epcot-a${i}`, 'epcot')),
  ...Array.from({ length: 10 }, (_, i) => attraction(`dhs-a${i}`, 'dhs')),
  ...Array.from({ length: 8 }, (_, i) => attraction(`ak-a${i}`, 'ak')),
];

const DATES_1D = ['2026-05-01'];
const DATES_3D = ['2026-05-01', '2026-05-02', '2026-05-03'];
const DATES_4D = ['2026-05-01', '2026-05-02', '2026-05-03', '2026-05-04'];
const DATES_5D = ['2026-05-01', '2026-05-02', '2026-05-03', '2026-05-04', '2026-05-05'];

describe('assignParksToDays', () => {
  describe('no must-dos', () => {
    it('covers every distinct park on a 4-day trip', () => {
      const result = assignParksToDays({
        dates: DATES_4D,
        attractions: CATALOG,
        mustDoAttractionIds: [],
      });
      const parks = new Set(result.values());
      expect(parks.size).toBe(4);
      expect(result.size).toBe(4);
    });

    it('picks a highest-intensity park for day 0', () => {
      const result = assignParksToDays({
        dates: DATES_1D,
        attractions: CATALOG,
        mustDoAttractionIds: [],
      });
      const day0 = result.get('2026-05-01');
      expect(['mk', 'epcot']).toContain(day0);
    });

    it('avoids back-to-back highest-intensity days when it can', () => {
      const result = assignParksToDays({
        dates: DATES_3D,
        attractions: CATALOG,
        mustDoAttractionIds: [],
      });
      const seq = DATES_3D.map((d) => result.get(d));
      const heavySet = new Set(['mk', 'epcot']);
      const consecutiveHeavy = seq.some(
        (p, i) => i > 0 && heavySet.has(p!) && heavySet.has(seq[i - 1]!),
      );
      expect(consecutiveHeavy).toBe(false);
    });

    it('allows repeats on a 5-day trip (more days than parks)', () => {
      const result = assignParksToDays({
        dates: DATES_5D,
        attractions: CATALOG,
        mustDoAttractionIds: [],
      });
      expect(result.size).toBe(5);
      const parks = new Set(result.values());
      expect(parks.size).toBeLessThanOrEqual(4);
    });
  });

  describe('must-do dominance', () => {
    it('schedules a park with must-dos on day 0 regardless of intensity', () => {
      const result = assignParksToDays({
        dates: DATES_4D,
        attractions: CATALOG,
        mustDoAttractionIds: ['ak-a0', 'ak-a1', 'ak-a2'],
      });
      expect(result.get('2026-05-01')).toBe('ak');
    });

    it('ranks parks by must-do count when multiple parks have must-dos', () => {
      const result = assignParksToDays({
        dates: DATES_3D,
        attractions: CATALOG,
        mustDoAttractionIds: ['mk-a0', 'mk-a1', 'mk-a2', 'epcot-a0', 'dhs-a0'],
      });
      expect(result.get('2026-05-01')).toBe('mk');
    });

    it('covers all must-do parks on a trip long enough', () => {
      const result = assignParksToDays({
        dates: DATES_4D,
        attractions: CATALOG,
        mustDoAttractionIds: ['mk-a0', 'epcot-a0', 'dhs-a0', 'ak-a0'],
      });
      const parks = new Set(result.values());
      expect(parks.size).toBe(4);
    });
  });

  describe('determinism', () => {
    it('is stable across repeated runs', () => {
      const input = {
        dates: DATES_4D,
        attractions: CATALOG,
        mustDoAttractionIds: ['mk-a0', 'mk-a1', 'epcot-a0'],
      };
      const a = assignParksToDays(input);
      const b = assignParksToDays(input);
      expect([...a.entries()]).toEqual([...b.entries()]);
    });
  });

  describe('edge cases', () => {
    it('empty dates → empty map', () => {
      expect(
        assignParksToDays({ dates: [], attractions: CATALOG, mustDoAttractionIds: [] }).size,
      ).toBe(0);
    });

    it('empty catalog → empty map', () => {
      expect(
        assignParksToDays({ dates: DATES_3D, attractions: [], mustDoAttractionIds: [] }).size,
      ).toBe(0);
    });

    it('single-park catalog → every day assigned to that park', () => {
      const singlePark = CATALOG.filter((a) => a.parkId === 'mk');
      const result = assignParksToDays({
        dates: DATES_3D,
        attractions: singlePark,
        mustDoAttractionIds: [],
      });
      expect(Array.from(result.values())).toEqual(['mk', 'mk', 'mk']);
    });
  });
});
