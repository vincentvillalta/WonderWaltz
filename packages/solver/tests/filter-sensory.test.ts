import { describe, it, expect } from 'vitest';
import { sensoryOk, filterAttractionsForParty } from '../src/filter.js';
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

// ─── sensoryOk predicate ─────────────────────────────────────────────────────

describe('sensoryOk', () => {
  const cases: Array<{
    name: string;
    attraction: Partial<CatalogAttraction>;
    guest: Partial<SolverGuest>;
    expected: boolean;
  }> = [
    {
      name: 'no sensory needs — always passes',
      attraction: { tags: ['thrill', 'dark', 'roller-coaster'] },
      guest: { sensory: 'none' },
      expected: true,
    },
    {
      name: 'high-sensory guest + thrill ride with dark/fast tags — fails',
      attraction: { tags: ['thrill', 'indoor', 'dark', 'roller-coaster'] },
      guest: { sensory: 'high' },
      expected: false,
    },
    {
      name: 'high-sensory guest + gentle family ride — passes',
      attraction: { tags: ['family', 'toddler-friendly', 'indoor', 'slow'] },
      guest: { sensory: 'high' },
      expected: true,
    },
    {
      name: 'high-sensory guest + ride with loud tag only — fails',
      attraction: { tags: ['family', 'indoor', 'loud'] },
      guest: { sensory: 'high' },
      expected: false,
    },
    {
      name: 'high-sensory guest + ride with drop tag — fails',
      attraction: { tags: ['thrill', 'indoor', 'drop', 'dark'] },
      guest: { sensory: 'high' },
      expected: false,
    },
    {
      name: 'low-sensory guest + mild slow ride — passes',
      attraction: { tags: ['family', 'toddler-friendly', 'indoor', 'slow'] },
      guest: { sensory: 'low' },
      expected: true,
    },
    {
      name: 'low-sensory guest + ride with dark tag — fails (low tolerates minimal stimuli only)',
      attraction: { tags: ['family', 'indoor', 'dark'] },
      guest: { sensory: 'low' },
      expected: false,
    },
    {
      name: 'low-sensory guest + outdoor boat ride — passes',
      attraction: { tags: ['family', 'outdoor', 'boat'] },
      guest: { sensory: 'low' },
      expected: true,
    },
    {
      name: 'low-sensory guest + thrill ride — fails',
      attraction: { tags: ['thrill', 'outdoor', 'roller-coaster'] },
      guest: { sensory: 'low' },
      expected: false,
    },
  ];

  it.each(cases)('$name', ({ attraction, guest, expected }) => {
    expect(sensoryOk(makeAttraction(attraction), makeGuest(guest))).toBe(expected);
  });
});

// ─── filterAttractionsForParty (sensory dimension) ───────────────────────────

describe('filterAttractionsForParty — sensory filtering', () => {
  const thrillRide = makeAttraction({
    id: 'a-thrill',
    name: 'Thrill Ride',
    tags: ['thrill', 'dark', 'roller-coaster'],
  });
  const gentleRide = makeAttraction({
    id: 'a-gentle',
    name: 'Gentle Ride',
    tags: ['family', 'toddler-friendly', 'indoor', 'slow'],
  });

  it('high-sensory guest filters out thrill ride', () => {
    const guests = [
      makeGuest({ id: 'g-sensory', sensory: 'high' }),
      makeGuest({ id: 'g-none', sensory: 'none' }),
    ];
    const result = filterAttractionsForParty([thrillRide, gentleRide], guests);
    expect(result.map((a) => a.id)).toEqual(['a-gentle']);
  });

  it('low-sensory guest keeps only toddler-friendly/slow rides', () => {
    const guests = [makeGuest({ sensory: 'low' })];
    const result = filterAttractionsForParty([thrillRide, gentleRide], guests);
    expect(result.map((a) => a.id)).toEqual(['a-gentle']);
  });

  it('no sensory needs — all rides pass', () => {
    const guests = [makeGuest({ sensory: 'none' })];
    const result = filterAttractionsForParty([thrillRide, gentleRide], guests);
    expect(result.map((a) => a.id)).toEqual(['a-thrill', 'a-gentle']);
  });
});
