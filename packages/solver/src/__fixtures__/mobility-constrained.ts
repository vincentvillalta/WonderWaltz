/**
 * Fixture 4: Mobility-constrained multi-day.
 * 2 days (MK, EPCOT). Party includes reduced-mobility guest.
 * Walking budget hard cap via reduced mobility filtering.
 * Fairy tier.
 * Pinned dates: 2026-06-20 to 2026-06-21.
 */

import type { SolverInput } from '../types.js';
import { buildCatalog, adultGuest } from './shared.js';

export const mobilityConstrained = {
  name: 'Mobility-constrained multi-day (walking budget hard cap)',
  input: {
    trip: {
      id: 'fixture-4-mobility',
      userId: 'user-fixture-4',
      startDate: '2026-06-20',
      endDate: '2026-06-21',
      partySize: 3,
      budgetTier: 'fairy',
      hasDas: false,
      lodgingType: 'moderate',
    },
    guests: [adultGuest('g1'), adultGuest('g2'), adultGuest('g3', { mobility: 'reduced' })],
    preferences: {
      budgetTier: 'fairy',
      mustDoAttractionIds: [
        'mk-pirates',
        'mk-haunted-mansion',
        'epcot-frozen',
        'epcot-spaceship-earth',
      ],
      preferredShows: ['mk-happily-ever-after'],
      tableServiceReservations: [],
    },
    dateStart: '2026-06-20',
    dateEnd: '2026-06-21',
    catalog: buildCatalog(['mk', 'epcot']),
    forecasts: { buckets: [] },
    weather: {
      days: [
        {
          date: '2026-06-20',
          highF: 86,
          lowF: 71,
          precipitationProbability: 0.25,
          summary: 'Warm with clouds',
        },
        {
          date: '2026-06-21',
          highF: 89,
          lowF: 73,
          precipitationProbability: 0.35,
          summary: 'Scattered storms',
        },
      ],
    },
    crowdCalendar: { entries: [] },
  } satisfies SolverInput,
};
