import { pgTable, uuid, text, timestamp, boolean } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey(), // matches Supabase auth.users.id
  email: text('email'), // null for anonymous users
  displayName: text('display_name'),
  isAnonymous: boolean('is_anonymous').notNull().default(true),
  isAdmin: boolean('is_admin').notNull().default(false),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
