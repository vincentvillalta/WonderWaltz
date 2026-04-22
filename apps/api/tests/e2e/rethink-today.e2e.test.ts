import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { CircuitBreakerService } from '../../src/plan-generation/circuit-breaker.service.js';
import { type BudgetCheck } from '../../src/plan-generation/circuit-breaker.service.js';
import type { PlanGenerationService } from '../../src/plan-generation/plan-generation.service.js';
import { TripsController } from '../../src/trips/trips.controller.js';
import type { RethinkRequestDto } from '../../src/shared/dto/rethink.dto.js';

// ─── Helpers ─────────────────────────────────────────────────────────

function createMockPlanGeneration(): PlanGenerationService {
  return {
    generate: vi.fn().mockResolvedValue({ planId: 'plan-rethink' }),
  } as unknown as PlanGenerationService;
}

function createMockCircuitBreaker(overrides: Partial<BudgetCheck> = {}): CircuitBreakerService {
  const defaults: BudgetCheck = {
    allowed: true,
    spentCents: 10,
    budgetCents: 50,
    ...overrides,
  };
  return {
    checkBudget: vi.fn().mockResolvedValue(defaults),
    buildBudgetExhaustedResponse: vi.fn().mockReturnValue({
      error: 'trip_budget_exhausted',
      spent_cents: overrides.spentCents ?? 55,
      budget_cents: overrides.budgetCents ?? 50,
      resetOptions: [{ type: 'top_up', sku: 'trip_topup_050', usd_cents: 50 }],
    }),
    recordIncident: vi.fn().mockResolvedValue(undefined),
  } as unknown as CircuitBreakerService;
}

function createMockDb() {
  let callCount = 0;
  return {
    execute: vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve([
          {
            id: 'trip-1',
            entitlement_state: 'free',
            current_plan_id: 'plan-abc',
            plan_status: 'ready',
          },
        ]);
      }
      return Promise.resolve([
        {
          id: 'item-1',
          plan_day_id: 'day-1',
          ref_id: 'attraction-1',
          name: 'Space Mountain',
          start_time: '12:30',
          end_time: '13:30',
          item_type: 'attraction',
        },
      ]);
    }),
  };
}

function makeRethinkBody(overrides: Partial<RethinkRequestDto> = {}): RethinkRequestDto {
  return {
    current_time: '2026-06-01T13:00:00.000Z',
    completed_item_ids: [],
    active_ll_bookings: [],
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────

describe('POST /v1/trips/:id/rethink-today', () => {
  let controller: TripsController;
  let planGeneration: PlanGenerationService;
  let circuitBreaker: CircuitBreakerService;
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    planGeneration = createMockPlanGeneration();
    circuitBreaker = createMockCircuitBreaker();
    db = createMockDb();
    controller = new TripsController(planGeneration, circuitBreaker, db as never);
  });

  it('returns job_id equal to trip id on valid rethink', async () => {
    const result = await controller.rethinkToday('trip-1', makeRethinkBody());
    expect(result).toEqual({ job_id: 'trip-1' });
  });

  it('invokes PlanGenerationService.generate with the trip id', async () => {
    await controller.rethinkToday('trip-1', makeRethinkBody());
    await Promise.resolve();
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(planGeneration.generate).toHaveBeenCalledWith('trip-1');
  });

  it('returns 402 when budget exhausted', async () => {
    circuitBreaker = createMockCircuitBreaker({
      allowed: false,
      spentCents: 55,
      budgetCents: 50,
    });
    controller = new TripsController(planGeneration, circuitBreaker, db as never);

    try {
      await controller.rethinkToday('trip-1', makeRethinkBody());
      expect.fail('Should have thrown');
    } catch (err: unknown) {
      const httpErr = err as { getStatus?: () => number };
      expect(httpErr.getStatus?.()).toBe(402);
    }
  });
});
