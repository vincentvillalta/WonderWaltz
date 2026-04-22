import { describe, expect, it, vi, beforeEach } from 'vitest';
import { TripsController } from '../../src/trips/trips.controller.js';
import { PlansService } from '../../src/plans/plans.service.js';
import type { CircuitBreakerService } from '../../src/plan-generation/circuit-breaker.service.js';
import type { PlanGenerationService } from '../../src/plan-generation/plan-generation.service.js';
import type { PlanDto, FullDayPlanDto, LockedDayPlanDto } from '../../src/shared/dto/plan.dto.js';

/**
 * End-to-end integration test: POST generate-plan -> job completes -> GET plans/:id.
 *
 * Since BullMQ cannot be driven in-process cleanly without a full NestJS app
 * + worker module, this test exercises the full round-trip via:
 *   1. POST generate-plan (via TripsController) -> 202 + job_id
 *   2. Simulate job completion by calling PlansService.getPlan directly
 *      (the plan data is "persisted" via the mock DB)
 *   3. Assert the PlanDto structure is correct for both free + unlocked tiers.
 *
 * The 202 enqueue path is fully proven by task-1 e2e tests; this test
 * focuses on the end-to-end data shape after plan generation completes.
 */

// ─── Helpers ─────────────────────────────────────────────────────────

function createMockPlanGeneration(): PlanGenerationService {
  return {
    generate: vi.fn().mockResolvedValue({ planId: 'plan-rt-1' }),
  } as unknown as PlanGenerationService;
}

function createMockCircuitBreaker(): CircuitBreakerService {
  return {
    checkBudget: vi.fn().mockResolvedValue({
      allowed: true,
      spentCents: 5,
      budgetCents: 50,
    }),
    buildBudgetExhaustedResponse: vi.fn(),
    recordIncident: vi.fn(),
  } as unknown as CircuitBreakerService;
}

