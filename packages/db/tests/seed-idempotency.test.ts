/**
 * Seed idempotency proof — packages/db/scripts/seed-catalog.ts.
 *
 * Re-running the seed must NOT change row counts and must keep all field
 * values stable. The script uses ON CONFLICT DO UPDATE so Postgres will
 * happily overwrite — the proof is that the UPDATE writes the same values
 * it already had.
 *
 * Strategy:
 *   1. Snapshot row counts + a handful of representative rows by external_id
 *   2. Re-run the seed
 *   3. Confirm row counts unchanged AND sampled rows byte-equal
 *
 * Skipped when DATABASE_URL is unset.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

const DATABASE_URL = process.env['DATABASE_URL'];
const describeIfDb = DATABASE_URL ? describe : describe.skip;
const __dirname = dirname(fileURLToPath(import.meta.url));
const SEED_SCRIPT = resolve(__dirname, '../scripts/seed-catalog.ts');

const SAMPLED_ATTRACTIONS = [
  'wdw-mk-tron',
  'wdw-mk-seven-dwarfs',
  'wdw-ep-guardians',
  'wdw-hs-rise-resistance',
  'wdw-ak-avatar-flight',
];

describeIfDb('seed-catalog.ts — idempotency', () => {
  let sql: ReturnType<typeof postgres>;

  beforeAll(() => {
    sql = postgres(DATABASE_URL!, { prepare: false, max: 2 });
  });

  afterAll(async () => {
    await sql.end({ timeout: 5 });
  });

  it('re-running the seed keeps row counts and sampled values stable', async () => {
    const TABLES = ['parks', 'attractions', 'dining', 'shows', 'resorts', 'walking_graph'];

    const beforeCounts: Record<string, number> = {};
    for (const t of TABLES) {
      const r = await sql<{ c: number }[]>`SELECT COUNT(*)::int AS c FROM ${sql(t)}`;
      beforeCounts[t] = r[0]!.c;
    }

    const beforeSample = await sql<
      {
        external_id: string;
        baseline_wait_minutes: number | null;
        lightning_lane_type: string;
        is_headliner: boolean;
        name: string;
      }[]
    >`
      SELECT external_id, baseline_wait_minutes, lightning_lane_type, is_headliner, name
      FROM attractions
      WHERE external_id = ANY(${SAMPLED_ATTRACTIONS as unknown as string[]})
      ORDER BY external_id
    `;

    const result = spawnSync('npx', ['tsx', SEED_SCRIPT], {
      cwd: resolve(__dirname, '..'),
      env: { ...process.env, DATABASE_URL },
      encoding: 'utf8',
      timeout: 120_000,
    });
    expect(result.status, result.stderr || result.stdout).toBe(0);

    for (const t of TABLES) {
      const r = await sql<{ c: number }[]>`SELECT COUNT(*)::int AS c FROM ${sql(t)}`;
      expect(r[0]!.c, `${t} row count drifted`).toBe(beforeCounts[t]);
    }

    const afterSample = await sql<typeof beforeSample>`
      SELECT external_id, baseline_wait_minutes, lightning_lane_type, is_headliner, name
      FROM attractions
      WHERE external_id = ANY(${SAMPLED_ATTRACTIONS as unknown as string[]})
      ORDER BY external_id
    `;
    expect(afterSample).toEqual(beforeSample);
  }, 180_000);
});
