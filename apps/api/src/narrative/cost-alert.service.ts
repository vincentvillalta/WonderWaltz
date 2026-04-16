import { Injectable, Inject, Logger, Optional } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import * as Sentry from '@sentry/nestjs';
import type Redis from 'ioredis';
import { DB_TOKEN } from '../ingestion/queue-times.service.js';
import { REDIS_CLIENT_TOKEN } from '../alerting/slack-alerter.service.js';

/** Minimal Drizzle-compatible interface for raw SQL execution */
interface DbExecutable {
  execute(query: unknown): Promise<unknown>;
}

/** Minimal Slack alerter interface — duck-typed to avoid circular import */
interface SlackAlerter {
  sendAlert(message: string): Promise<void>;
}

/** Token for injecting the SlackAlerterService (duck-typed) */
const SLACK_ALERTER_TOKEN = 'SlackAlerterService';

const DEDUP_KEY = 'cost-alert:last-fired';
const DEDUP_TTL_SECONDS = 3600; // 1 hour
const MIN_ROWS_FOR_SIGNAL = 5;
const HIT_RATE_THRESHOLD = 0.7;

export interface HitRateResult {
  rate: number;
  windowRows: number;
  alerted: boolean;
}

/**
 * CostAlertService — LLM-06 cache hit rate monitoring.
 *
 * Queries the rolling 1-hour window from `llm_costs` and fires
 * Sentry + Slack alerts when the cache hit rate drops below 70%.
 *
 * Rate-limited to once per hour via a Redis dedup key.
 *
 * Can be called on a cron schedule (BullMQ scheduler) or after
 * every cost write for more responsive alerting.
 */
@Injectable()
export class CostAlertService {
  private readonly logger = new Logger(CostAlertService.name);

  constructor(
    @Optional() @Inject(DB_TOKEN) private readonly db?: DbExecutable,
    @Optional() @Inject(REDIS_CLIENT_TOKEN) private readonly redis?: Redis,
    @Optional() @Inject(SLACK_ALERTER_TOKEN) private readonly slackAlerter?: SlackAlerter,
  ) {}

  /**
   * Checks the rolling 1-hour cache hit rate and alerts if below threshold.
   *
   * cache_hit_rate = cached_read_tok / (cached_read_tok + input_tok)
   *
   * Guards:
   * - Needs >= 5 rows in the window for meaningful signal
   * - Deduplicates alerts to once per hour via Redis key
   */
  async checkHitRate(): Promise<HitRateResult> {
    if (!this.db) {
      return { rate: 0, windowRows: 0, alerted: false };
    }

    const rows = (await this.db.execute(sql`
      SELECT
        COALESCE(SUM(cached_read_tok), 0) AS cached,
        COALESCE(SUM(input_tok), 0) AS input,
        COUNT(*) AS rows
      FROM llm_costs
      WHERE created_at > NOW() - INTERVAL '1 hour'
    `)) as Array<{ cached: string; input: string; rows: string }>;

    const row = rows[0];
    const cached = Number(row?.cached ?? 0) || 0;
    const input = Number(row?.input ?? 0) || 0;
    const windowRows = Number(row?.rows ?? 0) || 0;

    const total = cached + input;
    const rate = total > 0 ? cached / total : 0;

    // Not enough data for a meaningful alert
    if (windowRows < MIN_ROWS_FOR_SIGNAL) {
      return { rate, windowRows, alerted: false };
    }

    // Rate is healthy
    if (rate >= HIT_RATE_THRESHOLD) {
      return { rate, windowRows, alerted: false };
    }

    // Check dedup — skip if we already alerted in the last hour
    try {
      const lastFired = this.redis ? await this.redis.get(DEDUP_KEY) : null;
      if (lastFired) {
        this.logger.debug(`Cache hit rate alert suppressed (dedup): rate=${rate.toFixed(2)}`);
        return { rate, windowRows, alerted: false };
      }
    } catch (err) {
      this.logger.error('Redis GET for dedup key failed', err);
      // Continue — better to double-alert than miss one
    }

    // Fire alerts
    const alertMessage =
      `LLM cache hit rate dropped to ${(rate * 100).toFixed(1)}% ` +
      `(${windowRows} calls in last hour, threshold: 70%). ` +
      `cached_read_tok=${cached}, input_tok=${input}`;

    try {
      Sentry.captureException(new Error(alertMessage), {
        tags: { alert: 'llm-cache-hit-rate' },
        extra: { rate, windowRows, cached, input },
      });
    } catch (err) {
      this.logger.error('Sentry.captureException failed for cache hit rate alert', err);
    }

    try {
      if (this.slackAlerter) {
        await this.slackAlerter.sendAlert(alertMessage);
      }
    } catch (err) {
      this.logger.error('Slack alert failed for cache hit rate', err);
    }

    // Set dedup key
    try {
      if (this.redis) {
        await this.redis.set(DEDUP_KEY, '1', 'EX', DEDUP_TTL_SECONDS);
      }
    } catch (err) {
      this.logger.error('Redis SET for dedup key failed', err);
    }

    return { rate, windowRows, alerted: true };
  }
}
