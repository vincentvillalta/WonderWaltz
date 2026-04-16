import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { validateNarrative } from '../../src/narrative/schema.js';

/**
 * Loads a fixture and parses the narrative JSON from the content[0].text field,
 * substituting planItemId placeholders with concrete IDs from a solver output map.
 */
function loadFixtureNarrative(fixtureName: string, planItemMap?: Record<string, string>): unknown {
  const fixturePath = resolve(__dirname, '..', 'fixtures', fixtureName);
  const raw = readFileSync(fixturePath, 'utf-8');
  const fixture = JSON.parse(raw) as { content: Array<{ text: string }> };
  let text = fixture.content[0]!.text;

  if (planItemMap) {
    for (const [placeholder, id] of Object.entries(planItemMap)) {
      text = text.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), id);
    }
  }

  return JSON.parse(text);
}

/** Simulates solver output plan item IDs for the 2-day fixture. */
const SOLVER_PLAN_ITEM_IDS = new Set([
  'plan-item-0-0',
  'plan-item-0-1',
  'plan-item-0-2',
  'plan-item-1-0',
  'plan-item-1-1',
]);

const PLAN_ITEM_MAP: Record<string, string> = {
  '{{PLAN_ITEM_0_0}}': 'plan-item-0-0',
  '{{PLAN_ITEM_0_1}}': 'plan-item-0-1',
  '{{PLAN_ITEM_0_2}}': 'plan-item-0-2',
  '{{PLAN_ITEM_1_0}}': 'plan-item-1-0',
  '{{PLAN_ITEM_1_1}}': 'plan-item-1-1',
};

describe('ride-ID contract validation (LLM-04)', () => {
  it('valid fixture with solver IDs passes subset check', () => {
    const narrative = loadFixtureNarrative('narrative-response.json', PLAN_ITEM_MAP);
    const result = validateNarrative(narrative, SOLVER_PLAN_ITEM_IDS);
    expect(result.ok).toBe(true);
  });

  it('invalid-ride fixture fails with hallucinated_ride error', () => {
    const narrative = loadFixtureNarrative('narrative-response.invalid-ride.json');
    const result = validateNarrative(narrative, SOLVER_PLAN_ITEM_IDS);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('hallucinated_ride');
      expect(result.invalidIds).toContain('00000000-dead-beef-0000-000000000042');
    }
  });

  it('narrative with extra unknown ID fails', () => {
    const narrative = loadFixtureNarrative('narrative-response.json', {
      ...PLAN_ITEM_MAP,
      '{{PLAN_ITEM_0_0}}': 'unknown-item-id', // override one to be invalid
    });
    const result = validateNarrative(narrative, SOLVER_PLAN_ITEM_IDS);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('hallucinated_ride');
      expect(result.invalidIds).toContain('unknown-item-id');
    }
  });

  it('empty narrative (no days) passes subset check trivially', () => {
    const narrative = { days: [], packingDelta: [], budgetHacks: [] };
    const result = validateNarrative(narrative, SOLVER_PLAN_ITEM_IDS);
    expect(result.ok).toBe(true);
  });
});
