import { describe, it, expect, vi, beforeEach } from 'vitest';
import scheduleFixture from '../../tests/fixtures/themeparks-wiki-schedule-response.json';
import liveFixture from '../../tests/fixtures/themeparks-wiki-response.json';

/**
 * Unit tests for ThemeparksService.
 *
 * DATA-02a: schedule endpoint openingTime/closingTime correctly mapped to Redis
 *   park_hours:{parkUuid}:{date} key
 * DATA-02b: live endpoint queue.STANDBY.waitTime → minutes in wait_times_history insert
 *
 * Additional:
 * - SHOW entityType populates showtimes Redis key
 * - ATTRACTION entityType writes wait_times_history
 * - status != 'OPERATING' maps to is_open: false
 *
 * Note: makeRedisClient is inlined here to avoid the compiled setup.js CJS issue
 * (same pattern as queue-times.service.spec.ts).
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

const PARK_UUID = '75ea578a-adc8-4116-a54d-dccb60765ef9';
const ENTITY_ID = '75ea578a-adc8-4116-a54d-dccb60765ef9';

// UUIDs in our catalog that correspond to themeparks_wiki_id values in the live fixture
const SDMT_INTERNAL_UUID = '11111111-1111-1111-1111-111111111111';
const HAUNTED_INTERNAL_UUID = '22222222-2222-2222-2222-222222222222';

// themeparks_wiki_id values from the live fixture
const SDMT_TW_ID = '75ea578a-adc8-4116-a54d-dccb60765ef9';
const HAUNTED_TW_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

const mockCatalogRows = [
  { id: SDMT_INTERNAL_UUID, themeparks_wiki_id: SDMT_TW_ID },
  { id: HAUNTED_INTERNAL_UUID, themeparks_wiki_id: HAUNTED_TW_ID },
];

describe('ThemeparksService', () => {
  let service: {
    pollSchedule: (entityId: string, parkUuid: string) => Promise<void>;
    pollLiveData: (entityId: string, parkUuid: string) => Promise<void>;
  };
  let mockRedis: ReturnType<typeof makeRedisClient>;
  let mockExecute: ReturnType<typeof vi.fn>;
  let mockDb: { execute: ReturnType<typeof vi.fn> };
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    mockRedis = makeRedisClient();
    mockExecute = vi
      .fn()
      .mockResolvedValueOnce({ rows: mockCatalogRows })
      .mockResolvedValue({ rows: [] });
    mockDb = { execute: mockExecute };

    const { ThemeparksService } = await import('./themeparks.service.js');
    service = new ThemeparksService(mockDb as never, mockRedis as never);

    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
  });

  // ---------------------------------------------------------------------------
  // DATA-02a: schedule endpoint field mapping
  // ---------------------------------------------------------------------------
  describe('DATA-02a: pollSchedule — schedule endpoint field mapping', () => {
    it('writes park_hours:{parkUuid}:{date} to Redis with openingTime + closingTime', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(scheduleFixture),
      });

      await service.pollSchedule(ENTITY_ID, PARK_UUID);

      // Expect Redis set called for each schedule date
      const setCalls = mockRedis.set.mock.calls as Array<[string, string, string, number]>;
      const dateKeys = setCalls.map(([key]) => key);

      expect(dateKeys).toContain(`park_hours:${PARK_UUID}:2026-04-14`);
      expect(dateKeys).toContain(`park_hours:${PARK_UUID}:2026-04-15`);
      expect(dateKeys).toContain(`park_hours:${PARK_UUID}:2026-04-16`);
    });

    it('stores openingTime and closingTime in the Redis value JSON', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(scheduleFixture),
      });

      await service.pollSchedule(ENTITY_ID, PARK_UUID);

      const setCalls = mockRedis.set.mock.calls as Array<[string, string, string, number]>;
      const apr14Call = setCalls.find(([key]) => key === `park_hours:${PARK_UUID}:2026-04-14`);
      expect(apr14Call).toBeDefined();

      const value = JSON.parse(apr14Call![1]) as {
        openingTime: string;
        closingTime: string;
        type: string;
        date: string;
      };
      expect(value.openingTime).toBe('2026-04-14T09:00:00-04:00');
      expect(value.closingTime).toBe('2026-04-14T23:00:00-04:00');
      expect(value.type).toBe('OPERATING');
      expect(value.date).toBe('2026-04-14');
    });

    it('sets EX 86400 (24 hours) on park_hours keys', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(scheduleFixture),
      });

      await service.pollSchedule(ENTITY_ID, PARK_UUID);

      const setCalls = mockRedis.set.mock.calls as Array<[string, string, string, number]>;
      const apr14Call = setCalls.find(([key]) => key === `park_hours:${PARK_UUID}:2026-04-14`);
      expect(apr14Call![2]).toBe('EX');
      expect(apr14Call![3]).toBe(86400);
    });
  });

  // ---------------------------------------------------------------------------
  // DATA-02b: live endpoint wait time field mapping
  // ---------------------------------------------------------------------------
  describe('DATA-02b: pollLiveData — STANDBY.waitTime → wait_times_history.minutes', () => {
    it('resolves themeparks_wiki_id to internal UUID via DB query', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(liveFixture),
      });

      await service.pollLiveData(ENTITY_ID, PARK_UUID);

      // First execute call is the SELECT to resolve IDs
      expect(mockExecute.mock.calls.length).toBeGreaterThanOrEqual(1);
      const selectCall = mockExecute.mock.calls[0] as [{ queryChunks?: unknown[] }];
      // It's a sql`` object (template literal); we just verify it was called
      expect(selectCall[0]).toBeDefined();
    });

    it('maps queue.STANDBY.waitTime → minutes in wait_times_history insert', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(liveFixture),
      });

      await service.pollLiveData(ENTITY_ID, PARK_UUID);

      // SDMT has waitTime: 65, Haunted Mansion has waitTime: 45
      // DB inserts should include those values
      const insertCalls = mockExecute.mock.calls.slice(1);
      const insertedMinutes: number[] = [];
      for (const call of insertCalls) {
        const sqlObj = call[0] as { queryChunks?: unknown[] };
        const chunks = sqlObj.queryChunks ?? [];
        for (const chunk of chunks) {
          if (chunk === 65 || chunk === 45) {
            insertedMinutes.push(chunk as number);
          }
        }
      }
      expect(insertedMinutes).toContain(65); // SDMT
      expect(insertedMinutes).toContain(45); // Haunted Mansion
    });

    it("sets source='themeparks-wiki' in the DB insert", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(liveFixture),
      });

      await service.pollLiveData(ENTITY_ID, PARK_UUID);

      // Check SQL template strings contain 'themeparks-wiki'
      const insertCalls = mockExecute.mock.calls.slice(1);
      let foundSource = false;
      for (const call of insertCalls) {
        const sqlObj = call[0] as { queryChunks?: Array<{ value?: string }> };
        const chunks = sqlObj.queryChunks ?? [];
        for (const chunk of chunks) {
          if (
            chunk &&
            typeof chunk === 'object' &&
            'value' in chunk &&
            chunk.value === 'themeparks-wiki'
          ) {
            foundSource = true;
          }
          if (typeof chunk === 'string' && (chunk as string).includes('themeparks-wiki')) {
            foundSource = true;
          }
        }
        // Also check the raw SQL strings
        const rawSql = JSON.stringify(sqlObj);
        if (rawSql.includes('themeparks-wiki')) {
          foundSource = true;
        }
      }
      expect(foundSource).toBe(true);
    });

    it('maps status OPERATING → is_open: true; other status → is_open: false', async () => {
      // Create a fixture where one ride is CLOSED
      const closedFixture = {
        liveData: [
          {
            id: SDMT_TW_ID,
            name: 'Seven Dwarfs Mine Train',
            entityType: 'ATTRACTION',
            status: 'CLOSED',
            lastUpdated: '2026-04-14T14:00:00-04:00',
            queue: { STANDBY: { waitTime: 0 } },
          },
        ],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(closedFixture),
      });

      await service.pollLiveData(ENTITY_ID, PARK_UUID);

      // Insert for the CLOSED ride should have is_open: false
      const insertCalls = mockExecute.mock.calls.slice(1);
      expect(insertCalls.length).toBeGreaterThan(0);

      const firstInsert = insertCalls[0];
      expect(firstInsert).toBeDefined();
      const sqlObj = (firstInsert as [{ queryChunks?: unknown[] }])[0];
      const chunks = sqlObj.queryChunks ?? [];
      expect(chunks).toContain(false); // is_open: false for non-OPERATING status
    });
  });

  // ---------------------------------------------------------------------------
  // SHOW entityType: writes showtimes Redis key
  // ---------------------------------------------------------------------------
  describe('SHOW entityType: showtimes Redis key', () => {
    it('writes showtimes:{parkUuid}:{date} key for SHOW entities', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(liveFixture),
      });

      await service.pollLiveData(ENTITY_ID, PARK_UUID);

      const setCalls = mockRedis.set.mock.calls as Array<[string, string, string, number]>;
      const showtimeKeys = setCalls
        .map(([key]) => key)
        .filter((key) => key.startsWith('showtimes:'));
      expect(showtimeKeys.length).toBeGreaterThan(0);
      // The parade has showtimes on 2026-04-14
      expect(showtimeKeys.some((k) => k.startsWith(`showtimes:${PARK_UUID}:`))).toBe(true);
    });

    it('does NOT write wait_times_history for SHOW entities', async () => {
      // Fixture with only a SHOW entity
      const showOnlyFixture = {
        liveData: [
          {
            id: 'f0e1d2c3-b4a5-6789-0123-456789abcdef',
            name: 'Festival of Fantasy Parade',
            entityType: 'SHOW',
            status: 'OPERATING',
            lastUpdated: '2026-04-14T14:00:00-04:00',
            showtimes: [{ startTime: '2026-04-14T15:00:00-04:00' }],
          },
        ],
      };

      // Reset execute mock so it returns empty for the SELECT (no SHOW in catalog)
      mockExecute.mockReset();
      mockExecute.mockResolvedValue({ rows: [] });

      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(showOnlyFixture),
      });

      await service.pollLiveData(ENTITY_ID, PARK_UUID);

      // Only 1 execute call (the SELECT for attraction IDs), no INSERT
      expect(mockExecute).toHaveBeenCalledTimes(1);
    });
  });

  // ---------------------------------------------------------------------------
  // ATTRACTION entityType: writes wait_times_history
  // ---------------------------------------------------------------------------
  describe('ATTRACTION entityType: writes wait_times_history', () => {
    it('writes wait_times_history INSERT for known ATTRACTIONs', async () => {
      const attractionOnlyFixture = {
        liveData: [
          {
            id: SDMT_TW_ID,
            name: 'Seven Dwarfs Mine Train',
            entityType: 'ATTRACTION',
            status: 'OPERATING',
            lastUpdated: '2026-04-14T14:00:00-04:00',
            queue: { STANDBY: { waitTime: 65 } },
          },
        ],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(attractionOnlyFixture),
      });

      await service.pollLiveData(ENTITY_ID, PARK_UUID);

      // 1 SELECT + 1 INSERT
      expect(mockExecute).toHaveBeenCalledTimes(2);
    });

    it('skips ATTRACTIONs without a STANDBY queue', async () => {
      const noQueueFixture = {
        liveData: [
          {
            id: SDMT_TW_ID,
            name: 'Seven Dwarfs Mine Train',
            entityType: 'ATTRACTION',
            status: 'OPERATING',
            lastUpdated: '2026-04-14T14:00:00-04:00',
            queue: {}, // No STANDBY
          },
        ],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(noQueueFixture),
      });

      await service.pollLiveData(ENTITY_ID, PARK_UUID);

      // Only the SELECT, no INSERT
      expect(mockExecute).toHaveBeenCalledTimes(1);
    });

    it('skips ATTRACTIONs not found in the catalog', async () => {
      const unknownFixture = {
        liveData: [
          {
            id: 'unknown-uuid-not-in-catalog',
            name: 'Unknown Ride',
            entityType: 'ATTRACTION',
            status: 'OPERATING',
            lastUpdated: '2026-04-14T14:00:00-04:00',
            queue: { STANDBY: { waitTime: 30 } },
          },
        ],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(unknownFixture),
      });

      await service.pollLiveData(ENTITY_ID, PARK_UUID);

      // Only the SELECT, no INSERT
      expect(mockExecute).toHaveBeenCalledTimes(1);
    });
  });
});
