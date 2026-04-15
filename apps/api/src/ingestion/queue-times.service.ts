import { Injectable, Logger, Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { sql } from 'drizzle-orm';
import { REDIS_CLIENT_TOKEN } from '../alerting/slack-alerter.service.js';

/** Injection token for the Drizzle DB instance */
export const DB_TOKEN = 'DB';

/**
 * WDW Park IDs on queue-times.com.
 * EPCOT=5, MK=6, Hollywood Studios=7, Animal Kingdom=8
 */
export const PARK_IDS = [5, 6, 7, 8] as const;

/** Normal Redis TTL for a fresh wait-time value (2 minutes) */
const NORMAL_TTL_S = 120;

/** TTL extension on fetch failure (+10 minutes) */
const FAILURE_TTL_EXTENSION_S = 600;

// ---------------------------------------------------------------------------
// API response shapes
// ---------------------------------------------------------------------------

interface QueueTimesRide {
  id: number;
  name: string;
  is_open: boolean;
  wait_time: number;
  last_updated: string;
}

interface QueueTimesLand {
  id: number;
  name: string;
  rides: QueueTimesRide[];
}

interface QueueTimesResponse {
  lands: QueueTimesLand[];
  rides: QueueTimesRide[];
}

// ---------------------------------------------------------------------------
// Duck-typed Drizzle interface — avoids @wonderwaltz/db dist-path mismatch
// (see 02-02 SUMMARY key-decisions; same pattern as LagAlertService)
// ---------------------------------------------------------------------------

interface AttractionRow extends Record<string, unknown> {
  id: string;
  queue_times_id: number;
}

interface DrizzleDb {
  execute<T extends Record<string, unknown>>(query: ReturnType<typeof sql>): Promise<{ rows: T[] }>;
}

/**
 * QueueTimesService
 *
 * Handles the HTTP fetch from queue-times.com, Redis wait-key writes,
 * and wait_times_history DB inserts for WDW parks.
 *
 * DATA-01: primary ingestion source, polled every 5 minutes.
 */
@Injectable()
export class QueueTimesService {
  private readonly logger = new Logger(QueueTimesService.name);

  /** In-memory cache of queue_times_id → internal UUID, populated once per process lifetime */
  private attractionIdCache: Map<number, string> | null = null;

  constructor(
    @Inject(DB_TOKEN) private readonly db: DrizzleDb,
    @Inject(REDIS_CLIENT_TOKEN) private readonly redis: Redis,
  ) {}

  /**
   * Resolve all attraction UUIDs from catalog by queue_times_id.
   * Cached in memory for the lifetime of the worker process.
   */
  async resolveAttractionIds(): Promise<Map<number, string>> {
    if (this.attractionIdCache !== null) {
      return this.attractionIdCache;
    }

    // drizzle-orm postgres-js driver returns RowList (an iterable array),
    // NOT an object with a .rows property (that's the pg driver shape).
    const rows = (await this.db.execute<AttractionRow>(sql`
      SELECT id, queue_times_id
      FROM attractions
      WHERE queue_times_id IS NOT NULL
    `)) as unknown as AttractionRow[];

    const map = new Map<number, string>();
    for (const row of rows) {
      map.set(Number(row.queue_times_id), String(row.id));
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
   * Poll a single WDW park from queue-times.com.
   *
   * On success:
   *   - Writes Redis key `wait:{uuid}` with JSON value and EX 120
   *   - Inserts row into wait_times_history with source='queue-times'
   *
   * On fetch failure:
   *   - Extends TTL of all existing `wait:*` keys by +600 seconds
   *   - Does NOT write to DB
   */
  async pollPark(queueTimesId: number): Promise<void> {
    let rides: QueueTimesRide[];
    const fetchedAt = new Date();

    try {
      const url = `https://queue-times.com/parks/${queueTimesId}/queue_times.json`;
      const response = await fetch(url);
      const data = (await response.json()) as QueueTimesResponse;

      // Flatten lands[].rides into a single array; also include top-level rides
      rides = [...data.lands.flatMap((land) => land.rides), ...data.rides];
    } catch (err) {
      this.logger.error(`Failed to fetch queue-times.com park ${queueTimesId}`, err);
      await this.extendTtlOnFailure();
      return;
    }

    const idMap = await this.resolveAttractionIds();

    for (const ride of rides) {
      const uuid = idMap.get(ride.id);
      if (!uuid) {
        // Ride not in our catalog — skip silently
        continue;
      }

      const redisValue = JSON.stringify({
        minutes: ride.wait_time,
        fetched_at: fetchedAt.toISOString(),
        source: 'queue-times',
        is_stale: false,
      });

      // Write to Redis with 2-minute TTL
      await this.redis.set(`wait:${uuid}`, redisValue, 'EX', NORMAL_TTL_S);

      // Insert into wait_times_history — ON CONFLICT DO NOTHING handles duplicate (ride_id, ts)
      await this.db.execute(sql`
        INSERT INTO wait_times_history (ride_id, ts, minutes, is_open, source, fetched_at)
        VALUES (
          ${uuid}::uuid,
          ${fetchedAt.toISOString()}::timestamptz,
          ${ride.wait_time},
          ${ride.is_open},
          'queue-times',
          ${fetchedAt.toISOString()}::timestamptz
        )
        ON CONFLICT DO NOTHING
      `);
    }
  }

  /**
   * Extend the TTL of all existing `wait:*` Redis keys by +600 seconds.
   * Called when a fetch cycle fails — preserves last-known values instead of expiring them.
   */
  async extendTtlOnFailure(): Promise<void> {
    try {
      const keys = await (
        this.redis as unknown as { keys(pattern: string): Promise<string[]> }
      ).keys('wait:*');
      for (const key of keys) {
        await this.redis.expire(key, FAILURE_TTL_EXTENSION_S);
      }
    } catch (err) {
      this.logger.error('extendTtlOnFailure failed', err);
    }
  }
}
