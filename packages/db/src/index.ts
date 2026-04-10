import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index.js';

export function createDb(connectionString: string) {
  // prepare: false required for Supabase PgBouncer (transaction pooling mode).
  // Use direct connection URL (port 5432), not pooler URL (port 6543).
  // See: RESEARCH.md Pitfall 4.
  const client = postgres(connectionString, { prepare: false });
  return drizzle(client, { schema });
}

export type Db = ReturnType<typeof createDb>;

// Re-export all schema for consumers
export * from './schema/index.js';
