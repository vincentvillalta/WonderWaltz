import { describe, it, expect } from 'vitest';
import { score, deriveEnjoymentWeight } from '../src/score.js';
import type { CatalogAttraction, ForecastConfidence } from '../src/types.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeAttraction(overrides: Partial<CatalogAttraction> = {}): CatalogAttraction {
  return {
    id: 'a-test',
    parkId: 'mk',
    name: 'Test Ride',
    tags: [],
    baselineWaitMinutes: 30,
    lightningLaneType: null,
    isHeadliner: false,
    durationMinutes: 10,
    ...overrides,
  };
}

// ─── deriveEnjoymentWeight ──────────────────────────────────────────────────

describe('deriveEnjoymentWeight', () => {
  it('returns 85 for headliners', () => {
    expect(deriveEnjoymentWeight(makeAttraction({ isHeadliner: true }))).toBe(85);
  });

  it('returns 50 for non-headliners', () => {
    expect(deriveEnjoymentWeight(makeAttraction({ isHeadliner: false }))).toBe(50);
  });
});

// ─── score() ────────────────────────────────────────────────────────────────

describe('score', () => {
  const cases: Array<{
    name: string;
    attraction: CatalogAttraction;
    predictedWaitMinutes: number;
    walkSeconds: number;
    confidence: ForecastConfidence;
    expectedApprox: number;
  }> = [
    {
      name: 'headliner, low wait → high score',
      attraction: makeAttraction({ isHeadliner: true, durationMinutes: 8 }),
      predictedWaitMinutes: 10,
      walkSeconds: 120,
      confidence: 'high',
      // enjoyment=85, time_cost=8+5=13, wait_cost=10*1.0=10, walk_cost=120/60=2
      // score = 85 / (13 + 10 + 2) = 85/25 = 3.4
      expectedApprox: 3.4,
    },
    {
      name: 'headliner, high wait → low score',
      attraction: makeAttraction({ isHeadliner: true, durationMinutes: 8 }),
      predictedWaitMinutes: 90,
      walkSeconds: 300,
      confidence: 'high',
      // enjoyment=85, time_cost=13, wait_cost=90, walk_cost=5
      // score = 85 / (13 + 90 + 5) = 85/108 ≈ 0.787
      expectedApprox: 85 / 108,
    },
    {
      name: 'low-intensity + low wait → moderate score',
      attraction: makeAttraction({ isHeadliner: false, durationMinutes: 5 }),
      predictedWaitMinutes: 15,
      walkSeconds: 180,
      confidence: 'medium',
      // enjoyment=50, time_cost=5+5=10, wait_cost=15, walk_cost=3
      // score = 50 / (10 + 15 + 3) = 50/28 ≈ 1.786
      expectedApprox: 50 / 28,
    },
    {
      name: 'low-confidence penalty: wait_cost × 1.2',
      attraction: makeAttraction({ isHeadliner: true, durationMinutes: 8 }),
      predictedWaitMinutes: 10,
      walkSeconds: 120,
      confidence: 'low',
      // enjoyment=85, time_cost=13, wait_cost=10*1.2=12, walk_cost=2
      // score = 85 / (13 + 12 + 2) = 85/27 ≈ 3.148
      expectedApprox: 85 / 27,
    },
    {
      name: 'medium confidence has no penalty (same as high)',
      attraction: makeAttraction({ isHeadliner: true, durationMinutes: 8 }),
      predictedWaitMinutes: 10,
      walkSeconds: 120,
      confidence: 'medium',
      // same as first case: 85 / (13 + 10 + 2) = 3.4
      expectedApprox: 3.4,
    },
    {
      name: 'zero walk + zero wait → score = enjoyment / time_cost',
      attraction: makeAttraction({ isHeadliner: false, durationMinutes: 10 }),
      predictedWaitMinutes: 0,
      walkSeconds: 0,
      confidence: 'high',
      // enjoyment=50, time_cost=15, wait=0, walk=0
      // score = 50 / 15 ≈ 3.333
      expectedApprox: 50 / 15,
    },
  ];

  it.each(cases)(
    '$name',
    ({ attraction, predictedWaitMinutes, walkSeconds, confidence, expectedApprox }) => {
      const result = score({ attraction, predictedWaitMinutes, walkSeconds, confidence });
      expect(result).toBeCloseTo(expectedApprox, 6);
    },
  );

  it('low-confidence decreases score vs high-confidence (same inputs)', () => {
    const attraction = makeAttraction({ isHeadliner: true, durationMinutes: 8 });
    const highConf = score({
      attraction,
      predictedWaitMinutes: 30,
      walkSeconds: 120,
      confidence: 'high',
    });
    const lowConf = score({
      attraction,
      predictedWaitMinutes: 30,
      walkSeconds: 120,
      confidence: 'low',
    });
    expect(lowConf).toBeLessThan(highConf);
  });

  it('determinism: same inputs → identical score across 10 runs', () => {
    const attraction = makeAttraction({ isHeadliner: true, durationMinutes: 12 });
    const input = {
      attraction,
      predictedWaitMinutes: 45,
      walkSeconds: 200,
      confidence: 'medium' as const,
    };
    const first = score(input);
    for (let i = 0; i < 10; i++) {
      expect(score(input)).toBe(first);
    }
  });

  it('returns a finite number (never NaN/Infinity)', () => {
    const attraction = makeAttraction({ durationMinutes: 0 });
    // Even with durationMinutes=0, time_cost = 0+5 = 5, so denominator > 0
    const result = score({
      attraction,
      predictedWaitMinutes: 0,
      walkSeconds: 0,
      confidence: 'high',
    });
    expect(Number.isFinite(result)).toBe(true);
  });
});
