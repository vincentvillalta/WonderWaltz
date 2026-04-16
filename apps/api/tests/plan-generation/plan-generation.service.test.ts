import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnrecoverableError } from 'bullmq';
import { PlanGenerationService } from '../../src/plan-generation/plan-generation.service.js';
import { BudgetExhaustedError } from '../../src/narrative/narrative.service.js';

/**
 * PlanGenerationService tests -- orchestration, cache-hit, budget error.
 *
 * All dependencies are mocked including SolverLoader which normally crosses
 * the ESM/CJS boundary to load @wonderwaltz/solver.
 */

const TRIP_ID = '11111111-1111-1111-1111-111111111111';
const PLAN_ID = '22222222-2222-2222-2222-222222222222';
const CACHED_PLAN_ID = '33333333-3333-3333-3333-333333333333';

const TRIP_ROW = {
  id: TRIP_ID,
  user_id: 'user-1',
  name: 'Test Trip',
  start_date: '2026-07-01',
  end_date: '2026-07-03',
  budget_tier: 'fairy_tale',
  lodging_type: 'moderate',
  lodging_resort_id: null,
  has_hopper: false,
  has_das: false,
  plan_status: 'pending',
  current_plan_id: null,
  llm_budget_cents: 50,
};

const GUEST_ROWS = [
  {
    id: 'guest-1',
    trip_id: TRIP_ID,
    name: 'Alice',
    age_bracket: '18+',
    has_das: false,
    has_mobility_needs: false,
    has_sensory_needs: false,
    dietary_flags: [],
  },
];

const PREFERENCES_ROW = {
  must_do_attraction_ids: ['ride-1'],
  avoid_attraction_ids: [],
  meal_preferences: [],
};

const ATTRACTION_ROWS = [
  {
    id: 'ride-1',
    park_id: 'park-mk',
    name: 'Space Mountain',
    tags: ['thrill'],
    baseline_wait_minutes: 45,
    lightning_lane_type: 'multi_pass',
    is_headliner: true,
    height_requirement_inches: 44,
    duration_minutes: 10,
  },
];

const SOLVER_OUTPUT = [
  {
    dayIndex: 0,
    date: '2026-07-01',
    parkId: 'park-mk',
    items: [
      {
        id: 'item-1',
        type: 'attraction',
        refId: 'ride-1',
        name: 'Space Mountain',
        startTime: '2026-07-01T09:00:00',
        endTime: '2026-07-01T09:30:00',
        waitMinutes: 25,
      },
    ],
    warnings: [],
  },
];

const NARRATIVE_RESULT = {
  narrative: {
    days: [
      {
        dayIndex: 0,
        intro: 'Welcome to Magic Kingdom for a day of thrills and wonder!',
        items: [{ planItemId: 'item-1', tip: 'Hit this first before lines grow.' }],
      },
    ],
    packingDelta: [],
    budgetHacks: [],
  },
  narrativeAvailable: true,
  usage: {
    input_tokens: 1000,
    output_tokens: 500,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 800,
  },
};

// ─── Mock builders ──────────────────────────────────────────────────────

/**
 * Build a DB mock that dispatches by call order.
 * The generate() method calls the DB in a known sequence:
 *   1-3. Load trip, guests, preferences (parallel)
 *   4. Cache lookup (plans WHERE solver_input_hash)
 *   5-8. Catalog queries (attractions, dining, shows, walking_graph) — on cache miss
 *   9. UPDATE trips SET current_plan_id
 *
 * For cache hit: step 4 returns a row, step 5 is the UPDATE.
 */
function buildDbMock(opts: { cacheHit?: boolean } = {}) {
  let callCount = 0;
  const executeFn = vi.fn().mockImplementation(() => {
    callCount++;
    switch (callCount) {
      case 1:
        return Promise.resolve([TRIP_ROW]); // trips
      case 2:
        return Promise.resolve(GUEST_ROWS); // guests
      case 3:
        return Promise.resolve([PREFERENCES_ROW]); // preferences
      case 4: // cache lookup
        return opts.cacheHit ? Promise.resolve([{ id: CACHED_PLAN_ID }]) : Promise.resolve([]);
      case 5: // attractions (or UPDATE on cache hit)
        return opts.cacheHit ? Promise.resolve([]) : Promise.resolve(ATTRACTION_ROWS);
      case 6:
        return Promise.resolve([]); // dining
      case 7:
        return Promise.resolve([]); // shows
      case 8:
        return Promise.resolve([]); // walking_graph
      case 9:
        return Promise.resolve([]); // UPDATE trips
      default:
        return Promise.resolve([]);
    }
  });
  return { execute: executeFn, _callCount: () => callCount };
}

function buildWalkingGraphLoader() {
  return {
    getGraph: vi.fn().mockReturnValue({
      nodes: ['entrance', 'ride-1'],
      distances: new Map(),
    }),
    onModuleInit: vi.fn(),
  };
}

