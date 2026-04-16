import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createAnthropicMock, type AnthropicMock, type MockMessage } from '../anthropic-mock.js';
import {
  NarrativeService,
  SONNET_MODEL_ID,
  HAIKU_MODEL_ID,
  type NarrativeInput,
} from '../../src/narrative/narrative.service.js';
import type { AnthropicLike } from '../../src/narrative/anthropic.client.js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

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

describe('Model ID pinning contract (LLM-03)', () => {
  describe('exported constants', () => {
    it('SONNET_MODEL_ID equals claude-sonnet-4-6', () => {
      expect(SONNET_MODEL_ID).toBe('claude-sonnet-4-6');
    });

    it('HAIKU_MODEL_ID equals claude-haiku-4-5', () => {
      expect(HAIKU_MODEL_ID).toBe('claude-haiku-4-5');
    });
  });

  describe('generate() uses Sonnet by default', () => {
    let mock: AnthropicMock;
    let service: NarrativeService;

    beforeEach(() => {
      mock = createAnthropicMock();
      const mockDb = { execute: vi.fn().mockResolvedValue([]) };
      service = new NarrativeService(mock as unknown as AnthropicLike, mockDb);
    });

    it('passes SONNET_MODEL_ID to Anthropic SDK', async () => {
      const validText = substituteIds(loadFixtureText('narrative-response.json'));
      mock.messages.create = (params) => {
        mock.calls.push(params);
        return Promise.resolve(makeMockResponse(params.model, validText, BASE_USAGE));
      };

      await service.generate(makeInput());
      expect(mock.calls[0]!.model).toBe('claude-sonnet-4-6');
    });
  });

  describe('generateRethinkIntro() uses Haiku', () => {
    let mock: AnthropicMock;
    let service: NarrativeService;

    beforeEach(() => {
      mock = createAnthropicMock();
      const mockDb = { execute: vi.fn().mockResolvedValue([]) };
      service = new NarrativeService(mock as unknown as AnthropicLike, mockDb);
    });

    it('passes HAIKU_MODEL_ID to Anthropic SDK', async () => {
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

      await service.generateRethinkIntro({
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

      expect(mock.calls[0]!.model).toBe('claude-haiku-4-5');
    });
  });
});
