import { Processor, WorkerHost, OnWorkerEvent, InjectQueue } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { sql } from 'drizzle-orm';
import * as Sentry from '@sentry/nestjs';
import { SlackAlerterService } from '../alerting/slack-alerter.service.js';
import { DB_TOKEN } from '../ingestion/queue-times.service.js';

/** Minimal Drizzle-compatible interface for raw SQL execution (avoids @wonderwaltz/db dist-path mismatch) */
interface DrizzleDb {
  execute<T = Record<string, unknown>>(query: unknown): Promise<{ rows: T[] }>;
}

/**
 * RollupProcessor
 *
 * BullMQ processor for the 'rollup-verify' queue. Runs at :30 past each hour
 * (30 min after pg_cron's :00 refresh) to verify the materialized view
 * wait_times_1h was refreshed successfully.
 *
 * DATA-03: MONITOR ONLY — does NOT call REFRESH MATERIALIZED VIEW.
 * pg_cron handles the refresh (migration 0002). This worker queries
 * cron.job_run_details and alerts via Sentry if the refresh was missed.
 *
 * - concurrency: 1 (sequential, no race conditions)
 * - retries: 3 attempts with fixed 30-second backoff
 * - dead-letter: Sentry.captureException + SlackAlerterService.sendDeadLetter
 */
@Processor('rollup-verify', { concurrency: 1 })
export class RollupProcessor extends WorkerHost {
  private readonly logger = new Logger(RollupProcessor.name);

  constructor(
    @Inject(DB_TOKEN) private readonly db: DrizzleDb,
    private readonly slackAlerter: SlackAlerterService,
    @InjectQueue('rollup-verify') private readonly rollupQueue: Queue,
  ) {
    super();
  }

  /**
   * Register the recurring job scheduler on module init.
   * Cron '30 * * * *' = runs at :30 past each hour.
   * This gives pg_cron 30 min to complete its :00 refresh before we check.
   * Uses upsertJobScheduler (idempotent) — safe to call on every restart.
   */
  async onModuleInit(): Promise<void> {
    await this.rollupQueue.upsertJobScheduler(
      'rollup-verify-scheduler',
      { pattern: '30 * * * *' },
      {
        name: 'rollup_wait_history',
        data: {},
        opts: {
          attempts: 3,
          backoff: { type: 'fixed', delay: 30_000 },
        },
      },
    );
  }

  /**
   * Query cron.job_run_details for the most recent wait_times_1h refresh.
   * Alert via Sentry if:
   *   1. No rows found (pg_cron has never run)
   *   2. Last run is > 90 minutes ago (missed the hourly schedule)
   *   3. Last run status is not 'succeeded' (pg_cron failed)
   *
   * IMPORTANT: Do NOT call REFRESH MATERIALIZED VIEW — this is monitor-only.
   */
  async process(_job: Job): Promise<void> {
    const result = await this.db.execute(sql`
      SELECT status, start_time, end_time, return_message
      FROM cron.job_run_details
      WHERE command LIKE '%wait_times_1h%'
      ORDER BY start_time DESC
      LIMIT 1
    `);

    const lastRun = result.rows[0] as
      | {
          status: string;
          start_time: string;
          end_time: string;
          return_message: string | null;
        }
      | undefined;

    if (!lastRun) {
      Sentry.captureException(new Error('pg_cron rollup has never run'), {
        extra: { queue: 'rollup-verify' },
      });
      return;
    }

    const ageMinutes = (Date.now() - new Date(lastRun.start_time).getTime()) / 60_000;

    if (ageMinutes > 90 || lastRun.status !== 'succeeded') {
      Sentry.captureException(new Error('pg_cron refresh missed'), {
        extra: { lastRun, ageMinutes },
      });
      return;
    }

    this.logger.debug('pg_cron rollup verified OK', { ageMinutes });
  }

  /**
   * Dead-letter handler: fires when all retry attempts are exhausted.
   * Sends Sentry exception + Slack dead-letter alert.
   */
  @OnWorkerEvent('failed')
  async onFailed(job: Job, error: Error): Promise<void> {
    const maxAttempts = job.opts.attempts ?? 1;
    if (job.attemptsMade >= maxAttempts) {
      Sentry.captureException(error, {
        tags: { queue: 'rollup-verify', jobId: String(job.id) },
      });
      await this.slackAlerter.sendDeadLetter('rollup-verify', String(job.id), error.message);
    }
  }
}
