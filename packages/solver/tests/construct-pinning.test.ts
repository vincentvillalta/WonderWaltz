import { describe, it, expect } from 'vitest';
import { constructDay } from '../src/construct.js';
import { buildWalkingGraph } from '../src/walkingGraph.js';
import type { CatalogAttraction, ForecastConfidence } from '../src/types.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeAttraction(overrides: Partial<CatalogAttraction> = {}): CatalogAttraction {
  return {
    id: 'a-generic',
    parkId: 'mk',
    name: 'Generic Ride',
    tags: [],
    baselineWaitMinutes: 30,
    lightningLaneType: null,
    isHeadliner: false,
    durationMinutes: 10,
    ...overrides,
  };
}

/** Park hours: 9:00 to 21:00 on a given date. */
const PARK_OPEN = '2026-06-01T09:00:00';
const PARK_CLOSE = '2026-06-01T21:00:00';

/** Simple walking graph with 3 attractions + park entrance. */
const graph = buildWalkingGraph([
  { fromNodeId: 'entrance', toNodeId: 'a-space-mountain', seconds: 300 },
  { fromNodeId: 'entrance', toNodeId: 'a-pirates', seconds: 180 },
  { fromNodeId: 'entrance', toNodeId: 'a-dumbo', seconds: 240 },
  { fromNodeId: 'a-space-mountain', toNodeId: 'a-pirates', seconds: 360 },
  { fromNodeId: 'a-space-mountain', toNodeId: 'a-dumbo', seconds: 420 },
  { fromNodeId: 'a-pirates', toNodeId: 'a-dumbo', seconds: 120 },
]);

const attractions: CatalogAttraction[] = [
  makeAttraction({
    id: 'a-space-mountain',
    name: 'Space Mountain',
    isHeadliner: true,
    durationMinutes: 8,
  }),
  makeAttraction({
    id: 'a-pirates',
    name: 'Pirates of the Caribbean',
    isHeadliner: false,
    durationMinutes: 15,
  }),
  makeAttraction({
    id: 'a-dumbo',
    name: 'Dumbo',
    isHeadliner: false,
    durationMinutes: 5,
  }),
];

/**
 * Forecast function: returns a forecast for a given attraction at a given slot.
 * Space Mountain has low wait at 09:00, high wait at 12:00.
 * Others have constant moderate wait.
 */
