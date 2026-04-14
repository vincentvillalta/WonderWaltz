import { Injectable, Inject } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import type Redis from 'ioredis';
import { REDIS_CLIENT_TOKEN } from '../alerting/slack-alerter.service.js';
import { DB_TOKEN } from '../ingestion/queue-times.service.js';
import { WeatherService } from '../weather/weather.service.js';
import type { WeatherDto } from '../weather/weather.service.js';
import type { CrowdIndexValue } from '../crowd-index/crowd-index.service.js';
import type { WaitTimeDto, WaitTimeSource } from '../shared/dto/wait-time.dto.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Duck-typed Drizzle interface — avoids @wonderwaltz/db dist-path mismatch */
interface DrizzleDb {
  execute<T = Record<string, unknown>>(query: unknown): Promise<{ rows: T[] }>;
}

interface ParkRow {
  id: string;
  external_id: string;
  name: string;
}

interface AttractionRow {
  id: string;
  name: string;
  queue_times_id: number | null;
}

interface WaitTimeHistoryRow {
  minutes: number;
  fetched_at: string;
  source: string;
}

/** Redis-stored wait-time payload shape written by QueueTimesService */
interface RedisWaitPayload {
  minutes: number;
  fetched_at: string;
  source: WaitTimeSource;
  is_stale: boolean;
}

export interface ParkDto {
  id: string;
  name: string;
  external_id: string;
}

export interface CrowdIndexResponseDto {
  global: CrowdIndexValue;
  parks: {
    magic_kingdom: CrowdIndexValue;
    epcot: CrowdIndexValue;
    hollywood_studios: CrowdIndexValue;
    animal_kingdom: CrowdIndexValue;
  };
}

/** 5 minutes in milliseconds — is_stale threshold */
const STALE_THRESHOLD_MS = 5 * 60 * 1_000;

/** Null-safe crowd index value returned when Redis key is missing */
const NULL_CROWD_INDEX: CrowdIndexValue = {
  value: null,
  confidence: 'bootstrap',
  sample_size_days: 0,
};

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/**
 * ParksService
 *
 * Business logic for the live ingestion read endpoints (plan 02-09).
 *
 * - getParks(): DB catalog read
 * - getWaitTimes(parkId): Redis reads with is_stale computation + DB last-row fallback
 * - getCrowdIndex(): Redis reads for 5 crowd_index keys
 * - getWeather(date): delegates to WeatherService
 */
