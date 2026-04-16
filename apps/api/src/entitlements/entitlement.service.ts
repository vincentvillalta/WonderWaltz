import { Inject, Injectable, Logger } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DB_TOKEN } from '../ingestion/queue-times.service.js';

/** Minimal Drizzle-compatible interface for raw SQL execution */
interface DbExecutable {
  execute<T extends Record<string, unknown>>(query: ReturnType<typeof sql>): Promise<{ rows: T[] }>;
}

/** Row shape returned from the entitlements table */
export interface EntitlementRow extends Record<string, unknown> {
  id: string;
  user_id: string;
  trip_id: string;
  revenuecat_id: string;
  state: string;
  purchased_at: string;
  revoked_at: string | null;
  created_at: string;
}

/**
 * EntitlementService -- CRUD operations for IAP entitlements.
 *
 * - createEntitlement: idempotent INSERT (ON CONFLICT DO NOTHING on revenuecat_id)
 * - revokeEntitlement: UPDATE state + revoked_at
 * - unlockTrip / lockTrip: UPDATE trips.entitlement_state
 * - getEntitlementByRevenuecatId: single-row lookup
 * - getEntitlementsByUserId: active entitlements for restore flow (Plan 04)
 */
@Injectable()
export class EntitlementService {
  private readonly logger = new Logger(EntitlementService.name);

  constructor(@Inject(DB_TOKEN) private readonly db: DbExecutable) {}

  /**
   * Insert an entitlement row. ON CONFLICT (revenuecat_id) DO NOTHING
   * ensures idempotency -- duplicate webhook events become no-ops.
   *
   * Returns the created row, or null if the row already existed (duplicate).
   */
  async createEntitlement(
    userId: string,
    tripId: string,
    revenuecatId: string,
    purchasedAt: Date,
  ): Promise<EntitlementRow | null> {
    const { rows } = await this.db.execute<EntitlementRow>(
      sql`INSERT INTO entitlements (user_id, trip_id, revenuecat_id, state, purchased_at)
          VALUES (${userId}, ${tripId}, ${revenuecatId}, 'active', ${purchasedAt.toISOString()})
          ON CONFLICT (revenuecat_id) DO NOTHING
          RETURNING *`,
    );

    if (rows.length === 0) {
      this.logger.log(`Duplicate entitlement for revenuecat_id=${revenuecatId} — skipped`);
      return null;
    }

    return rows[0];
  }

  /**
   * Revoke an entitlement by setting state and revoked_at timestamp.
   */
  async revokeEntitlement(revenuecatId: string, reason: 'revoked' | 'refunded'): Promise<void> {
    await this.db.execute(
      sql`UPDATE entitlements
          SET state = ${reason}, revoked_at = NOW()
          WHERE revenuecat_id = ${revenuecatId}`,
    );
  }

  /**
   * Unlock a trip (set entitlement_state = 'unlocked').
   */
  async unlockTrip(tripId: string): Promise<void> {
    await this.db.execute(
      sql`UPDATE trips SET entitlement_state = 'unlocked', updated_at = NOW()
          WHERE id = ${tripId}`,
    );
  }

  /**
   * Lock a trip back to free (set entitlement_state = 'free').
   */
  async lockTrip(tripId: string): Promise<void> {
    await this.db.execute(
      sql`UPDATE trips SET entitlement_state = 'free', updated_at = NOW()
          WHERE id = ${tripId}`,
    );
  }

  /**
   * Lookup a single entitlement by RevenueCat ID.
   */
  async getEntitlementByRevenuecatId(revenuecatId: string): Promise<EntitlementRow | null> {
    const { rows } = await this.db.execute<EntitlementRow>(
      sql`SELECT * FROM entitlements WHERE revenuecat_id = ${revenuecatId}`,
    );
    return rows[0] ?? null;
  }

  /**
   * Get all active entitlements for a user (used by restore flow in Plan 04).
   */
  async getEntitlementsByUserId(userId: string): Promise<EntitlementRow[]> {
    const { rows } = await this.db.execute<EntitlementRow>(
      sql`SELECT * FROM entitlements WHERE user_id = ${userId} AND state = 'active'`,
    );
    return rows;
  }
}
