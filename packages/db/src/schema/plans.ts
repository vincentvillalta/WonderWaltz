import { pgTable, uuid, text, integer, timestamp, boolean, jsonb } from 'drizzle-orm/pg-core';

export const plans = pgTable('plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  tripId: uuid('trip_id').notNull(),
  version: integer('version').notNull().default(1),
  // solver_input_hash removed in migration 0006 — cache was ineffective (guest
  // identity made every key unique per trip). Narrative-day cache lives in
  // narrative_day_cache for cross-user LLM reuse.
  status: text('status').notNull().default('draft'),
  warnings: text('warnings').default('[]'), // JSON array of solver warning strings
  generatedAt: timestamp('generated_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const narrativeDayCache = pgTable('narrative_day_cache', {
  cacheKey: text('cache_key').primaryKey(),
  narrativeIntro: text('narrative_intro').notNull(),
  tips: jsonb('tips').notNull().default({}),
  model: text('model').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  lastHitAt: timestamp('last_hit_at', { withTimezone: true }).notNull().defaultNow(),
  hitCount: integer('hit_count').notNull().default(0),
});

export const planDays = pgTable('plan_days', {
  id: uuid('id').primaryKey().defaultRandom(),
  planId: uuid('plan_id').notNull(),
  dayIndex: integer('day_index').notNull(),
  parkId: uuid('park_id').notNull(),
  date: text('date').notNull(), // ISO date string
  narrativeIntro: text('narrative_intro'), // LLM-generated day intro (renamed from narrative)
  forecastConfidence: text('forecast_confidence'), // 'high' | 'medium' | 'low'
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const planItems = pgTable('plan_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  planDayId: uuid('plan_day_id').notNull(),
  itemType: text('item_type').notNull(), // 'attraction' | 'meal' | 'show' | 'll_reminder' | 'rest' | 'walk'
  refId: uuid('ref_id'), // polymorphic FK into catalog
  name: text('name').notNull().default(''), // display name from solver
  startTime: text('start_time').notNull(), // 'HH:MM'
  endTime: text('end_time').notNull(), // 'HH:MM'
  waitMinutes: integer('wait_minutes'), // predicted wait from forecast
  sortIndex: integer('sort_index').notNull(),
  lightningLaneType: text('lightning_lane_type'), // 'multi_pass' | 'single_pass' | 'none'
  notes: text('notes'), // solver notes e.g. "Use LL here"
  narrativeTip: text('narrative_tip'), // LLM-generated item tip (renamed from narrative)
  metadata: jsonb('metadata'), // flexible per-type data
  isCompleted: boolean('is_completed').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
