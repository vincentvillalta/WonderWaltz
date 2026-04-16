import { describe, it, expect } from 'vitest';
import { dietaryOk, filterDiningForParty } from '../src/filter.js';
import type { CatalogDining, SolverGuest } from '../src/types.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeDining(overrides: Partial<CatalogDining> = {}): CatalogDining {
  return {
    id: 'd-test',
    parkId: 'wdw-magic-kingdom',
    name: 'Test Restaurant',
    cuisineTags: ['american'],
    tableService: false,
    durationMinutes: 30,
    ...overrides,
  };
}

function makeGuest(overrides: Partial<SolverGuest> = {}): SolverGuest {
  return {
    id: 'g-test',
    ageBracket: '18+',
    mobility: 'none',
    sensory: 'none',
    dietary: [],
    ...overrides,
  };
}

// ─── dietaryOk predicate ─────────────────────────────────────────────────────

describe('dietaryOk', () => {
  const cases: Array<{
    name: string;
    dining: Partial<CatalogDining>;
    guests: Array<Partial<SolverGuest>>;
    expected: boolean;
  }> = [
    {
      name: 'dining supports vegetarian + gluten_free, guest needs vegetarian — passes',
      dining: { accommodates: ['vegetarian', 'gluten_free'] },
      guests: [{ dietary: ['vegetarian'] }],
      expected: true,
    },
    {
      name: 'dining supports vegetarian only, guest needs vegan — fails',
      dining: { accommodates: ['vegetarian'] },
      guests: [{ dietary: ['vegan'] }],
      expected: false,
    },
    {
      name: 'no dietary restrictions — all dining passes',
      dining: { accommodates: [] },
      guests: [{ dietary: [] }],
      expected: true,
    },
    {
      name: 'no dietary restrictions (undefined accommodates) — passes',
      dining: {},
      guests: [{ dietary: [] }],
      expected: true,
    },
    {
      name: 'guest needs gluten_free but dining has no accommodates — fails',
      dining: {},
      guests: [{ dietary: ['gluten_free'] }],
      expected: false,
    },
    {
      name: 'multiple guests with different needs — must support union',
      dining: { accommodates: ['vegetarian', 'gluten_free', 'nut_free'] },
      guests: [{ dietary: ['vegetarian'] }, { dietary: ['gluten_free', 'nut_free'] }],
      expected: true,
    },
    {
      name: 'multiple guests — one need unsupported — fails',
      dining: { accommodates: ['vegetarian', 'gluten_free'] },
      guests: [{ dietary: ['vegetarian'] }, { dietary: ['nut_free'] }],
      expected: false,
    },
    {
      name: 'empty guest list — passes (no needs)',
      dining: { accommodates: [] },
      guests: [],
      expected: true,
    },
    {
      name: 'dining supports everything guests need exactly',
      dining: { accommodates: ['vegan', 'nut_free'] },
      guests: [{ dietary: ['vegan', 'nut_free'] }],
      expected: true,
    },
  ];

  it.each(cases)('$name', ({ dining, guests, expected }) => {
    expect(
      dietaryOk(
        makeDining(dining),
        guests.map((g) => makeGuest(g)),
      ),
    ).toBe(expected);
  });
});

// ─── filterDiningForParty ────────────────────────────────────────────────────

describe('filterDiningForParty', () => {
  const veganFriendly = makeDining({
    id: 'd-vegan',
    name: 'Vegan Spot',
    accommodates: ['vegetarian', 'vegan', 'gluten_free'],
  });
  const basicDiner = makeDining({
    id: 'd-basic',
    name: 'Basic Diner',
    accommodates: ['vegetarian'],
  });
  const noAccommodations = makeDining({
    id: 'd-none',
    name: 'No Accommodations',
  });

  it('filters to only venues supporting all guest needs', () => {
    const guests = [makeGuest({ dietary: ['vegan'] }), makeGuest({ dietary: ['gluten_free'] })];
    const result = filterDiningForParty([veganFriendly, basicDiner, noAccommodations], guests);
    expect(result.map((d) => d.id)).toEqual(['d-vegan']);
  });

  it('no dietary needs — all dining passes', () => {
    const guests = [makeGuest({ dietary: [] })];
    const result = filterDiningForParty([veganFriendly, basicDiner, noAccommodations], guests);
    expect(result.map((d) => d.id)).toEqual(['d-vegan', 'd-basic', 'd-none']);
  });

  it('vegetarian need — two venues pass', () => {
    const guests = [makeGuest({ dietary: ['vegetarian'] })];
    const result = filterDiningForParty([veganFriendly, basicDiner, noAccommodations], guests);
    expect(result.map((d) => d.id)).toEqual(['d-vegan', 'd-basic']);
  });

  it('empty guest list — all dining passes', () => {
    const result = filterDiningForParty([veganFriendly, basicDiner, noAccommodations], []);
    expect(result.map((d) => d.id)).toEqual(['d-vegan', 'd-basic', 'd-none']);
  });
});
