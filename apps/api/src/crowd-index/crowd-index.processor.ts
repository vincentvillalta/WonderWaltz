import { Processor, WorkerHost, OnWorkerEvent, InjectQueue } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import * as Sentry from '@sentry/nestjs';
import { CrowdIndexService } from './crowd-index.service.js';
import { SlackAlerterService } from '../alerting/slack-alerter.service.js';

/**
 * CrowdIndexProcessor
 *
 * BullMQ processor for the 'crowd-index' queue. Runs at the top of each hour
 * via upsertJobScheduler (cron '0 * * * *') to compute and cache the crowd index.
 *
 * DATA-04: Writes 5 Redis keys per run:
 *   - crowd_index:{date}                   — global (all 4 parks)
 *   - crowd_index:magic-kingdom:{date}
 *   - crowd_index:epcot:{date}
 *   - crowd_index:hollywood-studios:{date}
 *   - crowd_index:animal-kingdom:{date}
 *
 * Auto-switches between bootstrap (< 30d) and percentile (>= 30d) formulas.
 *
 * - concurrency: 1 (sequential, no race conditions)
 * - retries: 3 attempts with fixed 30-second backoff
 * - dead-letter: Sentry.captureException + SlackAlerterService.sendDeadLetter
 */
@Processor('crowd-index', { concurrency: 1 })
export class CrowdIndexProcessor extends WorkerHost {
  private readonly log = new Logger(CrowdIndexProcessor.name);

  constructor(
    private readonly crowdIndexService: CrowdIndexService,
    private readonly slackAlerter: SlackAlerterService,
    @InjectQueue('crowd-index') private readonly crowdIndexQueue: Queue,
  ) {
    super();
  }

  /**
   * Register the recurring job scheduler on module init.
   * Cron '0 * * * *' = runs at the top of each hour.
   * Uses upsertJobScheduler (idempotent) — safe to call on every restart.
   */
  async onModuleInit(): Promise<void> {
    if (process.env['ENABLE_INGESTION_WORKERS'] !== 'true') {
      this.log.log('crowd-index scheduler disabled (ENABLE_INGESTION_WORKERS!=true)');
      return;
    }
    await this.crowdIndexQueue.upsertJobScheduler(
      'crowd-index-scheduler',
      { pattern: '0 * * * *' },
      {
        name: 'refresh_crowd_index',
        data: {},
        opts: {
          attempts: 3,
          backoff: { type: 'fixed', delay: 30_000 },
        },
      },
    );
  }

  /**
   * Compute and cache crowd index for today.
   * Delegates formula selection + Redis write to CrowdIndexService.refreshAll().
   */
  async process(_job: Job): Promise<void> {
    const today = new Date().toISOString().split('T')[0] as string;
    await this.crowdIndexService.refreshAll(today);
  }

  /**
   * Dead-letter handler: fires when all retry attempts are exhausted.
   * Sends Sentry exception + Slack dead-letter alert.
   * Transient failures (attemptsMade < maxAttempts) are silently ignored —
   * BullMQ will retry them automatically.
   */
  @OnWorkerEvent('failed')
  async onFailed(job: Job, error: Error): Promise<void> {
    const maxAttempts = job.opts.attempts ?? 1;
    if (job.attemptsMade >= maxAttempts) {
      Sentry.captureException(error, {
        tags: { queue: 'crowd-index', jobId: String(job.id) },
      });
      await this.slackAlerter.sendDeadLetter('crowd-index', String(job.id), error.message);
    }
  }

  /**
   * Success handler: reset the consecutive dead-letter counter in Redis.
   */
  @OnWorkerEvent('completed')
  async onCompleted(): Promise<void> {
    await this.slackAlerter.resetConsecutiveCount('crowd-index');
  }
}
