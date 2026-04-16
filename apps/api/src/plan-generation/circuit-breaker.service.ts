import { Injectable, Inject, Logger, Optional } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import * as Sentry from '@sentry/nestjs';
import type Redis from 'ioredis';
import { DB_TOKEN } from '../ingestion/queue-times.service.js';
import { REDIS_CLIENT_TOKEN } from '../alerting/slack-alerter.service.js';
import type { PlanBudgetExhaustedDto } from '../shared/dto/plan-budget-exhausted.dto.js';

/**
 * CircuitBreakerService — per-trip LLM budget enforcement (LLM-07).
 *
 * Checks whether a trip has remaining budget before each Anthropic call.
 * When budget is tight, signals a Sonnet-to-Haiku downgrade. When budget
 * is fully exhausted, blocks the call entirely (402 path).
 *
 * Every breaker event writes to three sinks:
 *   1. llm_cost_incidents table (durable analytics)
 *   2. Sentry.captureException (event tracking)
 *   3. Slack alert (aggregated hourly via Redis dedup)
 */

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

const DEFAULT_BUDGET_CENTS = 50;
const DEDUP_KEY = 'circuit-breaker:slack-dedup';
const DEDUP_TTL_SECONDS = 3600; // 1 hour

export interface BudgetCheck {
  allowed: boolean;
  swapTo?: 'haiku';
  reason?: string;
  spentCents: number;
  budgetCents: number;
}

export interface IncidentInput {
  tripId: string;
  event: string;
  model: string;
  spentCents: number;
}

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);

  constructor(
    @Optional() @Inject(DB_TOKEN) private readonly db: DbExecutable,
    @Optional() @Inject(REDIS_CLIENT_TOKEN) private readonly redis: Redis,
    @Optional() @Inject(SLACK_ALERTER_TOKEN) private readonly slackAlerter: SlackAlerter,
  ) {}

  /**
   * Checks whether the trip has remaining budget for a projected LLM call.
   *
   * Returns:
   * - allowed:true, no swap → proceed with current model
   * - allowed:true, swapTo:'haiku' → budget tight, downgrade to Haiku
   * - allowed:false → budget exhausted, block the call (402 path)
   */
  async checkBudget(tripId: string, projectedCents: number): Promise<BudgetCheck> {
    // 1. Read trip budget
    const tripRows = (await this.db.execute(
      sql`SELECT llm_budget_cents FROM trips WHERE id = ${tripId}`,
    )) as Array<{ llm_budget_cents: string | null }>;

    const budgetCents = Number(tripRows[0]?.llm_budget_cents) || DEFAULT_BUDGET_CENTS;

    // 2. Read total spent
    const spentRows = (await this.db.execute(
      sql`SELECT COALESCE(SUM(usd_cents), 0) AS total FROM llm_costs WHERE trip_id = ${tripId}`,
    )) as Array<{ total: string }>;

    const spentCents = Number(spentRows[0]?.total) || 0;

    // 3. Decision logic
    if (spentCents >= budgetCents) {
      return {
        allowed: false,
        reason: 'trip_budget_exhausted',
        spentCents,
        budgetCents,
      };
    }

    if (spentCents + projectedCents > budgetCents) {
      return {
        allowed: true,
        swapTo: 'haiku',
        spentCents,
        budgetCents,
      };
    }

    return {
      allowed: true,
      spentCents,
      budgetCents,
    };
  }

  /**
   * Records a circuit-breaker incident to all three sinks:
   *   1. llm_cost_incidents table (durable)
   *   2. Sentry.captureException (event tracking)
   *   3. Slack alert (aggregated hourly via Redis dedup)
   */
  async recordIncident(input: IncidentInput): Promise<void> {
    // Sink 1: DB insert
    try {
      await this.db.execute(sql`
        INSERT INTO llm_cost_incidents (trip_id, event, model, spent_cents)
        VALUES (${input.tripId}, ${input.event}, ${input.model}, ${input.spentCents})
      `);
    } catch (err) {
      this.logger.error('Failed to insert llm_cost_incidents row', err);
    }

    // Sink 2: Sentry
    try {
      Sentry.captureException(
        new Error(`Circuit breaker: ${input.event} for trip ${input.tripId}`),
        {
          tags: {
            tripId: input.tripId,
            event: input.event,
            model: input.model,
          },
          extra: { spentCents: input.spentCents },
        },
      );
    } catch (err) {
      this.logger.error('Sentry.captureException failed', err);
    }

    // Sink 3: Slack (aggregated hourly via Redis dedup)
    try {
      const lastFired = await this.redis?.get(DEDUP_KEY);
      if (!lastFired) {
        const message =
          `LLM circuit breaker fired: event=${input.event} ` +
          `trip=${input.tripId} model=${input.model} spent=${input.spentCents}c`;
        await this.slackAlerter?.sendAlert(message);

        // Set dedup key
        await this.redis?.set(DEDUP_KEY, '1', 'EX', DEDUP_TTL_SECONDS);
      }
    } catch (err) {
      this.logger.error('Slack alert or Redis dedup failed', err);
    }
  }

  /**
   * Builds the 402 response body when budget is fully exhausted.
   * Phase 4 wires the real RevenueCat SKU.
   */
  buildBudgetExhaustedResponse(spentCents: number, budgetCents: number): PlanBudgetExhaustedDto {
    return {
      error: 'trip_budget_exhausted',
      spent_cents: spentCents,
      budget_cents: budgetCents,
      resetOptions: [
        {
          type: 'top_up',
          sku: 'trip_topup_050',
          usd_cents: 50,
        },
      ],
    };
  }
}
