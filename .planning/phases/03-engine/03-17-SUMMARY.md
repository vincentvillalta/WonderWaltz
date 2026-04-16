---
phase: 03-engine
plan: 17
subsystem: api
tags: [nestjs, bullmq, entitlement, controller, endpoint, discriminated-union, projection]

requires:
  - phase: 03-engine
    plan: 16
    provides: PlanGenerationService.generate(tripId) orchestrator + PersistPlanService
  - phase: 03-engine
    plan: 15
    provides: RateLimitGuard + @RateLimit decorator for endpoint rate limiting
  - phase: 03-engine
    plan: 14
    provides: CircuitBreakerService.checkBudget for 402 budget enforcement
  - phase: 03-engine
    plan: 03
    provides: FullDayPlanDto, LockedDayPlanDto, RethinkRequestDto, PlanBudgetExhaustedDto
provides:
  - "POST /v1/trips/:id/generate-plan -- 202 + plan_job_id with budget check"
  - "POST /v1/trips/:id/rethink-today -- 202 + plan_job_id with in-progress inference + LL hard pins"
  - "GET /v1/plans/:id -- PlanDto with discriminated-union days (FullDayPlan | LockedDayPlan)"
  - "PlansService.getPlan(planId) -- entitlement-based projection (free: Day 0 full + Days 1+ locked)"
  - "PlansModule -- standalone NestJS module for plan retrieval"
affects:
  - Phase 4 (auth middleware wires request.user for RateLimitGuard resolution)
  - Phase 4 (entitlements wire top-up IAP flow from 402 response)
  - Phase 5+ (mobile clients consume these three endpoints)

tech-stack:
  added: []
  patterns:
    - "Controller-level budget check via CircuitBreakerService before BullMQ enqueue"
    - "In-progress item inference: current_time within solver item window = pinned"
    - "Entitlement projection pattern: free tier Day 0 full, Days 1+ locked with templated headline"
    - "PlansModule separate from TripsModule for clean controller separation"

key-files:
  created:
    - apps/api/src/plans/plans.controller.ts
    - apps/api/src/plans/plans.service.ts
    - apps/api/src/plans/plans.module.ts
    - apps/api/tests/e2e/generate-plan.e2e.test.ts
    - apps/api/tests/e2e/rethink-today.e2e.test.ts
    - apps/api/tests/e2e/get-plan-projection.e2e.test.ts
    - apps/api/tests/e2e/plan-roundtrip.e2e.test.ts
  modified:
    - apps/api/src/trips/trips.controller.ts
    - apps/api/src/trips/trips.module.ts
    - apps/api/src/app.module.ts

key-decisions:
  - "PlansModule as standalone module (not inside TripsModule) -- clean controller separation; plans have their own service layer for projection logic"
  - "Old PlansController stub moved from trips/ to plans/ directory -- PlansService injection requires its own module"
  - "In-progress inference uses UTC minutes-since-midnight comparison against HH:MM plan_items times -- timezone-naive, matches solver convention from 03-07"
  - "BullMQ queue injected via @InjectQueue('plan-generation') -- standard NestJS BullMQ pattern matching existing processors"
  - "PlansService.getPlan returns null (not throws) for missing plans -- controller maps to 404, keeps service testable without HTTP exceptions"

patterns-established:
  - "Entitlement projection: free tier gets Day 0 full + Days 1+ locked with deterministic templated headline"
  - "Budget check at controller layer before BullMQ enqueue -- fail fast on 402"
  - "Rethink in-progress inference: filter plan_items by current_time window, exclude completed, return pinned IDs"

requirements-completed: [PLAN-04]

# Metrics
duration: 31 min
completed: 2026-04-16
---

# Phase 03 Plan 17: HTTP Endpoints Summary

**Three HTTP endpoints wired: POST generate-plan (202 enqueue), POST rethink-today (in-progress inference + LL hard pins), GET plans/:id (entitlement-based FullDayPlan/LockedDayPlan projection) with 20 e2e tests covering the full generate-to-view roundtrip.**

## Performance

- **Duration:** 31 min
- **Started:** 2026-04-16T18:00:26Z
- **Completed:** 2026-04-16T18:31:00Z
- **Tasks:** 3 (all TDD, combined RED+GREEN)
- **Tests added:** 20
- **Files:** 7 created, 3 modified

## Accomplishments

- `POST /v1/trips/:id/generate-plan` replaces 501 stub with full implementation: CircuitBreakerService budget check (402 on exhaustion), BullMQ job enqueue with `{ tripId, kind: 'initial' }`, returns 202 + `{ job_id }`. Configured with 5 attempts, 30s fixed backoff.
- `POST /v1/trips/:id/rethink-today` accepts RethinkRequestDto, computes in-progress inference (items where current_time falls within start/end window and not completed), converts active_ll_bookings to hard pins, enqueues `{ tripId, kind: 'rethink', rethinkInput }`.
- `GET /v1/plans/:id` via new PlansController + PlansService with entitlement projection: unlocked users see all days as FullDayPlanDto; free-tier sees Day 0 full + Days 1+ as LockedDayPlanDto with templated headline (`"Your {park} {budgetTier} day centers on {topScoredItem}."`) and totalItems counting all item types.
- PlansModule registered in AppModule; old PlansController stub removed from TripsModule.
- Low-confidence forecast days trigger `meta.forecast_disclaimer = 'Beta Forecast'` on the PlanDto response.
- E2E roundtrip test proves POST generate-plan -> GET plans/:id returns structured PlanDto with correct projection for both free and unlocked tiers, within 30s runtime budget.

