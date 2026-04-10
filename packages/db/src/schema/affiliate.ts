import { pgTable, uuid, text, timestamp, boolean } from 'drizzle-orm/pg-core';

export const affiliateItems = pgTable('affiliate_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  planId: uuid('plan_id').notNull(),
  category: text('category').notNull(),
  name: text('name').notNull(),
  asin: text('asin'), // Amazon ASIN
  baseUrl: text('base_url'), // URL without affiliate tag
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const packingListItems = pgTable('packing_list_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  planId: uuid('plan_id').notNull(),
  category: text('category').notNull(),
  name: text('name').notNull(),
  isAffiliate: boolean('is_affiliate').notNull().default(false),
  affiliateItemId: uuid('affiliate_item_id'),
  sortIndex: text('sort_index').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
