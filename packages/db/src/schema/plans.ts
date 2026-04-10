import { pgTable, uuid, text, integer, timestamp, boolean, jsonb } from 'drizzle-orm/pg-core';

export const plans = pgTable('plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  tripId: uuid('trip_id').notNull(),
  version: integer('version').notNull().default(1),
  solverInputHash: text('solver_input_hash'), // for result caching
  status: text('status').notNull().default('draft'),
  generatedAt: timestamp('generated_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const planDays = pgTable('plan_days', {
  id: uuid('id').primaryKey().defaultRandom(),
  planId: uuid('plan_id').notNull(),
  dayIndex: integer('day_index').notNull(),
  parkId: uuid('park_id').notNull(),
  date: text('date').notNull(), // ISO date string
  narrative: text('narrative'), // LLM-generated day intro
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const planItems = pgTable('plan_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  planDayId: uuid('plan_day_id').notNull(),
  itemType: text('item_type').notNull(), // 'attraction' | 'meal' | 'show' | 'll_reminder' | 'rest' | 'walk'
  refId: uuid('ref_id'), // polymorphic FK into catalog
  startTime: text('start_time').notNull(), // 'HH:MM'
  endTime: text('end_time').notNull(), // 'HH:MM'
  sortIndex: integer('sort_index').notNull(),
  narrative: text('narrative'), // LLM-generated item tip
  metadata: jsonb('metadata'), // flexible per-type data
  isCompleted: boolean('is_completed').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
