import { Inject, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ADMIN_TOKEN } from '../shared-infra.module.js';
import { DB_TOKEN } from '../ingestion/queue-times.service.js';

/**
 * Duck-typed Drizzle DB interface — same pattern as QueueTimesService,
 * LagAlertService, etc. to avoid @wonderwaltz/db dist-path mismatch.
 */
interface DrizzleDb {
  execute<T extends Record<string, unknown>>(query: ReturnType<typeof sql>): Promise<{ rows: T[] }>;
}

/**
 * AuthService — handles anonymous user creation via Supabase admin API
 * and JWT generation for the new user.
 *
 * Uses Supabase admin.createUser to create auth.users entries, then
 * signs a custom JWT with the Supabase JWT secret (jose library) so the
 * token is immediately usable for supabase.auth.getUser() validation.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(SUPABASE_ADMIN_TOKEN) private readonly supabase: SupabaseClient,
    @Inject(DB_TOKEN) private readonly db: DrizzleDb,
  ) {}

  /**
   * Create an anonymous Supabase user and sync to public.users.
   * Returns { access_token, user_id, expires_at }.
   */
  async createAnonymousUser(): Promise<{
    access_token: string;
    user_id: string;
    expires_at: string;
  }> {
    // 1. Create anonymous user via Supabase signInAnonymously().
    // Requires "Allow anonymous sign-ins" enabled in Supabase dashboard.
    const { data, error } = await this.supabase.auth.signInAnonymously();

    if (error || !data.user || !data.session) {
      this.logger.error(`Failed to create anonymous user: ${error?.message ?? 'unknown'}`);
      throw new InternalServerErrorException('Failed to create anonymous user');
    }

    const userId = data.user.id;

    // 2. Insert into public.users with ON CONFLICT DO NOTHING (idempotent)
    await this.db.execute(
      sql`INSERT INTO users (id, is_anonymous, created_at, updated_at)
          VALUES (${userId}, true, NOW(), NOW())
          ON CONFLICT (id) DO NOTHING`,
    );

    // 3. Return the Supabase-signed JWT from the session.
    // This token is accepted by SupabaseAuthGuard (validated via supabase.auth.getUser).
    const expiresAt = new Date(data.session.expires_at! * 1000).toISOString();

    this.logger.log(`Created anonymous user ${userId}`);

    return {
      access_token: data.session.access_token,
      user_id: userId,
      expires_at: expiresAt,
    };
  }

  /**
   * Sync an upgraded identity to public.users.
   * Called after the client completes Supabase linkIdentity (OAuth merge).
   * Idempotent — if user is already non-anonymous, returns success without error.
   */
  async upgradeUser(
    userId: string,
    email: string | undefined,
  ): Promise<{ upgraded: boolean; user_id: string }> {
    await this.db.execute(
      sql`UPDATE users
          SET is_anonymous = false,
              email = ${email ?? null},
              updated_at = NOW()
          WHERE id = ${userId}`,
    );

    this.logger.log(`Upgraded user ${userId} (email: ${email ?? 'none'})`);

    return { upgraded: true, user_id: userId };
  }
}
