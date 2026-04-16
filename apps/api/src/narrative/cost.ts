import { sql } from 'drizzle-orm';

/**
 * LLM cost calculation helpers for LLM-05 cost telemetry.
 *
 * Rate card pinned as of 2026-04-15 (USD per 1M tokens):
 *
 * | Model                | Input  | Cache Write | Cache Read | Output |
 * |----------------------|--------|-------------|------------|--------|
 * | claude-sonnet-4-6    | $3.00  | $3.75       | $0.30      | $15.00 |
 * | claude-haiku-4-5     | $0.80  | $1.00       | $0.08      | $4.00  |
 */

// ─── Rate card (frozen) ─────────────────────────────────────────────

interface ModelRates {
  input: number; // USD per 1M tokens
  cacheWrite: number;
  cacheRead: number;
  output: number;
}

const RATE_CARD: Record<string, ModelRates> = Object.freeze({
  'claude-sonnet-4-6': Object.freeze({
    input: 3.0,
    cacheWrite: 3.75,
    cacheRead: 0.3,
    output: 15.0,
  }),
  'claude-haiku-4-5': Object.freeze({ input: 0.8, cacheWrite: 1.0, cacheRead: 0.08, output: 4.0 }),
});

const DEFAULT_RATES: ModelRates = RATE_CARD['claude-sonnet-4-6']!;

// ─── Cost calculation ───────────────────────────────────────────────

export interface CostInput {
  model: string;
  input_tokens: number;
  cache_creation_input_tokens: number;
  cache_read_input_tokens: number;
  output_tokens: number;
}

/**
 * Calculates the cost in USD cents (integer, rounded up) for a single
 * Anthropic API call based on token counts and model pricing.
 *
 * Returns 0 for zero-token calls.
 */
export function calculateUsdCents(usage: CostInput): number {
  const rates = RATE_CARD[usage.model] ?? DEFAULT_RATES;

  const dollars =
    (usage.input_tokens * rates.input) / 1_000_000 +
    (usage.cache_creation_input_tokens * rates.cacheWrite) / 1_000_000 +
    (usage.cache_read_input_tokens * rates.cacheRead) / 1_000_000 +
    (usage.output_tokens * rates.output) / 1_000_000;

  const cents = dollars * 100;
  return Math.ceil(cents);
}

// ─── DB write ───────────────────────────────────────────────────────

export interface LlmCostRow {
  tripId: string | null;
  planId: string | null;
  model: string;
  inputTok: number;
  cachedReadTok: number;
  outputTok: number;
  usdCents: number;
}

/** Minimal Drizzle-compatible interface for raw SQL execution */
interface DbExecutable {
  execute(query: unknown): Promise<unknown>;
}

/**
 * Inserts a single row into the `llm_costs` table.
 *
 * Uses raw SQL via drizzle-orm sql template tag. The caller is responsible
 * for computing `usdCents` via `calculateUsdCents()` before calling this.
 */
export async function recordLlmCost(db: DbExecutable, row: LlmCostRow): Promise<void> {
  await db.execute(sql`
    INSERT INTO llm_costs (trip_id, plan_id, model, input_tok, cached_read_tok, output_tok, usd_cents)
    VALUES (${row.tripId}, ${row.planId}, ${row.model}, ${row.inputTok}, ${row.cachedReadTok}, ${row.outputTok}, ${row.usdCents})
  `);
}
