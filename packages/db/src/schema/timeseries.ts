import { pgTable, uuid, integer, boolean, timestamp, text } from 'drizzle-orm/pg-core';

// Standard Drizzle table — converted to TimescaleDB hypertable
// via custom raw SQL migration 0001_timescale_hypertable.sql
export const waitTimesHistory = pgTable('wait_times_history', {
  rideId: uuid('ride_id').notNull(),
  ts: timestamp('ts', { withTimezone: true }).notNull(),
  minutes: integer('minutes').notNull(),
  isOpen: boolean('is_open').notNull(),
  source: text('source').notNull(), // 'queue-times' | 'themeparks-wiki'
  fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull().defaultNow(),
});
// Note: No primary key — TimescaleDB hypertables use (ride_id, ts) as natural composite key
