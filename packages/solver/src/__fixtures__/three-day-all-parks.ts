/**
 * Fixture 2: 3-day all-parks family trip (mixed ages).
 * MK, EPCOT, DHS. Fairy tier. 2 adults + 2 kids (3-6, 7-9).
 * Pinned dates: 2026-06-16 to 2026-06-18.
 */

import type { SolverInput } from '../types.js';
import { buildCatalog, adultGuest, childGuest } from './shared.js';

export const threeDayAllParks = {
  name: '3-day all-parks family (mixed ages)',
  input: {
    trip: {
      id: 'fixture-2-family',
      userId: 'user-fixture-2',
      startDate: '2026-06-16',
      endDate: '2026-06-18',
      partySize: 4,
      budgetTier: 'fairy',
      hasDas: false,
      lodgingType: 'moderate',
    },
    guests: [
      adultGuest('g1'),
      adultGuest('g2'),
      childGuest('g3', '3-6', { heightInches: 40 }),
      childGuest('g4', '7-9', { heightInches: 50 }),
    ],
    preferences: {
      budgetTier: 'fairy',
      mustDoAttractionIds: ['mk-seven-dwarfs', 'mk-pirates', 'epcot-frozen', 'dhs-slinky-dog'],
      preferredShows: ['mk-happily-ever-after', 'dhs-fantasmic'],
      tableServiceReservations: [],
    },
    dateStart: '2026-06-16',
    dateEnd: '2026-06-18',
    catalog: buildCatalog(['mk', 'epcot', 'dhs']),
    forecasts: { buckets: [] },
    weather: {
      days: [
        {
          date: '2026-06-16',
          highF: 88,
          lowF: 73,
          precipitationProbability: 0.2,
          summary: 'Partly cloudy',
        },
        {
          date: '2026-06-17',
          highF: 91,
          lowF: 74,
          precipitationProbability: 0.4,
          summary: 'Afternoon storms',
        },
        {
          date: '2026-06-18',
          highF: 87,
          lowF: 72,
          precipitationProbability: 0.1,
          summary: 'Mostly sunny',
        },
      ],
    },
    crowdCalendar: { entries: [] },
  } satisfies SolverInput,
};
