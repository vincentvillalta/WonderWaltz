import { Processor, WorkerHost, OnWorkerEvent, InjectQueue } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import * as Sentry from '@sentry/nestjs';
import { ThemeparksService, WDW_PARKS } from './themeparks.service.js';
import { SlackAlerterService } from '../alerting/slack-alerter.service.js';

/**
 * ThemeparksProcessor
 *
 * BullMQ processor for the 'park-hours' queue. Runs every 6 hours via
 * upsertJobScheduler to poll all 4 WDW parks from themeparks.wiki.
 *
 * Schedule staggered to 1am, 7am, 1pm, 7pm — avoids firing at the same
 * time as the queue-times 5-minute scheduler.
 *
 * - concurrency: 1 (sequential, no race conditions)
 * - retries: 5 attempts with fixed 30-second backoff (from CONTEXT.md)
 * - dead-letter: Sentry.captureException + SlackAlerterService.sendDeadLetter
 *   after all retries are exhausted (DATA-06a)
 *
 * DATA-02: park hours feed the solver's opening/closing time constraints;
 * showtimes feed entertainment scheduling. This is NOT a failover for
 * queue-times.com — it runs on its own independent 6hr clock.
 */
@Processor('park-hours', {
  concurrency: 1,
  settings: {
    backoffStrategy: (n: number) => n * 30_000,
  },
})
export class ThemeparksProcessor extends WorkerHost {
  private readonly log = new Logger(ThemeparksProcessor.name);

  constructor(
    private readonly themeparksService: ThemeparksService,
    private readonly slackAlerter: SlackAlerterService,
    @InjectQueue('park-hours') private readonly parkHoursQueue: Queue,
  ) {
    super();
  }

  /**
   * Register the recurring job scheduler on module init.
   * Uses upsertJobScheduler (idempotent) — safe to call on every restart.
   *
   * Cron pattern '0 1,7,13,19 * * *' = 1am, 7am, 1pm, 7pm UTC.
   * Staggered from queue-times.com (which runs every 5 minutes at :00).
   */
  async onModuleInit(): Promise<void> {
    if (process.env['ENABLE_INGESTION_WORKERS'] !== 'true') {
      this.log.log('fetch-park-hours scheduler disabled (ENABLE_INGESTION_WORKERS!=true)');
      return;
    }
    await this.parkHoursQueue.upsertJobScheduler(
      'fetch-park-hours-scheduler',
      { pattern: '0 1,7,13,19 * * *' },
      {
        name: 'fetch_themeparks_wiki_hours',
        data: {},
        opts: {
          attempts: 5,
          backoff: { type: 'fixed', delay: 30_000 },
        },
      },
    );
  }

  /**
   * Poll all 4 WDW parks: schedule (hours) + live data (attractions + shows).
   * Iterates in order: MK, EPCOT, HS, AK.
   */
  async process(_job: Job): Promise<void> {
    for (const park of WDW_PARKS) {
      await this.themeparksService.pollSchedule(park.entityId, park.parkUuid);
      await this.themeparksService.pollLiveData(park.entityId, park.parkUuid);
    }
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
        tags: { queue: 'park-hours', jobId: String(job.id) },
      });
      await this.slackAlerter.sendDeadLetter('park-hours', String(job.id), error.message);
    }
  }

  /**
   * Success handler: reset the consecutive dead-letter counter in Redis.
   */
  @OnWorkerEvent('completed')
  async onCompleted(): Promise<void> {
    await this.slackAlerter.resetConsecutiveCount('park-hours');
  }
}
