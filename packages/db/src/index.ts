import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

export function createDb(connectionString: string) {
  // prepare: false required for Supabase PgBouncer (transaction pooling mode).
  // Using direct connection URL (port 5432), not pooler (port 6543).
  // See: RESEARCH.md Pitfall 4.
  const client = postgres(connectionString, { prepare: false });
  return drizzle(client);
}

export type Db = ReturnType<typeof createDb>;
