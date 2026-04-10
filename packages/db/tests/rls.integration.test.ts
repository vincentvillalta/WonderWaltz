/**
 * RLS integration tests -- requires local Supabase running.
 * Start with: supabase start
 * Run: vitest run packages/db/tests/rls.integration.test.ts
 *
 * Verification command from VALIDATION.md:
 * vitest run packages/db/tests/rls.integration.test.ts
 */
import { createClient } from '@supabase/supabase-js';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createDb } from '../src/index.js';
import { trips } from '../src/schema/trips.js';
import { eq } from 'drizzle-orm';

const SUPABASE_URL = process.env['SUPABASE_URL'] ?? 'http://127.0.0.1:54321';
const ANON_KEY = process.env['SUPABASE_ANON_KEY']!;
const DATABASE_URL =
  process.env['DATABASE_URL'] ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

const TEST_USER_A_ID = '00000000-0000-0000-0000-000000000001';

let testTripId: string;

describe('RLS policies', () => {
  beforeAll(async () => {
    // Seed a trip for user A using service role (bypasses RLS)
    const db = createDb(DATABASE_URL);
    const [trip] = await db
      .insert(trips)
      .values({
        userId: TEST_USER_A_ID,
        name: 'RLS Test Trip',
        startDate: '2026-06-01',
        endDate: '2026-06-03',
      })
      .returning();
    testTripId = trip!.id;
  });

  afterAll(async () => {
    const db = createDb(DATABASE_URL);
    await db.delete(trips).where(eq(trips.id, testTripId));
  });

  it('unauthenticated anon client cannot read trips', async () => {
    const anon = createClient(SUPABASE_URL, ANON_KEY);
    const { data } = await anon.from('trips').select('*').eq('id', testTripId);

    // RLS blocks the read -- should return empty array or PGRST116
    expect(data ?? []).toHaveLength(0);
  });

  it('unauthenticated anon client cannot read catalog attractions', async () => {
    const anon = createClient(SUPABASE_URL, ANON_KEY);
    const { data } = await anon.from('attractions').select('*').limit(1);
    // RLS blocks even catalog reads -- all catalog reads go through NestJS
    expect(data ?? []).toHaveLength(0);
  });
});
