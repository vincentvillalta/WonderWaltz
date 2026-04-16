/**
 * Fixture 1: Single-day Magic Kingdom with toddler (0-2 bracket).
 * Pixie tier, 3 must-do low-intensity attractions.
 * Pinned date: 2026-06-15.
 */

import type { SolverInput } from '../types.js';
import { buildCatalog, adultGuest, childGuest } from './shared.js';

export const singleDayMkToddler = {
  name: 'Single-day MK with toddler (0-2)',
  input: {
    trip: {
      id: 'fixture-1-toddler',
      userId: 'user-fixture-1',
      startDate: '2026-06-15',
      endDate: '2026-06-15',
      partySize: 3,
      budgetTier: 'pixie',
      hasDas: false,
      lodgingType: 'value',
    },
    guests: [adultGuest('g1'), adultGuest('g2'), childGuest('g3', '0-2')],
    preferences: {
      budgetTier: 'pixie',
      mustDoAttractionIds: ['mk-its-a-small-world', 'mk-dumbo', 'mk-pirates'],
      preferredShows: ['mk-happily-ever-after'],
      tableServiceReservations: [],
    },
    dateStart: '2026-06-15',
    dateEnd: '2026-06-15',
    catalog: buildCatalog(['mk']),
    forecasts: { buckets: [] },
    weather: {
      days: [
        {
          date: '2026-06-15',
          highF: 90,
          lowF: 75,
          precipitationProbability: 0.3,
          summary: 'Hot and humid',
        },
      ],
    },
    crowdCalendar: { entries: [] },
  } satisfies SolverInput,
};
