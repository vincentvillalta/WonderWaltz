/**
 * Migration 0004 schema test — Phase 3 engine scaffolding.
 *
 * Asserts that after applying migrations against a live Postgres (Supabase),
 * the new tables/columns/indexes exist:
 *   - crowd_calendar table
 *   - llm_cost_incidents table
 *   - trips.current_plan_id column
 *   - trips.llm_budget_cents column with default 50
 *   - plans_trip_hash_idx index
 *   - attractions.baseline_wait_minutes / lightning_lane_type / is_headliner
 *
 * This test runs against the DATABASE_URL env (Supabase project). It is
 * read-only: pure information_schema and pg_indexes queries.
 *
 * Skipped when DATABASE_URL is not set (CI without secrets).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import postgres from 'postgres';

const DATABASE_URL = process.env['DATABASE_URL'];

const describeIfDb = DATABASE_URL ? describe : describe.skip;

describeIfDb('migration 0004 — phase 3 scaffolding', () => {
  let sql: ReturnType<typeof postgres>;

  beforeAll(() => {
    sql = postgres(DATABASE_URL!, { prepare: false, max: 2 });
  });

  afterAll(async () => {
    await sql.end({ timeout: 5 });
  });

  it('crowd_calendar table exists with required columns + bucket CHECK', async () => {
    const reg = await sql<{ to_regclass: string | null }[]>`
      SELECT to_regclass('public.crowd_calendar')::text AS to_regclass
    `;
    expect(reg[0]?.to_regclass).toBe('crowd_calendar');

    const cols = await sql<{ column_name: string; data_type: string; is_nullable: string }[]>`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'crowd_calendar'
    `;
    const names = cols.map((c) => c.column_name);
    expect(names).toContain('date');
    expect(names).toContain('bucket');
    expect(names).toContain('reason');
    expect(names).toContain('created_at');

    // Verify CHECK constraint covers the four bucket values
    const checks = await sql<{ definition: string }[]>`
      SELECT pg_get_constraintdef(c.oid) AS definition
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      WHERE t.relname = 'crowd_calendar' AND c.contype = 'c'
    `;
    const hasBucketCheck = checks.some(
      (c) =>
        c.definition.includes('low') &&
        c.definition.includes('medium') &&
        c.definition.includes('high') &&
        c.definition.includes('peak'),
    );
    expect(hasBucketCheck).toBe(true);
  });

  it('llm_cost_incidents table exists with required columns', async () => {
    const reg = await sql<{ to_regclass: string | null }[]>`
      SELECT to_regclass('public.llm_cost_incidents')::text AS to_regclass
    `;
    expect(reg[0]?.to_regclass).toBe('llm_cost_incidents');

    const cols = await sql<{ column_name: string; data_type: string }[]>`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'llm_cost_incidents'
    `;
    const names = cols.map((c) => c.column_name);
    expect(names).toEqual(
      expect.arrayContaining([
        'id',
        'trip_id',
        'event',
        'model',
        'spent_cents',
        'timestamp',
        'metadata',
      ]),
    );
  });

  it('trips.current_plan_id and trips.llm_budget_cents exist with correct defaults', async () => {
    const cols = await sql<
      {
        column_name: string;
        data_type: string;
        column_default: string | null;
        is_nullable: string;
      }[]
    >`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'trips'
        AND column_name IN ('current_plan_id', 'llm_budget_cents')
    `;
    const byName = new Map(cols.map((c) => [c.column_name, c]));

    const cpid = byName.get('current_plan_id');
    expect(cpid).toBeDefined();
    expect(cpid!.is_nullable).toBe('YES');

    const budget = byName.get('llm_budget_cents');
    expect(budget).toBeDefined();
    expect(budget!.is_nullable).toBe('NO');
    // Default is rendered as '50' or '50::integer' depending on driver
    expect(budget!.column_default ?? '').toMatch(/^50/);
  });

  // The solver_input_hash column + plans_trip_hash_idx were dropped in
  // migration 0006 (cache was ineffective — guest identity made cache
  // keys unique per trip). Nothing to assert here anymore.

  it('attractions has baseline_wait_minutes, lightning_lane_type, is_headliner', async () => {
    const cols = await sql<
      { column_name: string; data_type: string; column_default: string | null }[]
    >`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'attractions'
        AND column_name IN ('baseline_wait_minutes', 'lightning_lane_type', 'is_headliner')
    `;
    const names = cols.map((c) => c.column_name);
    expect(names).toEqual(
      expect.arrayContaining(['baseline_wait_minutes', 'lightning_lane_type', 'is_headliner']),
    );

    const lltype = cols.find((c) => c.column_name === 'lightning_lane_type');
    // lightning_lane_type default: 'none'
    expect(lltype?.column_default ?? '').toContain('none');

    const headliner = cols.find((c) => c.column_name === 'is_headliner');
    expect(headliner?.column_default ?? '').toMatch(/false/);
  });
});
