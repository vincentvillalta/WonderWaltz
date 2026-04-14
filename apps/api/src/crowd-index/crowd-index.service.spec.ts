import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CrowdIndexService } from './crowd-index.service.js';

/**
 * Unit tests for CrowdIndexService.
 *
 * DATA-04a: Bootstrap formula min(100, avg_wait × 1.2) verified for known inputs
 * DATA-04b: Percentile formula returns value in [0,100] for known distribution
 * DATA-04c: writeToRedis sets 5 keys (global + 4 parks) per run
 * DATA-04d: every Redis value has { value, confidence, sample_size_days } shape
 *
 * Note: makeRedisClient is inlined here (not imported from tests/setup.js)
 * to avoid the CJS/ESM compiled-setup issue documented in 02-04 SUMMARY.
 */

function makeRedisClient() {
  return {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    expire: vi.fn().mockResolvedValue(1),
    incr: vi.fn().mockResolvedValue(1),
    del: vi.fn().mockResolvedValue(1),
    keys: vi.fn().mockResolvedValue([]),
    quit: vi.fn().mockResolvedValue('OK'),
    disconnect: vi.fn(),
    status: 'ready',
    on: vi.fn(),
    once: vi.fn(),
    removeAllListeners: vi.fn(),
    ping: vi.fn().mockResolvedValue('PONG'),
  };
}

