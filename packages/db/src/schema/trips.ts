import {
  pgTable,
  pgEnum,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  date,
} from 'drizzle-orm/pg-core';

// LEGL-07: age stored as bracket string, NOT birthdate
export const ageBracketEnum = pgEnum('age_bracket', ['0-2', '3-6', '7-9', '10-13', '14-17', '18+']);

export const budgetTierEnum = pgEnum('budget_tier', [
  'pixie_dust',
  'fairy_tale',
  'royal_treatment',
]);

export const lodgingTypeEnum = pgEnum('lodging_type', [
  'value',
  'moderate',
  'deluxe',
  'deluxe_villa',
  'off_site',
]);

export const planStatusEnum = pgEnum('plan_status', ['pending', 'generating', 'ready', 'error']);

export const entitlementStateEnum = pgEnum('entitlement_state', ['free', 'unlocked']);

export const trips = pgTable('trips', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  name: text('name').notNull(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  budgetTier: budgetTierEnum('budget_tier').notNull().default('fairy_tale'),
  lodgingType: lodgingTypeEnum('lodging_type').notNull().default('off_site'),
  lodgingResortId: uuid('lodging_resort_id'), // FK to catalog.resorts
  hasHopper: boolean('has_hopper').notNull().default(false),
  hasDas: boolean('has_das').notNull().default(false),
  planStatus: planStatusEnum('plan_status').notNull().default('pending'),
  entitlementState: entitlementStateEnum('entitlement_state').notNull().default('free'),
  // Phase 3 (migration 0004): pointer to the active plan; history preserved in plans table.
  currentPlanId: uuid('current_plan_id'), // FK → plans(id) ON DELETE SET NULL
  // Phase 3 (migration 0004): per-trip lifetime LLM spend cap in cents (default $0.50).
  llmBudgetCents: integer('llm_budget_cents').notNull().default(50),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const guests = pgTable('guests', {
  id: uuid('id').primaryKey().defaultRandom(),
  tripId: uuid('trip_id').notNull(),
  name: text('name').notNull(),
  ageBracket: ageBracketEnum('age_bracket').notNull(), // LEGL-07: NO birthdate
  hasDas: boolean('has_das').notNull().default(false),
  hasMobilityNeeds: boolean('has_mobility_needs').notNull().default(false),
  hasSensoryNeeds: boolean('has_sensory_needs').notNull().default(false),
  dietaryFlags: text('dietary_flags').array().notNull().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const tripParkDays = pgTable('trip_park_days', {
  id: uuid('id').primaryKey().defaultRandom(),
  tripId: uuid('trip_id').notNull(),
  dayIndex: integer('day_index').notNull(), // 0-based
  parkId: uuid('park_id').notNull(),
  isHopperDay: boolean('is_hopper_day').notNull().default(false),
  date: date('date').notNull(),
});

export const tripPreferences = pgTable('trip_preferences', {
  id: uuid('id').primaryKey().defaultRandom(),
  tripId: uuid('trip_id').notNull().unique(),
  mustDoAttractionIds: uuid('must_do_attraction_ids').array().notNull().default([]),
  avoidAttractionIds: uuid('avoid_attraction_ids').array().notNull().default([]),
  mealPreferences: text('meal_preferences').array().notNull().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
