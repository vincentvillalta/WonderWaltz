import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { sql } from 'drizzle-orm';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ADMIN_TOKEN } from '../shared-infra.module.js';
import { DB_TOKEN } from '../ingestion/queue-times.service.js';
import { rowsOf } from '../common/drizzle-rows.js';

/**
 * Duck-typed Drizzle DB interface — same pattern as QueueTimesService,
 * LagAlertService, etc. to avoid @wonderwaltz/db dist-path mismatch.
 */
interface DrizzleDb {
  execute<T extends Record<string, unknown>>(query: ReturnType<typeof sql>): Promise<{ rows: T[] }>;
}

/** Shape attached to request.user by the guard */
export interface RequestUser {
  id: string;
  isAnonymous: boolean;
  email: string | undefined;
}

/**
 * SupabaseAuthGuard — NestJS CanActivate guard that validates JWTs via
 * Supabase's auth.getUser() and checks for soft-deleted users in public.users.
 *
 * Attaches { id, isAnonymous, email } to request.user on success.
 */
@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(
    @Inject(SUPABASE_ADMIN_TOKEN) private readonly supabase: SupabaseClient,
    @Inject(DB_TOKEN) private readonly db: DrizzleDb,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Record<string, unknown>>();
    const headers = request['headers'] as Record<string, string | undefined>;
    const authHeader = headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }

    const token = authHeader.slice(7); // strip "Bearer "

    // Validate token via Supabase admin API
    const { data, error } = await this.supabase.auth.getUser(token);
    if (error || !data.user) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const user = data.user;

    // Check if user is soft-deleted in public.users
    const rows = rowsOf<{ deleted_at: string | null }>(
      await this.db.execute(sql`SELECT deleted_at FROM users WHERE id = ${user.id}`),
    );

    if (rows[0]?.deleted_at) {
      throw new ForbiddenException('account_deleted');
    }

    // Derive isAnonymous from user_metadata or lack of email
    const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
    const isAnonymous =
      metadata['is_anonymous'] !== undefined ? Boolean(metadata['is_anonymous']) : !user.email;

    // Attach user context to request
    request['user'] = {
      id: user.id,
      isAnonymous,
      email: user.email || undefined,
    } satisfies RequestUser;

    return true;
  }
}
