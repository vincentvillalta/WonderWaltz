/**
 * SOLV-12: Six canonical fixture snapshot tests.
 *
 * Each fixture runs solve() and matches the output against a committed
 * Vitest snapshot. Running in CI mode (--run) FAILS if any snapshot diff
 * exists — ensuring determinism across runs and Node versions.
 *
 * A secondary assertion computes the SHA-256 of each result for quick
 * regression visibility.
 */

import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { solve } from '../src/index.js';
import { fixtures } from '../src/__fixtures__/index.js';

describe('Canonical fixture snapshots (SOLV-12)', () => {
  for (const f of fixtures) {
    it(`${f.name} → byte-identical DayPlan[]`, () => {
      const result = solve(f.input);
      expect(result).toMatchSnapshot();
    });

    it(`${f.name} → stable SHA-256`, () => {
      const result = solve(f.input);
      const json = JSON.stringify(result);
      const hash = createHash('sha256').update(json).digest('hex');
      expect(hash).toMatchSnapshot();
    });
  }
});

describe('5-day Royal Treatment perf benchmark', () => {
  it('solve() completes in < 2 seconds', () => {
    const fiveDayFixture = fixtures.find((f) => f.name.includes('5-day'));
    expect(fiveDayFixture).toBeDefined();

    const start = performance.now();
    solve(fiveDayFixture!.input);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(2000);
  });
});
