import { Inject, Injectable } from '@nestjs/common';
import { ANTHROPIC_CLIENT_TOKEN, type AnthropicLike } from './anthropic.client.js';

/**
 * Scaffold stub for LLM-01.
 *
 * The real implementation — prompt composition, cache_control breakpoints,
 * Zod validation of the narrative payload, retry-on-parse-failure, Haiku
 * fallback on budget exhaustion — all lands in plan 03-12. This file exists
 * so every downstream plan in Phase 3 can import `NarrativeService` and
 * wire it into its module graph without cycles.
 *
 * The types here are the load-bearing contract; internal shape may evolve
 * inside 03-12 without breaking the plan-generation module (03-16).
 */

export interface NarrativeInputItem {
  planItemId: string;
  attractionId: string;
  attractionName: string;
  scheduledStart: string;
  scheduledEnd: string;
}

export interface NarrativeInputDay {
  dayIndex: number;
  park: string;
  date: string;
  items: NarrativeInputItem[];
}

export interface NarrativeInput {
  tripId: string;
  guests: Array<{ ageBracket: string; preferences?: string[] }>;
  days: NarrativeInputDay[];
  budgetTier: 'pixie' | 'fairy' | 'royal';
}

export interface NarrativeDayItem {
  planItemId: string;
  tip: string;
}

export interface NarrativeDay {
  dayIndex: number;
  intro: string;
  items: NarrativeDayItem[];
}

export interface NarrativePackingDelta {
  item: string;
  reason: string;
}

export interface NarrativeResult {
  days: NarrativeDay[];
  packingDelta: NarrativePackingDelta[];
  budgetHacks: string[];
  /** Total input_tokens + output_tokens across every Claude call. */
  totalTokens: number;
  /** Cents spent on this generation, summed across miss/hit/write line items. */
  totalCostCents: number;
  /** Model pinned per LLM-03; `null` on the rethink-intro-only path. */
  modelUsed: 'claude-sonnet-4-6' | 'claude-haiku-4-5';
}

export interface RethinkIntroInput {
  tripId: string;
  dayIndex: number;
  completedItemIds: string[];
  remainingItems: NarrativeInputItem[];
}

@Injectable()
export class NarrativeService {
  constructor(@Inject(ANTHROPIC_CLIENT_TOKEN) private readonly client: AnthropicLike) {}

  /**
   * Generates the initial plan narrative using Sonnet.
   * Falls back to Haiku mid-generation if the $0.50 per-trip cap is
   * projected to trip (LLM-07).
   *
   * @throws Not-Implemented in 03-02; real implementation lands in 03-12.
   */
  generate(_input: NarrativeInput): Promise<NarrativeResult> {
    return Promise.reject(new Error('NarrativeService.generate — implemented in 03-12'));
  }

  /**
   * Generates ONLY the per-day intro for "Rethink my day" (PLAN-04). Uses
   * Haiku. Per-item tips are preserved from the initial generation; this
   * call does not re-write them.
   *
   * @throws Not-Implemented in 03-02; real implementation lands in 03-12.
   */
  generateRethinkIntro(
    _input: RethinkIntroInput,
  ): Promise<{ intro: string; modelUsed: 'claude-haiku-4-5' }> {
    return Promise.reject(
      new Error('NarrativeService.generateRethinkIntro — implemented in 03-12'),
    );
  }
}
