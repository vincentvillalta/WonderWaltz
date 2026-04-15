import { createHash } from 'node:crypto';
import type { SolverInput } from './types.js';

/**
 * Recursively sort object keys so JSON.stringify produces a canonical byte sequence.
 *
 * Rules (CONTEXT.md Area 7 — determinism hazards):
 *   - Plain objects: keys sorted ascending (ASCII).
 *   - Arrays: order preserved (arrays carry semantic priority).
 *   - Primitives: passed through verbatim.
 *   - `undefined` values: dropped (JSON.stringify drops them anyway; doing
 *     it here keeps the canonicalized structure equal to the serialized one).
 *   - Maps/Sets/Dates/functions: NOT SUPPORTED — callers must pre-normalize.
 *     `SolverInput` carries only plain data, so this is not a concern today.
 */
export function canonicalize(value: unknown): unknown {
  if (value === null) return null;
  if (Array.isArray(value)) return value.map((v) => canonicalize(v));
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    const out: Record<string, unknown> = {};
    for (const [k, v] of entries) {
      out[k] = canonicalize(v);
    }
    return out;
  }
  return value;
}

/**
 * Compute the deterministic solver_input_hash per SOLV-11 / CONTEXT.md Area 7:
 *
 *   hash = sha256( canonicalJson({ trip, guests, preferences, dateStart, dateEnd }) )
 *
 * Volatile inputs (forecasts, weather, crowdCalendar, catalog) are INTENTIONALLY
 * excluded so repeat generations within the same trip-day return a cache hit
 * instead of thrashing narrative spend.
 */
export function computeSolverInputHash(input: SolverInput): string {
  const stable = {
    trip: input.trip,
    guests: input.guests,
    preferences: input.preferences,
    dateStart: input.dateStart,
    dateEnd: input.dateEnd,
  };
  const canonical = canonicalize(stable);
  const serialized = JSON.stringify(canonical);
  return createHash('sha256').update(serialized).digest('hex');
}
