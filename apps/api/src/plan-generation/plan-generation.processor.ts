import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import * as Sentry from '@sentry/nestjs';
import { PlanGenerationService } from './plan-generation.service.js';
import { SlackAlerterService } from '../alerting/slack-alerter.service.js';

/**
 * PlanGenerationProcessor -- BullMQ processor for the plan-generation queue.
 *
 * Mirrors QueueTimesProcessor pattern:
 * - concurrency: 2
 * - backoff: n * 30_000
 * - dead-letter: Sentry + Slack after final retry
 *
 * Job data shape: { tripId: string, kind: 'initial' | 'rethink' }
 *
 * UnrecoverableError (from BudgetExhaustedError) skips retries automatically
 * (BullMQ native behavior).
 */

interface PlanGenerationJobData {
  tripId: string;
  kind: 'initial' | 'rethink';
}

@Processor('plan-generation', {
  concurrency: 2,
  settings: {
    backoffStrategy: (n: number) => n * 30_000,
  },
})
export class PlanGenerationProcessor extends WorkerHost {
  private readonly log = new Logger(PlanGenerationProcessor.name);

  constructor(
    private readonly planGenerationService: PlanGenerationService,
    private readonly slackAlerter: SlackAlerterService,
  ) {
    super();
  }

  async process(job: Job<PlanGenerationJobData>): Promise<{
    planId: string;
  }> {
    this.log.log(
      `Processing plan-generation job ${job.id}: ` +
        `trip=${job.data.tripId} kind=${job.data.kind}`,
    );

    const result = await this.planGenerationService.generate(job.data.tripId);

    this.log.log(`Plan-generation job ${job.id} complete: planId=${result.planId}`);

    return result;
  }

  /**
   * Dead-letter handler: fires on every failure.
   * After final retry: Sentry + Slack alert.
   * Transient failures are logged but let BullMQ retry automatically.
   */
  @OnWorkerEvent('failed')
  async onFailed(job: Job, error: Error): Promise<void> {
    const e = error as Error & {
      code?: string;
      detail?: string;
      cause?: unknown;
    };
    const enriched = [
      error.message,
      e.code ? `code=${e.code}` : null,
      e.detail ? `detail=${e.detail}` : null,
      e.cause instanceof Error ? `cause=${e.cause.message}` : null,
    ]
      .filter(Boolean)
      .join(' | ');

    this.log.error(
      `Job ${job.id} attempt ${job.attemptsMade}` +
        `/${job.opts.attempts ?? 1} failed: ${enriched}`,
      error.stack,
    );

    const maxAttempts = job.opts.attempts ?? 1;
    if (job.attemptsMade >= maxAttempts) {
      Sentry.captureException(error, {
        tags: {
          queue: 'plan-generation',
          jobId: String(job.id),
        },
      });
      await this.slackAlerter.sendDeadLetter('plan-generation', String(job.id), enriched);
    }
  }

  @OnWorkerEvent('completed')
  async onCompleted(): Promise<void> {
    await this.slackAlerter.resetConsecutiveCount('plan-generation');
  }
}
