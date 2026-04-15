/**
 * Zod schema for packages/content/wdw/attractions.yaml.
 *
 * Phase 3 (plan 03-01) added three solver-facing fields to every attraction:
 *   - baseline_wait_minutes: int 1–180. Used as the wait-cost fallback when
 *     the forecaster reports `confidence: 'low'` (the default for the first
 *     ~4 weeks after t=0 = 2026-04-15).
 *   - lightning_lane_type: 'multi_pass' | 'single_pass' | 'none'. Drives the
 *     solver's LL-allocation decision (SOLV-04, SOLV-10).
 *   - is_headliner: bool. Top-tier rides per park; used as a tie-breaker for
 *     LL allocation and for free-tier locked-day headlines.
 *
 * The remaining fields mirror the pre-existing YAML shape, kept loose
 * (.passthrough()) where feasible so this validator never blocks legitimate
 * additions in future plans.
 */
import { z } from 'zod';

export const LightningLaneTypeSchema = z.enum(['multi_pass', 'single_pass', 'none']);

export const AttractionSchema = z.object({
  id: z.string().min(1),
  park_id: z.string().min(1),
  name: z.string().min(1),
  queue_times_id: z.number().int().nullable().optional(),
  themeparks_wiki_id: z.string().nullable().optional(),
  height_req_cm: z.number().int().positive().nullable().optional(),
  attraction_type: z.string().min(1),
  tags: z.array(z.string()).default([]),
  latitude: z.number().optional(),
  longitude: z.number().optional(),

  // Phase 3 additions (plan 03-01 task 2)
  baseline_wait_minutes: z.number().int().min(1).max(180),
  lightning_lane_type: LightningLaneTypeSchema,
  is_headliner: z.boolean(),
});

export type Attraction = z.infer<typeof AttractionSchema>;

export const AttractionsFileSchema = z.object({
  content_version: z.string().optional(),
  attractions: z.array(AttractionSchema),
});

export type AttractionsFile = z.infer<typeof AttractionsFileSchema>;
