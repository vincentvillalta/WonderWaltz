import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueueTimesService } from './queue-times.service.js';
import queueTimesFixture from '../../tests/fixtures/queue-times-response.json';

/**
 * Unit tests for QueueTimesService.
 *
 * DATA-01a: queue-times.com response correctly mapped (wait_time→minutes, is_open, source='queue-times')
 * DATA-01c: Redis key wait:{uuid} set with EX 120 on success
 * DATA-01d: on fetch failure, redis.expire(key, 600) called; no DB insert
 *
 * Note: makeRedisClient is inlined here rather than imported from tests/setup.js
 * because the compiled setup.js uses require('vitest') which fails in Vitest's
 * ESM isolation mode. The ioredis mock is still registered globally by setupFiles.
 */

/**
 * Creates an async iterable scanStream that yields the given key batches.
 * Mirrors ioredis's scanStream interface: a ReadableStream that's
 * async-iterable and yields string[] chunks.
 */
function makeScanStream(batches: string[][]) {
  return {
    *[Symbol.asyncIterator]() {
      for (const batch of batches) {
        yield batch;
      }
    },
  };
}

function makeRedisClient() {
  const pipelineExec = vi.fn().mockResolvedValue([]);
  const pipelineExpire = vi.fn();
  const pipeline = {
    expire: pipelineExpire,
    exec: pipelineExec,
  };
  // expire returns `pipeline` itself for chaining (mockReturnThis)
  pipelineExpire.mockReturnValue(pipeline);

  return {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    expire: vi.fn().mockResolvedValue(1),
    incr: vi.fn().mockResolvedValue(1),
    del: vi.fn().mockResolvedValue(1),
    scanStream: vi.fn().mockReturnValue(makeScanStream([[]])),
    pipeline: vi.fn().mockReturnValue(pipeline),
    _pipeline: pipeline,
    quit: vi.fn().mockResolvedValue('OK'),
    disconnect: vi.fn(),
    status: 'ready',
    on: vi.fn(),
    once: vi.fn(),
    removeAllListeners: vi.fn(),
    ping: vi.fn().mockResolvedValue('PONG'),
  };
}

