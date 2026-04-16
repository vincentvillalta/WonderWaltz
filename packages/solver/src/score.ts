/**
 * SOLV-03: Scoring function for the greedy construction pass.
 *
 * Formula: score = enjoyment_weight / (time_cost + wait_cost + walk_cost)
 * All cost multipliers = 1.0 (equal weights baseline; tunable later via
 * snapshot fixture outcomes).
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

// ─── Input type ─────────────────────────────────────────────────────────────

export type ScoreInput = {
  attraction: CatalogAttraction;
  /** Predicted standby wait from forecast service (minutes). */
  predictedWaitMinutes: number;
  /** Walk time from previous item to this attraction (seconds). */
  walkSeconds: number;
  /** Forecast confidence label. */
  confidence: ForecastConfidence;
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

// ─── Score function ─────────────────────────────────────────────────────────

/**
 * Computes a deterministic score for placing an attraction at a given point
 * in the day.
 *
 * score = enjoyment_weight / (time_cost + wait_cost + walk_cost)
 *
 * - `time_cost = durationMinutes + 5` (staging buffer)
 * - `wait_cost = predictedWaitMinutes * penalty` (1.2x when confidence='low')
 * - `walk_cost = walkSeconds / 60` (converted to minutes)
 *
 * Returns a finite number for any valid input (denominator >= STAGING_MINUTES
 * = 5 when all costs are zero except the staging buffer).
 */
export function score(input: ScoreInput): number {
  const { attraction, predictedWaitMinutes, walkSeconds, confidence } = input;

  const enjoymentWeight = deriveEnjoymentWeight(attraction);

  const timeCost = attraction.durationMinutes + STAGING_MINUTES;

  const waitPenalty = confidence === 'low' ? LOW_CONFIDENCE_PENALTY : 1.0;
  const waitCost = predictedWaitMinutes * waitPenalty;

  const walkCost = walkSeconds / 60;

  return enjoymentWeight / (timeCost + waitCost + walkCost);
}
