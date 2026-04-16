/**
 * SOLV-10: Budget tier rules constant table.
 *
 * Encodes LL allocation caps, rest frequency, dining tier, and rest block
 * duration for each budget tier. These are algorithm constants — NOT catalog
 * data — so they live here in the solver, not in @wonderwaltz/content.
 *
 * Pure — no randomness, no side effects, no I/O.
 */

import type { BudgetTier } from './types.js';

// ─── Types ─────────────────────────────────────────────────────────────────

export type DiningTier = 'value' | 'quick_service' | 'table_service' | 'signature';

export type TierRules = {
  /** Max Lightning Lane Multi Pass slots per day. */
  readonly llmpCap: number;
  /** Max Lightning Lane Single Pass slots per day. */
  readonly llspCap: number;
  /** How often (in hours) to insert rest blocks. */
  readonly restFrequencyHours: number;
  /** Dining quality level for this tier. */
  readonly diningTier: DiningTier;
  /** Duration of each rest block in minutes. */
  readonly restBlockDurationMinutes: number;
};

// ─── Constant table ────────────────────────────────────────────────────────

const _pixie: TierRules = Object.freeze({
  llmpCap: 0,
  llspCap: 0,
  restFrequencyHours: 3,
  diningTier: 'value' as const,
  restBlockDurationMinutes: 60,
});

const _fairy: TierRules = Object.freeze({
  llmpCap: 3,
  llspCap: 1,
  restFrequencyHours: 2,
  diningTier: 'table_service' as const,
  restBlockDurationMinutes: 60,
});

const _royal: TierRules = Object.freeze({
  llmpCap: 3,
  llspCap: 2,
  restFrequencyHours: 2,
  diningTier: 'signature' as const,
  restBlockDurationMinutes: 120,
});

/**
 * Immutable budget tier rules table.
 * Keyed by BudgetTier ('pixie' | 'fairy' | 'royal').
 */
export const BUDGET_TIER_RULES: Readonly<Record<BudgetTier, TierRules>> = Object.freeze({
  pixie: _pixie,
  fairy: _fairy,
  royal: _royal,
});
