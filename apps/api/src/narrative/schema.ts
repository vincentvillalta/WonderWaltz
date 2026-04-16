/**
 * Zod schema for narrative output validation (LLM-04).
 *
 * Validates the structured JSON returned by Claude against:
 * 1. Shape: days[].intro, items[].tip, packingDelta[], budgetHacks[]
 * 2. Contract: every planItemId in the narrative must exist in the solver output
 *    (prevents hallucinated ride references)
 */

import { z } from 'zod';

// ─── Zod schema ──────────────────────────────────────────────────────

export const NarrativeDayItemSchema = z.object({
  planItemId: z.string(),
  tip: z.string().min(10).max(400),
});

export const NarrativeDaySchema = z.object({
  dayIndex: z.number().int().nonnegative(),
  intro: z.string().min(50).max(800),
  items: z.array(NarrativeDayItemSchema),
});

export const PackingDeltaSchema = z.object({
  item: z.string(),
  reason: z.string(),
});

export const NarrativeResponseSchema = z.object({
  days: z.array(NarrativeDaySchema),
  packingDelta: z.array(PackingDeltaSchema),
  budgetHacks: z.array(z.string()),
});

export type NarrativeResponse = z.infer<typeof NarrativeResponseSchema>;

// ─── Rethink intro schema (Haiku path — intro only) ──────────────────

export const RethinkIntroSchema = z.object({
  intro: z.string().min(20).max(800),
});

export type RethinkIntroResponse = z.infer<typeof RethinkIntroSchema>;

// ─── Contract validator ──────────────────────────────────────────────

export interface ValidationSuccess {
  ok: true;
  data: NarrativeResponse;
}

export interface ValidationFailure {
  ok: false;
  error: 'parse_error' | 'hallucinated_ride';
  details: string;
  /** IDs that were in the narrative but not in the solver output. */
  invalidIds?: string[];
}

export type ValidationResult = ValidationSuccess | ValidationFailure;

/**
 * Validates a narrative response against the Zod schema AND cross-validates
 * that every planItemId references an actual item from the solver output.
 *
 * @param response - Raw parsed JSON from Claude's response
 * @param solverPlanItemIds - Set of valid planItemIds from the solver output
 */
export function validateNarrative(
  response: unknown,
  solverPlanItemIds: Set<string>,
): ValidationResult {
  const parseResult = NarrativeResponseSchema.safeParse(response);

  if (!parseResult.success) {
    return {
      ok: false,
      error: 'parse_error',
      details: parseResult.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
    };
  }

  // Cross-validate: every planItemId in the narrative must exist in solver output
  const narrativeIds: string[] = [];
  for (const day of parseResult.data.days) {
    for (const item of day.items) {
      narrativeIds.push(item.planItemId);
    }
  }

  const invalidIds = narrativeIds.filter((id) => !solverPlanItemIds.has(id));
  if (invalidIds.length > 0) {
    return {
      ok: false,
      error: 'hallucinated_ride',
      details: `Narrative references ${invalidIds.length} planItemId(s) not in solver output: ${invalidIds.join(', ')}`,
      invalidIds,
    };
  }

  return { ok: true, data: parseResult.data };
}
