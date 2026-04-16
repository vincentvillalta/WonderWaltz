import { describe, it, expect } from 'vitest';
import { insertMeals } from '../src/meals.js';
import type { PlanItem, TableServiceReservation, SolverGuest, BudgetTier } from '../src/types.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeItem(overrides: Partial<PlanItem> = {}): PlanItem {
  return {
    id: 'item-1',
    type: 'attraction',
    refId: 'a-test',
    name: 'Test Ride',
    startTime: '2026-06-01T09:00:00',
    endTime: '2026-06-01T09:30:00',
    ...overrides,
  };
}

function makeGuest(overrides: Partial<SolverGuest> = {}): SolverGuest {
  return {
    id: 'g-1',
    ageBracket: '18+',
    mobility: 'none',
    sensory: 'none',
    dietary: [],
    ...overrides,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('insertMeals', () => {
  it('table-service reservation at 13:00 inserts as dining item, removes conflicting attractions', () => {
    const items: PlanItem[] = [
      makeItem({ id: 'i1', startTime: '2026-06-01T09:00:00', endTime: '2026-06-01T09:30:00' }),
      makeItem({
        id: 'i2',
        startTime: '2026-06-01T12:30:00',
        endTime: '2026-06-01T13:15:00',
        refId: 'a-conflicting',
      }),
      makeItem({ id: 'i3', startTime: '2026-06-01T14:00:00', endTime: '2026-06-01T14:30:00' }),
    ];

    const reservations: TableServiceReservation[] = [
      {
        venueName: 'Be Our Guest',
        startTime: '2026-06-01T13:00:00',
        endTime: '2026-06-01T14:30:00',
      },
    ];

    const result = insertMeals({
      items,
      tableServiceReservations: reservations,
      guests: [makeGuest()],
      budgetTier: 'fairy',
    });

    // Should have the dining reservation.
    const diningItem = result.find((i) => i.type === 'dining' && i.name === 'Be Our Guest');
    expect(diningItem).toBeDefined();
    expect(diningItem!.startTime).toBe('2026-06-01T13:00:00');
    expect(diningItem!.endTime).toBe('2026-06-01T14:30:00');

    // Conflicting attraction at 12:30 should be removed (overlaps with TS reservation).
    expect(result.find((i) => i.refId === 'a-conflicting')).toBeUndefined();

    // Non-conflicting items should remain.
    expect(result.find((i) => i.id === 'i1')).toBeDefined();
  });

  it('quick-service lunch inserted in 60+ min gap between 11:00-13:30', () => {
    // Create items with a big gap around lunchtime.
    const items: PlanItem[] = [
      makeItem({ id: 'i1', startTime: '2026-06-01T09:00:00', endTime: '2026-06-01T09:30:00' }),
      makeItem({ id: 'i2', startTime: '2026-06-01T10:00:00', endTime: '2026-06-01T10:30:00' }),
      // Big gap from 10:30 to 13:00 (150 min).
      makeItem({ id: 'i3', startTime: '2026-06-01T13:00:00', endTime: '2026-06-01T13:30:00' }),
      makeItem({ id: 'i4', startTime: '2026-06-01T17:00:00', endTime: '2026-06-01T17:30:00' }),
    ];

    const result = insertMeals({
      items,
      tableServiceReservations: [],
      guests: [makeGuest()],
      budgetTier: 'fairy',
    });

    // Should have a QS lunch inserted.
    const qsLunch = result.find(
      (i) => i.type === 'dining' && i.notes === 'Mobile order recommended',
    );
    expect(qsLunch).toBeDefined();
    // Should be between 11:00 and 13:30.
    expect(qsLunch!.startTime >= '2026-06-01T11:00:00').toBe(true);
    expect(qsLunch!.startTime <= '2026-06-01T13:30:00').toBe(true);
  });

  it('no TS reservations + pixie budget tier → QS meals still inserted', () => {
    const items: PlanItem[] = [
      makeItem({ id: 'i1', startTime: '2026-06-01T09:00:00', endTime: '2026-06-01T10:00:00' }),
      // 2.5hr gap for lunch.
      makeItem({ id: 'i2', startTime: '2026-06-01T12:30:00', endTime: '2026-06-01T13:00:00' }),
      // 2hr gap for dinner.
      makeItem({ id: 'i3', startTime: '2026-06-01T15:00:00', endTime: '2026-06-01T15:30:00' }),
      makeItem({ id: 'i4', startTime: '2026-06-01T19:30:00', endTime: '2026-06-01T20:00:00' }),
    ];

    const result = insertMeals({
      items,
      tableServiceReservations: [],
      guests: [makeGuest()],
      budgetTier: 'pixie',
    });

    const meals = result.filter((i) => i.type === 'dining');
    // Should have at least one QS meal.
    expect(meals.length).toBeGreaterThanOrEqual(1);
  });

  it('result is sorted by startTime and has no overlaps', () => {
    const items: PlanItem[] = [
      makeItem({ id: 'i1', startTime: '2026-06-01T09:00:00', endTime: '2026-06-01T09:30:00' }),
      makeItem({ id: 'i2', startTime: '2026-06-01T14:00:00', endTime: '2026-06-01T14:30:00' }),
    ];

    const reservations: TableServiceReservation[] = [
      {
        venueName: 'Crystal Palace',
        startTime: '2026-06-01T12:00:00',
        endTime: '2026-06-01T13:30:00',
      },
    ];

    const result = insertMeals({
      items,
      tableServiceReservations: reservations,
      guests: [makeGuest()],
      budgetTier: 'fairy',
    });

    // Check sorted by startTime.
    for (let i = 1; i < result.length; i++) {
      expect(result[i].startTime >= result[i - 1].startTime).toBe(true);
    }
  });

  it('deterministic: same inputs → identical output', () => {
    const items: PlanItem[] = [
      makeItem({ id: 'i1', startTime: '2026-06-01T09:00:00', endTime: '2026-06-01T10:00:00' }),
      makeItem({ id: 'i2', startTime: '2026-06-01T14:00:00', endTime: '2026-06-01T14:30:00' }),
    ];

    const input = {
      items,
      tableServiceReservations: [],
      guests: [makeGuest()],
      budgetTier: 'fairy' as BudgetTier,
    };

    const first = insertMeals(input);
    for (let i = 0; i < 5; i++) {
      expect(insertMeals(input)).toEqual(first);
    }
  });
});
