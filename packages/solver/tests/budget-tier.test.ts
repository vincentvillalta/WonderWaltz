/**
 * SOLV-10: Budget tier rules constant table — table-driven tests.
 *
 * Verifies all three budget tiers (pixie, fairy, royal) encode correct
 * LL caps, rest frequency, dining tier, and rest block duration.
 */
import { describe, it, expect } from 'vitest';
import { BUDGET_TIER_RULES, type TierRules } from '../src/rules.js';
import type { BudgetTier } from '../src/types.js';

// ─── Shape / exhaustiveness ──────────────────────────────────────────────

describe('BUDGET_TIER_RULES shape', () => {
  it('covers all three budget tiers', () => {
    const tiers: BudgetTier[] = ['pixie', 'fairy', 'royal'];
    for (const t of tiers) {
      expect(BUDGET_TIER_RULES[t]).toBeDefined();
    }
  });

  it('has exactly three keys', () => {
    expect(Object.keys(BUDGET_TIER_RULES)).toHaveLength(3);
  });
});

// ─── Pixie Dust ──────────────────────────────────────────────────────────

describe('Pixie Dust tier', () => {
  const pixie = BUDGET_TIER_RULES.pixie;

  it('forbids LLMP (llmpCap === 0)', () => {
    expect(pixie.llmpCap).toBe(0);
  });

  it('forbids LLSP (llspCap === 0)', () => {
    expect(pixie.llspCap).toBe(0);
  });

  it('rest frequency is every 3 hours', () => {
    expect(pixie.restFrequencyHours).toBe(3);
  });

  it('dining tier is value', () => {
    expect(pixie.diningTier).toBe('value');
  });

  it('rest block duration is 60 minutes', () => {
    expect(pixie.restBlockDurationMinutes).toBe(60);
  });
});

// ─── Fairy Tale ──────────────────────────────────────────────────────────

describe('Fairy Tale tier', () => {
  const fairy = BUDGET_TIER_RULES.fairy;

  it('allows LLMP (llmpCap === 3)', () => {
    expect(fairy.llmpCap).toBe(3);
  });

  it('allows up to 1 LLSP', () => {
    expect(fairy.llspCap).toBe(1);
  });

  it('rest frequency is every 2 hours', () => {
    expect(fairy.restFrequencyHours).toBe(2);
  });

  it('dining tier is table_service', () => {
    expect(fairy.diningTier).toBe('table_service');
  });

  it('rest block duration is 60 minutes', () => {
    expect(fairy.restBlockDurationMinutes).toBe(60);
  });
});

// ─── Royal Treatment ─────────────────────────────────────────────────────

describe('Royal Treatment tier', () => {
  const royal = BUDGET_TIER_RULES.royal;

  it('allows LLMP (llmpCap === 3)', () => {
    expect(royal.llmpCap).toBe(3);
  });

  it('allows up to 2 LLSP', () => {
    expect(royal.llspCap).toBe(2);
  });

  it('rest frequency is every 2 hours', () => {
    expect(royal.restFrequencyHours).toBe(2);
  });

  it('allows signature dining', () => {
    expect(royal.diningTier).toBe('signature');
  });

  it('rest block duration is 120 minutes (resort mid-day break)', () => {
    expect(royal.restBlockDurationMinutes).toBe(120);
  });
});

// ─── Immutability ────────────────────────────────────────────────────────

describe('immutability', () => {
  it('BUDGET_TIER_RULES is frozen (top-level)', () => {
    expect(Object.isFrozen(BUDGET_TIER_RULES)).toBe(true);
  });

  it('each tier object is frozen', () => {
    for (const tier of Object.values(BUDGET_TIER_RULES)) {
      expect(Object.isFrozen(tier)).toBe(true);
    }
  });

  it('rejects mutation at runtime', () => {
    expect(() => {
      // @ts-expect-error — intentional mutation test
      (BUDGET_TIER_RULES as Record<string, TierRules>).pixie = {} as TierRules;
    }).toThrow();
  });
});

// ─── Table-driven cross-tier assertions ──────────────────────────────────

describe('cross-tier table-driven', () => {
  const cases: Array<{
    tier: BudgetTier;
    llmpCap: number;
    llspCap: number;
    restFrequencyHours: number;
    diningTier: string;
    restBlockDurationMinutes: number;
  }> = [
    {
      tier: 'pixie',
      llmpCap: 0,
      llspCap: 0,
      restFrequencyHours: 3,
      diningTier: 'value',
      restBlockDurationMinutes: 60,
    },
    {
      tier: 'fairy',
      llmpCap: 3,
      llspCap: 1,
      restFrequencyHours: 2,
      diningTier: 'table_service',
      restBlockDurationMinutes: 60,
    },
    {
      tier: 'royal',
      llmpCap: 3,
      llspCap: 2,
      restFrequencyHours: 2,
      diningTier: 'signature',
      restBlockDurationMinutes: 120,
    },
  ];

  it.each(cases)(
    '$tier tier has correct values',
    ({ tier, llmpCap, llspCap, restFrequencyHours, diningTier, restBlockDurationMinutes }) => {
      const rules = BUDGET_TIER_RULES[tier];
      expect(rules.llmpCap).toBe(llmpCap);
      expect(rules.llspCap).toBe(llspCap);
      expect(rules.restFrequencyHours).toBe(restFrequencyHours);
      expect(rules.diningTier).toBe(diningTier);
      expect(rules.restBlockDurationMinutes).toBe(restBlockDurationMinutes);
    },
  );
});
