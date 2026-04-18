import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createAnthropicMock, type AnthropicMock, type MockMessage } from '../anthropic-mock.js';
import { NarrativeService, type NarrativeInput } from '../../src/narrative/narrative.service.js';
import type { AnthropicLike } from '../../src/narrative/anthropic.client.js';

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

const BASE_USAGE: MockMessage['usage'] = {
  input_tokens: 200,
  output_tokens: 650,
  cache_creation_input_tokens: 5000,
  cache_read_input_tokens: 0,
};

const HIT_USAGE: MockMessage['usage'] = {
  input_tokens: 200,
  output_tokens: 300,
  cache_creation_input_tokens: 0,
  cache_read_input_tokens: 4800,
};

/** Mock DB that records execute calls for cost row verification */
function createMockDb() {
  return { execute: vi.fn().mockResolvedValue([]) };
}

/**
 * Count the number of execute() calls whose SQL contains `needle`. The mock's
 * execute() receives a drizzle sql template object; we flatten it to a string
 * and look for the substring. Used to filter llm_costs / narrative_day_cache
 * calls apart from each other.
 */
function countSqlMatches(mockDb: ReturnType<typeof createMockDb>, needle: string): number {
  const calls = mockDb.execute.mock.calls as Array<[unknown]>;
  let count = 0;
  for (const [q] of calls) {
    const text = JSON.stringify(q);
    if (text.includes(needle)) count++;
  }
  return count;
}

describe('NarrativeService.generate — full pipeline', () => {
  let mock: AnthropicMock;
  let mockDb: ReturnType<typeof createMockDb>;
  let service: NarrativeService;

  beforeEach(() => {
    mock = createAnthropicMock();
    mockDb = createMockDb();
    service = new NarrativeService(mock as unknown as AnthropicLike, mockDb);
  });

  it('happy path: valid fixture returns narrativeAvailable:true', async () => {
    const validText = substituteIds(loadFixtureText('narrative-response.json'));
    mock.messages.create = (params) => {
      mock.calls.push(params);
      return Promise.resolve(makeMockResponse(params.model, validText, BASE_USAGE));
    };

    const result = await service.generate(makeInput());
    expect(result.narrativeAvailable).toBe(true);
    expect(result.narrative).toBeDefined();
    expect(result.narrative!.days).toHaveLength(2);
    expect(result.usage.input_tokens).toBe(200);
    expect(result.usage.output_tokens).toBe(650);
    expect(mock.calls).toHaveLength(1);
  });

  it('zod failure once then success: retries and succeeds', async () => {
    const invalidText = '{"invalid": "json structure"}';
    const validText = substituteIds(loadFixtureText('narrative-response.json'));
    let callCount = 0;

    mock.messages.create = (params) => {
      mock.calls.push(params);
      callCount++;
      const text = callCount === 1 ? invalidText : validText;
      return Promise.resolve(makeMockResponse(params.model, text, HIT_USAGE));
    };

    const result = await service.generate(makeInput());
    expect(result.narrativeAvailable).toBe(true);
    expect(result.narrative).toBeDefined();
    expect(mock.calls).toHaveLength(2);
    // Usage sums across both attempts
    expect(result.usage.input_tokens).toBe(400);
    expect(result.usage.output_tokens).toBe(600);
  });

  it('zod failure twice: persists with narrativeAvailable:false', async () => {
    const invalidText = '{"invalid": "json structure"}';
    const failUsage: MockMessage['usage'] = { ...HIT_USAGE, output_tokens: 100 };

    mock.messages.create = (params) => {
      mock.calls.push(params);
      return Promise.resolve(makeMockResponse(params.model, invalidText, failUsage));
    };

    const result = await service.generate(makeInput());
    expect(result.narrativeAvailable).toBe(false);
    expect(result.narrative).toBeUndefined();
    expect(mock.calls).toHaveLength(2);
    expect(result.usage.input_tokens).toBe(400);
    expect(result.usage.output_tokens).toBe(200);
  });

  it('hallucinated ride: rejected by contract, retried, still fails', async () => {
    const invalidRideText = loadFixtureText('narrative-response.invalid-ride.json');
    const rideUsage: MockMessage['usage'] = {
      input_tokens: 180,
      output_tokens: 90,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 4800,
    };

    mock.messages.create = (params) => {
      mock.calls.push(params);
      return Promise.resolve(makeMockResponse(params.model, invalidRideText, rideUsage));
    };

    const result = await service.generate(makeInput());
    expect(result.narrativeAvailable).toBe(false);
    expect(result.narrative).toBeUndefined();
    expect(mock.calls).toHaveLength(2);
  });

  it('model passthrough: generate passes model to SDK', async () => {
    const validText = substituteIds(loadFixtureText('narrative-response.json'));
    mock.messages.create = (params) => {
      mock.calls.push(params);
      return Promise.resolve(makeMockResponse(params.model, validText, BASE_USAGE));
    };

    await service.generate(makeInput(), 'claude-haiku-4-5');
    expect(mock.calls[0]!.model).toBe('claude-haiku-4-5');
  });

  it('retry prompt includes validation error details', async () => {
    const invalidText = '{"invalid": "json structure"}';
    const validText = substituteIds(loadFixtureText('narrative-response.json'));
    let callCount = 0;

    mock.messages.create = (params) => {
      mock.calls.push(params);
      callCount++;
      const text = callCount === 1 ? invalidText : validText;
      return Promise.resolve(makeMockResponse(params.model, text, HIT_USAGE));
    };

    await service.generate(makeInput());

    // Second call should have system suffix with error info
    const secondCall = mock.calls[1]!;
    const system = secondCall.system;
    expect(Array.isArray(system)).toBe(true);
    if (Array.isArray(system)) {
      const texts = system.map((b) => b.text).join(' ');
      expect(texts).toContain('previous response failed validation');
    }
  });
});

