import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DB_TOKEN } from '../ingestion/queue-times.service.js';

/**
 * Duck-typed Drizzle DB interface — same pattern as QueueTimesService,
 * LagAlertService, AuthService to avoid @wonderwaltz/db dist-path mismatch.
 */
interface DrizzleDb {
  execute<T extends Record<string, unknown>>(query: ReturnType<typeof sql>): Promise<{ rows: T[] }>;
}

/** Shape returned by getUserProfile matching UserMeDto */
interface UserProfile {
  id: string;
  email: string | null;
  is_anonymous: boolean;
  created_at: string;
  [key: string]: unknown;
}

/**
 * UsersService — user profile operations and trip counting.
 *
 * Used by UsersController for GET /v1/users/me and by future
 * anonymous trip limit guard (Plan 05) for trip counting.
 */
@Injectable()
export class UsersService {
  constructor(@Inject(DB_TOKEN) private readonly db: DrizzleDb) {}

  /**
   * Get user profile by ID. Returns null if user not found or soft-deleted.
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const { rows } = await this.db.execute<UserProfile>(
      sql`SELECT id, email, is_anonymous, created_at
          FROM users
          WHERE id = ${userId} AND deleted_at IS NULL`,
    );

    return rows[0] ?? null;
  }

  /**
   * Count non-deleted trips for a user. Used by anonymous trip limit enforcement.
   */
  async getTripsCount(userId: string): Promise<number> {
    const { rows } = await this.db.execute<{ count: string }>(
      sql`SELECT COUNT(*) AS count
          FROM trips
          WHERE user_id = ${userId} AND deleted_at IS NULL`,
    );

    return Number(rows[0]?.count ?? 0);
  }
}
