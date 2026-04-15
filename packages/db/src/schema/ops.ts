// Operations tables — used by ingestion workers, solver, and admin
import { pgTable, uuid, text, integer, timestamp, date, jsonb } from 'drizzle-orm/pg-core';

/**
 * crowd_calendar — DB override table for crowd-bucket exceptions.
 *
 * The runtime rule engine in packages/content/wdw/calendar-rules.ts handles
 * weekends, federal holidays, and school-break heuristics. Manual admin
 * overrides land here and beat the rules.
 *
 * bucket constraint enforced by SQL CHECK in migration 0004:
 *   bucket IN ('low', 'medium', 'high', 'peak')
 */
export const crowdCalendar = pgTable('crowd_calendar', {
  date: date('date').primaryKey(),
  bucket: text('bucket').notNull(), // 'low' | 'medium' | 'high' | 'peak'
  reason: text('reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * llm_cost_incidents — durable telemetry sink for circuit-breaker events.
 *
 * Written alongside Sentry capture + Slack alert (see CONTEXT.md
 * "Telemetry" section: every breaker event hits all three sinks).
 */
export const llmCostIncidents = pgTable('llm_cost_incidents', {
  id: uuid('id').primaryKey().defaultRandom(),
  tripId: uuid('trip_id').notNull(),
  event: text('event').notNull(), // 'budget_exhausted' | 'sonnet_to_haiku' | 'narrative_failed'
  model: text('model').notNull(), // 'claude-sonnet-*' | 'claude-haiku-*'
  spentCents: integer('spent_cents').notNull(),
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull().defaultNow(),
  metadata: jsonb('metadata'),
});
