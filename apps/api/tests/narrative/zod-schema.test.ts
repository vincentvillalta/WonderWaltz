import { describe, expect, it } from 'vitest';
import { NarrativeResponseSchema } from '../../src/narrative/schema.js';

describe('NarrativeResponseSchema — table-driven validation', () => {
  const validFixture = {
    days: [
      {
        dayIndex: 0,
        intro:
          'Rope-drop Magic Kingdom and lean into the mountains while the park is fresh. Seven Dwarfs first then Space Mountain.',
        items: [
          {
            planItemId: 'item-001',
            tip: 'Be at the tapstile 30 minutes before official open for shortest standby.',
          },
        ],
      },
    ],
    packingDelta: [{ item: 'Sunscreen', reason: 'Orlando UV index runs 9-11 in April.' }],
    budgetHacks: ['Mobile-order lunch at Pecos Bill at 10:45.'],
  };

  it('valid fixture passes', () => {
    const result = NarrativeResponseSchema.safeParse(validFixture);
    expect(result.success).toBe(true);
  });

  it('empty days array is valid (edge case)', () => {
    const result = NarrativeResponseSchema.safeParse({
      days: [],
      packingDelta: [],
      budgetHacks: [],
    });
    expect(result.success).toBe(true);
  });

  it('missing intro field fails', () => {
    const bad = {
      days: [
        {
          dayIndex: 0,
          // intro missing
          items: [],
        },
      ],
      packingDelta: [],
      budgetHacks: [],
    };
    const result = NarrativeResponseSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it('intro too short (<50 chars) fails', () => {
    const bad = {
      days: [
        {
          dayIndex: 0,
          intro: 'Too short intro.',
          items: [],
        },
      ],
      packingDelta: [],
      budgetHacks: [],
    };
    const result = NarrativeResponseSchema.safeParse(bad);
    expect(result.success).toBe(false);
    if (!result.success) {
      const introError = result.error.issues.find((i) => i.path.includes('intro'));
      expect(introError).toBeDefined();
    }
  });

  it('intro too long (>800 chars) fails', () => {
    const bad = {
      days: [
        {
          dayIndex: 0,
          intro: 'A'.repeat(801),
          items: [],
        },
      ],
      packingDelta: [],
      budgetHacks: [],
    };
    const result = NarrativeResponseSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it('tip too short (<10 chars) fails', () => {
    const bad = {
      days: [
        {
          dayIndex: 0,
          intro:
            'Rope-drop Magic Kingdom and lean into the mountains while the park is fresh and cool.',
          items: [{ planItemId: 'item-001', tip: 'Short.' }],
        },
      ],
      packingDelta: [],
      budgetHacks: [],
    };
    const result = NarrativeResponseSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it('negative dayIndex fails', () => {
    const bad = {
      days: [
        {
          dayIndex: -1,
          intro:
            'Rope-drop Magic Kingdom and lean into the mountains while the park is fresh and cool.',
          items: [],
        },
      ],
      packingDelta: [],
      budgetHacks: [],
    };
    const result = NarrativeResponseSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it('non-integer dayIndex fails', () => {
    const bad = {
      days: [
        {
          dayIndex: 0.5,
          intro:
            'Rope-drop Magic Kingdom and lean into the mountains while the park is fresh and cool.',
          items: [],
        },
      ],
      packingDelta: [],
      budgetHacks: [],
    };
    const result = NarrativeResponseSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });
});
