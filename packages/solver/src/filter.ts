/**
 * SOLV-02: Attraction and dining filter predicates.
 *
 * Four independent composable filters: height, mobility, sensory, dietary.
 * Pure functions — no side effects, deterministic.
 *
 * Each predicate answers "can this guest experience this attraction/dining?"
 * `filterAttractionsForParty` composes height + mobility + sensory:
 *   an attraction is kept only if EVERY non-exempt guest passes all three.
 * `filterDiningForParty` applies dietary filtering independently.
 */

import type { CatalogAttraction, CatalogDining, SolverGuest } from './types.js';

// ─── Tag sets for tag-based predicates ───────────────────────────────────────

/**
 * Tags that indicate an attraction requires transfer from ECV/wheelchair
 * and is incompatible with ECV guests.
 */
const ECV_INCOMPATIBLE_TAGS = new Set(['roller-coaster', 'drop', 'simulator', 'water', 'raft']);

/**
 * Tags that indicate an attraction requires significant physical effort,
 * incompatible with reduced-mobility guests.
 */
const REDUCED_MOBILITY_INCOMPATIBLE_TAGS = new Set(['roller-coaster', 'drop', 'simulator']);

/**
 * Sensory-triggering tags for guests with `sensory: 'high'` (sensitive to
 * intense stimuli). Any of these tags on an attraction filters it out.
 */
const HIGH_SENSORY_TRIGGER_TAGS = new Set([
  'thrill',
  'loud',
  'dark',
  'fast',
  'drops',
  'drop',
  'intense',
  'roller-coaster',
]);

/**
 * Tags tolerated by `sensory: 'low'` guests (very low tolerance — only
 * gentle, calm experiences). An attraction must have NO tags outside this
 * safe set to pass. We check by looking for ANY sensory-triggering tag.
 */
const LOW_SENSORY_TRIGGER_TAGS = new Set([
  ...HIGH_SENSORY_TRIGGER_TAGS,
  // Low-sensory guests are also triggered by moderate stimuli
  'water',
  'raft',
  '3d',
  '4d',
  'shooter',
  'interactive',
  'immersive',
]);

// ─── Guest exemption ─────────────────────────────────────────────────────────

/** Guests aged 0-2 are exempt from ride gates (babies don't gate the family). */
export function isGuestExempt(g: SolverGuest): boolean {
  return g.ageBracket === '0-2';
}

// ─── Individual predicates ───────────────────────────────────────────────────

/**
 * Height predicate.
 *
 * - No height requirement on attraction → always passes.
 * - Adults (18+) always pass (assumed to meet any height req).
 * - Child without `heightInches` + attraction has requirement → fails conservatively.
 * - Otherwise: guest height >= attraction requirement.
 */
export function heightOk(a: CatalogAttraction, g: SolverGuest): boolean {
  if (a.heightRequirementInches == null) return true;
  if (g.ageBracket === '18+') return true;
  if (g.heightInches == null) return false; // conservative: unknown child height
  return g.heightInches >= a.heightRequirementInches;
}

/**
 * Mobility predicate.
 *
 * Uses tag-based heuristics since `CatalogAttraction` doesn't carry explicit
 * `ecvAccessible` / `walkingRequiredFeet` fields. Instead, we identify
 * ride types that require transfer from wheelchair/ECV.
 *
 * - `mobility: 'none'` → always passes.
 * - `mobility: 'ecv'` → fails if ride has ECV-incompatible tags.
 * - `mobility: 'reduced'` → fails if ride has reduced-mobility-incompatible tags.
 */
export function mobilityOk(a: CatalogAttraction, g: SolverGuest): boolean {
  if (g.mobility === 'none') return true;

  const tags = a.tags;

  if (g.mobility === 'ecv') {
    return !tags.some((t) => ECV_INCOMPATIBLE_TAGS.has(t));
  }

  if (g.mobility === 'reduced') {
    return !tags.some((t) => REDUCED_MOBILITY_INCOMPATIBLE_TAGS.has(t));
  }

  return true;
}

/**
 * Sensory predicate.
 *
 * Uses tag-based filtering since attractions carry `tags: string[]` with
 * descriptors like 'thrill', 'dark', 'loud', 'drop', etc.
 *
 * - `sensory: 'none'` → always passes.
 * - `sensory: 'high'` → fails if any HIGH_SENSORY_TRIGGER_TAGS present.
 * - `sensory: 'low'` → fails if any LOW_SENSORY_TRIGGER_TAGS present
 *   (tolerates only minimal/gentle stimuli).
 */
export function sensoryOk(a: CatalogAttraction, g: SolverGuest): boolean {
  if (g.sensory === 'none') return true;

  const tags = a.tags;

  if (g.sensory === 'high') {
    return !tags.some((t) => HIGH_SENSORY_TRIGGER_TAGS.has(t));
  }

  if (g.sensory === 'low') {
    return !tags.some((t) => LOW_SENSORY_TRIGGER_TAGS.has(t));
  }

  return true;
}

/**
 * Dietary predicate.
 *
 * For each guest's dietary tag, the dining location must declare support
 * via `dining.accommodates`. If ANY guest tag is unsupported, dining fails.
 *
 * - No dietary restrictions across all guests → always passes.
 * - Dining with no `accommodates` field but guests have needs → fails.
 * - Must support the UNION of all guests' dietary needs.
 */
export function dietaryOk(d: CatalogDining, guests: SolverGuest[]): boolean {
  const allNeeds = new Set<string>();
  for (const g of guests) {
    for (const need of g.dietary) {
      allNeeds.add(need);
    }
  }

  // No dietary needs → everything passes
  if (allNeeds.size === 0) return true;

  const accommodates = new Set(d.accommodates ?? []);
  for (const need of allNeeds) {
    if (!accommodates.has(need)) return false;
  }

  return true;
}

// ─── Composed filters ────────────────────────────────────────────────────────

/**
 * Returns only attractions where EVERY non-exempt guest passes all three
 * predicates (height, mobility, sensory). A single guest who can't ride
 * eliminates the attraction ("family won't split up" assumption).
 */
export function filterAttractionsForParty(
  attractions: CatalogAttraction[],
  guests: SolverGuest[],
): CatalogAttraction[] {
  const active = guests.filter((g) => !isGuestExempt(g));
  if (active.length === 0) return attractions;

  return attractions.filter((a) =>
    active.every((g) => heightOk(a, g) && mobilityOk(a, g) && sensoryOk(a, g)),
  );
}

/**
 * Returns only dining locations that can accommodate ALL guests' dietary needs.
 */
export function filterDiningForParty(
  dining: CatalogDining[],
  guests: SolverGuest[],
): CatalogDining[] {
  return dining.filter((d) => dietaryOk(d, guests));
}
