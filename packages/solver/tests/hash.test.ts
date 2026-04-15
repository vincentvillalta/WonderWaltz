import { describe, expect, it } from 'vitest';
import { canonicalize, computeSolverInputHash } from '../src/hash.js';
import type { SolverInput } from '../src/types.js';
import { makeFixture } from './fixtures/solver-input.js';

describe('computeSolverInputHash', () => {
  it('returns a 64-char hex SHA-256 string', () => {
    const hash = computeSolverInputHash(makeFixture());
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic across 5 runs on identical input', () => {
    const hashes = Array.from({ length: 5 }, () => computeSolverInputHash(makeFixture()));
    expect(new Set(hashes).size).toBe(1);
  });

  it('is invariant to key order in the input object', () => {
    const a = makeFixture();
    const reordered: SolverInput = {
      crowdCalendar: a.crowdCalendar,
      weather: a.weather,
      forecasts: a.forecasts,
      catalog: a.catalog,
      dateEnd: a.dateEnd,
      dateStart: a.dateStart,
      preferences: a.preferences,
      guests: a.guests,
      trip: a.trip,
    };
    expect(computeSolverInputHash(a)).toBe(computeSolverInputHash(reordered));
  });

  it('is invariant to key order inside nested objects (trip)', () => {
    const a = makeFixture();
    const tripReordered: SolverInput = {
      ...a,
      trip: {
        hasDas: a.trip.hasDas,
        budgetTier: a.trip.budgetTier,
        partySize: a.trip.partySize,
        endDate: a.trip.endDate,
        startDate: a.trip.startDate,
        userId: a.trip.userId,
        id: a.trip.id,
      },
    };
    expect(computeSolverInputHash(a)).toBe(computeSolverInputHash(tripReordered));
  });

  it('changes when trip.budgetTier changes', () => {
    const a = makeFixture();
    const b = makeFixture({ trip: { ...a.trip, budgetTier: 'royal' } });
    expect(computeSolverInputHash(a)).not.toBe(computeSolverInputHash(b));
  });

  it('changes when a guest dietary entry changes', () => {
    const a = makeFixture();
    const [g1, g2] = a.guests;
    if (!g1 || !g2) throw new Error('fixture broken');
    const b = makeFixture({
      guests: [g1, { ...g2, dietary: ['dairy_free'] }],
    });
    expect(computeSolverInputHash(a)).not.toBe(computeSolverInputHash(b));
  });

  it('is STABLE across changes to volatile inputs (forecasts/weather/crowd)', () => {
    const a = makeFixture();
    const b = makeFixture({
      forecasts: {
        buckets: [
          {
            attractionId: 'a-space-mountain',
            bucketStart: '2026-06-01T09:00:00Z',
            predictedWaitMinutes: 42,
            confidence: 'low',
          },
        ],
      },
      weather: {
        days: [
          {
            date: '2026-06-01',
            highF: 92,
            lowF: 74,
            precipitationProbability: 0.2,
            summary: 'Partly cloudy',
          },
        ],
      },
      crowdCalendar: {
        entries: [{ date: '2026-06-01', parkId: 'mk', bucket: 'heavy' }],
      },
    });
    expect(computeSolverInputHash(a)).toBe(computeSolverInputHash(b));
  });

  it('is SENSITIVE to mustDoAttractionIds order (priority is semantic)', () => {
    const a = makeFixture();
    const b = makeFixture({
      preferences: {
        ...a.preferences,
        mustDoAttractionIds: [...a.preferences.mustDoAttractionIds].reverse(),
      },
    });
    expect(computeSolverInputHash(a)).not.toBe(computeSolverInputHash(b));
  });

  it('changes when dateStart changes', () => {
    const a = makeFixture();
    const b = makeFixture({ dateStart: '2026-06-02' });
    expect(computeSolverInputHash(a)).not.toBe(computeSolverInputHash(b));
  });
});

describe('canonicalize', () => {
  it('sorts nested object keys recursively', () => {
    const input = { b: { z: 1, a: 2 }, a: [{ y: 1, x: 2 }] };
    const out = canonicalize(input) as Record<string, unknown>;
    expect(JSON.stringify(out)).toBe('{"a":[{"x":2,"y":1}],"b":{"a":2,"z":1}}');
  });

  it('drops undefined values', () => {
    const out = canonicalize({ a: 1, b: undefined, c: 3 });
    expect(JSON.stringify(out)).toBe('{"a":1,"c":3}');
  });

  it('preserves null and array order', () => {
    const out = canonicalize({ a: null, b: [3, 1, 2] });
    expect(JSON.stringify(out)).toBe('{"a":null,"b":[3,1,2]}');
  });
});
