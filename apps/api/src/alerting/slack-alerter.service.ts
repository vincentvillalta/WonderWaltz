import { Injectable, Logger } from '@nestjs/common';
import type { Redis } from 'ioredis';
import * as Sentry from '@sentry/nestjs';

/**
 * SlackAlerterService
 *
 * Provides Slack webhook notifications for:
 * - Dead-lettered BullMQ jobs (with Sentry exception capture + Redis consecutive counter)
 * - Global ingestion lag alerts
 *
 * All network/Redis operations are best-effort (wrapped in try/catch).
 * Alerting failures are logged but never thrown — they must never crash a processor.
 */
@Injectable()
export class SlackAlerterService {
  private readonly logger = new Logger(SlackAlerterService.name);

  constructor(private readonly redis: Redis) {}

  /**
   * Called when a job is dead-lettered (all retry attempts exhausted).
   *
   * DATA-06a: Calls Sentry.captureException with queue/jobId tags.
   * DATA-06b: POSTs dead-letter notification to Slack webhook.
   * Increments Redis consecutive dead-letter counter for the queue.
   */
  async sendDeadLetter(queueName: string, jobId: string, errorMessage: string): Promise<void> {
    // 1. Capture in Sentry (DATA-06a)
    try {
      Sentry.captureException(new Error(errorMessage), {
        tags: { queue: queueName, jobId },
      });
    } catch (err) {
      this.logger.error('Sentry.captureException failed', err);
    }

    // 2. Send Slack alert (DATA-06b)
    await this.postToSlack(
      `:rotating_light: Dead-letter: queue=${queueName} job=${jobId}: ${errorMessage}`,
    );

    // 3. Increment consecutive dead-letter counter in Redis
    try {
      await this.redis.incr(`dlq_consecutive:${queueName}`);
    } catch (err) {
      this.logger.error(`Redis INCR failed for dlq_consecutive:${queueName}`, err);
    }
  }

  /**
   * Called on a successful job to reset the consecutive dead-letter counter.
   * Uses a 24-hour TTL to auto-expire stale counters.
   */
  async resetConsecutiveCount(queueName: string): Promise<void> {
    try {
      await this.redis.set(`dlq_consecutive:${queueName}`, '0', 'EX', 86400);
    } catch (err) {
      this.logger.error(`Redis SET failed for dlq_consecutive:${queueName}`, err);
    }
  }

  /**
   * Sends a lag alert to Slack when global ingestion lag exceeds 30 minutes.
   * Does NOT call Sentry — lag is an operational condition, not an exception.
   */
  async sendLagAlert(lagMinutes: number): Promise<void> {
    await this.postToSlack(
      `:warning: WonderWaltz ingestion lag: ${Math.round(lagMinutes)} minutes`,
    );
  }

  /**
   * Internal helper: POST a message to the Slack incoming webhook.
   * Best-effort — errors are logged but never thrown.
   */
  private async postToSlack(text: string): Promise<void> {
    const webhookUrl = process.env['SLACK_ALERT_WEBHOOK_URL'];

    if (!webhookUrl) {
      this.logger.error('SLACK_ALERT_WEBHOOK_URL is not set — skipping Slack alert');
      return;
    }

    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
    } catch (err) {
      this.logger.error('Slack webhook POST failed', err);
    }
  }
}
