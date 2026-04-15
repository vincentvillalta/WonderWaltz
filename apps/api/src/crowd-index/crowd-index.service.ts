import { Injectable, Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { sql } from 'drizzle-orm';
import { REDIS_CLIENT_TOKEN } from '../alerting/slack-alerter.service.js';
import { DB_TOKEN } from '../ingestion/queue-times.service.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CrowdIndexValue {
  value: number | null;
  confidence: 'bootstrap' | 'percentile';
  sample_size_days: number;
}

/** Duck-typed Drizzle interface — avoids @wonderwaltz/db dist-path mismatch */
interface DrizzleDb {
  execute<T = Record<string, unknown>>(query: unknown): Promise<{ rows: T[] }>;
}

interface DayCountRow {
  day_count: number;
}

interface TopRideRow {
  ride_id: string;
}

interface IndexStatsRow {
  avg_wait: number;
  p0: number;
  p50: number;
  p95: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * WDW park slugs — match parks.external_id values in the catalog.
 * Used as Redis key segments: crowd_index:{slug}:{date}
 */
export const PARK_SLUGS = [
  'magic-kingdom',
  'epcot',
  'hollywood-studios',
  'animal-kingdom',
] as const;

/** Bootstrap/percentile auto-switch threshold (days of history required) */
const PERCENTILE_THRESHOLD_DAYS = 30;

/** Redis TTL for crowd index keys (2 hours — hourly job refreshes before expiry) */
const CROWD_INDEX_TTL_S = 7200;

/** Number of top rides to include per park */
const TOP_RIDES_PER_PARK = 5;

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/**
 * CrowdIndexService
 *
 * Pure calculation layer for the crowd index worker (DATA-04).
 *
 * Responsibilities:
 * - Query historical data to determine bootstrap vs percentile mode
 * - Compute 0–100 crowd index for each park and globally
 * - Write all 5 Redis keys with confidence metadata
 *
 * Bootstrap mode (< 30 days of data): min(100, avg_wait × 1.2)
 * Percentile mode (≥ 30 days): percentile_cont mapping against last 90 days
 *
 * Auto-switch: the service detects mode at runtime from the day count query.
 */
@Injectable()
export class CrowdIndexService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: DrizzleDb,
    @Inject(REDIS_CLIENT_TOKEN) private readonly redis: Redis,
  ) {}

  // ---------------------------------------------------------------------------
  // Formula: Bootstrap
  // ---------------------------------------------------------------------------

  /**
   * Bootstrap formula (DATA-04a): min(100, avg_wait × 1.2)
   * Used when < 30 days of wait_times_history rows exist.
   *
   * Pure function — no DB/Redis access.
   */
  computeBootstrap(avgWait: number): number {
    return Math.min(100, avgWait * 1.2);
  }

  // ---------------------------------------------------------------------------
  // Formula: Percentile
  // ---------------------------------------------------------------------------

  /**
   * Percentile index formula (DATA-04b): linear interpolation between anchor points.
   *
   * Anchor points: p0 → 0, p50 → 50, p95 → 95
   *
   * if avgWait <= p0: return 0
   * if avgWait >= p95: return 95 (clamped — never reaches 100 in percentile mode)
   * if avgWait <= p50: interpolate linearly between [p0→0] and [p50→50]
   * else: interpolate linearly between [p50→50] and [p95→95]
   *
   * Pure function — no DB/Redis access.
   */
  computePercentileIndex(avgWait: number, p0: number, p50: number, p95: number): number {
    if (avgWait <= p0) return 0;
    if (avgWait >= p95) return 95;

    if (avgWait <= p50) {
      return ((avgWait - p0) / (p50 - p0)) * 50;
    }

    return 50 + ((avgWait - p50) / (p95 - p50)) * 45;
  }

  // ---------------------------------------------------------------------------
  // Data queries
  // ---------------------------------------------------------------------------

  /**
   * Query the number of distinct days of wait_times_history data.
   * Used to determine bootstrap vs percentile mode at runtime.
   *
   * >= 30 days → percentile mode; < 30 days → bootstrap mode
   */
  async getSampleSizeDays(): Promise<number> {
    // drizzle-orm postgres-js returns RowList (array), not { rows: [] }
    const rows = (await this.db.execute<DayCountRow>(sql`
      SELECT COUNT(DISTINCT DATE(ts))::int AS day_count
      FROM wait_times_history
    `)) as unknown as DayCountRow[];

    return rows[0]?.day_count ?? 0;
  }

  /**
   * Return the top N ride UUIDs for a park, ranked by 90-day avg wait time.
   * Used to scope queries to the most-representative rides per park.
   */
  async getTopRidesForPark(parkSlug: string): Promise<string[]> {
    const rows = (await this.db.execute<TopRideRow>(sql`
      SELECT a.id AS ride_id
      FROM attractions a
      INNER JOIN parks p ON p.id = a.park_id
      WHERE p.external_id = ${parkSlug}
        AND a.queue_times_id IS NOT NULL
        AND a.is_active = true
      ORDER BY (
        SELECT AVG(w.minutes)
        FROM wait_times_history w
        WHERE w.ride_id = a.id
          AND w.ts > now() - INTERVAL '90 days'
      ) DESC NULLS LAST
      LIMIT ${TOP_RIDES_PER_PARK}
    `)) as unknown as TopRideRow[];

    return rows.map((r) => String(r.ride_id));
  }

  /**
   * Run Pattern 7 percentile SQL filtered to the given ride UUIDs.
   * Returns current avg_wait + historical percentile distribution anchors.
   * Returns null when no data available (e.g. empty ride list or no history).
   */
  async computeIndexForRides(
    rideUuids: string[],
  ): Promise<{ avg_wait: number; p0: number; p50: number; p95: number } | null> {
    if (rideUuids.length === 0) {
      return null;
    }

    const uuidList = rideUuids.map((id) => `'${id}'`).join(', ');

    // Pattern 7 from RESEARCH.md — percentile_cont against 90-day history
    // Note: rideUuids are trusted UUIDs from our own DB queries, not user input
    const rows = (await this.db.execute<IndexStatsRow>(sql`
      WITH top_rides AS (
        SELECT id AS ride_id
        FROM attractions
        WHERE id::text IN (${sql.raw(uuidList)})
      ),
      current_avg AS (
        SELECT AVG(w.minutes) AS avg_wait
        FROM wait_times_history w
        INNER JOIN top_rides tr ON tr.ride_id = w.ride_id
        WHERE w.ts > now() - INTERVAL '10 minutes'
      ),
      historical_dist AS (
        SELECT
          percentile_cont(0.0)  WITHIN GROUP (ORDER BY hourly_avg) AS p0,
          percentile_cont(0.5)  WITHIN GROUP (ORDER BY hourly_avg) AS p50,
          percentile_cont(0.95) WITHIN GROUP (ORDER BY hourly_avg) AS p95
        FROM (
          SELECT date_trunc('hour', ts) AS h, AVG(minutes) AS hourly_avg
          FROM wait_times_history w
          INNER JOIN top_rides tr ON tr.ride_id = w.ride_id
          WHERE ts > now() - INTERVAL '90 days'
          GROUP BY 1
        ) sub
      )
      SELECT ca.avg_wait, hd.p0, hd.p50, hd.p95
      FROM current_avg ca, historical_dist hd
    `)) as unknown as IndexStatsRow[];

    const row = rows[0];
    if (!row || row.avg_wait == null) {
      return null;
    }

    return {
      avg_wait: Number(row.avg_wait),
      p0: Number(row.p0),
      p50: Number(row.p50),
      p95: Number(row.p95),
    };
  }

  // ---------------------------------------------------------------------------
  // Main entry point
  // ---------------------------------------------------------------------------

  /**
   * Compute and write all 5 crowd index Redis keys for the given date.
   *
   * 1. Determine mode (bootstrap vs percentile) based on data window
   * 2. Compute per-park values using top 5 rides per park
   * 3. Compute global value using union of all parks' top 5 rides
   * 4. Write all 5 keys to Redis via writeToRedis
   */
  async refreshAll(date: string): Promise<void> {
    const sampleSizeDays = await this.getSampleSizeDays();
    const isPercentileMode = sampleSizeDays >= PERCENTILE_THRESHOLD_DAYS;
    const confidence: 'bootstrap' | 'percentile' = isPercentileMode ? 'percentile' : 'bootstrap';

    const parksValues: Record<string, CrowdIndexValue> = {};
    const allTopRides: string[] = [];

    // Compute per-park values
    for (const slug of PARK_SLUGS) {
      const topRides = await this.getTopRidesForPark(slug);
      allTopRides.push(...topRides);

      let value: number | null;

      if (isPercentileMode) {
        const stats = await this.computeIndexForRides(topRides);
        value =
          stats != null
            ? this.computePercentileIndex(stats.avg_wait, stats.p0, stats.p50, stats.p95)
            : null;
      } else {
        // Bootstrap: compute avg from available recent data, or use null if no rides
        const stats = await this.computeIndexForRides(topRides);
        value = stats != null ? this.computeBootstrap(stats.avg_wait) : null;
      }

      parksValues[slug] = { value, confidence, sample_size_days: sampleSizeDays };
    }

    // Compute global value using union of all parks' top rides (up to 20)
    let globalValue: number | null;

    if (isPercentileMode) {
      const stats = await this.computeIndexForRides(allTopRides);
      globalValue =
        stats != null
          ? this.computePercentileIndex(stats.avg_wait, stats.p0, stats.p50, stats.p95)
          : null;
    } else {
      const stats = await this.computeIndexForRides(allTopRides);
      globalValue = stats != null ? this.computeBootstrap(stats.avg_wait) : null;
    }

    const global: CrowdIndexValue = {
      value: globalValue,
      confidence,
      sample_size_days: sampleSizeDays,
    };

    await this.writeToRedis(date, global, parksValues);
  }

  // ---------------------------------------------------------------------------
  // Redis write
  // ---------------------------------------------------------------------------

  /**
   * Write all 5 crowd index Redis keys for the given date.
   *
   * Keys written (DATA-04c):
   *   crowd_index:{date}                   — global
   *   crowd_index:magic-kingdom:{date}
   *   crowd_index:epcot:{date}
   *   crowd_index:hollywood-studios:{date}
   *   crowd_index:animal-kingdom:{date}
   *
   * Each value is JSON with { value, confidence, sample_size_days } (DATA-04d).
   * TTL: 7200 seconds (2 hours) — the hourly job refreshes before expiry.
   */
  async writeToRedis(
    date: string,
    global: CrowdIndexValue,
    parks: Record<string, CrowdIndexValue>,
  ): Promise<void> {
    // Write global key
    await this.redis.set(`crowd_index:${date}`, JSON.stringify(global), 'EX', CROWD_INDEX_TTL_S);

    // Write per-park keys
    for (const slug of PARK_SLUGS) {
      const parkValue = parks[slug];
      if (parkValue !== undefined) {
        await this.redis.set(
          `crowd_index:${slug}:${date}`,
          JSON.stringify(parkValue),
          'EX',
          CROWD_INDEX_TTL_S,
        );
      }
    }
  }
}
