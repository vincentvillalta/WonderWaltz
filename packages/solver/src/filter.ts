/**
 * SOLV-02: Attraction and dining filter predicates.
 *
 * Four independent composable filters: height, mobility, sensory, dietary.
 * Pure functions — no side effects, deterministic.
 *
 * Stubs (TDD RED) — implementations land in the GREEN phase.
 */

import type { CatalogAttraction, CatalogDining, SolverGuest } from './types.js';

// ─── Guest exemption ─────────────────────────────────────────────────────────

/** Guests aged 0-2 are exempt from ride gates (babies don't gate the family). */
export function isGuestExempt(_g: SolverGuest): boolean {
  throw new Error('Not implemented (RED)');
}

// ─── Individual predicates ───────────────────────────────────────────────────

export function heightOk(_a: CatalogAttraction, _g: SolverGuest): boolean {
  throw new Error('Not implemented (RED)');
}

export function mobilityOk(_a: CatalogAttraction, _g: SolverGuest): boolean {
  throw new Error('Not implemented (RED)');
}

export function sensoryOk(_a: CatalogAttraction, _g: SolverGuest): boolean {
  throw new Error('Not implemented (RED)');
}

export function dietaryOk(_d: CatalogDining, _guests: SolverGuest[]): boolean {
  throw new Error('Not implemented (RED)');
}

// ─── Composed filters ────────────────────────────────────────────────────────

/**
 * Returns only attractions where EVERY non-exempt guest passes all three
 * predicates (height, mobility, sensory). A single guest who can't ride
 * eliminates the attraction ("family won't split up" assumption).
 */
export function filterAttractionsForParty(
  _attractions: CatalogAttraction[],
  _guests: SolverGuest[],
): CatalogAttraction[] {
  throw new Error('Not implemented (RED)');
}

/**
 * Returns only dining locations that can accommodate ALL guests' dietary needs.
 */
export function filterDiningForParty(
  _dining: CatalogDining[],
  _guests: SolverGuest[],
): CatalogDining[] {
  throw new Error('Not implemented (RED)');
}
