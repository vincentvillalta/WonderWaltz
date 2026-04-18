/**
 * SOLV-03 (revised 2026-04): Scoring function for the greedy construction pass.
 *
 * Formula:
 *   base  = enjoymentWeight / (timeCost + waitCost + walkCost)
 *   score = base
 *         × (isMustDo       ? MUST_DO_BOOST : 1)
 *         × (popularityScore / POPULARITY_PIVOT)
 *
 * Must-do replaces the old hard-pinning loop in construct.ts: it now boosts
 * the score so a must-do gets picked in almost every comparison, but a truly
 * awful slot (e.g. forecast says 180min wait at 10am vs 30min at 7pm) will
 * still defer to the better slot instead of blocking the morning.
 *
 * Popularity (1-10, default 5) is a static per-attraction weight. Headliners
 * already bump enjoymentWeight; popularity stacks on top so two headliners
 * with the same wait can still be ranked apart (Avatar FoP > Everest).
 *
 * Pure — no randomness, no side effects, no I/O.
 */

import type { CatalogAttraction, ForecastConfidence } from './types.js';

// ─── Constants ──────────────────────────────────────────────────────────────

/** Staging buffer added to ride duration (boarding, safety spiel, etc.) */
const STAGING_MINUTES = 5;

/** Penalty multiplier for low-confidence forecasts (per CONTEXT.md Area 2). */
const LOW_CONFIDENCE_PENALTY = 1.2;

/** Enjoyment weight for headliner attractions (80+). */
const HEADLINER_ENJOYMENT = 85;

/** Enjoyment weight for non-headliner attractions. */
const DEFAULT_ENJOYMENT = 50;

/**
 * Multiplier applied to must-do attractions. Strong enough to dominate score
 * comparisons in all but pathological slots — still loses to a 30-min wait
 * vs a 180-min wait at the same time.
 */
const MUST_DO_BOOST = 5;

/** Popularity is scaled as `popularity / POPULARITY_PIVOT`, so pivot == neutral. */
const POPULARITY_PIVOT = 5;

/** Clamp bounds for popularity multiplier (defensive, should never trip). */
const POPULARITY_MIN = 1;
const POPULARITY_MAX = 10;

// ─── Input type ─────────────────────────────────────────────────────────────

export type ScoreInput = {
  attraction: CatalogAttraction;
  /** Predicted standby wait from forecast service (minutes). */
  predictedWaitMinutes: number;
  /** Walk time from previous item to this attraction (seconds). */
  walkSeconds: number;
  /** Forecast confidence label. */
  confidence: ForecastConfidence;
  /** True when this attraction is in the trip's mustDoAttractionIds. */
  isMustDo?: boolean;
};

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Derives an enjoyment weight from the catalog attraction.
 * Headliners get 85 (high engagement); others get 50.
 *
 * This bridges the gap between the plan's `enjoymentScore` (1-100 from YAML)
 * and the actual catalog data which only carries `isHeadliner: boolean`.
 * When per-ride enjoyment scores land in the YAML, this function becomes
 * a direct field read.
 */
export function deriveEnjoymentWeight(attraction: CatalogAttraction): number {
  return attraction.isHeadliner ? HEADLINER_ENJOYMENT : DEFAULT_ENJOYMENT;
}

/** Clamp popularity to [MIN, MAX] and default missing values to pivot. */
function resolvePopularity(attraction: CatalogAttraction): number {
  const raw = attraction.popularityScore ?? POPULARITY_PIVOT;
  if (raw < POPULARITY_MIN) return POPULARITY_MIN;
  if (raw > POPULARITY_MAX) return POPULARITY_MAX;
  return raw;
}

// ─── Score function ─────────────────────────────────────────────────────────

/**
 * Computes a deterministic score for placing an attraction at a given point
 * in the day.
 *
 *   base  = enjoymentWeight / (timeCost + waitCost + walkCost)
 *   score = base × mustDoMultiplier × popularityMultiplier
 *
 * - `timeCost       = durationMinutes + 5`
 * - `waitCost       = predictedWaitMinutes × (low-conf ? 1.2 : 1.0)`
 * - `walkCost       = walkSeconds / 60`
 * - `mustDo mult    = 5 when isMustDo, else 1`
 * - `popularity mult = clamp(popularityScore, 1, 10) / 5`
 *
 * Returns a finite number; denominator floor is STAGING_MINUTES (=5).
 */
export function score(input: ScoreInput): number {
  const { attraction, predictedWaitMinutes, walkSeconds, confidence, isMustDo } = input;

  const enjoymentWeight = deriveEnjoymentWeight(attraction);

  const timeCost = attraction.durationMinutes + STAGING_MINUTES;

  const waitPenalty = confidence === 'low' ? LOW_CONFIDENCE_PENALTY : 1.0;
  const waitCost = predictedWaitMinutes * waitPenalty;

  const walkCost = walkSeconds / 60;

  const base = enjoymentWeight / (timeCost + waitCost + walkCost);

  const mustDoMultiplier = isMustDo ? MUST_DO_BOOST : 1;
  const popularityMultiplier = resolvePopularity(attraction) / POPULARITY_PIVOT;

  return base * mustDoMultiplier * popularityMultiplier;
}