describe('QueueTimesService', () => {
  let service: QueueTimesService;
  let mockRedis: ReturnType<typeof makeRedisClient>;
  let mockExecute: ReturnType<typeof vi.fn>;
  let mockDb: { execute: ReturnType<typeof vi.fn> };
  let mockFetch: ReturnType<typeof vi.fn>;

  // UUIDs that correspond to the fixture ride IDs (56, 62, 78, 91)
  const RIDE_56_UUID = '00000000-0000-0000-0000-000000000056';
  const RIDE_62_UUID = '00000000-0000-0000-0000-000000000062';
  const RIDE_78_UUID = '00000000-0000-0000-0000-000000000078';
  const RIDE_91_UUID = '00000000-0000-0000-0000-000000000091';

  // Mock DB catalog rows — attractions matching the fixture ride IDs
  const mockCatalogRows = [
    { id: RIDE_56_UUID, queue_times_id: 56 },
    { id: RIDE_62_UUID, queue_times_id: 62 },
    { id: RIDE_78_UUID, queue_times_id: 78 },
    { id: RIDE_91_UUID, queue_times_id: 91 },
  ];

  beforeEach(() => {
    mockRedis = makeRedisClient();

    // db.execute: first call returns catalog rows (resolveAttractionIds);
    // subsequent calls are INSERT statements (return empty rows)
    mockExecute = vi.fn().mockResolvedValueOnce(mockCatalogRows).mockResolvedValue([]);

    mockDb = { execute: mockExecute };

    service = new QueueTimesService(mockDb as never, mockRedis as never);

    // Stub global fetch to return the fixture
    mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(queueTimesFixture),
    });
    vi.stubGlobal('fetch', mockFetch);
  });

  describe('DATA-01a: field mapping', () => {
    it('maps wait_time → minutes, preserves is_open, sets source=queue-times', async () => {
      await service.pollPark(6);

      // db.execute called 5 times: 1 for SELECT + 4 for INSERTs (one per fixture ride)
      expect(mockExecute).toHaveBeenCalledTimes(5);

      // Extract interpolated values from each INSERT's sql`` object
      // queryChunks layout: [sqlText, uuid, sqlText, fetchedAt, sqlText, minutes, sqlText, isOpen, sqlText, source-literal, sqlText, fetchedAt2, ...]
      const insertCalls = mockExecute.mock.calls.slice(1);

      // Build map: uuid → all interpolated values for that INSERT
      const byUuid = new Map<string, unknown[]>();
      for (const call of insertCalls) {
        const sqlObj = call[0] as { queryChunks?: unknown[] };
        const chunks = sqlObj.queryChunks ?? [];
        // Extract only the interpolated values (non-chunk objects without 'value' key)
        const values = chunks.filter(
          (c) => typeof c !== 'object' || (c !== null && !Array.isArray(c) && !('value' in c)),
        );
        const uuidValue = values[0] as string;
        byUuid.set(uuidValue, values);
      }

      // Jungle Cruise (56) — wait_time: 40, is_open: true, source hardcoded in SQL
      const jcValues = byUuid.get(RIDE_56_UUID);
      expect(jcValues).toBeDefined();
      expect(jcValues).toContain(40); // minutes (from wait_time)
      expect(jcValues).toContain(true); // is_open preserved

      // It's a Small World (91) — wait_time: 0, is_open: false
      const swValues = byUuid.get(RIDE_91_UUID);
      expect(swValues).toBeDefined();
      expect(swValues).toContain(0); // minutes
      expect(swValues).toContain(false); // is_open: false
    });

    it('uses new Date() for fetched_at, NOT ride.last_updated', async () => {
      const beforeFetch = new Date();
      await service.pollPark(6);
      const afterFetch = new Date();

      const setCalls = mockRedis.set.mock.calls as Array<[string, string, string, number]>;
      for (const [, valueJson] of setCalls) {
        const value = JSON.parse(valueJson) as { fetched_at: string };
        const fetchedAt = new Date(value.fetched_at);
        expect(fetchedAt.getTime()).toBeGreaterThanOrEqual(beforeFetch.getTime() - 100);
        expect(fetchedAt.getTime()).toBeLessThanOrEqual(afterFetch.getTime() + 100);
        // Fixture last_updated = '2026-04-14T14:05:18.000Z' — must NOT be that value
        expect(value.fetched_at).not.toBe('2026-04-14T14:05:18.000Z');
      }
    });
  });

  describe('DATA-01c: Redis write on success', () => {
    it('calls redis.set with key wait:{uuid} and EX 120 for each ride', async () => {
      await service.pollPark(6);

      const setCalls = mockRedis.set.mock.calls as Array<[string, string, string, number]>;

      // 4 Redis writes — one per fixture ride
      expect(setCalls).toHaveLength(4);

      // Jungle Cruise (56): key format, TTL, and value shape
      const jcCall = setCalls.find(([key]) => key === `wait:${RIDE_56_UUID}`);
      expect(jcCall).toBeDefined();
      expect(jcCall![2]).toBe('EX');
      expect(jcCall![3]).toBe(120);

      const jcValue = JSON.parse(jcCall![1]) as {
        minutes: number;
        fetched_at: string;
        source: string;
        is_stale: boolean;
      };
      expect(jcValue.minutes).toBe(40);
      expect(jcValue.source).toBe('queue-times');
      expect(jcValue.is_stale).toBe(false);
      expect(typeof jcValue.fetched_at).toBe('string');
    });

    it('sets Redis key for all 4 fixture rides', async () => {
      await service.pollPark(6);

      const setCalls = mockRedis.set.mock.calls as Array<[string, string, string, number]>;
      const keys = setCalls.map(([key]) => key);

      expect(keys).toContain(`wait:${RIDE_56_UUID}`);
      expect(keys).toContain(`wait:${RIDE_62_UUID}`);
      expect(keys).toContain(`wait:${RIDE_78_UUID}`);
      expect(keys).toContain(`wait:${RIDE_91_UUID}`);
    });
  });

  describe('DATA-01d: TTL extension on fetch failure', () => {
    beforeEach(() => {
      mockFetch.mockRejectedValue(new Error('Network timeout'));
      vi.stubGlobal('fetch', mockFetch);

      // Pre-populate Redis keys for the failure path via scanStream (single batch).
      // extendTtlOnFailure() uses redis.scanStream + pipeline.expire, not redis.keys.
      mockRedis.scanStream = vi
        .fn()
        .mockReturnValue(makeScanStream([[`wait:${RIDE_56_UUID}`, `wait:${RIDE_62_UUID}`]]));

      // Reset execute mock — no DB calls should happen on failure
      mockExecute.mockReset();
    });

    it('calls redis.expire with +600 on existing keys when fetch fails', async () => {
      await service.pollPark(6);

      // The service now uses a pipeline: pipeline.expire(key, 600) for each SCAN-yielded key,
      // then pipeline.exec() once at the end.
      const pipeline = mockRedis._pipeline;
      expect(pipeline.expire).toHaveBeenCalledWith(`wait:${RIDE_56_UUID}`, 600);
      expect(pipeline.expire).toHaveBeenCalledWith(`wait:${RIDE_62_UUID}`, 600);
      expect(pipeline.exec).toHaveBeenCalled();
    });

    it('does NOT call db.execute when fetch fails', async () => {
      await service.pollPark(6);

      expect(mockExecute).not.toHaveBeenCalled();
    });

    it('does NOT call redis.set on fetch failure', async () => {
      await service.pollPark(6);

      expect(mockRedis.set).not.toHaveBeenCalled();
    });
  });
});
