/**
 * Fixture 6: 5-day Royal Treatment trip.
 * All 4 parks + 1 repeat day (MK again). Royal tier, Deluxe Villa lodging.
 * 2 adults + 2 kids.
 * Pinned dates: 2026-06-24 to 2026-06-28.
 *
 * This is the performance benchmark fixture: solve() must complete in < 2s.
 */

import type { SolverInput } from '../types.js';
import { buildCatalog, adultGuest, childGuest } from './shared.js';

export const fiveDayRoyal = {
  name: '5-day Royal Treatment trip',
  input: {
    trip: {
      id: 'fixture-6-royal',
      userId: 'user-fixture-6',
      startDate: '2026-06-24',
      endDate: '2026-06-28',
      partySize: 4,
      budgetTier: 'royal',
      hasDas: false,
      lodgingType: 'deluxe_villa',
    },
    guests: [
      adultGuest('g1'),
      adultGuest('g2'),
      childGuest('g3', '7-9', { heightInches: 50 }),
      childGuest('g4', '10-13', { heightInches: 56 }),
    ],
    preferences: {
      budgetTier: 'royal',
      mustDoAttractionIds: [
        'mk-space-mountain',
        'mk-seven-dwarfs',
        'epcot-guardians',
        'dhs-rise-resistance',
        'ak-flight-passage',
      ],
      preferredShows: ['mk-happily-ever-after', 'epcot-harmonious', 'dhs-fantasmic'],
      tableServiceReservations: [
        {
          venueName: 'Be Our Guest Restaurant',
          attractionRefId: 'mk-be-our-guest',
          startTime: '2026-06-24T18:00:00',
          endTime: '2026-06-24T19:00:00',
        },
      ],
    },
    dateStart: '2026-06-24',
    dateEnd: '2026-06-28',
    catalog: buildCatalog(),
    forecasts: { buckets: [] },
    weather: {
      days: [
        {
          date: '2026-06-24',
          highF: 90,
          lowF: 74,
          precipitationProbability: 0.2,
          summary: 'Partly cloudy',
        },
        {
          date: '2026-06-25',
          highF: 91,
          lowF: 75,
          precipitationProbability: 0.3,
          summary: 'Afternoon storms',
        },
        {
          date: '2026-06-26',
          highF: 88,
          lowF: 72,
          precipitationProbability: 0.1,
          summary: 'Mostly sunny',
        },
        {
          date: '2026-06-27',
          highF: 87,
          lowF: 71,
          precipitationProbability: 0.15,
          summary: 'Clear skies',
        },
        {
          date: '2026-06-28',
          highF: 92,
          lowF: 76,
          precipitationProbability: 0.25,
          summary: 'Hot and humid',
        },
      ],
    },
    crowdCalendar: { entries: [] },
  } satisfies SolverInput,
};
