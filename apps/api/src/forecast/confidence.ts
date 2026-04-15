/**
 * Confidence classifier for ForecastService (FC-03).
 *
 * Pure function — no side effects, no async. Extracted so we can
 * table-drive the gate without spinning up a NestJS module.
 *
 * Thresholds (from CONTEXT.md Area 2):
 *   - `high`   : >= 8 weeks of history AND > 50 samples in bucket
 *   - `medium` : >= 4 weeks of history AND > 20 samples in bucket
 *   - `low`    : otherwise (default operating mode for first ~4 weeks
 *                post-2026-04-15 until ingestion matures)
 *
 * An additional `samples < 5` short-circuit exists in `ForecastService`
 * to force baseline fallback even if weeks-of-history would otherwise
 * qualify for medium — prevents confident-looking medians over near-
 * empty buckets.
 */

export type ForecastConfidence = 'high' | 'medium' | 'low';

export function classifyConfidence(args: {
  samples: number;
  weeksOfHistory: number;
}): ForecastConfidence {
  const { samples, weeksOfHistory } = args;
  if (weeksOfHistory >= 8 && samples > 50) return 'high';
  if (weeksOfHistory >= 4 && samples > 20) return 'medium';
  return 'low';
}