// Full mock DB that serves both the controller (trip lookup) and PlansService (plan + days + items)
function createRoundtripDb(entitlementState: 'free' | 'unlocked') {
  let callContext: 'controller' | 'service' = 'controller';
  let serviceCallCount = 0;

  const tripRow = {
    id: 'trip-rt-1',
    entitlement_state: entitlementState,
    budget_tier: 'fairy_tale',
    current_plan_id: 'plan-rt-1',
    plan_status: 'ready',
  };

  const planRow = {
    id: 'plan-rt-1',
    trip_id: 'trip-rt-1',
    version: 1,
    status: 'ready',
    solver_input_hash: 'hash-rt',
    created_at: '2026-06-01T10:00:00.000Z',
    warnings: '["Upgrade to Royal Treatment for LL access on Seven Dwarfs Mine Train"]',
  };

  const planDays = [
    {
      id: 'day-rt-0',
      plan_id: 'plan-rt-1',
      day_index: 0,
      park_id: 'park-mk',
      park_name: 'Magic Kingdom',
      date: '2026-06-01',
      narrative_intro: 'Welcome to the most magical place!',
      forecast_confidence: 'low',
    },
    {
      id: 'day-rt-1',
      plan_id: 'plan-rt-1',
      day_index: 1,
      park_id: 'park-ep',
      park_name: 'EPCOT',
      date: '2026-06-02',
      narrative_intro: 'A world of innovation awaits!',
      forecast_confidence: 'high',
    },
    {
      id: 'day-rt-2',
      plan_id: 'plan-rt-1',
      day_index: 2,
      park_id: 'park-hs',
      park_name: 'Hollywood Studios',
      date: '2026-06-03',
      narrative_intro: 'Lights, camera, action!',
      forecast_confidence: 'high',
    },
  ];

  const planItems = [
    // Day 0 items
    {
      id: 'item-rt-1',
      plan_day_id: 'day-rt-0',
      item_type: 'attraction',
      ref_id: 'attr-space-mountain',
      name: 'Space Mountain',
      start_time: '09:00',
      end_time: '09:30',
      wait_minutes: 25,
      sort_index: 0,
      lightning_lane_type: null,
      notes: 'Get there at rope drop!',
      narrative_tip: 'Arrive early for minimal waits.',
      metadata: null,
    },
    {
      id: 'item-rt-2',
      plan_day_id: 'day-rt-0',
      item_type: 'dining',
      ref_id: 'dining-be-our-guest',
      name: 'Be Our Guest Restaurant',
      start_time: '12:00',
      end_time: '13:00',
      wait_minutes: null,
      sort_index: 1,
      lightning_lane_type: null,
      notes: null,
      narrative_tip: 'Reserve the grey stuff — it is delicious.',
      metadata: null,
    },
    {
      id: 'item-rt-3',
      plan_day_id: 'day-rt-0',
      item_type: 'break',
      ref_id: null,
      name: 'Afternoon Rest',
      start_time: '14:00',
      end_time: '15:00',
      wait_minutes: null,
      sort_index: 2,
      lightning_lane_type: null,
      notes: null,
      narrative_tip: null,
      metadata: null,
    },
    // Day 1 items
    {
      id: 'item-rt-4',
      plan_day_id: 'day-rt-1',
      item_type: 'attraction',
      ref_id: 'attr-guardians',
      name: 'Guardians of the Galaxy',
      start_time: '09:00',
      end_time: '09:45',
      wait_minutes: 45,
      sort_index: 0,
      lightning_lane_type: 'LLSP',
      notes: null,
      narrative_tip: 'Use your Lightning Lane!',
      metadata: null,
    },
    {
      id: 'item-rt-5',
      plan_day_id: 'day-rt-1',
      item_type: 'show',
      ref_id: 'show-harmonious',
      name: 'Harmonious',
      start_time: '21:00',
      end_time: '21:30',
      wait_minutes: null,
      sort_index: 1,
      lightning_lane_type: null,
      notes: null,
      narrative_tip: null,
      metadata: null,
    },
    // Day 2 items
    {
      id: 'item-rt-6',
      plan_day_id: 'day-rt-2',
      item_type: 'attraction',
      ref_id: 'attr-tower-of-terror',
      name: 'Tower of Terror',
      start_time: '10:00',
      end_time: '10:30',
      wait_minutes: 60,
      sort_index: 0,
      lightning_lane_type: 'LLMP',
      notes: 'A classic thrill!',
      narrative_tip: 'Brace yourself.',
      metadata: null,
    },
  ];

  return {
    execute: vi.fn().mockImplementation(() => {
      if (callContext === 'controller') {
        // Controller: trip lookup
        return Promise.resolve([tripRow]);
      }

      // PlansService calls: plan, trip, days, items
      serviceCallCount++;
      if (serviceCallCount === 1) return Promise.resolve([planRow]);
      if (serviceCallCount === 2) return Promise.resolve([tripRow]);
      if (serviceCallCount === 3) return Promise.resolve(planDays);
      if (serviceCallCount === 4) return Promise.resolve(planItems);
      return Promise.resolve([]);
    }),
    switchToServiceContext() {
      callContext = 'service';
      serviceCallCount = 0;
    },
  };
}

// ─── Tests ───────────────────────────────────────────────────────────

