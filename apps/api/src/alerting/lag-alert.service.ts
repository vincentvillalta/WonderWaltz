import { Injectable, Logger, Inject } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { SlackAlerterService } from './slack-alerter.service.js';

/** Minimal interface for the Drizzle DB instance used by LagAlertService */
interface DbExecutable {
  execute<T extends Record<string, unknown>>(query: ReturnType<typeof sql>): Promise<{ rows: T[] }>;
}

/** Injection token for the Drizzle DB instance */
export const DB_TOKEN = 'DB';

/**
 * LagAlertService
 *
 * Checks global ingestion lag against wait_times_history and sends a Slack
 * alert when the freshest row is more than 30 minutes old.
 *
 * DATA-06b: lag > 30min outside quiet hours → sendLagAlert
 * DATA-06c: lag > 30min inside quiet hours (2am–6am ET) → suppressed
 *
 * Called by QueueTimesProcessor after each successful poll cycle.
 */
@Injectable()
export class LagAlertService {
  private readonly logger = new Logger(LagAlertService.name);

  constructor(
    @Inject(DB_TOKEN) private readonly db: DbExecutable,
    private readonly slackAlerter: SlackAlerterService,
  ) {}

  /**
   * Query the freshest fetched_at across all wait-time rows (last hour).
   * If the freshest row is more than 30 minutes old — and it is not quiet hours —
   * fire a Slack lag alert.
   */
  async checkAndAlert(): Promise<void> {
    try {
      const result = await this.db.execute<{ max_fetched: Date | null }>(sql`
        SELECT MAX(fetched_at) AS max_fetched
        FROM wait_times_history
        WHERE ts > now() - INTERVAL '1 hour'
      `);

      const maxFetched = result.rows[0]?.max_fetched ?? null;
      const lagMinutes = maxFetched
        ? (Date.now() - new Date(maxFetched).getTime()) / 60_000
        : Infinity;

      if (lagMinutes > 30 && !this.isQuietHours()) {
        await this.slackAlerter.sendLagAlert(lagMinutes);
      }
    } catch (err) {
      this.logger.error('LagAlertService.checkAndAlert failed', err);
    }
  }

  /**
   * Returns true during quiet hours (2am–5:59am America/New_York).
   * Parks are closed overnight; lag alerts during this window are suppressed.
   *
   * Uses toLocaleString to get current ET hour without a full timezone library.
   */
  isQuietHours(): boolean {
    const hour = Number(
      new Date().toLocaleString('en-US', {
        timeZone: 'America/New_York',
        hour: 'numeric',
        hour12: false,
      }),
    );
    return hour >= 2 && hour < 6;
  }
}
