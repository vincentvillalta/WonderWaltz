import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { ANTHROPIC_CLIENT_TOKEN, type AnthropicLike } from './anthropic.client.js';
import { buildCachedPrefix, buildDynamicPrompt, buildMessagesPayload } from './prompt.js';
import {
  validateNarrative,
  RethinkIntroSchema,
  type NarrativeResponse,
  type ValidationResult,
} from './schema.js';
import { calculateUsdCents, recordLlmCost } from './cost.js';
import { DB_TOKEN } from '../ingestion/queue-times.service.js';

/**
 * NarrativeService — Claude-powered narrative generation for trip plans.
 *
 * Pipeline: build cached prefix + dynamic suffix -> call Anthropic ->
 * parse JSON -> Zod validate -> cross-validate ride IDs -> retry once
 * on failure -> persist with narrative_available:false on 2nd failure.
 *
 * The types here are the load-bearing contract; downstream plans (03-16
 * plan-generation processor) depend on these interfaces.
 */

// ─── Input/output types (preserved from 03-02 scaffold) ─────────────

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

export interface AnthropicUsage {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens: number;
  cache_read_input_tokens: number;
}

export interface GenerateResult {
  narrative?: NarrativeResponse | undefined;
  narrativeAvailable: boolean;
  usage: AnthropicUsage;
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

// ─── Usage aggregation helper ────────────────────────────────────────

function sumUsage(a: AnthropicUsage, b: AnthropicUsage): AnthropicUsage {
  return {
    input_tokens: a.input_tokens + b.input_tokens,
    output_tokens: a.output_tokens + b.output_tokens,
    cache_creation_input_tokens: a.cache_creation_input_tokens + b.cache_creation_input_tokens,
    cache_read_input_tokens: a.cache_read_input_tokens + b.cache_read_input_tokens,
  };
}

function zeroUsage(): AnthropicUsage {
  return {
    input_tokens: 0,
    output_tokens: 0,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0,
  };
}

/** Minimal Drizzle-compatible interface for raw SQL execution */
interface DbExecutable {
  execute(query: unknown): Promise<unknown>;
}

/** Context for cost tracking — tripId + planId for the llm_costs row */
export interface CostContext {
  tripId: string;
  planId: string;
}

@Injectable()
export class NarrativeService {
  private readonly logger = new Logger(NarrativeService.name);

  constructor(
    @Inject(ANTHROPIC_CLIENT_TOKEN) private readonly client: AnthropicLike,
    @Optional() @Inject(DB_TOKEN) private readonly db?: DbExecutable,
  ) {}

  /**
   * Generates the full plan narrative using Sonnet (default).
   *
   * Pipeline:
   * 1. Build payload (cached prefix + dynamic suffix)
   * 2. Call Anthropic SDK
   * 3. Parse response.content[0].text as JSON
   * 4. Run validateNarrative against solver plan item IDs
   * 5. On success: return { narrative, narrativeAvailable: true, usage }
   * 6. On failure: retry ONCE with corrective prompt
   * 7. On 2nd failure: return { narrativeAvailable: false, usage }
   */
  async generate(
    input: NarrativeInput,
    model: string = 'claude-sonnet-4-6',
    costContext?: CostContext,
  ): Promise<GenerateResult> {
    const cachedPrefix = buildCachedPrefix();
    const dynamicPrompt = buildDynamicPrompt(input);

    // Collect all plan item IDs from solver output for cross-validation
    const solverPlanItemIds = new Set<string>();
    for (const day of input.days) {
      for (const item of day.items) {
        solverPlanItemIds.add(item.planItemId);
      }
    }

    let totalUsage = zeroUsage();

    // ─── First attempt ───────────────────────────────────────────
    const payload = buildMessagesPayload({
      model,
      cachedPrefix,
      dynamicPrompt,
    });

    const response = await this.client.messages.create(payload);
    const responseUsage = response.usage as AnthropicUsage;
    totalUsage = sumUsage(totalUsage, responseUsage);

    await this.writeCostRow(model, responseUsage, costContext);

    const firstResult = this.parseAndValidate(response, solverPlanItemIds);
    if (firstResult.ok) {
      return {
        narrative: firstResult.data,
        narrativeAvailable: true,
        usage: totalUsage,
      };
    }

    // ─── Retry once with corrective prompt ───────────────────────
    this.logger.warn(
      `Narrative validation failed (attempt 1): ${firstResult.error} — ${firstResult.details}`,
    );

    const retryPayload = buildMessagesPayload({
      model,
      cachedPrefix,
      dynamicPrompt,
      systemSuffix:
        `Your previous response failed validation: ${firstResult.details}. ` +
        `Please retry and ensure your output matches the required JSON schema exactly. ` +
        `Only reference planItemIds from the solver plan provided.`,
    });

    const retryResponse = await this.client.messages.create(retryPayload);
    const retryUsage = retryResponse.usage as AnthropicUsage;
    totalUsage = sumUsage(totalUsage, retryUsage);

    await this.writeCostRow(model, retryUsage, costContext);

    const secondResult = this.parseAndValidate(retryResponse, solverPlanItemIds);
    if (secondResult.ok) {
      return {
        narrative: secondResult.data,
        narrativeAvailable: true,
        usage: totalUsage,
      };
    }

    // ─── Second failure: graceful degradation ────────────────────
    this.logger.warn(
      `Narrative validation failed (attempt 2): ${secondResult.error} — ${secondResult.details}. ` +
        `Persisting plan with narrative_available: false.`,
    );

    return {
      narrative: undefined,
      narrativeAvailable: false,
      usage: totalUsage,
    };
  }

