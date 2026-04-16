import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { CircuitBreakerService } from '../../src/plan-generation/circuit-breaker.service.js';
import { type BudgetCheck } from '../../src/plan-generation/circuit-breaker.service.js';
import { TripsController } from '../../src/trips/trips.controller.js';

// ─── Helpers ─────────────────────────────────────────────────────────

function createMockQueue() {
  return {
    add: vi.fn().mockResolvedValue({ id: 'job-123' }),
  };
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
  let queue: ReturnType<typeof createMockQueue>;
  let circuitBreaker: CircuitBreakerService;
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    queue = createMockQueue();
    circuitBreaker = createMockCircuitBreaker();
    db = createMockDb();
    controller = new TripsController(queue as never, circuitBreaker, db as never);
  });

  it('returns 202 with plan_job_id on valid request', async () => {
    const result = await controller.generatePlan('trip-1');
    expect(result).toEqual({ job_id: 'job-123' });
  });

  it('enqueues BullMQ job with correct data', async () => {
    await controller.generatePlan('trip-1');
    expect(queue.add).toHaveBeenCalledWith(
      'generate',
      expect.objectContaining({ tripId: 'trip-1', kind: 'initial' }),
      expect.objectContaining({ attempts: 5 }),
    );
  });

  it('returns 402 when budget exhausted', async () => {
    circuitBreaker = createMockCircuitBreaker({
      allowed: false,
      spentCents: 55,
      budgetCents: 50,
      reason: 'trip_budget_exhausted',
    });
    controller = new TripsController(queue as never, circuitBreaker, db as never);

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
    controller = new TripsController(queue as never, circuitBreaker, db as never);

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
