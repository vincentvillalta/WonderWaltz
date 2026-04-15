import type { SolverInput } from '../../src/types.js';

/**
 * A minimal, hand-rolled SolverInput used by hash + boundary tests.
 * Deliberately small — full snapshot fixtures live in tests/fixtures/trips/*
 * once 03-07..03-10 land.
 */
export function makeFixture(overrides: Partial<SolverInput> = {}): SolverInput {
  const base: SolverInput = {
    trip: {
      id: '11111111-1111-1111-1111-111111111111',
      userId: '22222222-2222-2222-2222-222222222222',
      startDate: '2026-06-01',
      endDate: '2026-06-03',
      partySize: 3,
      budgetTier: 'fairy',
      hasDas: false,
    },
    guests: [
      {
        id: 'g-1',
        ageBracket: '18+',
        mobility: 'none',
        sensory: 'none',
        dietary: [],
      },
      {
        id: 'g-2',
        ageBracket: '7-9',
        mobility: 'none',
        sensory: 'none',
        dietary: ['gluten_free'],
      },
    ],
    preferences: {
      budgetTier: 'fairy',
      mustDoAttractionIds: ['a-space-mountain', 'a-seven-dwarfs'],
      preferredShows: ['s-happily-ever-after'],
      tableServiceReservations: [],
    },
    dateStart: '2026-06-01',
    dateEnd: '2026-06-03',
    catalog: {
      attractions: [],
      dining: [],
      shows: [],
      walkingGraph: { edges: [] },
    },
    forecasts: { buckets: [] },
    weather: { days: [] },
    crowdCalendar: { entries: [] },
  };
  return { ...base, ...overrides };
}