function buildForecastService() {
  return {
    predictWait: vi.fn().mockResolvedValue({ minutes: 30, confidence: 'low' }),
    computePlanForecastFraming: vi.fn().mockReturnValue({ disclaimer: 'Beta Forecast' }),
  };
}

function buildCalendarService() {
  return {
    getBucket: vi.fn().mockResolvedValue('low'),
  };
}

function buildNarrativeService(opts: { throwBudgetExhausted?: boolean } = {}) {
  const generate = opts.throwBudgetExhausted
    ? vi.fn().mockRejectedValue(new BudgetExhaustedError(TRIP_ID, 55, 50))
    : vi.fn().mockResolvedValue(NARRATIVE_RESULT);
  return {
    generate,
    generateRethinkIntro: vi.fn(),
  };
}

function buildPersistPlanService() {
  return {
    persist: vi.fn().mockResolvedValue({ planId: PLAN_ID }),
  };
}

function buildSolverLoader() {
  return {
    load: vi.fn().mockResolvedValue({
      solve: vi.fn().mockReturnValue(SOLVER_OUTPUT),
      computeSolverInputHash: vi.fn().mockReturnValue('hash-abc123'),
    }),
  };
}

function buildService(opts: { cacheHit?: boolean; throwBudgetExhausted?: boolean } = {}) {
  const db = buildDbMock(opts);
  const walkingGraphLoader = buildWalkingGraphLoader();
  const forecastService = buildForecastService();
  const calendarService = buildCalendarService();
  const narrativeService = buildNarrativeService(opts);
  const solverLoader = buildSolverLoader();
  const persistPlanService = buildPersistPlanService();

  const service = new PlanGenerationService(
    db as never,
    walkingGraphLoader as never,
    forecastService as never,
    calendarService as never,
    narrativeService as never,
    solverLoader as never,
    persistPlanService as never,
  );

  return { service, db, narrativeService, persistPlanService, solverLoader };
}

// ─── Tests ──────────────────────────────────────────────────────────────

describe('PlanGenerationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('happy path (cache miss)', () => {
    it('orchestrates full pipeline and returns { planId, cached: false }', async () => {
      const { service, narrativeService, persistPlanService } = buildService();

      const result = await service.generate(TRIP_ID);

      expect(result).toEqual({ planId: PLAN_ID, cached: false });
      expect(narrativeService.generate).toHaveBeenCalledTimes(1);
      expect(persistPlanService.persist).toHaveBeenCalledTimes(1);

      // Verify persist input shape
      const persistArg = persistPlanService.persist.mock.calls[0]?.[0] as Record<string, unknown>;
      expect(persistArg).toHaveProperty('tripId', TRIP_ID);
      expect(persistArg).toHaveProperty('solverInputHash');
      expect(typeof persistArg['solverInputHash']).toBe('string');
      expect((persistArg['solverInputHash'] as string).length).toBeGreaterThan(0);
      expect(persistArg).toHaveProperty('narrativeAvailable', true);
    });

    it('completes within 5 seconds (mocked deps)', async () => {
      const { service } = buildService();
      const start = Date.now();
      await service.generate(TRIP_ID);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(5000);
    });
  });

  describe('cache hit', () => {
    it('returns cached plan without calling solver or narrative', async () => {
      const { service, narrativeService, persistPlanService } = buildService({
        cacheHit: true,
      });

      const result = await service.generate(TRIP_ID);

      expect(result).toEqual({ planId: CACHED_PLAN_ID, cached: true });
      expect(narrativeService.generate).not.toHaveBeenCalled();
      expect(persistPlanService.persist).not.toHaveBeenCalled();
    });

    it('updates trips.current_plan_id on cache hit', async () => {
      const { service, db } = buildService({ cacheHit: true });

      await service.generate(TRIP_ID);

      // The 5th DB call on cache-hit path is the UPDATE trips
      expect(db.execute).toHaveBeenCalledTimes(5);
    });
  });

  describe('BudgetExhaustedError', () => {
    it('wraps in UnrecoverableError and sets trip status to failed', async () => {
      const { service, db } = buildService({ throwBudgetExhausted: true });

      await expect(service.generate(TRIP_ID)).rejects.toThrow(UnrecoverableError);

      // UPDATE trips SET plan_status = 'failed' was called
      // After: 3 parallel loads + cache check + 4 catalog loads + UPDATE = 9 calls
      expect(db.execute.mock.calls.length).toBeGreaterThanOrEqual(9);
    });
  });

  describe('trip not found', () => {
    it('throws when trip does not exist', async () => {
      const db = { execute: vi.fn().mockResolvedValue([]) };
      const service = new PlanGenerationService(
        db as never,
        buildWalkingGraphLoader() as never,
        buildForecastService() as never,
        buildCalendarService() as never,
        buildNarrativeService() as never,
        buildSolverLoader() as never,
        buildPersistPlanService() as never,
      );

      await expect(service.generate('nonexistent')).rejects.toThrow('not found');
    });
  });
});
