import { describe, expect, it, vi, beforeEach } from 'vitest';
import * as Sentry from '@sentry/nestjs';
import {
  CircuitBreakerService,
  type BudgetCheck,
} from '../../src/plan-generation/circuit-breaker.service.js';

vi.mock('@sentry/nestjs', () => ({
  captureException: vi.fn(),
}));

// ─── Helpers ─────────────────────────────────────────────────────────

function createMockDb(spentCents: number, budgetCents: number = 50) {
  let callCount = 0;
  return {
    execute: vi.fn().mockImplementation(() => {
      callCount++;
      // First call: trip budget query
      if (callCount === 1) {
        return Promise.resolve([{ llm_budget_cents: String(budgetCents) }]);
      }
      // Second call: SUM spent query
      if (callCount === 2) {
        return Promise.resolve([{ total: String(spentCents) }]);
      }
      // Subsequent calls: INSERT (incident recording)
      return Promise.resolve([]);
    }),
  };
}

function createMockRedis() {
  const store = new Map<string, string>();
  return {
    get: vi.fn().mockImplementation((key: string) => Promise.resolve(store.get(key) ?? null)),
    set: vi.fn().mockImplementation((key: string, value: string, _ex: string, _ttl: number) => {
      store.set(key, value);
      return Promise.resolve('OK');
    }),
    _store: store,
  };
}

function createMockSlack() {
  return {
    sendAlert: vi.fn().mockResolvedValue(undefined),
  };
}

describe('CircuitBreakerService', () => {
  let db: ReturnType<typeof createMockDb>;
  let redis: ReturnType<typeof createMockRedis>;
  let slack: ReturnType<typeof createMockSlack>;

  beforeEach(() => {
    vi.clearAllMocks();
    redis = createMockRedis();
    slack = createMockSlack();
  });

  describe('checkBudget', () => {
    it('allows when spent + projected <= budget', async () => {
      db = createMockDb(20, 50);
      const svc = new CircuitBreakerService(db as never, redis as never, slack as never);

      const result: BudgetCheck = await svc.checkBudget('trip-001', 15);
      expect(result.allowed).toBe(true);
      expect(result.swapTo).toBeUndefined();
      expect(result.spentCents).toBe(20);
      expect(result.budgetCents).toBe(50);
    });

    it('allows with swapTo haiku when spent + projected > budget (sonnet projected)', async () => {
      db = createMockDb(40, 50);
      const svc = new CircuitBreakerService(db as never, redis as never, slack as never);

      const result: BudgetCheck = await svc.checkBudget('trip-001', 15);
      expect(result.allowed).toBe(true);
      expect(result.swapTo).toBe('haiku');
      expect(result.spentCents).toBe(40);
      expect(result.budgetCents).toBe(50);
    });

    it('disallows when spent >= budget', async () => {
      db = createMockDb(55, 50);
      const svc = new CircuitBreakerService(db as never, redis as never, slack as never);

      const result: BudgetCheck = await svc.checkBudget('trip-001', 15);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('trip_budget_exhausted');
      expect(result.spentCents).toBe(55);
      expect(result.budgetCents).toBe(50);
    });

    it('uses default budget of 50 when trips row returns null', async () => {
      // Simulate null budget
      const mockDb = {
        execute: vi
          .fn()
          .mockResolvedValueOnce([{ llm_budget_cents: null }]) // trip query
          .mockResolvedValueOnce([{ total: '10' }]), // sum query
      };
      const svc = new CircuitBreakerService(mockDb as never, redis as never, slack as never);

      const result = await svc.checkBudget('trip-001', 10);
      expect(result.budgetCents).toBe(50);
      expect(result.allowed).toBe(true);
    });
  });

  describe('recordIncident — 3-sink telemetry', () => {
    it('writes to DB, Sentry, and Slack', async () => {
      db = createMockDb(45, 50);
      const svc = new CircuitBreakerService(db as never, redis as never, slack as never);

      await svc.recordIncident({
        tripId: 'trip-001',
        event: 'sonnet_to_haiku_swap',
        model: 'claude-sonnet-4-6',
        spentCents: 45,
      });

      // DB insert (the third call on db.execute)
      expect(db.execute).toHaveBeenCalled();

      // Sentry
      expect(Sentry.captureException).toHaveBeenCalledTimes(1);
      const sentryCall = vi.mocked(Sentry.captureException).mock.calls[0]!;
      expect(sentryCall[0]).toBeInstanceOf(Error);
      const sentryContext = sentryCall[1] as { tags: Record<string, string> };
      expect(sentryContext.tags).toMatchObject({
        tripId: 'trip-001',
        event: 'sonnet_to_haiku_swap',
        model: 'claude-sonnet-4-6',
      });

      // Slack
      expect(slack.sendAlert).toHaveBeenCalledTimes(1);
    });

    it('deduplicates Slack alerts within the same hour', async () => {
      db = createMockDb(45, 50);
      const svc = new CircuitBreakerService(db as never, redis as never, slack as never);

      // First call — Slack fires
      await svc.recordIncident({
        tripId: 'trip-001',
        event: 'sonnet_to_haiku_swap',
        model: 'claude-sonnet-4-6',
        spentCents: 45,
      });
      expect(slack.sendAlert).toHaveBeenCalledTimes(1);

      // Second call — Slack NOT fired (dedup key present)
      await svc.recordIncident({
        tripId: 'trip-002',
        event: 'budget_exhausted',
        model: 'claude-sonnet-4-6',
        spentCents: 55,
      });
      expect(slack.sendAlert).toHaveBeenCalledTimes(1); // Still 1

      // DB and Sentry still fire both times
      expect(Sentry.captureException).toHaveBeenCalledTimes(2);
    });
  });

  describe('buildBudgetExhaustedResponse', () => {
    it('returns PlanBudgetExhaustedDto shape', () => {
      db = createMockDb(55, 50);
      const svc = new CircuitBreakerService(db as never, redis as never, slack as never);

      const dto = svc.buildBudgetExhaustedResponse(55, 50);
      expect(dto.error).toBe('trip_budget_exhausted');
      expect(dto.spent_cents).toBe(55);
      expect(dto.budget_cents).toBe(50);
      expect(dto.resetOptions).toHaveLength(1);
      expect(dto.resetOptions[0]!.type).toBe('top_up');
      expect(dto.resetOptions[0]!.sku).toBe('trip_topup_050');
      expect(dto.resetOptions[0]!.usd_cents).toBe(50);
    });
  });
});
