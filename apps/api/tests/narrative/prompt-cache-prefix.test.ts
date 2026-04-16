import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  buildCachedPrefix,
  buildDynamicPrompt,
  buildMessagesPayload,
} from '../../src/narrative/prompt.js';

describe('buildCachedPrefix — byte-stability (LLM-02)', () => {
  it('returns identical bytes across 100 invocations (SHA-256 invariant)', () => {
    const hashes = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const prefix = buildCachedPrefix();
      const hash = createHash('sha256').update(prefix).digest('hex');
      hashes.add(hash);
    }
    expect(hashes.size).toBe(1);
  });

  it('length is between 15K-40K chars (bounded catalog+brand)', () => {
    const prefix = buildCachedPrefix();
    expect(prefix.length).toBeGreaterThanOrEqual(15_000);
    expect(prefix.length).toBeLessThanOrEqual(40_000);
  });

  it('includes a known attraction name (Seven Dwarfs Mine Train)', () => {
    const prefix = buildCachedPrefix();
    expect(prefix).toContain('Seven Dwarfs Mine Train');
  });

  it('includes a known dining name (Be Our Guest Restaurant)', () => {
    const prefix = buildCachedPrefix();
    expect(prefix).toContain('Be Our Guest Restaurant');
  });

  it('includes a known resort name (Pop Century Resort)', () => {
    const prefix = buildCachedPrefix();
    expect(prefix).toContain('Pop Century Resort');
  });

  it('includes BRAND voice content (warm expert tone)', () => {
    const prefix = buildCachedPrefix();
    expect(prefix).toContain('Warm expert');
  });

  it('includes tone rules about no Disney voice mimicry', () => {
    const prefix = buildCachedPrefix();
    expect(prefix).toContain('pixie dust');
  });

  it('does NOT include any dynamic fields (no trip IDs, no guest data)', () => {
    const prefix = buildCachedPrefix();
    // These patterns should never appear in the static prefix
    expect(prefix).not.toMatch(/tripId/i);
    expect(prefix).not.toMatch(/guestId/i);
    expect(prefix).not.toMatch(/ageBracket/i);
  });
});

describe('buildDynamicPrompt', () => {
  const sampleInput = {
    tripId: 'trip-123',
    guests: [{ ageBracket: '3-6' as const, preferences: ['thrill'] }],
    days: [
      {
        dayIndex: 0,
        park: 'Magic Kingdom',
        date: '2026-06-15',
        items: [
          {
            planItemId: 'item-001',
            attractionId: 'wdw-mk-space-mountain',
            attractionName: 'Space Mountain',
            scheduledStart: '09:00',
            scheduledEnd: '09:30',
          },
        ],
      },
    ],
    budgetTier: 'fairy' as const,
  };

  it('includes trip context and guest data', () => {
    const prompt = buildDynamicPrompt(sampleInput);
    expect(prompt).toContain('trip-123');
    expect(prompt).toContain('3-6');
  });

  it('includes solver output items', () => {
    const prompt = buildDynamicPrompt(sampleInput);
    expect(prompt).toContain('Space Mountain');
    expect(prompt).toContain('item-001');
  });
});

describe('buildMessagesPayload', () => {
  it('places cache_control ephemeral on the system block', () => {
    const prefix = buildCachedPrefix();
    const payload = buildMessagesPayload({
      model: 'claude-sonnet-4-6',
      cachedPrefix: prefix,
      dynamicPrompt: 'Generate a narrative for this trip.',
    });

    expect(payload.model).toBe('claude-sonnet-4-6');
    expect(Array.isArray(payload.system)).toBe(true);

    // Find the block with cache_control
    const systemBlocks = payload.system as Array<{
      type: string;
      text: string;
      cache_control?: { type: string };
    }>;
    const cachedBlock = systemBlocks.find((b) => b.cache_control?.type === 'ephemeral');
    expect(cachedBlock).toBeDefined();
    expect(cachedBlock!.text).toBe(prefix);
  });

  it('includes dynamic prompt as the user message', () => {
    const payload = buildMessagesPayload({
      model: 'claude-sonnet-4-6',
      cachedPrefix: 'prefix',
      dynamicPrompt: 'my dynamic prompt',
    });

    expect(payload.messages).toEqual([{ role: 'user', content: 'my dynamic prompt' }]);
  });
});
