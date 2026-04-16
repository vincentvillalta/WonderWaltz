import { describe, expect, it, vi } from 'vitest';
import { PlansService } from '../../src/plans/plans.service.js';

// ─── Helpers ─────────────────────────────────────────────────────────

/** Builds a minimal plan row from DB */
function makePlanRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'plan-1',
    trip_id: 'trip-1',
    version: 1,
    status: 'ready',
    solver_input_hash: 'abc123',
    created_at: '2026-06-01T10:00:00.000Z',
    warnings: '[]',
    ...overrides,
  };
}

/** Builds a plan day row */
function makePlanDayRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'day-1',
    plan_id: 'plan-1',
    day_index: 0,
    park_id: 'park-mk',
    park_name: 'Magic Kingdom',
    date: '2026-06-01',
    narrative_intro: 'A magical day awaits!',
    forecast_confidence: 'high',
    ...overrides,
  };
}

/** Builds a plan item row */
function makePlanItemRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'item-1',
    plan_day_id: 'day-1',
    item_type: 'attraction',
    ref_id: 'attraction-1',
    name: 'Space Mountain',
    start_time: '09:30',
    end_time: '10:00',
    wait_minutes: 35,
    sort_index: 0,
    lightning_lane_type: null,
    notes: null,
    narrative_tip: 'Get there early!',
    metadata: null,
    ...overrides,
  };
}

function makeTrip(overrides: Record<string, unknown> = {}) {
  return {
    id: 'trip-1',
    entitlement_state: 'free',
    budget_tier: 'fairy_tale',
    ...overrides,
  };
}

function createMockDb(options: {
  plan?: ReturnType<typeof makePlanRow> | null;
  days?: Array<ReturnType<typeof makePlanDayRow>>;
  items?: Array<ReturnType<typeof makePlanItemRow>>;
  trip?: ReturnType<typeof makeTrip>;
}) {
  let callCount = 0;
  return {
    execute: vi.fn().mockImplementation(() => {
      callCount++;
      // Call 1: plan query
      if (callCount === 1) {
        return Promise.resolve(options.plan ? [options.plan] : []);
      }
      // Call 2: trip query (entitlement_state)
      if (callCount === 2) {
        return Promise.resolve(options.trip ? [options.trip] : []);
      }
      // Call 3: plan_days query
      if (callCount === 3) {
        return Promise.resolve(options.days ?? []);
      }
      // Call 4: plan_items query
      if (callCount === 4) {
        return Promise.resolve(options.items ?? []);
      }
      return Promise.resolve([]);
    }),
  };
}

// ─── Tests ───────────────────────────────────────────────────────────