describe('CrowdIndexService', () => {
  let service: CrowdIndexService;
  let mockRedis: ReturnType<typeof makeRedisClient>;
  let mockExecute: ReturnType<typeof vi.fn>;
  let mockDb: { execute: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockRedis = makeRedisClient();
    mockExecute = vi.fn().mockResolvedValue({ rows: [] });
    mockDb = { execute: mockExecute };

    service = new CrowdIndexService(mockDb as never, mockRedis as never);
  });

  // ---------------------------------------------------------------------------
  // DATA-04a: Bootstrap formula
  // ---------------------------------------------------------------------------

  describe('DATA-04a: computeBootstrap', () => {
    it('returns min(100, avg_wait × 1.2) — below 100', () => {
      expect(service.computeBootstrap(50)).toBe(60); // 50 × 1.2 = 60
    });

    it('clamps at 100 for large avg_wait', () => {
      expect(service.computeBootstrap(90)).toBe(100); // 90 × 1.2 = 108 → clamped to 100
    });

    it('returns 0 for avg_wait of 0', () => {
      expect(service.computeBootstrap(0)).toBe(0);
    });

    it('works at the exact clamping boundary (avg_wait = 83.33)', () => {
      // 83.33 × 1.2 = 99.996 ≈ < 100; should not clamp
      const result = service.computeBootstrap(83.33);
      expect(result).toBeLessThan(100);
      expect(result).toBeGreaterThan(99);
    });
  });

  // ---------------------------------------------------------------------------
  // DATA-04b: Percentile formula
  // ---------------------------------------------------------------------------

  describe('DATA-04b: computePercentileIndex', () => {
    // Anchor points: p0=10, p50=35, p95=70

    it('returns 0 when avg_wait <= p0', () => {
      expect(service.computePercentileIndex(10, 10, 35, 70)).toBe(0);
      expect(service.computePercentileIndex(5, 10, 35, 70)).toBe(0);
    });

    it('returns 95 when avg_wait >= p95', () => {
      expect(service.computePercentileIndex(70, 10, 35, 70)).toBe(95);
      expect(service.computePercentileIndex(100, 10, 35, 70)).toBe(95);
    });

    it('returns 50 at the p50 anchor point', () => {
      const result = service.computePercentileIndex(35, 10, 35, 70);
      expect(result).toBeCloseTo(50, 5);
    });

    it('linearly interpolates between p0 and p50', () => {
      // avg_wait = 22.5 → midpoint between p0=10 and p50=35
      // expected = (22.5 - 10) / (35 - 10) × 50 = 12.5/25 × 50 = 25
      const result = service.computePercentileIndex(22.5, 10, 35, 70);
      expect(result).toBeCloseTo(25, 5);
    });

    it('linearly interpolates between p50 and p95', () => {
      // avg_wait = 52.5 → midpoint between p50=35 and p95=70
      // expected = 50 + ((52.5 - 35) / (70 - 35)) × 45 = 50 + (17.5/35 × 45) = 50 + 22.5 = 72.5
      const result = service.computePercentileIndex(52.5, 10, 35, 70);
      expect(result).toBeCloseTo(72.5, 5);
    });

    it('returns a value in [0, 95] for any valid input', () => {
      const result = service.computePercentileIndex(45, 10, 35, 70);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(95);
    });
  });

  // ---------------------------------------------------------------------------
  // DATA-04c: 5 Redis keys written per refreshAll()
  // ---------------------------------------------------------------------------

  describe('DATA-04c: writeToRedis sets 5 keys', () => {
    const date = '2026-04-14';
    const globalValue = { value: 60, confidence: 'bootstrap' as const, sample_size_days: 3 };
    const parksValues = {
      'magic-kingdom': { value: 55, confidence: 'bootstrap' as const, sample_size_days: 3 },
      epcot: { value: 65, confidence: 'bootstrap' as const, sample_size_days: 3 },
      'hollywood-studios': { value: 70, confidence: 'bootstrap' as const, sample_size_days: 3 },
      'animal-kingdom': { value: 50, confidence: 'bootstrap' as const, sample_size_days: 3 },
    };

    it('calls redis.set exactly 5 times (global + 4 parks)', async () => {
      await service.writeToRedis(date, globalValue, parksValues);

      expect(mockRedis.set).toHaveBeenCalledTimes(5);
    });

    it('sets global key crowd_index:{date} with EX 7200', async () => {
      await service.writeToRedis(date, globalValue, parksValues);

      const setCalls = mockRedis.set.mock.calls as Array<[string, string, string, number]>;
      const globalCall = setCalls.find(([key]) => key === `crowd_index:${date}`);
      expect(globalCall).toBeDefined();
      expect(globalCall![2]).toBe('EX');
      expect(globalCall![3]).toBe(7200);
    });

    it('sets per-park keys crowd_index:{slug}:{date} for all 4 parks', async () => {
      await service.writeToRedis(date, globalValue, parksValues);

      const setCalls = mockRedis.set.mock.calls as Array<[string, string, string, number]>;
      const keys = setCalls.map(([key]) => key);

      expect(keys).toContain(`crowd_index:magic-kingdom:${date}`);
      expect(keys).toContain(`crowd_index:epcot:${date}`);
      expect(keys).toContain(`crowd_index:hollywood-studios:${date}`);
      expect(keys).toContain(`crowd_index:animal-kingdom:${date}`);
    });
  });

  // ---------------------------------------------------------------------------
  // DATA-04d: confidence metadata shape
  // ---------------------------------------------------------------------------

  describe('DATA-04d: confidence metadata in Redis values', () => {
    const date = '2026-04-14';

    it('each Redis value has { value, confidence, sample_size_days } shape', async () => {
      const globalValue = { value: 60, confidence: 'bootstrap' as const, sample_size_days: 5 };
      const parksValues = {
        'magic-kingdom': { value: 55, confidence: 'bootstrap' as const, sample_size_days: 5 },
        epcot: { value: 65, confidence: 'bootstrap' as const, sample_size_days: 5 },
        'hollywood-studios': { value: 70, confidence: 'bootstrap' as const, sample_size_days: 5 },
        'animal-kingdom': { value: 50, confidence: 'bootstrap' as const, sample_size_days: 5 },
      };

      await service.writeToRedis(date, globalValue, parksValues);

      const setCalls = mockRedis.set.mock.calls as Array<[string, string, string, number]>;
      for (const [, jsonValue] of setCalls) {
        const parsed = JSON.parse(jsonValue) as {
          value: number | null;
          confidence: string;
          sample_size_days: number;
        };
        expect(parsed).toHaveProperty('value');
        expect(parsed).toHaveProperty('confidence');
        expect(parsed).toHaveProperty('sample_size_days');
        expect(['bootstrap', 'percentile']).toContain(parsed.confidence);
      }
    });

    it('uses confidence=bootstrap when sampleSizeDays < 30', async () => {
      // Mock: getSampleSizeDays returns 5 (bootstrap mode)
      // Mock: getTopRidesForPark returns empty → computeIndexForRides returns null
      // refreshAll should write bootstrap values
      mockExecute
        .mockResolvedValueOnce({ rows: [{ day_count: 5 }] }) // getSampleSizeDays
        .mockResolvedValue({ rows: [] }); // all subsequent queries (top rides + index)

      await service.refreshAll(date);

      const setCalls = mockRedis.set.mock.calls as Array<[string, string, string, number]>;
      for (const [, jsonValue] of setCalls) {
        const parsed = JSON.parse(jsonValue) as { confidence: string; sample_size_days: number };
        expect(parsed.confidence).toBe('bootstrap');
        expect(parsed.sample_size_days).toBe(5);
      }
    });

    it('uses confidence=percentile when sampleSizeDays >= 30', async () => {
      // Mock: getSampleSizeDays returns 45 (percentile mode)
      // Mock: getTopRidesForPark returns 2 UUIDs, computeIndexForRides returns stats
      const rideUuids = ['uuid-1', 'uuid-2'];
      const indexStats = { avg_wait: 40, p0: 10, p50: 35, p95: 70 };

      mockExecute
        .mockResolvedValueOnce({ rows: [{ day_count: 45 }] }) // getSampleSizeDays
        // 4 parks × getTopRidesForPark (returns 2 rides each)
        .mockResolvedValueOnce({ rows: rideUuids.map((id) => ({ ride_id: id })) }) // MK top rides
        .mockResolvedValueOnce({ rows: [indexStats] }) // MK computeIndexForRides
        .mockResolvedValueOnce({ rows: rideUuids.map((id) => ({ ride_id: id })) }) // EPCOT top rides
        .mockResolvedValueOnce({ rows: [indexStats] }) // EPCOT computeIndexForRides
        .mockResolvedValueOnce({ rows: rideUuids.map((id) => ({ ride_id: id })) }) // HS top rides
        .mockResolvedValueOnce({ rows: [indexStats] }) // HS computeIndexForRides
        .mockResolvedValueOnce({ rows: rideUuids.map((id) => ({ ride_id: id })) }) // AK top rides
        .mockResolvedValueOnce({ rows: [indexStats] }) // AK computeIndexForRides
        // Global: union of all park rides → computeIndexForRides
        .mockResolvedValueOnce({ rows: [indexStats] }); // global computeIndexForRides

      await service.refreshAll(date);

      const setCalls = mockRedis.set.mock.calls as Array<[string, string, string, number]>;
      for (const [, jsonValue] of setCalls) {
        const parsed = JSON.parse(jsonValue) as { confidence: string; sample_size_days: number };
        expect(parsed.confidence).toBe('percentile');
        expect(parsed.sample_size_days).toBe(45);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // getSampleSizeDays: queries COUNT(DISTINCT DATE(ts))
  // ---------------------------------------------------------------------------

  describe('getSampleSizeDays', () => {
    it('returns the day_count from the query result', async () => {
      mockExecute.mockResolvedValueOnce({ rows: [{ day_count: 42 }] });

      const result = await service.getSampleSizeDays();
      expect(result).toBe(42);
    });

    it('returns 0 when no rows returned', async () => {
      mockExecute.mockResolvedValueOnce({ rows: [] });

      const result = await service.getSampleSizeDays();
      expect(result).toBe(0);
    });
  });
});
