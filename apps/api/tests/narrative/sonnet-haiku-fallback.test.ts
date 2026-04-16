import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createAnthropicMock, type AnthropicMock, type MockMessage } from '../anthropic-mock.js';
import {
  NarrativeService,
  SONNET_MODEL_ID,
  HAIKU_MODEL_ID,
  BudgetExhaustedError,
  type NarrativeInput,
} from '../../src/narrative/narrative.service.js';
import type { AnthropicLike } from '../../src/narrative/anthropic.client.js';
import type { CircuitBreakerService } from '../../src/plan-generation/circuit-breaker.service.js';

// ─── Helpers ─────────────────────────────────────────────────────────

function loadFixtureText(name: string): string {
  const path = resolve(__dirname, '..', 'fixtures', name);
  const raw = readFileSync(path, 'utf-8');
  const fixture = JSON.parse(raw) as { content: Array<{ text: string }> };
  return fixture.content[0]!.text;
}

const PLAN_ITEM_MAP: Record<string, string> = {
  '{{PLAN_ITEM_0_0}}': 'plan-item-0-0',
  '{{PLAN_ITEM_0_1}}': 'plan-item-0-1',
  '{{PLAN_ITEM_0_2}}': 'plan-item-0-2',
  '{{PLAN_ITEM_1_0}}': 'plan-item-1-0',
  '{{PLAN_ITEM_1_1}}': 'plan-item-1-1',
};

function substituteIds(text: string): string {
  let result = text;
  for (const [placeholder, id] of Object.entries(PLAN_ITEM_MAP)) {
    result = result.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), id);
  }
  return result;
}

const BASE_USAGE: MockMessage['usage'] = {
  input_tokens: 200,
  output_tokens: 650,
  cache_creation_input_tokens: 5000,
  cache_read_input_tokens: 0,
};

function makeMockResponse(model: string, text: string, usage: MockMessage['usage']): MockMessage {
  return {
    id: 'msg_test',
    type: 'message',
    role: 'assistant',
    model,
    content: [{ type: 'text', text }],
    stop_reason: 'end_turn',
    stop_sequence: null,
    usage,
  };
}

function makeInput(): NarrativeInput {
  return {
    tripId: 'trip-test-001',
    guests: [{ ageBracket: '3-6' }],
    days: [
      {
        dayIndex: 0,
        park: 'Magic Kingdom',
        date: '2026-06-15',
        items: [
          {
            planItemId: 'plan-item-0-0',
            attractionId: 'wdw-mk-seven-dwarfs',
            attractionName: 'Seven Dwarfs Mine Train',
            scheduledStart: '09:00',
            scheduledEnd: '09:30',
          },
          {
            planItemId: 'plan-item-0-1',
            attractionId: 'wdw-mk-space-mountain',
            attractionName: 'Space Mountain',
            scheduledStart: '09:45',
            scheduledEnd: '10:15',
          },
          {
            planItemId: 'plan-item-0-2',
            attractionId: 'wdw-mk-big-thunder',
            attractionName: 'Big Thunder Mountain Railroad',
            scheduledStart: '10:30',
            scheduledEnd: '11:00',
          },
        ],
      },
      {
        dayIndex: 1,
        park: 'EPCOT',
        date: '2026-06-16',
        items: [
          {
            planItemId: 'plan-item-1-0',
            attractionId: 'wdw-ep-guardians',
            attractionName: 'Guardians of the Galaxy: Cosmic Rewind',
            scheduledStart: '09:00',
            scheduledEnd: '09:30',
          },
          {
            planItemId: 'plan-item-1-1',
            attractionId: 'wdw-ep-test-track',
            attractionName: 'Test Track',
            scheduledStart: '11:00',
            scheduledEnd: '11:30',
          },
        ],
      },
    ],
    budgetTier: 'fairy',
  };
}

/** Mock DB that records execute calls */
function createMockDb() {
  return { execute: vi.fn().mockResolvedValue([]) };
}

/** Creates a mock CircuitBreakerService with customizable checkBudget result */
function createMockCircuitBreaker(overrides?: Partial<CircuitBreakerService>) {
  return {
    checkBudget: vi.fn().mockResolvedValue({
      allowed: true,
      spentCents: 10,
      budgetCents: 50,
    }),
    recordIncident: vi.fn().mockResolvedValue(undefined),
    buildBudgetExhaustedResponse: vi.fn().mockReturnValue({
      error: 'trip_budget_exhausted' as const,
      spent_cents: 55,
      budget_cents: 50,
      resetOptions: [{ type: 'top_up' as const, sku: 'trip_topup_050', usd_cents: 50 }],
    }),
    ...overrides,
  };
}

