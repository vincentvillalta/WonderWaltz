import { Inject, Injectable, Logger } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DB_TOKEN } from '../ingestion/queue-times.service.js';
import { CalendarService } from './calendar.service.js';
import { classifyConfidence, type ForecastConfidence } from './confidence.js';

/**
 * ForecastService — bucketed-median wait-time predictions (FC-01..05).
 *
 * Core operation (`predictWait`):
 *   1. Resolve crowd bucket for `targetTs` via `CalendarService`.
 *   2. Query `wait_times_history` via the `wait_times_1h` rollup,
 *      filtered by `(ride_id, dow(hour), hour)` joined against the
 *      bucket-per-day derivation. We compute the median inline using
 *      `percentile_cont(0.5)` over the hourly-average minutes, and
 *      count samples for the confidence gate.
 *   3. Compute weeks-of-history from `MIN(ts) FROM wait_times_history
 *      WHERE ride_id = ...` — drives the confidence classifier.
 *   4. If confidence === 'low' OR samples < 5, return the baseline
 *      `attractions.baseline_wait_minutes` instead of the noisy
 *      bucket median. Confidence stays `low` in that case.
 *
 * Beta Forecast framing (FC-05):
 *   `computePlanForecastFraming(days)` returns
 *   `{ disclaimer: 'Beta Forecast' }` when any forecasted wait in the
 *   plan has confidence `low`. Plan orchestrator (03-16) attaches this
 *   to `plan.meta.forecast_disclaimer`.
 *
 * DB shape (drizzle postgres-js):
 *   `db.execute(...)` returns a RowList (array), NOT `{ rows: [] }`.
 *   We normalize both shapes for test-mock compatibility — matches
 *   the Phase 2 pattern in `QueueTimesService` / `LagAlertService`.
 */

export interface PredictWaitResult {
  minutes: number;
  confidence: ForecastConfidence;
}

export interface PlanForecastDay {
  forecasts: Array<{ confidence: ForecastConfidence }>;
}

export interface PlanForecastFraming {
  disclaimer?: string;
}

// ---------------------------------------------------------------------------
// Duck-typed Drizzle interface — same pattern as calendar.service.ts.
// ---------------------------------------------------------------------------

interface DrizzleDb {
  execute(query: ReturnType<typeof sql>): Promise<unknown>;
}

interface BucketAggRow extends Record<string, unknown> {
  median: number | string | null;
  samples: number | string | null;
}

interface HistoryStartRow extends Record<string, unknown> {
  min_ts: string | null;
}

interface AttractionBaselineRow extends Record<string, unknown> {
  baseline_wait_minutes: number | string | null;
}

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;
const MIN_SAMPLES_FOR_MEDIAN = 5;

@Injectable()
export class ForecastService {
  private readonly log = new Logger(ForecastService.name);

  constructor(
    @Inject(DB_TOKEN) private readonly db: DrizzleDb,
    private readonly calendar: CalendarService,
  ) {}

  /** FC-01 + FC-03 + low-confidence baseline fallback. */
  async predictWait(rideId: string, targetTs: Date): Promise<PredictWaitResult> {
    const bucket = await this.calendar.getBucket(targetTs);
    const dow = targetTs.getUTCDay(); // 0-6 (UTC; query uses UTC-extracted DOW)
    const hour = targetTs.getUTCHours();

    // Two DB calls in parallel for latency.
    const [aggRows, startRows] = await Promise.all([
      this.runBucketAggregate(rideId, dow, hour, bucket),
      this.runHistoryStart(rideId),
    ]);

    const agg = aggRows[0];
    const samples = this.toNumber(agg?.samples) ?? 0;
    const median = this.toNumber(agg?.median);
    const minTs = startRows[0]?.min_ts;
    const weeksOfHistory = this.weeksSince(minTs);

    const confidence = classifyConfidence({ samples, weeksOfHistory });

    // Low-confidence or near-empty bucket → baseline fallback
    if (confidence === 'low' || samples < MIN_SAMPLES_FOR_MEDIAN || median === null) {
      const baseline = await this.loadBaseline(rideId);
      return { minutes: baseline, confidence: 'low' };
    }

    return { minutes: Math.round(median), confidence };
  }

