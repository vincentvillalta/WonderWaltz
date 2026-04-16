import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { CircuitBreakerService } from '../../src/plan-generation/circuit-breaker.service.js';
import { type BudgetCheck } from '../../src/plan-generation/circuit-breaker.service.js';
import { TripsController } from '../../src/trips/trips.controller.js';
import type { RethinkRequestDto } from '../../src/shared/dto/rethink.dto.js';

// ─── Helpers ─────────────────────────────────────────────────────────

function createMockQueue() {
  return {
    add: vi.fn().mockResolvedValue({ id: 'rethink-job-456' }),
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

function createMockDb() {
  let callCount = 0;
  return {
    execute: vi.fn().mockImplementation(() => {
      callCount++;
      // First call: trip query
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
      // Second call: plan_items for current plan (for in-progress inference)
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
        {
          id: 'item-2',
          plan_day_id: 'day-1',
          ref_id: 'attraction-2',
          name: 'Thunder Mountain',
          start_time: '14:00',
          end_time: '15:00',
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
  let queue: ReturnType<typeof createMockQueue>;
  let circuitBreaker: CircuitBreakerService;
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    queue = createMockQueue();
    circuitBreaker = createMockCircuitBreaker();
    db = createMockDb();
    controller = new TripsController(queue as never, circuitBreaker, db as never);
  });

  it('returns 202 with plan_job_id on valid rethink', async () => {
    const body = makeRethinkBody();
    const result = await controller.rethinkToday('trip-1', body);
    expect(result).toEqual({ job_id: 'rethink-job-456' });
  });

  it('enqueues job with kind=rethink', async () => {
    const body = makeRethinkBody();
    await controller.rethinkToday('trip-1', body);
    expect(queue.add).toHaveBeenCalledWith(
      'generate',
      expect.objectContaining({ tripId: 'trip-1', kind: 'rethink' }),
      expect.anything(),
    );
  });

  it('in-progress inference: current_time within item window pinned in job data', async () => {
    const body = makeRethinkBody({
      current_time: '2026-06-01T13:00:00.000Z', // falls within item-1 12:30-13:30
      completed_item_ids: [],
    });
    await controller.rethinkToday('trip-1', body);

    const jobData = (queue.add as ReturnType<typeof vi.fn>).mock.calls[0]?.[1] as Record<
      string,
      unknown
    >;
    const rethinkInput = jobData['rethinkInput'] as {
      pinnedItemIds?: string[];
    };
    expect(rethinkInput.pinnedItemIds).toContain('item-1');
  });

  it('completed items excluded from in-progress inference', async () => {
    const body = makeRethinkBody({
      current_time: '2026-06-01T13:00:00.000Z',
      completed_item_ids: ['item-1'], // item-1 already done
    });
    await controller.rethinkToday('trip-1', body);

    const jobData = (queue.add as ReturnType<typeof vi.fn>).mock.calls[0]?.[1] as Record<
      string,
      unknown
    >;
    const rethinkInput = jobData['rethinkInput'] as {
      pinnedItemIds?: string[];
    };
    expect(rethinkInput.pinnedItemIds).not.toContain('item-1');
  });

  it('active_ll_bookings become hard pins in job data', async () => {
    const body = makeRethinkBody({
      active_ll_bookings: [
        {
          attraction_id: 'attr-A',
          return_window_start: '2026-06-01T14:00:00.000Z',
          return_window_end: '2026-06-01T15:00:00.000Z',
        },
        {
          attraction_id: 'attr-B',
          return_window_start: '2026-06-01T16:00:00.000Z',
          return_window_end: '2026-06-01T17:00:00.000Z',
        },
      ],
    });
    await controller.rethinkToday('trip-1', body);

    const jobData = (queue.add as ReturnType<typeof vi.fn>).mock.calls[0]?.[1] as Record<
      string,
      unknown
    >;
    const rethinkInput = jobData['rethinkInput'] as {
      hardPins?: Array<{ attractionId: string }>;
    };
    expect(rethinkInput.hardPins).toHaveLength(2);
    expect(rethinkInput.hardPins?.[0]).toHaveProperty('attractionId', 'attr-A');
    expect(rethinkInput.hardPins?.[1]).toHaveProperty('attractionId', 'attr-B');
  });

  it('returns 402 when budget exhausted', async () => {
    circuitBreaker = createMockCircuitBreaker({
      allowed: false,
      spentCents: 55,
      budgetCents: 50,
    });
    controller = new TripsController(queue as never, circuitBreaker, db as never);

    try {
      await controller.rethinkToday('trip-1', makeRethinkBody());
      expect.fail('Should have thrown');
    } catch (err: unknown) {
      const httpErr = err as { getStatus?: () => number };
      expect(httpErr.getStatus?.()).toBe(402);
    }
  });
});
