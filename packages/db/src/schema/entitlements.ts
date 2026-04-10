import { pgTable, uuid, text, timestamp, integer } from 'drizzle-orm/pg-core';

export const entitlements = pgTable('entitlements', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  tripId: uuid('trip_id').notNull(),
  revenuecatId: text('revenuecat_id').notNull().unique(),
  state: text('state').notNull(), // 'active' | 'revoked' | 'refunded'
  purchasedAt: timestamp('purchased_at', { withTimezone: true }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const iapEvents = pgTable('iap_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  tripId: uuid('trip_id'),
  eventType: text('event_type').notNull(), // 'INITIAL_PURCHASE' | 'REFUND' | 'CANCELLATION'
  revenuecatId: text('revenuecat_id'),
  rawPayload: text('raw_payload').notNull(), // JSON string
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const llmCosts = pgTable('llm_costs', {
  id: uuid('id').primaryKey().defaultRandom(),
  tripId: uuid('trip_id'),
  planId: uuid('plan_id'),
  model: text('model').notNull(),
  inputTok: integer('input_tok').notNull(),
  cachedReadTok: integer('cached_read_tok').notNull().default(0),
  outputTok: integer('output_tok').notNull(),
  usdCents: integer('usd_cents').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
