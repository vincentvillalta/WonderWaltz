import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DB_TOKEN } from '../ingestion/queue-times.service.js';

/** Minimal Drizzle-compatible interface for raw SQL execution */
interface DbExecutable {
  execute<T extends Record<string, unknown>>(query: ReturnType<typeof sql>): Promise<{ rows: T[] }>;
}

/** BullMQ queue interface (duck-typed to avoid @nestjs/bullmq import for DI) */
interface PurgeQueue {
  add(name: string, data: Record<string, unknown>, opts: Record<string, unknown>): Promise<unknown>;
}

export interface DeleteAccountResult {
  deleted: boolean;
  purge_scheduled_at: string;
}

const PURGE_QUEUE_TOKEN = 'BullQueue_account-purge';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * AccountDeletionService -- handles user account soft-delete and purge scheduling.
 *
 * requestDeletion():
 * 1. Validates confirmed:true (double-tap)
 * 2. Sets deleted_at on users table
 * 3. Revokes all active entitlements
 * 4. Enqueues a 30-day delayed BullMQ purge job
 */
@Injectable()
export class AccountDeletionService {
  private readonly logger = new Logger(AccountDeletionService.name);

  constructor(
    @Inject(DB_TOKEN) private readonly db: DbExecutable,
    @Inject(PURGE_QUEUE_TOKEN) private readonly purgeQueue: PurgeQueue,
  ) {}

  /**
   * Soft-delete a user account. Requires confirmed:true (double-tap confirm).
   *
   * - Sets deleted_at on users table (WHERE deleted_at IS NULL for idempotency)
   * - Revokes all active entitlements
   * - Enqueues a 30-day delayed purge job
   */
  async requestDeletion(userId: string, confirmed: boolean): Promise<DeleteAccountResult> {
    if (!confirmed) {
      throw new BadRequestException({
        error: 'confirmation_required',
        message: 'Send confirmed: true to confirm account deletion',
      });
    }

    // Soft-delete user (idempotent: WHERE deleted_at IS NULL means second call is a no-op UPDATE)
    await this.db.execute(
      sql`UPDATE users SET deleted_at = NOW(), updated_at = NOW()
          WHERE id = ${userId} AND deleted_at IS NULL`,
    );

    // Revoke all active entitlements
    await this.db.execute(
      sql`UPDATE entitlements SET state = 'revoked', revoked_at = NOW()
          WHERE user_id = ${userId} AND state = 'active'`,
    );

    // Schedule purge in 30 days
    const purgeAt = new Date(Date.now() + THIRTY_DAYS_MS);
    await this.purgeQueue.add(
      'purge-account',
      { userId, requestedAt: new Date().toISOString() },
      {
        delay: THIRTY_DAYS_MS,
        attempts: 3,
        backoff: { type: 'exponential', delay: 60_000 },
      },
    );

    this.logger.log(
      `Account deletion requested for user=${userId}, purge scheduled at ${purgeAt.toISOString()}`,
    );

    return {
      deleted: true,
      purge_scheduled_at: purgeAt.toISOString(),
    };
  }
}