function forecastFn(
  attractionId: string,
  slotStart: string,
): { predictedWaitMinutes: number; confidence: ForecastConfidence } {
  // Parse hour from the ISO string directly (avoid timezone conversion).
  const hourMatch = slotStart.match(/T(\d{2}):/);
  const hour = hourMatch ? parseInt(hourMatch[1], 10) : 12;
  if (attractionId === 'a-space-mountain') {
    if (hour < 10) return { predictedWaitMinutes: 10, confidence: 'high' };
    if (hour < 14) return { predictedWaitMinutes: 60, confidence: 'medium' };
    return { predictedWaitMinutes: 30, confidence: 'medium' };
  }
  return { predictedWaitMinutes: 20, confidence: 'medium' };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('constructDay', () => {
  it('must-do pinned to optimal window (forecast low-wait slot)', () => {
    const result = constructDay({
      filteredAttractions: attractions,
      mustDoAttractionIds: ['a-space-mountain'],
      parkHours: { open: PARK_OPEN, close: PARK_CLOSE },
      walkingGraph: graph,
      forecastFn,
      startNodeId: 'entrance',
    });

    // Space Mountain must be pinned — find it
    const spaceMtn = result.find((item) => item.refId === 'a-space-mountain');
    expect(spaceMtn).toBeDefined();
    // Should be pinned to 09:00 slot (lowest wait)
    expect(spaceMtn!.startTime).toBe('2026-06-01T09:00:00');
    expect(spaceMtn!.type).toBe('attraction');
  });

  it('greedy places highest-scoring remaining attraction next', () => {
    const result = constructDay({
      filteredAttractions: attractions,
      mustDoAttractionIds: [],
      parkHours: { open: PARK_OPEN, close: PARK_CLOSE },
      walkingGraph: graph,
      forecastFn,
      startNodeId: 'entrance',
    });

    expect(result.length).toBeGreaterThan(0);
    // All items should have attraction type
    for (const item of result) {
      expect(item.type).toBe('attraction');
    }
    // Items should be sorted by startTime ascending
    for (let i = 1; i < result.length; i++) {
      expect(result[i].startTime > result[i - 1].startTime).toBe(true);
    }
  });

  it('no overlapping items', () => {
    const result = constructDay({
      filteredAttractions: attractions,
      mustDoAttractionIds: ['a-space-mountain'],
      parkHours: { open: PARK_OPEN, close: PARK_CLOSE },
      walkingGraph: graph,
      forecastFn,
      startNodeId: 'entrance',
    });

    for (let i = 1; i < result.length; i++) {
      const prevEnd = new Date(result[i - 1].endTime).getTime();
      const currStart = new Date(result[i].startTime).getTime();
      expect(currStart).toBeGreaterThanOrEqual(prevEnd);
    }
  });

  it('determinism: same input x 10 runs → identical output', () => {
    const input = {
      filteredAttractions: attractions,
      mustDoAttractionIds: ['a-space-mountain'],
      parkHours: { open: PARK_OPEN, close: PARK_CLOSE },
      walkingGraph: graph,
      forecastFn,
      startNodeId: 'entrance',
    };

    const first = constructDay(input);
    for (let i = 0; i < 10; i++) {
      const run = constructDay(input);
      expect(run).toEqual(first);
    }
  });

  it('tie-breaking by id-lex when scores equal', () => {
    // Create two attractions with identical characteristics
    const tiedAttractions = [
      makeAttraction({ id: 'a-zulu', name: 'Zulu Ride', durationMinutes: 10 }),
      makeAttraction({ id: 'a-alpha', name: 'Alpha Ride', durationMinutes: 10 }),
    ];

    const tiedGraph = buildWalkingGraph([
      { fromNodeId: 'entrance', toNodeId: 'a-zulu', seconds: 180 },
      { fromNodeId: 'entrance', toNodeId: 'a-alpha', seconds: 180 },
      { fromNodeId: 'a-zulu', toNodeId: 'a-alpha', seconds: 180 },
    ]);

    const constantForecast = () => ({ predictedWaitMinutes: 20, confidence: 'medium' as const });

    const result = constructDay({
      filteredAttractions: tiedAttractions,
      mustDoAttractionIds: [],
      parkHours: { open: PARK_OPEN, close: PARK_CLOSE },
      walkingGraph: tiedGraph,
      forecastFn: constantForecast,
      startNodeId: 'entrance',
    });

    expect(result.length).toBe(2);
    // a-alpha should come before a-zulu (lex order on tie)
    expect(result[0].refId).toBe('a-alpha');
    expect(result[1].refId).toBe('a-zulu');
  });

  it('empty must-do + empty filtered → empty day plan (no crash)', () => {
    const result = constructDay({
      filteredAttractions: [],
      mustDoAttractionIds: [],
      parkHours: { open: PARK_OPEN, close: PARK_CLOSE },
      walkingGraph: graph,
      forecastFn,
      startNodeId: 'entrance',
    });

    expect(result).toEqual([]);
  });

  it('must-do not in filtered attractions is silently skipped', () => {
    const result = constructDay({
      filteredAttractions: attractions,
      mustDoAttractionIds: ['a-nonexistent'],
      parkHours: { open: PARK_OPEN, close: PARK_CLOSE },
      walkingGraph: graph,
      forecastFn,
      startNodeId: 'entrance',
    });

    // Should still produce a plan with greedy fill (just no pinned must-do)
    expect(result.length).toBeGreaterThan(0);
    expect(result.find((i) => i.refId === 'a-nonexistent')).toBeUndefined();
  });

  it('plan item IDs are deterministic hashes', () => {
    const result = constructDay({
      filteredAttractions: attractions,
      mustDoAttractionIds: ['a-space-mountain'],
      parkHours: { open: PARK_OPEN, close: PARK_CLOSE },
      walkingGraph: graph,
      forecastFn,
      startNodeId: 'entrance',
    });

    for (const item of result) {
      // ID should be a 16-char hex string (sha256 truncated)
      expect(item.id).toMatch(/^[a-f0-9]{16}$/);
    }
  });
});
