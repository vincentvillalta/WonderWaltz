/**
 * SOLV-11: Determinism proof — solve() must produce byte-identical output
 * on 100 consecutive runs with the same input.
 *
 * Also asserts perf budget: 3-day fixture completes in < 2 seconds.
 */

import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { solve } from '../src/index.js';
import type { SolverInput, CatalogAttraction, CatalogShow } from '../src/types.js';

// ─── Fixture: 3-day all-parks family ───────────────────────────────────────

function makeThreeDayFixture(): SolverInput {
  const parks = ['mk', 'epcot', 'dhs'];
  const dates = ['2026-06-16', '2026-06-17', '2026-06-18'];

  // Build attractions for each park (5 per park)
  const attractions: CatalogAttraction[] = [];
  for (const parkId of parks) {
    for (let i = 1; i <= 5; i++) {
      attractions.push({
        id: `${parkId}-ride-${i}`,
        parkId,
        name: `${parkId.toUpperCase()} Ride ${i}`,
        tags: i === 1 ? ['thrill', 'roller-coaster'] : ['family'],
        baselineWaitMinutes: 30 + i * 5,
        lightningLaneType: i <= 2 ? 'multi_pass' : i === 3 ? 'single_pass' : null,
        isHeadliner: i <= 2,
        durationMinutes: 5 + i,
        heightRequirementInches: i === 1 ? 44 : undefined,
      });
    }
  }

  const shows: CatalogShow[] = parks.map((parkId) => ({
    id: `${parkId}-show-1`,
    parkId,
    name: `${parkId.toUpperCase()} Evening Show`,
    durationMinutes: 20,
    showtimes: ['20:00'],
  }));

  // Walking graph edges: connect all rides in each park linearly
  const edges = [];
  for (const parkId of parks) {
    edges.push({ fromNodeId: 'entrance', toNodeId: `${parkId}-ride-1`, parkId, walkSeconds: 300 });
    for (let i = 1; i < 5; i++) {
      edges.push({
        fromNodeId: `${parkId}-ride-${i}`,
        toNodeId: `${parkId}-ride-${i + 1}`,
        parkId,
        walkSeconds: 120,
      });
    }
  }

  return {
    trip: {
      id: 'trip-deterministic',
      userId: 'user-1',
      startDate: dates[0],
      endDate: dates[2],
      partySize: 4,
      budgetTier: 'fairy',
      hasDas: false,
      lodgingType: 'moderate',
    },
    guests: [
      { id: 'g1', ageBracket: '18+', mobility: 'none', sensory: 'none', dietary: [] },
      { id: 'g2', ageBracket: '18+', mobility: 'none', sensory: 'none', dietary: [] },
      { id: 'g3', ageBracket: '7-9', mobility: 'none', sensory: 'none', dietary: [] },
      { id: 'g4', ageBracket: '3-6', mobility: 'none', sensory: 'none', dietary: [] },
    ],
    preferences: {
      budgetTier: 'fairy',
      mustDoAttractionIds: ['mk-ride-2', 'epcot-ride-2'],
      preferredShows: ['mk-show-1'],
      tableServiceReservations: [],
    },
    dateStart: dates[0],
    dateEnd: dates[2],
    catalog: {
      attractions,
      dining: [],
      shows,
      walkingGraph: { edges },
    },
    forecasts: { buckets: [] },
    weather: {
      days: dates.map((d) => ({
        date: d,
        highF: 85,
        lowF: 72,
        precipitationProbability: 0.1,
        summary: 'Partly cloudy',
      })),
    },
    crowdCalendar: { entries: [] },
  };
}

// ─── Tests ─────────────────────────────────────────────────────────────────

describe('solve() determinism (SOLV-11)', () => {
  it('produces byte-identical output across 100 runs', () => {
    const input = makeThreeDayFixture();
    const hashes = new Set<string>();

    for (let i = 0; i < 100; i++) {
      const result = solve(input);
      const json = JSON.stringify(result);
      const hash = createHash('sha256').update(json).digest('hex');
      hashes.add(hash);
    }

    expect(hashes.size).toBe(1);
  });

  it('returns DayPlan[] with correct structure', () => {
    const input = makeThreeDayFixture();
    const result = solve(input);

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(3); // 3-day trip

    for (let i = 0; i < result.length; i++) {
      expect(result[i].dayIndex).toBe(i);
      expect(result[i].date).toBeDefined();
      expect(result[i].parkId).toBeDefined();
      expect(Array.isArray(result[i].items)).toBe(true);
      expect(Array.isArray(result[i].warnings)).toBe(true);
    }
  });

  it('completes 3-day fixture in < 2 seconds', () => {
    const input = makeThreeDayFixture();
    const start = performance.now();
    solve(input);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(2000);
  });

  it('assigns parks to days based on available attractions', () => {
    const input = makeThreeDayFixture();
    const result = solve(input);

    // Each day should have a valid park
    const validParks = new Set(['mk', 'epcot', 'dhs']);
    for (const day of result) {
      expect(validParks.has(day.parkId)).toBe(true);
    }
  });

  it('items have sorted startTime within each day', () => {
    const input = makeThreeDayFixture();
    const result = solve(input);

    for (const day of result) {
      for (let i = 1; i < day.items.length; i++) {
        expect(day.items[i].startTime >= day.items[i - 1].startTime).toBe(true);
      }
    }
  });

  it('deprioritizes rides visited on earlier days', () => {
    const input = makeThreeDayFixture();
    const result = solve(input);

    // Collect ride refIds per day
    const ridesByDay = result.map((day) =>
      day.items
        .filter((item) => item.type === 'attraction' && item.refId)
        .map((item) => item.refId!),
    );

    // For multi-day at the same park, check that different rides appear
    // (not guaranteed to be completely different but set intersection
    // should be smaller than total)
    if (ridesByDay.length >= 2) {
      const day1Rides = new Set(ridesByDay[0]);
      const day2Rides = new Set(ridesByDay[1]);
      // Days should have at least some items
      expect(ridesByDay[0].length).toBeGreaterThan(0);
      // Since parks differ across days in this fixture,
      // rides should be entirely different park sets
      const overlap = [...day1Rides].filter((r) => day2Rides.has(r));
      // Different parks = no overlap
      expect(overlap.length).toBe(0);
    }
  });
});
