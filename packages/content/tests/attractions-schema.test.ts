/**
 * Phase 3 — attractions.yaml schema validation.
 *
 * Asserts that every row in attractions.yaml carries the three solver-facing
 * fields added in plan 03-01 task 2:
 *   - baseline_wait_minutes (1–180)
 *   - lightning_lane_type ('multi_pass' | 'single_pass' | 'none')
 *   - is_headliner (boolean)
 *
 * This is the source-of-truth gate: if the YAML drifts, this test red-lines
 * before the seed script ever runs.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { AttractionsFileSchema } from '../wdw/schema/attraction.zod.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ATTRACTIONS_PATH = resolve(__dirname, '../wdw/attractions.yaml');

describe('attractions.yaml — phase 3 schema', () => {
  const raw = readFileSync(ATTRACTIONS_PATH, 'utf8');
  const parsed = parse(raw) as unknown;

  it('parses cleanly under AttractionsFileSchema (Zod)', () => {
    const result = AttractionsFileSchema.safeParse(parsed);
    if (!result.success) {
      // Surface the first 5 issues for fast triage
      const issues = result.error.issues
        .slice(0, 5)
        .map((i) => `${i.path.join('.')}: ${i.message}`);
      throw new Error(`Zod validation failed:\n${issues.join('\n')}`);
    }
    expect(result.success).toBe(true);
  });

  it('every attraction has baseline_wait_minutes in [1, 180]', () => {
    const result = AttractionsFileSchema.parse(parsed);
    for (const a of result.attractions) {
      expect(a.baseline_wait_minutes, `attraction ${a.id}`).toBeGreaterThanOrEqual(1);
      expect(a.baseline_wait_minutes, `attraction ${a.id}`).toBeLessThanOrEqual(180);
    }
  });

  it("every attraction has lightning_lane_type in {'multi_pass','single_pass','none'}", () => {
    const result = AttractionsFileSchema.parse(parsed);
    const allowed = new Set(['multi_pass', 'single_pass', 'none']);
    for (const a of result.attractions) {
      expect(allowed.has(a.lightning_lane_type), `attraction ${a.id}`).toBe(true);
    }
  });

  it('every attraction has a boolean is_headliner', () => {
    const result = AttractionsFileSchema.parse(parsed);
    for (const a of result.attractions) {
      expect(typeof a.is_headliner, `attraction ${a.id}`).toBe('boolean');
    }
  });
});
