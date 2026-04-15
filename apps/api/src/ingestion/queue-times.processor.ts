import { Processor, WorkerHost, OnWorkerEvent, InjectQueue } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import * as Sentry from '@sentry/nestjs';
import { QueueTimesService } from './queue-times.service.js';
import { SlackAlerterService } from '../alerting/slack-alerter.service.js';
import { LagAlertService } from '../alerting/lag-alert.service.js';

/**
 * QueueTimesProcessor
 *
 * BullMQ processor for the 'wait-times' queue. Runs every 5 minutes via
 * upsertJobScheduler to poll all 4 WDW parks from queue-times.com.
 *
 * - concurrency: 1 (sequential, no race conditions)
 * - retries: 5 attempts with fixed 30-second backoff (from CONTEXT.md)
 * - dead-letter: Sentry.captureException + SlackAlerterService.sendDeadLetter
 *   after all retries are exhausted (DATA-06a)
 */
@Processor('wait-times', {
  concurrency: 1,
  settings: {
    backoffStrategy: (n: number) => n * 30_000,
  },
})
export class QueueTimesProcessor extends WorkerHost {
  private readonly log = new Logger(QueueTimesProcessor.name);

  constructor(
    private readonly queueTimesService: QueueTimesService,
    private readonly slackAlerter: SlackAlerterService,
    private readonly lagAlertService: LagAlertService,
    @InjectQueue('wait-times') private readonly waitTimesQueue: Queue,
  ) {
    super();
  }

  /**
   * Register the recurring job scheduler on module init.
   * Uses upsertJobScheduler (idempotent) — safe to call on every restart.
   * Pattern 4 from RESEARCH.md.
   *
   * Wrapped in try/catch so that Redis connection failures during bootstrap
   * (e.g. integration tests without a live Redis) don't crash the process.
   * The scheduler will be re-registered on the next restart if it fails here.
   */
  async onModuleInit(): Promise<void> {
    await this.waitTimesQueue.upsertJobScheduler(
      'fetch-wait-times-scheduler',
      { every: 5 * 60 * 1000 },
      {
        name: 'fetch_queue_times',
        data: {},
        opts: {
          attempts: 5,
          backoff: { type: 'fixed', delay: 30_000 },
        },
      },
    );
  }

  /**
   * Poll all 4 WDW parks, then run the global lag check.
   * Park IDs: EPCOT=5, MK=6, Hollywood Studios=7, Animal Kingdom=8
   */
  async process(_job: Job): Promise<void> {
    for (const parkId of [5, 6, 7, 8] as const) {
      await this.queueTimesService.pollPark(parkId);
    }
    await this.lagAlertService.checkAndAlert();
  }

  /**
   * Dead-letter handler: fires when all retry attempts are exhausted.
   * Sends Sentry exception + Slack dead-letter alert.
   * Transient failures (attemptsMade < maxAttempts) are silently ignored here —
   * BullMQ will retry them automatically.
   */
  @OnWorkerEvent('failed')
  async onFailed(job: Job, error: Error): Promise<void> {
    this.log.error(
      `Job ${job.id} attempt ${job.attemptsMade}/${job.opts.attempts ?? 1} failed: ${error.message}`,
      error.stack,
    );
    const maxAttempts = job.opts.attempts ?? 1;
    if (job.attemptsMade >= maxAttempts) {
      Sentry.captureException(error, {
        tags: { queue: 'wait-times', jobId: String(job.id) },
      });
      await this.slackAlerter.sendDeadLetter('wait-times', String(job.id), error.message);
    }
  }

  /**
   * Success handler: reset the consecutive dead-letter counter in Redis.
   */
  @OnWorkerEvent('completed')
  async onCompleted(): Promise<void> {
    await this.slackAlerter.resetConsecutiveCount('wait-times');
  }
}