describe('GET /v1/plans/:id — PlansService projection', () => {
  describe('unlocked tier', () => {
    it('all days return type=full', async () => {
      const db = createMockDb({
        plan: makePlanRow(),
        trip: makeTrip({ entitlement_state: 'unlocked' }),
        days: [
          makePlanDayRow({ id: 'day-0', day_index: 0 }),
          makePlanDayRow({ id: 'day-1', day_index: 1 }),
          makePlanDayRow({ id: 'day-2', day_index: 2 }),
        ],
        items: [
          makePlanItemRow({ plan_day_id: 'day-0' }),
          makePlanItemRow({ id: 'item-2', plan_day_id: 'day-1' }),
          makePlanItemRow({ id: 'item-3', plan_day_id: 'day-2' }),
        ],
      });
      const service = new PlansService(db as never);
      const result = await service.getPlan('plan-1');

      expect(result).not.toBeNull();
      expect(result!.days).toHaveLength(3);
      for (const day of result!.days) {
        expect(day.type).toBe('full');
      }
    });
  });

  describe('free tier', () => {
    it('Day 0 is full; Days 1+ are locked with templated headline', async () => {
      const db = createMockDb({
        plan: makePlanRow(),
        trip: makeTrip({ entitlement_state: 'free', budget_tier: 'fairy_tale' }),
        days: [
          makePlanDayRow({ id: 'day-0', day_index: 0, park_name: 'Magic Kingdom' }),
          makePlanDayRow({ id: 'day-1', day_index: 1, park_name: 'EPCOT' }),
          makePlanDayRow({ id: 'day-2', day_index: 2, park_name: 'Hollywood Studios' }),
        ],
        items: [
          makePlanItemRow({ plan_day_id: 'day-0', name: 'Space Mountain' }),
          makePlanItemRow({ id: 'item-2', plan_day_id: 'day-1', name: 'Guardians of the Galaxy' }),
          makePlanItemRow({
            id: 'item-3',
            plan_day_id: 'day-1',
            name: 'Test Track',
            item_type: 'dining',
          }),
          makePlanItemRow({
            id: 'item-4',
            plan_day_id: 'day-2',
            name: 'Tower of Terror',
          }),
        ],
      });
      const service = new PlansService(db as never);
      const result = await service.getPlan('plan-1');

      expect(result).not.toBeNull();
      expect(result!.days).toHaveLength(3);

      // Day 0 is full
      const day0 = result!.days[0]!;
      expect(day0.type).toBe('full');
      expect(day0).toHaveProperty('items');

      // Day 1 is locked
      const day1 = result!.days[1]!;
      expect(day1.type).toBe('locked');
      expect(day1).toHaveProperty('headline');
      expect(day1).toHaveProperty('totalItems', 2); // 2 items on day-1
      expect(day1).toHaveProperty('park', 'EPCOT');
      expect(day1).not.toHaveProperty('items');

      // Day 2 is locked
      const day2 = result!.days[2]!;
      expect(day2.type).toBe('locked');
      expect(day2).toHaveProperty('totalItems', 1);
    });

    it('locked day headline uses template with park, budgetTier, topScoredItem', async () => {
      const db = createMockDb({
        plan: makePlanRow(),
        trip: makeTrip({ entitlement_state: 'free', budget_tier: 'fairy_tale' }),
        days: [
          makePlanDayRow({ id: 'day-0', day_index: 0 }),
          makePlanDayRow({ id: 'day-1', day_index: 1, park_name: 'EPCOT' }),
        ],
        items: [
          makePlanItemRow({ plan_day_id: 'day-0' }),
          makePlanItemRow({
            id: 'item-2',
            plan_day_id: 'day-1',
            name: 'Guardians of the Galaxy',
            sort_index: 0,
          }),
        ],
      });
      const service = new PlansService(db as never);
      const result = await service.getPlan('plan-1');

      const day1 = result!.days[1]! as { headline: string };
      expect(day1.headline).toBe('Your EPCOT fairy_tale day centers on Guardians of the Galaxy.');
    });

    it('totalItems counts ALL item types (rides + meals + shows + rest)', async () => {
      const db = createMockDb({
        plan: makePlanRow(),
        trip: makeTrip({ entitlement_state: 'free' }),
        days: [
          makePlanDayRow({ id: 'day-0', day_index: 0 }),
          makePlanDayRow({ id: 'day-1', day_index: 1, park_name: 'Magic Kingdom' }),
        ],
        items: [
          makePlanItemRow({ plan_day_id: 'day-0' }),
          makePlanItemRow({ id: 'i1', plan_day_id: 'day-1', item_type: 'attraction' }),
          makePlanItemRow({ id: 'i2', plan_day_id: 'day-1', item_type: 'dining' }),
          makePlanItemRow({ id: 'i3', plan_day_id: 'day-1', item_type: 'show' }),
          makePlanItemRow({ id: 'i4', plan_day_id: 'day-1', item_type: 'break' }),
          makePlanItemRow({ id: 'i5', plan_day_id: 'day-1', item_type: 'travel' }),
        ],
      });
      const service = new PlansService(db as never);
      const result = await service.getPlan('plan-1');

      const day1 = result!.days[1]! as { totalItems: number };
      expect(day1.totalItems).toBe(5); // all types counted
    });
  });

  describe('plan with low-confidence forecast', () => {
    it('includes meta.forecast_disclaimer when any day has low confidence', async () => {
      const db = createMockDb({
        plan: makePlanRow(),
        trip: makeTrip({ entitlement_state: 'unlocked' }),
        days: [
          makePlanDayRow({ id: 'day-0', day_index: 0, forecast_confidence: 'high' }),
          makePlanDayRow({ id: 'day-1', day_index: 1, forecast_confidence: 'low' }),
        ],
        items: [
          makePlanItemRow({ plan_day_id: 'day-0' }),
          makePlanItemRow({ id: 'item-2', plan_day_id: 'day-1' }),
        ],
      });
      const service = new PlansService(db as never);
      const result = await service.getPlan('plan-1');

      expect(result!.meta).toBeDefined();
      expect(result!.meta!.forecast_disclaimer).toBe('Beta Forecast');
    });
  });

  describe('404 on unknown plan', () => {
    it('returns null when plan not found', async () => {
      const db = createMockDb({ plan: null });
      const service = new PlansService(db as never);
      const result = await service.getPlan('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('response envelope shape', () => {
    it('matches PlanDto shape: id, trip_id, version, status, days, warnings, created_at', async () => {
      const db = createMockDb({
        plan: makePlanRow({ warnings: '["Upgrade to Royal Treatment"]' }),
        trip: makeTrip({ entitlement_state: 'unlocked' }),
        days: [makePlanDayRow()],
        items: [makePlanItemRow()],
      });
      const service = new PlansService(db as never);
      const result = await service.getPlan('plan-1');

      expect(result).toMatchObject({
        id: 'plan-1',
        trip_id: 'trip-1',
        version: 1,
        status: 'ready',
        created_at: '2026-06-01T10:00:00.000Z',
      });
      expect(result!.warnings).toEqual(['Upgrade to Royal Treatment']);
      expect(Array.isArray(result!.days)).toBe(true);
    });
  });
});
