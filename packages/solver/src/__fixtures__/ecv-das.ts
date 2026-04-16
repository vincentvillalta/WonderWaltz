/**
 * Fixture 5: ECV guest with DAS flag.
 * 2 days (MK, AK). ECV + DAS enabled.
 * Fairy tier.
 * Pinned dates: 2026-06-22 to 2026-06-23.
 */

import type { SolverInput } from '../types.js';
import { buildCatalog, adultGuest } from './shared.js';

export const ecvDas = {
  name: 'ECV guest with DAS flag',
  input: {
    trip: {
      id: 'fixture-5-ecv-das',
      userId: 'user-fixture-5',
      startDate: '2026-06-22',
      endDate: '2026-06-23',
      partySize: 2,
      budgetTier: 'fairy',
      hasDas: true,
      lodgingType: 'value',
    },
    guests: [adultGuest('g1', { mobility: 'ecv', hasDas: true }), adultGuest('g2')],
    preferences: {
      budgetTier: 'fairy',
      mustDoAttractionIds: [
        'mk-pirates',
        'mk-its-a-small-world',
        'ak-navi-river',
        'ak-kilimanjaro',
      ],
      preferredShows: ['mk-happily-ever-after'],
      tableServiceReservations: [],
    },
    dateStart: '2026-06-22',
    dateEnd: '2026-06-23',
    catalog: buildCatalog(['mk', 'ak']),
    forecasts: { buckets: [] },
    weather: {
      days: [
        {
          date: '2026-06-22',
          highF: 88,
          lowF: 74,
          precipitationProbability: 0.2,
          summary: 'Partly cloudy',
        },
        {
          date: '2026-06-23',
          highF: 85,
          lowF: 70,
          precipitationProbability: 0.1,
          summary: 'Clear skies',
        },
      ],
    },
    crowdCalendar: { entries: [] },
  } satisfies SolverInput,
};