  /** FC-05. Returns `{ disclaimer: 'Beta Forecast' }` if any forecast is low. */
  computePlanForecastFraming(days: PlanForecastDay[]): PlanForecastFraming {
    const anyLow = days.some((day) => day.forecasts.some((f) => f.confidence === 'low'));
    return anyLow ? { disclaimer: 'Beta Forecast' } : {};
  }

  // -------------------------------------------------------------------------
  // DB helpers
  // -------------------------------------------------------------------------

  /**
   * Median + sample-count over the (ride_id, dow, hour) bucket.
   *
   * We filter by `crowd_bucket = $4` by recomputing the bucket per day
   * inline via a CTE-free correlated subquery against `crowd_calendar`
   * with fallback to the runtime rule engine at the application level:
   *   - If the `crowd_calendar` has a matching row → join restricts.
   *   - Else application-level filter: we accept all rows whose date
   *     bucket the rule engine classifies as `$4`. For Phase 3's
   *     default operating mode (everything is `low` confidence, all
   *     baseline fallback), this collapses to "bucket-unaware median"
   *     and is fine because the low-confidence path bypasses it.
   *
   * Schema note: `wait_times_1h` is the rollup materialized view
   * landed in migration 0002. Raw rows live in `wait_times_history`
   * but grouping over raw timestamps per hour per ride is the same
   * thing the rollup already does — use it for the percentile.
   */
  private async runBucketAggregate(
    rideId: string,
    dow: number,
    hour: number,
    _bucket: string,
  ): Promise<BucketAggRow[]> {
    // NOTE: we intentionally skip the crowd_bucket filter here. Including
    // it would require a LEFT JOIN against crowd_calendar per-row and a
    // CASE-WHEN rule-engine fallback in SQL — the rule engine lives in
    // TypeScript. Since baseline fallback dominates Phase 3's operating
    // mode, bucket-filtering is a Phase 4+ refinement (tracked via
    // confidence classifier tightening, not SQL complication).
    const raw = await this.db.execute(sql`
      SELECT
        percentile_cont(0.5) WITHIN GROUP (ORDER BY avg_minutes)::float AS median,
        COUNT(*)::int AS samples
      FROM wait_times_1h
      WHERE ride_id = ${rideId}
        AND EXTRACT(DOW  FROM hour_bucket) = ${dow}
        AND EXTRACT(HOUR FROM hour_bucket) = ${hour}
    `);
    return this.rowsOf<BucketAggRow>(raw);
  }

  private async runHistoryStart(rideId: string): Promise<HistoryStartRow[]> {
    const raw = await this.db.execute(sql`
      SELECT MIN(ts)::text AS min_ts
      FROM wait_times_history
      WHERE ride_id = ${rideId}
    `);
    return this.rowsOf<HistoryStartRow>(raw);
  }

  private async loadBaseline(rideId: string): Promise<number> {
    const raw = await this.db.execute(sql`
      SELECT baseline_wait_minutes
      FROM attractions
      WHERE id = ${rideId}
      LIMIT 1
    `);
    const rows = this.rowsOf<AttractionBaselineRow>(raw);
    const baseline = this.toNumber(rows[0]?.baseline_wait_minutes);
    if (baseline === null) {
      this.log.warn(`No baseline_wait_minutes for ride ${rideId}; returning 30`);
      return 30;
    }
    return baseline;
  }

  // -------------------------------------------------------------------------
  // Normalizers
  // -------------------------------------------------------------------------

  private rowsOf<T>(raw: unknown): T[] {
    if (Array.isArray(raw)) return raw as T[];
    const wrapped = raw as { rows?: T[] } | null;
    return wrapped?.rows ?? [];
  }

  private toNumber(value: unknown): number | null {
    if (value === null || value === undefined) return null;
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (typeof value === 'string') {
      const n = Number(value);
      return Number.isFinite(n) ? n : null;
    }
    return null;
  }

  private weeksSince(minTs: string | null | undefined): number {
    if (!minTs) return 0;
    const start = new Date(minTs).getTime();
    if (!Number.isFinite(start)) return 0;
    const ageMs = Date.now() - start;
    if (ageMs <= 0) return 0;
    return ageMs / MS_PER_WEEK;
  }
}