## Task Commits

1. **Task 1: trips.controller -- generatePlan + rethinkToday** -- `5557656` (feat)
2. **Task 2: plans.controller + plans.service with entitlement projection** -- `84aca6c` (feat)
3. **Task 3: E2E roundtrip test** -- `ea3de72` (feat)

## Files Created/Modified

### Created

- `apps/api/src/plans/plans.controller.ts` -- GET /v1/plans/:id with 404 handling
- `apps/api/src/plans/plans.service.ts` -- entitlement projection: loads plan + days + items, projects FullDayPlan or LockedDayPlan
- `apps/api/src/plans/plans.module.ts` -- standalone NestJS module for plans
- `apps/api/tests/e2e/generate-plan.e2e.test.ts` -- 4 tests: 202 + job_id, BullMQ job data, 402 budget exhausted, 402 body shape
- `apps/api/tests/e2e/rethink-today.e2e.test.ts` -- 6 tests: 202, rethink kind, in-progress inference, completed exclusion, LL hard pins, 402
- `apps/api/tests/e2e/get-plan-projection.e2e.test.ts` -- 7 tests: unlocked all-full, free Day 0 full / Days 1+ locked, headline template, totalItems all types, low-confidence meta, 404, shape
- `apps/api/tests/e2e/plan-roundtrip.e2e.test.ts` -- 3 tests: full roundtrip unlocked, free-tier projection, warnings array

### Modified

- `apps/api/src/trips/trips.controller.ts` -- replaced 501 stubs with generatePlan + rethinkToday implementations
- `apps/api/src/trips/trips.module.ts` -- added BullModule.registerQueue('plan-generation'), PlanGenerationModule import; removed old PlansController
- `apps/api/src/app.module.ts` -- registered PlansModule

## Decisions Made

- **PlansModule standalone:** The old PlansController was a 501 stub inside TripsModule. Since the new PlansService needs DB injection for the entitlement projection query, a dedicated PlansModule is cleaner than inflating TripsModule's provider list.
- **Null return for missing plans:** PlansService.getPlan returns null instead of throwing HttpException. The controller maps null to 404. This keeps the service testable without NestJS HTTP context.
- **UTC minutes-since-midnight for in-progress inference:** Matches the timezone-naive arithmetic established in solver 03-07. Plan items store HH:MM strings; current_time ISO is converted to minutes-since-midnight for comparison.
- **Budget check before enqueue:** CircuitBreakerService.checkBudget runs in the controller before BullMQ queue.add. This is a fail-fast optimization -- a trip already over budget never enters the queue.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Unused import in generate-plan test**
- **Found during:** Task 1 (commit)
- **Issue:** `RateLimitService` imported but not used in generate-plan.e2e.test.ts -- ESLint `no-unused-vars` error.
- **Fix:** Removed unused import.
- **Files modified:** `apps/api/tests/e2e/generate-plan.e2e.test.ts`
- **Committed in:** `5557656` (Task 1 commit, after re-stage)

**2. [Rule 1 - Bug] Unused import in get-plan-projection test**
- **Found during:** Task 2 (commit)
- **Issue:** `beforeEach` imported but not used in get-plan-projection.e2e.test.ts -- ESLint `no-unused-vars` error.
- **Fix:** Removed unused import.
- **Files modified:** `apps/api/tests/e2e/get-plan-projection.e2e.test.ts`
- **Committed in:** `84aca6c` (Task 2 commit, after re-stage)

---

**Total deviations:** 2 auto-fixed (2 lint bugs). None required user approval.
**Impact on plan:** Trivial lint fixes. No scope creep.

## Authentication Gates

None -- all tests use mocked infrastructure. Rate limit guards (`@UseGuards(RateLimitGuard)` + `@RateLimit`) are ready for wiring but require Phase 4 auth middleware to populate `request.user`. Currently, the `x-anon-user-id` header stub from 03-15 provides the userId.

## Issues Encountered

- ESLint pre-commit hook caught two unused imports across task 1 and task 2 commits. Fixed inline and re-staged.
- No test flakes; all 319 tests (42 files) pass consistently.

## User Setup Required

None -- no external service configuration required.

## Next Phase Readiness

All three user-visible HTTP endpoints for Phase 3 are wired:

- **03-18 (final plan):** Can proceed with any remaining Phase 3 cleanup or integration.
- **Phase 4 (auth):** Auth middleware populates `request.user.id` and `request.user.isUnlocked` -- RateLimitGuard + CircuitBreakerService are ready. The 402 response body is published for the top-up paywall.
- **Phase 5+ (mobile):** Clients can POST generate-plan, poll GET plans/:id, and POST rethink-today. Free-tier sees Day 0 full + locked summary cards; unlocked sees all days.

The full Phase 3 pipeline is proven end-to-end: POST generate-plan -> BullMQ job -> solver + narrative + persist -> GET plans/:id with entitlement projection.

---

*Phase: 03-engine*
*Completed: 2026-04-16*

## Self-Check: PASSED

- All 7 created files present on disk.
- All 3 task commits present in git log (5557656, 84aca6c, ea3de72).
- `pnpm --filter @wonderwaltz/api test --run` -> 42 files, 319 tests, 0 failures.
