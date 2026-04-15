import { Inject, Injectable, Logger } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DB_TOKEN } from '../ingestion/queue-times.service.js';
import { getRuleBucket, type CrowdBucket } from './calendar-rules.js';

/**
 * Duck-typed Drizzle interface — matches the `postgres-js` RowList shape
 * (an array), NOT `{ rows: [] }`. This mirrors `QueueTimesService` and
 * `LagAlertService` patterns established in Phase 2 so we avoid the
 * @wonderwaltz/db dist-path mismatch.
 */
interface DrizzleDb {
  execute(query: ReturnType<typeof sql>): Promise<unknown>;
}

interface CalendarOverrideRow extends Record<string, unknown> {
  bucket: CrowdBucket;
}

/**
 * CalendarService — hybrid crowd-bucket resolver.
 *
 *   1. Query `crowd_calendar` table by date.
 *   2. If a row exists (admin override), return its `bucket`.
 *   3. Otherwise, fall through to the pure `getRuleBucket()` rule engine.
 *
 * Zero caching for now — every call hits the DB. `crowd_calendar` is
 * small (a few dozen rows max) and indexed by the `date` PK; a query
 * costs ~1-2ms. If profiling ever shows this as hot, add an in-memory
 * LRU scoped to the process lifetime.
 */
@Injectable()
export class CalendarService {
  private readonly log = new Logger(CalendarService.name);

  constructor(@Inject(DB_TOKEN) private readonly db: DrizzleDb) {}

  async getBucket(date: Date): Promise<CrowdBucket> {
    const iso = this.toIsoDate(date);
    try {
      const raw = await this.db.execute(
        sql`SELECT bucket FROM crowd_calendar WHERE date = ${iso} LIMIT 1`,
      );
      // drizzle postgres-js returns RowList (array); some test mocks may
      // still use { rows: [...] }. Normalize both.
      const rows: CalendarOverrideRow[] = Array.isArray(raw)
        ? (raw as CalendarOverrideRow[])
        : ((raw as { rows?: CalendarOverrideRow[] }).rows ?? []);
      if (rows[0]) return rows[0].bucket;
    } catch (err) {
      this.log.warn(
        `crowd_calendar lookup failed for ${iso}, falling through to rule engine`,
        err instanceof Error ? err.stack : String(err),
      );
    }
    return getRuleBucket(date);
  }

  /** YYYY-MM-DD in UTC — stable regardless of server timezone. */
  private toIsoDate(date: Date): string {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
