import {
  pgTable,
  uuid,
  text,
  integer,
  smallint,
  boolean,
  timestamp,
  doublePrecision,
  customType,
} from 'drizzle-orm/pg-core';

// Drizzle has no native PostGIS type — use customType
const geometry = customType<{ data: string; driverData: string }>({
  dataType() {
    return 'geometry(Point, 4326)';
  },
});

export const parks = pgTable('parks', {
  id: uuid('id').primaryKey().defaultRandom(),
  externalId: text('external_id').notNull().unique(),
  name: text('name').notNull(),
  queueTimesId: integer('queue_times_id').notNull(),
  themeparksWikiId: text('themeparks_wiki_id').notNull(),
  timezone: text('timezone').notNull().default('America/New_York'),
  latitude: doublePrecision('latitude').notNull(),
  longitude: doublePrecision('longitude').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const attractions = pgTable('attractions', {
  id: uuid('id').primaryKey().defaultRandom(),
  parkId: uuid('park_id').notNull(),
  externalId: text('external_id').notNull().unique(),
  name: text('name').notNull(),
  locationPoint: geometry('location_point'), // PostGIS — nullable
  heightReqCm: integer('height_req_cm'), // null = no height requirement
  queueTimesId: integer('queue_times_id'),
  themeparksWikiId: text('themeparks_wiki_id'),
  attractionType: text('attraction_type').notNull().default('ride'),
  tags: text('tags').array().notNull().default([]),
  // Phase 3 (migration 0004): solver-facing fields.
  // baselineWaitMinutes: hardcoded fallback used when forecast confidence is 'low'.
  baselineWaitMinutes: integer('baseline_wait_minutes'),
  // lightningLaneType: 'multi_pass' | 'single_pass' | 'none' (CHECK enforced in SQL).
  lightningLaneType: text('lightning_lane_type').notNull().default('none'),
  // isHeadliner: top-tier ride per park; drives LL allocation priority.
  isHeadliner: boolean('is_headliner').notNull().default(false),
  // popularityScore: 1-10, drives greedy scoring (0006 migration). Default 5.
  popularityScore: smallint('popularity_score').notNull().default(5),
  isActive: boolean('is_active').notNull().default(true),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const dining = pgTable('dining', {
  id: uuid('id').primaryKey().defaultRandom(),
  parkId: uuid('park_id'), // null = resort or Disney Springs
  resortId: uuid('resort_id'),
  externalId: text('external_id').notNull().unique(),
  name: text('name').notNull(),
  diningType: text('dining_type').notNull(), // 'table_service' | 'quick_service' | 'snack'
  cuisineTags: text('cuisine_tags').array().notNull().default([]),
  isActive: boolean('is_active').notNull().default(true),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const shows = pgTable('shows', {
  id: uuid('id').primaryKey().defaultRandom(),
  parkId: uuid('park_id').notNull(),
  externalId: text('external_id').notNull().unique(),
  name: text('name').notNull(),
  showType: text('show_type').notNull(), // 'parade' | 'fireworks' | 'stage_show' | 'street_show'
  isActive: boolean('is_active').notNull().default(true),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const resorts = pgTable('resorts', {
  id: uuid('id').primaryKey().defaultRandom(),
  externalId: text('external_id').notNull().unique(),
  name: text('name').notNull(),
  tier: text('tier').notNull(), // 'value' | 'moderate' | 'deluxe' | 'deluxe_villa'
  isOnProperty: boolean('is_on_property').notNull().default(true),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Walking graph for solver path computation
export const walkingGraph = pgTable('walking_graph', {
  id: uuid('id').primaryKey().defaultRandom(),
  fromNodeId: text('from_node_id').notNull(), // 'attraction:{id}' | 'area:{name}'
  toNodeId: text('to_node_id').notNull(),
  walkingSeconds: integer('walking_seconds').notNull(),
  parkId: uuid('park_id').notNull(),
});