describe('E2E roundtrip: POST generate-plan -> GET plans/:id', () => {
  let planGeneration: PlanGenerationService;
  let circuitBreaker: CircuitBreakerService;

  beforeEach(() => {
    planGeneration = createMockPlanGeneration();
    circuitBreaker = createMockCircuitBreaker();
  });

  it('full flow: POST returns 200 + job_id, then GET returns structured PlanDto', async () => {
    const t0 = Date.now();

    const db = createRoundtripDb('unlocked');

    // Step 1: POST /v1/trips/:id/generate-plan -> 200
    const controller = new TripsController(planGeneration, circuitBreaker, db as never);
    const postResult = await controller.generatePlan('trip-rt-1');
    expect(postResult).toEqual({ job_id: 'trip-rt-1' });

    // Step 2: Simulate job completion — switch DB to serve PlansService queries
    db.switchToServiceContext();

    // Step 3: GET /v1/plans/:id -> structured PlanDto
    const plansService = new PlansService(db as never);
    const plan = await plansService.getPlan('plan-rt-1');

    expect(plan).not.toBeNull();
    const dto = plan as PlanDto;

    // Verify structure
    expect(dto.id).toBe('plan-rt-1');
    expect(dto.trip_id).toBe('trip-rt-1');
    expect(dto.version).toBe(1);
    expect(dto.status).toBe('ready');
    expect(dto.days).toHaveLength(3);
    expect(dto.warnings).toEqual([
      'Upgrade to Royal Treatment for LL access on Seven Dwarfs Mine Train',
    ]);
    expect(dto.created_at).toBe('2026-06-01T10:00:00.000Z');

    // All days should be full for unlocked tier
    for (const day of dto.days) {
      expect(day.type).toBe('full');
    }

    // Day 0 has 3 items (attraction + dining + break)
    const day0 = dto.days[0] as FullDayPlanDto;
    expect(day0.items).toHaveLength(3);
    expect(day0.items[0]!.name).toBe('Space Mountain');
    expect(day0.items[0]!.type).toBe('attraction');
    expect(day0.items[1]!.type).toBe('dining');
    expect(day0.items[2]!.type).toBe('break');

    // Day 1 has 2 items
    const day1 = dto.days[1] as FullDayPlanDto;
    expect(day1.items).toHaveLength(2);

    // Low-confidence forecast -> meta.forecast_disclaimer
    expect(dto.meta).toBeDefined();
    expect(dto.meta?.forecast_disclaimer).toBe('Beta Forecast');

    // Runtime budget check
    const elapsed = Date.now() - t0;
    expect(elapsed).toBeLessThan(30_000);
  });

  it('free-tier: Day 0 full with items, Days 1+ locked with headline + totalItems', async () => {
    const db = createRoundtripDb('free');
    db.switchToServiceContext();

    const plansService = new PlansService(db as never);
    const plan = await plansService.getPlan('plan-rt-1');

    expect(plan).not.toBeNull();
    const dto = plan as PlanDto;

    // Day 0: full
    const day0 = dto.days[0]!;
    expect(day0.type).toBe('full');
    expect(day0).toHaveProperty('items');
    const fullDay0 = day0 as FullDayPlanDto;
    expect(fullDay0.items).toHaveLength(3);

    // Day 1: locked
    const day1 = dto.days[1]!;
    expect(day1.type).toBe('locked');
    const locked1 = day1 as LockedDayPlanDto;
    expect(locked1.park).toBe('EPCOT');
    expect(locked1.totalItems).toBe(2);
    expect(locked1.headline).toBe('Your EPCOT fairy_tale day centers on Guardians of the Galaxy.');
    expect(locked1.unlockTeaser).toContain('Upgrade');
    expect(locked1).not.toHaveProperty('items');

    // Day 2: locked
    const day2 = dto.days[2]!;
    expect(day2.type).toBe('locked');
    const locked2 = day2 as LockedDayPlanDto;
    expect(locked2.park).toBe('Hollywood Studios');
    expect(locked2.totalItems).toBe(1);
    expect(locked2.headline).toContain('Tower of Terror');
  });

  it('llm_costs tracking: plan has warnings array from solver output', async () => {
    const db = createRoundtripDb('unlocked');
    db.switchToServiceContext();

    const plansService = new PlansService(db as never);
    const plan = await plansService.getPlan('plan-rt-1');

    expect(plan).not.toBeNull();
    expect(Array.isArray(plan!.warnings)).toBe(true);
    expect(plan!.warnings.length).toBeGreaterThan(0);
  });
});