@Injectable()
export class ParksService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: DrizzleDb,
    @Inject(REDIS_CLIENT_TOKEN) private readonly redis: Redis,
    private readonly weatherService: WeatherService,
  ) {}

  // ---------------------------------------------------------------------------
  // GET /v1/parks
  // ---------------------------------------------------------------------------

  async getParks(): Promise<ParkDto[]> {
    const result = await this.db.execute<ParkRow>(sql`
      SELECT id::text, external_id, name
      FROM parks
      ORDER BY name ASC
    `);

    return result.rows.map((row) => ({
      id: String(row.id),
      name: String(row.name),
      external_id: String(row.external_id),
    }));
  }

  // ---------------------------------------------------------------------------
  // GET /v1/parks/:parkId/waits
  // ---------------------------------------------------------------------------

  /**
   * Returns wait times for all tracked attractions in the specified park.
   *
   * parkId is the park's external_id slug (e.g. "magic-kingdom").
   *
   * For each attraction:
   * 1. Try Redis key wait:{attraction.id}
   * 2. On Redis miss, try last row of wait_times_history for fallback
   * 3. Compute is_stale = (now - fetched_at) > 5 minutes
   * 4. Include attraction even if no data found (minutes=null, is_stale=true)
   */
  async getWaitTimes(parkId: string): Promise<WaitTimeDto[]> {
    // Fetch all active attractions in the park (by external_id slug)
    const attractionsResult = await this.db.execute<AttractionRow>(sql`
      SELECT a.id::text AS id, a.name, a.queue_times_id
      FROM attractions a
      INNER JOIN parks p ON p.id = a.park_id
      WHERE p.external_id = ${parkId}
        AND a.is_active = true
        AND a.queue_times_id IS NOT NULL
      ORDER BY a.name ASC
    `);

    const waitTimes: WaitTimeDto[] = [];

    for (const attraction of attractionsResult.rows) {
      const attractionId = String(attraction.id);
      const attractionName = String(attraction.name);

      // Try Redis first
      const redisRaw = await this.redis.get(`wait:${attractionId}`);

      if (redisRaw) {
        try {
          const payload = JSON.parse(redisRaw) as RedisWaitPayload;
          const fetchedAt = payload.fetched_at;
          const isStale = Date.now() - new Date(fetchedAt).getTime() > STALE_THRESHOLD_MS;

          waitTimes.push({
            attractionId,
            name: attractionName,
            minutes: payload.minutes ?? null,
            fetched_at: fetchedAt,
            source: payload.source,
            is_stale: isStale,
          });
          continue;
        } catch {
          // Corrupt Redis value — fall through to DB fallback
        }
      }

      // Redis miss — try last row of wait_times_history as fallback
      const historyResult = await this.db.execute<WaitTimeHistoryRow>(sql`
        SELECT minutes, fetched_at::text, source
        FROM wait_times_history
        WHERE ride_id = ${attractionId}::uuid
        ORDER BY ts DESC
        LIMIT 1
      `);

      const historyRow = historyResult.rows[0];

      if (historyRow) {
        const fetchedAt = String(historyRow.fetched_at);
        const isStale = Date.now() - new Date(fetchedAt).getTime() > STALE_THRESHOLD_MS;

        waitTimes.push({
          attractionId,
          name: attractionName,
          minutes: historyRow.minutes ?? null,
          fetched_at: fetchedAt,
          source: (String(historyRow.source) as WaitTimeSource) || null,
          is_stale: isStale,
        });
      } else {
        // No data anywhere — include with null values and is_stale=true
        waitTimes.push({
          attractionId,
          name: attractionName,
          minutes: null,
          fetched_at: null,
          source: null,
          is_stale: true,
        });
      }
    }

    return waitTimes;
  }

  // ---------------------------------------------------------------------------
  // GET /v1/crowd-index
  // ---------------------------------------------------------------------------

  /**
   * Reads all 5 crowd index Redis keys for today and returns them.
   *
   * Keys read:
   *   crowd_index:{YYYY-MM-DD}                   — global
   *   crowd_index:magic-kingdom:{YYYY-MM-DD}
   *   crowd_index:epcot:{YYYY-MM-DD}
   *   crowd_index:hollywood-studios:{YYYY-MM-DD}
   *   crowd_index:animal-kingdom:{YYYY-MM-DD}
   *
   * Returns NULL_CROWD_INDEX stub when a key is missing (worker not yet run).
   */
  async getCrowdIndex(): Promise<CrowdIndexResponseDto> {
    const today = new Date().toISOString().split('T')[0]!;

    // Read all 5 keys concurrently
    const [globalRaw, mkRaw, epcotRaw, hsRaw, akRaw] = await Promise.all([
      this.redis.get(`crowd_index:${today}`),
      this.redis.get(`crowd_index:magic-kingdom:${today}`),
      this.redis.get(`crowd_index:epcot:${today}`),
      this.redis.get(`crowd_index:hollywood-studios:${today}`),
      this.redis.get(`crowd_index:animal-kingdom:${today}`),
    ]);

    const parse = (raw: string | null): CrowdIndexValue =>
      raw ? (JSON.parse(raw) as CrowdIndexValue) : { ...NULL_CROWD_INDEX };

    return {
      global: parse(globalRaw),
      parks: {
        magic_kingdom: parse(mkRaw),
        epcot: parse(epcotRaw),
        hollywood_studios: parse(hsRaw),
        animal_kingdom: parse(akRaw),
      },
    };
  }

  // ---------------------------------------------------------------------------
  // GET /v1/weather
  // ---------------------------------------------------------------------------

  async getWeather(date: string): Promise<WeatherDto | null> {
    return this.weatherService.getForecast(date);
  }
}
