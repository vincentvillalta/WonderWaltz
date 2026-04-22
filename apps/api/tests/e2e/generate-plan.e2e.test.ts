import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { CircuitBreakerService } from '../../src/plan-generation/circuit-breaker.service.js';
import { type BudgetCheck } from '../../src/plan-generation/circuit-breaker.service.js';
import type { PlanGenerationService } from '../../src/plan-generation/plan-generation.service.js';
import { TripsController } from '../../src/trips/trips.controller.js';

// ─── Helpers ─────────────────────────────────────────────────────────

function createMockPlanGeneration(): PlanGenerationService {
  return {
    generate: vi.fn().mockResolvedValue({ planId: 'plan-123' }),
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

function createMockDb(entitlementState = 'free') {
  return {
    execute: vi.fn().mockResolvedValue([
      {
        id: 'trip-1',
        entitlement_state: entitlementState,
        current_plan_id: null,
        plan_status: 'ready',
      },
    ]),
  };
}

// ─── Tests ───────────────────────────────────────────────────────────

describe('POST /v1/trips/:id/generate-plan', () => {
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

  it('returns job_id equal to trip id on valid request', async () => {
    const result = await controller.generatePlan('trip-1');
    expect(result).toEqual({ job_id: 'trip-1' });
  });

  it('invokes PlanGenerationService.generate with the trip id', async () => {
    await controller.generatePlan('trip-1');
    // Fire-and-forget: wait one microtask for the catch handler to wire up
    await Promise.resolve();
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(planGeneration.generate).toHaveBeenCalledWith('trip-1');
  });

  it('returns 402 when budget exhausted', async () => {
    circuitBreaker = createMockCircuitBreaker({
      allowed: false,
      spentCents: 55,
      budgetCents: 50,
      reason: 'trip_budget_exhausted',
    });
    controller = new TripsController(planGeneration, circuitBreaker, db as never);

    try {
      await controller.generatePlan('trip-1');
      expect.fail('Should have thrown');
    } catch (err: unknown) {
      const httpErr = err as { getStatus?: () => number; getResponse?: () => unknown };
      expect(httpErr.getStatus?.()).toBe(402);
    }
  });

  it('402 response body matches PlanBudgetExhaustedDto shape', async () => {
    circuitBreaker = createMockCircuitBreaker({
      allowed: false,
      spentCents: 55,
      budgetCents: 50,
    });
    controller = new TripsController(planGeneration, circuitBreaker, db as never);

    try {
      await controller.generatePlan('trip-1');
      expect.fail('Should have thrown');
    } catch (err: unknown) {
      const httpErr = err as { getResponse?: () => Record<string, unknown> };
      const body = httpErr.getResponse?.() as Record<string, unknown>;
      expect(body).toHaveProperty('error', 'trip_budget_exhausted');
      expect(body).toHaveProperty('spent_cents');
      expect(body).toHaveProperty('budget_cents');
      expect(body).toHaveProperty('resetOptions');
    }
  });
});
