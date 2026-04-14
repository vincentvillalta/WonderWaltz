import { Injectable, Logger, Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { sql } from 'drizzle-orm';
import { REDIS_CLIENT_TOKEN } from '../alerting/slack-alerter.service.js';
import { DB_TOKEN } from './queue-times.service.js';

// ---------------------------------------------------------------------------
// WDW Park entity IDs on themeparks.wiki — confirmed from RESEARCH.md
// ---------------------------------------------------------------------------

/** Maps internal park UUID → themeparks.wiki entity ID */
export const ENTITY_IDS: Record<string, string> = {
  '75ea578a-adc8-4116-a54d-dccb60765ef9': '75ea578a-adc8-4116-a54d-dccb60765ef9', // Magic Kingdom
  '47f90d2c-e191-4239-a466-5892ef59a88b': '47f90d2c-e191-4239-a466-5892ef59a88b', // EPCOT
  '288747d1-8b4f-4a64-867e-ea7c9b27bad8': '288747d1-8b4f-4a64-867e-ea7c9b27bad8', // Hollywood Studios
  '1c84a229-8862-4648-9c71-378ddd2c7693': '1c84a229-8862-4648-9c71-378ddd2c7693', // Animal Kingdom
};

/** WDW park UUID→entityId pairs for polling all 4 parks */
export const WDW_PARKS: Array<{ parkUuid: string; entityId: string }> = [
  {
    parkUuid: '75ea578a-adc8-4116-a54d-dccb60765ef9',
    entityId: '75ea578a-adc8-4116-a54d-dccb60765ef9',
  }, // MK
  {
    parkUuid: '47f90d2c-e191-4239-a466-5892ef59a88b',
    entityId: '47f90d2c-e191-4239-a466-5892ef59a88b',
  }, // EPCOT
  {
    parkUuid: '288747d1-8b4f-4a64-867e-ea7c9b27bad8',
    entityId: '288747d1-8b4f-4a64-867e-ea7c9b27bad8',
  }, // HS
  {
    parkUuid: '1c84a229-8862-4648-9c71-378ddd2c7693',
    entityId: '1c84a229-8862-4648-9c71-378ddd2c7693',
  }, // AK
];

/** Redis TTL for park hours / showtimes keys (24 hours) */
const HOURS_TTL_S = 86400;

/** Redis TTL for wait-time keys from themeparks.wiki (2 minutes, same as queue-times) */
const WAIT_TTL_S = 120;

// ---------------------------------------------------------------------------
// API response shapes
// ---------------------------------------------------------------------------

interface ScheduleEntry {
  date: string;
  type: string;
  openingTime: string;
  closingTime: string;
}

interface ScheduleResponse {
  schedule: ScheduleEntry[];
}

interface ShowtimeEntry {
  startTime: string;
  endTime?: string;
}

interface LiveDataEntry {
  id: string; // themeparks_wiki_id
  name: string;
  entityType: string;
  status: string;
  lastUpdated: string;
  queue?: {
    STANDBY?: { waitTime: number | null };
    [key: string]: unknown;
  };
  showtimes?: ShowtimeEntry[];
}

interface LiveResponse {
  liveData: LiveDataEntry[];
}

// ---------------------------------------------------------------------------
// Duck-typed Drizzle interface — avoids @wonderwaltz/db dist-path mismatch
// (same pattern as QueueTimesService / LagAlertService from 02-02/02-04)
// ---------------------------------------------------------------------------

interface AttractionRow extends Record<string, unknown> {
  id: string;
  themeparks_wiki_id: string;
}

interface DrizzleDb {
  execute<T extends Record<string, unknown>>(query: ReturnType<typeof sql>): Promise<{ rows: T[] }>;
}

/**
 * ThemeparksService
 *
 * Handles the HTTP fetch from themeparks.wiki /schedule and /live endpoints.
 *
 * DATA-02:
 *  - pollSchedule: writes park_hours:{parkUuid}:{date} + showtimes from schedule
 *  - pollLiveData: writes wait_times_history with source='themeparks-wiki' for ATTRACTION entities;
 *                  writes showtimes:{parkUuid}:{date} for SHOW entities
 *
 * This is the secondary ingestion source, running every 6 hours independently of queue-times.
 * It is NOT a failover for queue-times.com — it has its own independent schedule.
 */
@Injectable()
export class ThemeparksService {
  private readonly logger = new Logger(ThemeparksService.name);

  /** In-memory cache: themeparks_wiki_id (UUID string) → internal attraction UUID */
  private attractionIdCache: Map<string, string> | null = null;

  constructor(
    @Inject(DB_TOKEN) private readonly db: DrizzleDb,
    @Inject(REDIS_CLIENT_TOKEN) private readonly redis: Redis,
  ) {}

  /**
   * Resolve all attraction UUIDs from catalog by themeparks_wiki_id.
   * Cached in memory for the lifetime of the worker process.
   */
  async resolveAttractionIds(): Promise<Map<string, string>> {
    if (this.attractionIdCache !== null) {
      return this.attractionIdCache;
    }

    const result = await this.db.execute<AttractionRow>(sql`
      SELECT id, themeparks_wiki_id
      FROM attractions
      WHERE themeparks_wiki_id IS NOT NULL
    `);

    const map = new Map<string, string>();
    for (const row of result.rows) {
      map.set(String(row.themeparks_wiki_id), String(row.id));
    }

    this.attractionIdCache = map;
    return map;
  }

  /**
   * Clears the in-memory attraction ID cache.
   * Useful in tests and for long-running process refreshes.
   */
  resetCache(): void {
    this.attractionIdCache = null;
  }

  /**
   * Poll the /schedule endpoint for a given park entity.
   *
   * Writes to Redis:
   *   - park_hours:{parkUuid}:{YYYY-MM-DD} — JSON { openingTime, closingTime, type, date }; EX 86400
   */
  async pollSchedule(entityId: string, parkUuid: string): Promise<void> {
    let scheduleData: ScheduleResponse;

    try {
      const url = `https://api.themeparks.wiki/v1/entity/${entityId}/schedule`;
      const response = await fetch(url);
      scheduleData = (await response.json()) as ScheduleResponse;
    } catch (err) {
      this.logger.error(`Failed to fetch schedule for entity ${entityId}`, err);
      return;
    }

    for (const entry of scheduleData.schedule) {
      const key = `park_hours:${parkUuid}:${entry.date}`;
      const value = JSON.stringify({
        openingTime: entry.openingTime,
        closingTime: entry.closingTime,
        type: entry.type,
        date: entry.date,
      });

      await this.redis.set(key, value, 'EX', HOURS_TTL_S);
    }
  }

  /**
   * Poll the /live endpoint for a given park entity.
   *
   * For ATTRACTION entities with a STANDBY queue:
   *   - Resolves themeparks_wiki_id → internal UUID
   *   - Writes wait_times_history with source='themeparks-wiki'
   *   - Writes wait:{uuid} Redis key with EX 120 (conflict resolution: skip if more-recent value exists)
   *
   * For SHOW entities with showtimes:
   *   - Aggregates and writes showtimes:{parkUuid}:{date} Redis key with EX 86400
   */
  async pollLiveData(entityId: string, parkUuid: string): Promise<void> {
    let liveData: LiveResponse;

    try {
      const url = `https://api.themeparks.wiki/v1/entity/${entityId}/live`;
      const response = await fetch(url);
      liveData = (await response.json()) as LiveResponse;
    } catch (err) {
      this.logger.error(`Failed to fetch live data for entity ${entityId}`, err);
      return;
    }

    const fetchedAt = new Date();
    const idMap = await this.resolveAttractionIds();

    // Aggregate showtimes by date for all SHOW entities
    const showtimesByDate = new Map<
      string,
      Array<{ entityId: string; name: string; startTime: string; endTime?: string }>
    >();

    for (const entry of liveData.liveData) {
      if (entry.entityType === 'ATTRACTION') {
        await this.processAttraction(entry, idMap, fetchedAt);
      } else if (entry.entityType === 'SHOW') {
        this.aggregateShowtimes(entry, showtimesByDate);
      }
    }

    // Write aggregated showtimes to Redis
    for (const [date, showtimes] of showtimesByDate) {
      const key = `showtimes:${parkUuid}:${date}`;
      await this.redis.set(key, JSON.stringify(showtimes), 'EX', HOURS_TTL_S);
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async processAttraction(
    entry: LiveDataEntry,
    idMap: Map<string, string>,
    fetchedAt: Date,
  ): Promise<void> {
    const standby = entry.queue?.STANDBY;
    if (!standby || standby.waitTime === null || standby.waitTime === undefined) {
      // No STANDBY queue data — skip
      return;
    }

    const internalUuid = idMap.get(entry.id);
    if (!internalUuid) {
      // Ride not in our catalog — skip silently
      return;
    }

    const isOpen = entry.status === 'OPERATING';
    const minutes = standby.waitTime;

    // Conflict resolution: compare fetched_at timestamps in Redis
    // Only write to wait:{uuid} if this value is more recent than what's there
    await this.writeWaitTimeIfMoreRecent(
      internalUuid,
      minutes,
      isOpen,
      fetchedAt,
      'themeparks-wiki',
    );

    // Always insert into wait_times_history — ON CONFLICT DO NOTHING protects against duplicates
    await this.db.execute(sql`
      INSERT INTO wait_times_history (ride_id, ts, minutes, is_open, source, fetched_at)
      VALUES (
        ${internalUuid}::uuid,
        ${fetchedAt.toISOString()}::timestamptz,
        ${minutes},
        ${isOpen},
        ${'themeparks-wiki'},
        ${fetchedAt.toISOString()}::timestamptz
      )
      ON CONFLICT DO NOTHING
    `);
  }

  private async writeWaitTimeIfMoreRecent(
    uuid: string,
    minutes: number,
    isOpen: boolean,
    fetchedAt: Date,
    source: string,
  ): Promise<void> {
    const key = `wait:${uuid}`;

    try {
      const existing = await this.redis.get(key);
      if (existing) {
        const existingValue = JSON.parse(existing) as { fetched_at: string };
        const existingTime = new Date(existingValue.fetched_at).getTime();
        if (existingTime >= fetchedAt.getTime()) {
          // Existing value is same age or more recent — do not overwrite
          return;
        }
      }
    } catch (err) {
      // If we can't read the existing value, proceed with writing
      this.logger.warn(`Failed to read existing Redis key ${key}, will overwrite`, err);
    }

    const value = JSON.stringify({
      minutes,
      fetched_at: fetchedAt.toISOString(),
      source,
      is_stale: false,
    });

    await this.redis.set(key, value, 'EX', WAIT_TTL_S);
  }

  private aggregateShowtimes(
    entry: LiveDataEntry,
    showtimesByDate: Map<
      string,
      Array<{ entityId: string; name: string; startTime: string; endTime?: string }>
    >,
  ): void {
    if (!entry.showtimes || entry.showtimes.length === 0) {
      return;
    }

    for (const showtime of entry.showtimes) {
      // Extract date from the startTime ISO string
      const date = showtime.startTime.split('T')[0];
      if (!date) continue;

      if (!showtimesByDate.has(date)) {
        showtimesByDate.set(date, []);
      }

      showtimesByDate.get(date)!.push({
        entityId: entry.id,
        name: entry.name,
        startTime: showtime.startTime,
        endTime: showtime.endTime,
      });
    }
  }
}
