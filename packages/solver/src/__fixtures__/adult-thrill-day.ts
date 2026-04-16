/**
 * Fixture 3: Adult thrill-day (no kids, headliner priority).
 * 1 day, DHS. 2 adults, Royal tier.
 * Must-do: Rise of the Resistance, TRON, Rock 'n' Roller Coaster.
 * Pinned date: 2026-06-19.
 */

import type { SolverInput } from '../types.js';
import { buildCatalog, adultGuest } from './shared.js';

export const adultThrillDay = {
  name: 'Adult thrill-day (no kids, headliner priority)',
  input: {
    trip: {
      id: 'fixture-3-thrill',
      userId: 'user-fixture-3',
      startDate: '2026-06-19',
      endDate: '2026-06-19',
      partySize: 2,
      budgetTier: 'royal',
      hasDas: false,
      lodgingType: 'deluxe',
    },
    guests: [adultGuest('g1'), adultGuest('g2')],
    preferences: {
      budgetTier: 'royal',
      mustDoAttractionIds: ['dhs-rise-resistance', 'dhs-tron', 'dhs-rock-n-roller-coaster'],
      preferredShows: ['dhs-fantasmic'],
      tableServiceReservations: [],
    },
    dateStart: '2026-06-19',
    dateEnd: '2026-06-19',
    catalog: buildCatalog(['dhs']),
    forecasts: { buckets: [] },
    weather: {
      days: [
        {
          date: '2026-06-19',
          highF: 92,
          lowF: 76,
          precipitationProbability: 0.15,
          summary: 'Hot and sunny',
        },
      ],
    },
    crowdCalendar: { entries: [] },
  } satisfies SolverInput,
};