describe('NarrativeService cost tracking', () => {
  let mock: AnthropicMock;
  let mockDb: ReturnType<typeof createMockDb>;
  let service: NarrativeService;

  beforeEach(() => {
    mock = createAnthropicMock();
    mockDb = createMockDb();
    service = new NarrativeService(mock as unknown as AnthropicLike, mockDb);
  });

  it('writes one cost row on successful generate (single attempt)', async () => {
    const validText = substituteIds(loadFixtureText('narrative-response.json'));
    mock.messages.create = (params) => {
      mock.calls.push(params);
      return Promise.resolve(makeMockResponse(params.model, validText, BASE_USAGE));
    };

    await service.generate(makeInput(), 'claude-sonnet-4-6', {
      tripId: 'trip-uuid-001',
      planId: 'plan-uuid-001',
    });

    // One Anthropic call = one llm_costs row (narrative_day_cache DB traffic is separate).
    expect(countSqlMatches(mockDb, 'llm_costs')).toBe(1);
  });

  it('writes two cost rows on retry (both attempts)', async () => {
    const invalidText = '{"invalid": "json structure"}';
    const validText = substituteIds(loadFixtureText('narrative-response.json'));
    let callCount = 0;

    mock.messages.create = (params) => {
      mock.calls.push(params);
      callCount++;
      const text = callCount === 1 ? invalidText : validText;
      return Promise.resolve(makeMockResponse(params.model, text, HIT_USAGE));
    };

    await service.generate(makeInput(), 'claude-sonnet-4-6', {
      tripId: 'trip-uuid-001',
      planId: 'plan-uuid-001',
    });

    // Two Anthropic calls = two llm_costs rows (narrative_day_cache is separate).
    expect(countSqlMatches(mockDb, 'llm_costs')).toBe(2);
  });

  it('writes cost row for rethink intro', async () => {
    const introJson = JSON.stringify({
      intro:
        'Since you have already conquered Space Mountain, the rest of your afternoon shifts to a relaxed Frontierland loop.',
    });
    const introUsage: MockMessage['usage'] = {
      input_tokens: 100,
      output_tokens: 50,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 4800,
    };

    mock.messages.create = (params) => {
      mock.calls.push(params);
      return Promise.resolve(makeMockResponse(params.model, introJson, introUsage));
    };

    await service.generateRethinkIntro(
      {
        tripId: 'trip-test-001',
        dayIndex: 0,
        completedItemIds: ['plan-item-0-0'],
        remainingItems: [
          {
            planItemId: 'plan-item-0-1',
            attractionId: 'wdw-mk-space-mountain',
            attractionName: 'Space Mountain',
            scheduledStart: '09:45',
            scheduledEnd: '10:15',
          },
        ],
      },
      { tripId: 'trip-uuid-001', planId: 'plan-uuid-001' },
    );

    expect(mockDb.execute).toHaveBeenCalledTimes(1);
  });

  it('does not crash if DB write fails', async () => {
    mockDb.execute.mockRejectedValue(new Error('DB down'));
    const validText = substituteIds(loadFixtureText('narrative-response.json'));
    mock.messages.create = (params) => {
      mock.calls.push(params);
      return Promise.resolve(makeMockResponse(params.model, validText, BASE_USAGE));
    };

    // Should not throw even though DB is down
    const result = await service.generate(makeInput(), 'claude-sonnet-4-6', {
      tripId: 'trip-uuid-001',
      planId: 'plan-uuid-001',
    });
    expect(result.narrativeAvailable).toBe(true);
  });

  it('works without db injected (no cost tracking)', async () => {
    const noCostService = new NarrativeService(mock as unknown as AnthropicLike);
    const validText = substituteIds(loadFixtureText('narrative-response.json'));
    mock.messages.create = (params) => {
      mock.calls.push(params);
      return Promise.resolve(makeMockResponse(params.model, validText, BASE_USAGE));
    };

    const result = await noCostService.generate(makeInput());
    expect(result.narrativeAvailable).toBe(true);
    // No db = no execute calls
    expect(mockDb.execute).not.toHaveBeenCalled();
  });
});

describe('NarrativeService.generateRethinkIntro', () => {
  let mock: AnthropicMock;
  let mockDb: ReturnType<typeof createMockDb>;
  let service: NarrativeService;

  beforeEach(() => {
    mock = createAnthropicMock();
    mockDb = createMockDb();
    service = new NarrativeService(mock as unknown as AnthropicLike, mockDb);
  });

  it('returns intro string using haiku model', async () => {
    const introJson = JSON.stringify({
      intro:
        'Since you have already conquered Space Mountain, the rest of your afternoon shifts to a relaxed Frontierland loop.',
    });
    const introUsage: MockMessage['usage'] = {
      input_tokens: 100,
      output_tokens: 50,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 4800,
    };

    mock.messages.create = (params) => {
      mock.calls.push(params);
      return Promise.resolve(makeMockResponse(params.model, introJson, introUsage));
    };

    const result = await service.generateRethinkIntro({
      tripId: 'trip-test-001',
      dayIndex: 0,
      completedItemIds: ['plan-item-0-0'],
      remainingItems: [
        {
          planItemId: 'plan-item-0-1',
          attractionId: 'wdw-mk-space-mountain',
          attractionName: 'Space Mountain',
          scheduledStart: '09:45',
          scheduledEnd: '10:15',
        },
      ],
    });

    expect(result.intro).toContain('Space Mountain');
    expect(result.modelUsed).toBe('claude-haiku-4-5');
    expect(mock.calls[0]!.model).toBe('claude-haiku-4-5');
  });
});
