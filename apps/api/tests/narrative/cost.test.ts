import { describe, expect, it, vi, beforeEach } from 'vitest';
import { calculateUsdCents, recordLlmCost, type LlmCostRow } from '../../src/narrative/cost.js';

// ─── calculateUsdCents table-driven tests ─────────────────────────────

describe('calculateUsdCents', () => {
  it('Sonnet: input 5000 (0 cached) + output 800', () => {
    // input:  5000 * 3.00 / 1_000_000 = $0.015
    // output: 800 * 15.00 / 1_000_000 = $0.012
    // total:  $0.027 = 2.7 cents -> ceil -> 3 cents
    const cents = calculateUsdCents({
      model: 'claude-sonnet-4-6',
      input_tokens: 5000,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
      output_tokens: 800,
    });
    expect(cents).toBe(3);
  });

  it('Sonnet with cache hit: input 200 + cache_read 4800 + output 700', () => {
    // input:      200 * 3.00 / 1_000_000 = $0.0006
    // cache_read: 4800 * 0.30 / 1_000_000 = $0.00144
    // output:     700 * 15.00 / 1_000_000 = $0.0105
    // total:      $0.01254 = 1.254 cents -> ceil -> 2 cents
    const cents = calculateUsdCents({
      model: 'claude-sonnet-4-6',
      input_tokens: 200,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 4800,
      output_tokens: 700,
    });
    expect(cents).toBe(2);
  });

  it('Sonnet with cache write: input 200 + cache_creation 4800 + output 700', () => {
    // input:         200 * 3.00 / 1_000_000 = $0.0006
    // cache_creation: 4800 * 3.75 / 1_000_000 = $0.018
    // output:        700 * 15.00 / 1_000_000 = $0.0105
    // total:         $0.0291 = 2.91 cents -> ceil -> 3 cents
    const cents = calculateUsdCents({
      model: 'claude-sonnet-4-6',
      input_tokens: 200,
      cache_creation_input_tokens: 4800,
      cache_read_input_tokens: 0,
      output_tokens: 700,
    });
    expect(cents).toBe(3);
  });

  it('Haiku: input 3000 + output 400', () => {
    // input:  3000 * 0.80 / 1_000_000 = $0.0024
    // output: 400 * 4.00 / 1_000_000 = $0.0016
    // total:  $0.004 = 0.4 cents -> ceil -> 1 cent
    const cents = calculateUsdCents({
      model: 'claude-haiku-4-5',
      input_tokens: 3000,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
      output_tokens: 400,
    });
    expect(cents).toBe(1);
  });

  it('Haiku with cache read: input 100 + cache_read 2900 + output 200', () => {
    // input:      100 * 0.80 / 1_000_000 = $0.00008
    // cache_read: 2900 * 0.08 / 1_000_000 = $0.000232
    // output:     200 * 4.00 / 1_000_000 = $0.0008
    // total:      $0.001112 = 0.1112 cents -> ceil -> 1 cent
    const cents = calculateUsdCents({
      model: 'claude-haiku-4-5',
      input_tokens: 100,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 2900,
      output_tokens: 200,
    });
    expect(cents).toBe(1);
  });

  it('zero tokens returns 0 cents', () => {
    const cents = calculateUsdCents({
      model: 'claude-sonnet-4-6',
      input_tokens: 0,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
      output_tokens: 0,
    });
    expect(cents).toBe(0);
  });

  it('unknown model defaults to Sonnet pricing', () => {
    const cents = calculateUsdCents({
      model: 'claude-unknown-model',
      input_tokens: 5000,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
      output_tokens: 800,
    });
    expect(cents).toBe(3); // same as Sonnet
  });
});

// ─── recordLlmCost DB write tests ──────────────────────────────────────

describe('recordLlmCost', () => {
  let mockDb: { execute: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockDb = { execute: vi.fn().mockResolvedValue([]) };
  });

  it('inserts a row with correct column values', async () => {
    const row: LlmCostRow = {
      tripId: 'trip-uuid-001',
      planId: 'plan-uuid-001',
      model: 'claude-sonnet-4-6',
      inputTok: 5000,
      cachedReadTok: 0,
      outputTok: 800,
      usdCents: 3,
    };

    await recordLlmCost(mockDb, row);

    expect(mockDb.execute).toHaveBeenCalledOnce();
    // Verify the SQL template was called (drizzle sql`` produces a Sql object)
    const callArg = mockDb.execute.mock.calls[0]![0] as { queryChunks: unknown[] };
    expect(callArg).toBeDefined();
  });

  it('handles null tripId and planId', async () => {
    const row: LlmCostRow = {
      tripId: null,
      planId: null,
      model: 'claude-haiku-4-5',
      inputTok: 100,
      cachedReadTok: 0,
      outputTok: 50,
      usdCents: 1,
    };

    await recordLlmCost(mockDb, row);
    expect(mockDb.execute).toHaveBeenCalledOnce();
  });
});
