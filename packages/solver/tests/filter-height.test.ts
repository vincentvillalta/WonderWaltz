import { describe, it, expect } from 'vitest';
import { heightOk, filterAttractionsForParty, isGuestExempt } from '../src/filter.js';
import type { CatalogAttraction, SolverGuest } from '../src/types.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeAttraction(overrides: Partial<CatalogAttraction> = {}): CatalogAttraction {
  return {
    id: 'a-test',
    parkId: 'wdw-magic-kingdom',
    name: 'Test Ride',
    tags: ['family'],
    baselineWaitMinutes: 30,
    lightningLaneType: null,
    isHeadliner: false,
    durationMinutes: 10,
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

// ─── heightOk predicate ──────────────────────────────────────────────────────

describe('heightOk', () => {
  const cases: Array<{
    name: string;
    attraction: Partial<CatalogAttraction>;
    guest: Partial<SolverGuest>;
    expected: boolean;
  }> = [
    {
      name: 'no height requirement — always passes',
      attraction: {},
      guest: { heightInches: 36 },
      expected: true,
    },
    {
      name: 'guest tall enough — passes',
      attraction: { heightRequirementInches: 40 },
      guest: { heightInches: 48, ageBracket: '7-9' },
      expected: true,
    },
    {
      name: 'guest too short — fails',
      attraction: { heightRequirementInches: 40 },
      guest: { heightInches: 36, ageBracket: '3-6' },
      expected: false,
    },
    {
      name: 'guest exactly at requirement — passes',
      attraction: { heightRequirementInches: 44 },
      guest: { heightInches: 44, ageBracket: '7-9' },
      expected: true,
    },
    {
      name: 'adult without heightInches — passes (adults always clear)',
      attraction: { heightRequirementInches: 48 },
      guest: { ageBracket: '18+' },
      expected: true,
    },
    {
      name: 'child without heightInches and ride has requirement — fails conservatively',
      attraction: { heightRequirementInches: 40 },
      guest: { ageBracket: '3-6' },
      expected: false,
    },
    {
      name: 'child without heightInches and ride has no requirement — passes',
      attraction: {},
      guest: { ageBracket: '3-6' },
      expected: true,
    },
  ];

  it.each(cases)('$name', ({ attraction, guest, expected }) => {
    expect(heightOk(makeAttraction(attraction), makeGuest(guest))).toBe(expected);
  });
});

// ─── isGuestExempt ───────────────────────────────────────────────────────────

describe('isGuestExempt', () => {
  it('0-2 toddler is exempt', () => {
    expect(isGuestExempt(makeGuest({ ageBracket: '0-2' }))).toBe(true);
  });

  it('3-6 child is NOT exempt', () => {
    expect(isGuestExempt(makeGuest({ ageBracket: '3-6' }))).toBe(false);
  });

  it('18+ adult is NOT exempt', () => {
    expect(isGuestExempt(makeGuest({ ageBracket: '18+' }))).toBe(false);
  });
});

// ─── filterAttractionsForParty (height dimension) ────────────────────────────

describe('filterAttractionsForParty — height filtering', () => {
  const tallRide = makeAttraction({
    id: 'a-tall',
    heightRequirementInches: 40,
    name: 'Tall Ride',
  });
  const noReqRide = makeAttraction({
    id: 'a-noreq',
    name: 'No Req Ride',
  });

  it('toddler (0-2) does NOT gate the family', () => {
    const guests = [
      makeGuest({ id: 'g-adult', ageBracket: '18+', heightInches: 70 }),
      makeGuest({ id: 'g-toddler', ageBracket: '0-2', heightInches: 30 }),
    ];
    const result = filterAttractionsForParty([tallRide, noReqRide], guests);
    expect(result.map((a) => a.id)).toEqual(['a-tall', 'a-noreq']);
  });

  it('short child (3-6, 36in) gates tall ride but not no-req ride', () => {
    const guests = [
      makeGuest({ id: 'g-adult', ageBracket: '18+', heightInches: 70 }),
      makeGuest({ id: 'g-kid', ageBracket: '3-6', heightInches: 36 }),
    ];
    const result = filterAttractionsForParty([tallRide, noReqRide], guests);
    expect(result.map((a) => a.id)).toEqual(['a-noreq']);
  });

  it('tall child (7-9, 48in) does not gate tall ride', () => {
    const guests = [
      makeGuest({ id: 'g-adult', ageBracket: '18+', heightInches: 70 }),
      makeGuest({ id: 'g-kid', ageBracket: '7-9', heightInches: 48 }),
    ];
    const result = filterAttractionsForParty([tallRide, noReqRide], guests);
    expect(result.map((a) => a.id)).toEqual(['a-tall', 'a-noreq']);
  });

  it('empty guest list returns all attractions', () => {
    const result = filterAttractionsForParty([tallRide, noReqRide], []);
    expect(result).toHaveLength(2);
  });

  it('all guests exempt (only toddlers) returns all attractions', () => {
    const guests = [makeGuest({ id: 'g-baby', ageBracket: '0-2', heightInches: 28 })];
    const result = filterAttractionsForParty([tallRide, noReqRide], guests);
    expect(result).toHaveLength(2);
  });
});
