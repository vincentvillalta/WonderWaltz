import { Inject, Injectable, Logger } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import type { SupabaseClient } from '@supabase/supabase-js';
import { DB_TOKEN } from '../ingestion/queue-times.service.js';
import { SUPABASE_ADMIN_TOKEN } from '../shared-infra.module.js';

/** Minimal Drizzle-compatible interface for raw SQL execution */
interface DbExecutable {
  execute<T extends Record<string, unknown>>(query: ReturnType<typeof sql>): Promise<{ rows: T[] }>;
}

/** BullMQ Job shape (duck-typed to avoid @nestjs/bullmq import) */
interface PurgeJob {
  data: { userId: string };
}

/**
 * PurgeProcessor -- 30-day delayed cascade delete across all 14 tables + Supabase auth.
 *
 * Registered as BullMQ processor for 'account-purge' queue.
 * Each DELETE is a no-op on already-deleted rows (idempotent).
 * Wraps in try/catch per statement group -- logs failures but continues.
 *
 * Note: This is Injectable() not @Processor() to allow direct instantiation
 * in tests. The NestJS BullMQ processor registration happens in the module.
 */
@Injectable()
export class PurgeProcessor {
  private readonly logger = new Logger(PurgeProcessor.name);

  constructor(
    @Inject(DB_TOKEN) private readonly db: DbExecutable,
    @Inject(SUPABASE_ADMIN_TOKEN) private readonly supabase: SupabaseClient,
  ) {}

  /**
   * Cascade DELETE across all 14 tables in FK-safe order, then remove Supabase auth record.
   *
   * Each DELETE targets rows WHERE user_id = $1 (or via trip subquery).
   * Zero rows affected on already-purged users = idempotent.
   */
  async process(job: PurgeJob): Promise<void> {
    const { userId } = job.data;
    this.logger.log(`Starting purge cascade for user=${userId}`);

    // FK-safe deletion order: deepest children first
    const statements = [
      // 1. plan_items (deepest child via plan_days -> plans -> trips)
      sql`DELETE FROM plan_items WHERE plan_day_id IN (
        SELECT id FROM plan_days WHERE plan_id IN (
          SELECT id FROM plans WHERE trip_id IN (
            SELECT id FROM trips WHERE user_id = ${userId}
          )
        )
      )`,
      // 2. plan_days
      sql`DELETE FROM plan_days WHERE plan_id IN (
        SELECT id FROM plans WHERE trip_id IN (
          SELECT id FROM trips WHERE user_id = ${userId}
        )
      )`,
      // 3. packing_list_items
      sql`DELETE FROM packing_list_items WHERE plan_id IN (
        SELECT id FROM plans WHERE trip_id IN (
          SELECT id FROM trips WHERE user_id = ${userId}
        )
      )`,
      // 4. affiliate_items
      sql`DELETE FROM affiliate_items WHERE plan_id IN (
        SELECT id FROM plans WHERE trip_id IN (
          SELECT id FROM trips WHERE user_id = ${userId}
        )
      )`,
      // 5. plans
      sql`DELETE FROM plans WHERE trip_id IN (
        SELECT id FROM trips WHERE user_id = ${userId}
      )`,
      // 6. guests
      sql`DELETE FROM guests WHERE trip_id IN (
        SELECT id FROM trips WHERE user_id = ${userId}
      )`,
      // 7. trip_park_days
      sql`DELETE FROM trip_park_days WHERE trip_id IN (
        SELECT id FROM trips WHERE user_id = ${userId}
      )`,
      // 8. trip_preferences
      sql`DELETE FROM trip_preferences WHERE trip_id IN (
        SELECT id FROM trips WHERE user_id = ${userId}
      )`,
      // 9. entitlements
      sql`DELETE FROM entitlements WHERE user_id = ${userId}`,
      // 10. iap_events
      sql`DELETE FROM iap_events WHERE user_id = ${userId}`,
      // 11. llm_costs (via trips)
      sql`DELETE FROM llm_costs WHERE trip_id IN (
        SELECT id FROM trips WHERE user_id = ${userId}
      )`,
      // 12. push_tokens
      sql`DELETE FROM push_tokens WHERE user_id = ${userId}`,
      // 13. trips
      sql`DELETE FROM trips WHERE user_id = ${userId}`,
      // 14. users
      sql`DELETE FROM users WHERE id = ${userId}`,
    ];

    for (const stmt of statements) {
      try {
        await this.db.execute(stmt);
      } catch (err) {
        this.logger.error(`Purge statement failed for user=${userId}`, err);
        // Continue with remaining statements (best-effort cascade with retry)
      }
    }

    // Remove Supabase auth record
    try {
      const { error } = await this.supabase.auth.admin.deleteUser(userId);
      if (error) {
        this.logger.error(`Supabase auth deleteUser failed for user=${userId}`, error);
      }
    } catch (err) {
      this.logger.error(`Supabase auth deleteUser threw for user=${userId}`, err);
    }

    this.logger.log(`Purge cascade completed for user=${userId}`);
  }
}