describe('NarrativeService Sonnet-to-Haiku fallback (LLM-07 integration)', () => {
  let mock: AnthropicMock;
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    mock = createAnthropicMock();
    mockDb = createMockDb();
  });

  it('happy path: allowed + no swap -> Sonnet used', async () => {
    const cb = createMockCircuitBreaker();
    const service = new NarrativeService(
      mock as unknown as AnthropicLike,
      mockDb,
      cb as unknown as CircuitBreakerService,
    );

    const validText = substituteIds(loadFixtureText('narrative-response.json'));
    mock.messages.create = (params) => {
      mock.calls.push(params);
      return Promise.resolve(makeMockResponse(params.model, validText, BASE_USAGE));
    };

    const result = await service.generate(makeInput(), SONNET_MODEL_ID, {
      tripId: 'trip-test-001',
      planId: 'plan-001',
    });

    expect(result.narrativeAvailable).toBe(true);
    expect(mock.calls[0]!.model).toBe(SONNET_MODEL_ID);
    expect(cb.recordIncident).not.toHaveBeenCalled();
  });

  it('swap: allowed + swapTo haiku -> Anthropic called with Haiku, incident recorded', async () => {
    const cb = createMockCircuitBreaker({
      checkBudget: vi.fn().mockResolvedValue({
        allowed: true,
        swapTo: 'haiku',
        spentCents: 42,
        budgetCents: 50,
      }),
    });
    const service = new NarrativeService(
      mock as unknown as AnthropicLike,
      mockDb,
      cb as unknown as CircuitBreakerService,
    );

    const validText = substituteIds(loadFixtureText('narrative-response.json'));
    mock.messages.create = (params) => {
      mock.calls.push(params);
      return Promise.resolve(makeMockResponse(params.model, validText, BASE_USAGE));
    };

    const result = await service.generate(makeInput(), SONNET_MODEL_ID, {
      tripId: 'trip-test-001',
      planId: 'plan-001',
    });

    expect(result.narrativeAvailable).toBe(true);
    // Model should be swapped to Haiku
    expect(mock.calls[0]!.model).toBe(HAIKU_MODEL_ID);
    // Incident recorded
    expect(cb.recordIncident).toHaveBeenCalledWith(
      expect.objectContaining({
        tripId: 'trip-test-001',
        event: 'sonnet_to_haiku_swap',
        model: HAIKU_MODEL_ID,
      }),
    );
  });

  it('over-budget: allowed=false -> throws BudgetExhaustedError, Anthropic NOT called', async () => {
    const cb = createMockCircuitBreaker({
      checkBudget: vi.fn().mockResolvedValue({
        allowed: false,
        reason: 'trip_budget_exhausted',
        spentCents: 55,
        budgetCents: 50,
      }),
    });
    const service = new NarrativeService(
      mock as unknown as AnthropicLike,
      mockDb,
      cb as unknown as CircuitBreakerService,
    );

    mock.messages.create = (params) => {
      mock.calls.push(params);
      return Promise.resolve(makeMockResponse(params.model, '{}', BASE_USAGE));
    };

    await expect(
      service.generate(makeInput(), SONNET_MODEL_ID, {
        tripId: 'trip-test-001',
        planId: 'plan-001',
      }),
    ).rejects.toThrow(BudgetExhaustedError);

    // Anthropic mock should NOT have been called
    expect(mock.calls).toHaveLength(0);
    // Incident recorded
    expect(cb.recordIncident).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'budget_exhausted',
      }),
    );
  });

  it('swap + Haiku Zod failure twice -> narrativeAvailable:false, incident recorded', async () => {
    const cb = createMockCircuitBreaker({
      checkBudget: vi.fn().mockResolvedValue({
        allowed: true,
        swapTo: 'haiku',
        spentCents: 42,
        budgetCents: 50,
      }),
    });
    const service = new NarrativeService(
      mock as unknown as AnthropicLike,
      mockDb,
      cb as unknown as CircuitBreakerService,
    );

    // Both attempts return invalid JSON
    mock.messages.create = (params) => {
      mock.calls.push(params);
      return Promise.resolve(makeMockResponse(params.model, '{"invalid": true}', BASE_USAGE));
    };

    const result = await service.generate(makeInput(), SONNET_MODEL_ID, {
      tripId: 'trip-test-001',
      planId: 'plan-001',
    });

    expect(result.narrativeAvailable).toBe(false);
    // Both calls used Haiku
    expect(mock.calls[0]!.model).toBe(HAIKU_MODEL_ID);
    expect(mock.calls[1]!.model).toBe(HAIKU_MODEL_ID);
  });

  it('without circuit breaker injected -> generate works normally (no budget check)', async () => {
    const service = new NarrativeService(mock as unknown as AnthropicLike, mockDb);

    const validText = substituteIds(loadFixtureText('narrative-response.json'));
    mock.messages.create = (params) => {
      mock.calls.push(params);
      return Promise.resolve(makeMockResponse(params.model, validText, BASE_USAGE));
    };

    const result = await service.generate(makeInput());
    expect(result.narrativeAvailable).toBe(true);
    expect(mock.calls[0]!.model).toBe(SONNET_MODEL_ID);
  });
});