  /**
   * Generates ONLY the per-day intro for "Rethink my day" (PLAN-04).
   * Uses Haiku model. Per-item tips are preserved from the initial
   * generation; this call does not re-write them.
   */
  async generateRethinkIntro(
    input: RethinkIntroInput,
    costContext?: CostContext,
  ): Promise<{ intro: string; modelUsed: 'claude-haiku-4-5' }> {
    const cachedPrefix = buildCachedPrefix();

    const completedList = input.completedItemIds.join(', ') || 'none';
    const remainingList = input.remainingItems
      .map((item) => `${item.attractionName} (${item.planItemId})`)
      .join(', ');

    const dynamicPrompt = [
      `<RETHINK_CONTEXT>`,
      `Trip: ${input.tripId}`,
      `Day: ${input.dayIndex}`,
      `Completed items: ${completedList}`,
      `Remaining items: ${remainingList}`,
      `</RETHINK_CONTEXT>`,
      ``,
      `Write a new intro paragraph (20-800 chars) for this day,`,
      `acknowledging what has been completed and setting up what`,
      `remains. Do NOT re-write per-item tips.`,
      ``,
      `Return valid JSON: { "intro": "your paragraph here" }`,
    ].join('\n');

    const payload = buildMessagesPayload({
      model: 'claude-haiku-4-5',
      cachedPrefix,
      dynamicPrompt,
    });

    const response = await this.client.messages.create(payload);
    const responseUsage = response.usage as AnthropicUsage;

    await this.writeCostRow('claude-haiku-4-5', responseUsage, costContext);

    const text = this.extractText(response);
    const parsed = JSON.parse(text) as unknown;
    const validated = RethinkIntroSchema.parse(parsed);

    return {
      intro: validated.intro,
      modelUsed: 'claude-haiku-4-5',
    };
  }

  // ─── Private helpers ───────────────────────────────────────────

  private parseAndValidate(
    response: { content: Array<{ type: string; text?: string }> },
    solverPlanItemIds: Set<string>,
  ): ValidationResult {
    const text = this.extractText(response);

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return {
        ok: false,
        error: 'parse_error',
        details: 'Response is not valid JSON',
      };
    }

    return validateNarrative(parsed, solverPlanItemIds);
  }

  /**
   * Writes a cost row to llm_costs after each Anthropic API call.
   * Best-effort: errors are logged but never thrown (cost tracking
   * must never crash the narrative pipeline).
   */
  private async writeCostRow(
    model: string,
    usage: AnthropicUsage,
    costContext?: CostContext,
  ): Promise<void> {
    if (!this.db) return;

    try {
      const usdCents = calculateUsdCents({
        model,
        input_tokens: usage.input_tokens,
        cache_creation_input_tokens: usage.cache_creation_input_tokens,
        cache_read_input_tokens: usage.cache_read_input_tokens,
        output_tokens: usage.output_tokens,
      });

      await recordLlmCost(this.db, {
        tripId: costContext?.tripId ?? null,
        planId: costContext?.planId ?? null,
        model,
        inputTok: usage.input_tokens,
        cachedReadTok: usage.cache_read_input_tokens,
        outputTok: usage.output_tokens,
        usdCents,
      });
    } catch (err) {
      this.logger.error('Failed to record LLM cost row', err);
    }
  }

  private extractText(response: { content: Array<{ type: string; text?: string }> }): string {
    const textBlock = response.content.find(
      (b): b is { type: string; text: string } => b.type === 'text' && typeof b.text === 'string',
    );
    if (!textBlock) {
      throw new Error('Anthropic response has no text content block');
    }
    return textBlock.text;
  }
}
