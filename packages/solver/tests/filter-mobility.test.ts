import { describe, it, expect } from 'vitest';
import { mobilityOk, filterAttractionsForParty } from '../src/filter.js';
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

// ─── mobilityOk predicate ────────────────────────────────────────────────────

describe('mobilityOk', () => {
  const cases: Array<{
    name: string;
    attraction: Partial<CatalogAttraction>;
    guest: Partial<SolverGuest>;
    expected: boolean;
  }> = [
    {
      name: 'no mobility needs — always passes',
      attraction: { tags: ['thrill', 'roller-coaster'] },
      guest: { mobility: 'none' },
      expected: true,
    },
    {
      name: 'ECV guest + roller-coaster tag — fails (must transfer)',
      attraction: { tags: ['thrill', 'roller-coaster'] },
      guest: { mobility: 'ecv' },
      expected: false,
    },
    {
      name: 'ECV guest + family slow ride — passes',
      attraction: { tags: ['family', 'toddler-friendly', 'indoor', 'slow'] },
      guest: { mobility: 'ecv' },
      expected: true,
    },
    {
      name: 'ECV guest + boat ride — passes (boats are typically accessible)',
      attraction: { tags: ['family', 'indoor', 'boat'] },
      guest: { mobility: 'ecv' },
      expected: true,
    },
    {
      name: 'ECV guest + drop ride — fails',
      attraction: { tags: ['thrill', 'indoor', 'drop', 'dark'] },
      guest: { mobility: 'ecv' },
      expected: false,
    },
    {
      name: 'reduced mobility + roller-coaster — fails',
      attraction: { tags: ['thrill', 'outdoor', 'roller-coaster'] },
      guest: { mobility: 'reduced' },
      expected: false,
    },
    {
      name: 'reduced mobility + gentle indoor ride — passes',
      attraction: { tags: ['family', 'indoor', 'slow'] },
      guest: { mobility: 'reduced' },
      expected: true,
    },
    {
      name: 'reduced mobility + simulator — fails (requires transfer)',
      attraction: { tags: ['thrill', 'indoor', 'simulator'] },
      guest: { mobility: 'reduced' },
      expected: false,
    },
  ];

  it.each(cases)('$name', ({ attraction, guest, expected }) => {
    expect(mobilityOk(makeAttraction(attraction), makeGuest(guest))).toBe(expected);
  });
});

// ─── filterAttractionsForParty (mobility dimension) ──────────────────────────

describe('filterAttractionsForParty — mobility filtering', () => {
  const coaster = makeAttraction({
    id: 'a-coaster',
    name: 'Coaster',
    tags: ['thrill', 'roller-coaster'],
  });
  const gentleRide = makeAttraction({
    id: 'a-gentle',
    name: 'Gentle Ride',
    tags: ['family', 'indoor', 'slow'],
  });

  it('ECV guest filters out roller-coasters', () => {
    const guests = [
      makeGuest({ id: 'g-ecv', mobility: 'ecv' }),
      makeGuest({ id: 'g-able', mobility: 'none' }),
    ];
    const result = filterAttractionsForParty([coaster, gentleRide], guests);
    expect(result.map((a) => a.id)).toEqual(['a-gentle']);
  });

  it('all guests with no mobility needs — all attractions pass', () => {
    const guests = [makeGuest({ mobility: 'none' })];
    const result = filterAttractionsForParty([coaster, gentleRide], guests);
    expect(result.map((a) => a.id)).toEqual(['a-coaster', 'a-gentle']);
  });
});
