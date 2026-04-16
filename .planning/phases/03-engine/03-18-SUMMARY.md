---
phase: 03-engine
plan: 18
subsystem: api
tags: [nestjs, packing-list, affiliate, amazon-associates, rules-engine, determinism]

requires:
  - phase: 03-engine
    plan: 17
    provides: PlansService.getPlan with entitlement projection
  - phase: 03-engine
    plan: 04
    provides: SolverInput/DayPlan types with guest ages and weather
provides:
  - "PackingListService.generate() -- deterministic rules engine for packing list generation"
  - "AffiliateService.rewriteUrl() -- Amazon Associates tag injection at read time"
  - "PlansService packing list integration at GET /v1/plans/:id serialization"
  - "PackingListModule registered in AppModule"
affects:
  - Phase 4 (AMAZON_ASSOCIATES_TAG env var provisioning)
  - Phase 8 (LEGL-03 compliance verified -- raw tag never exposed to client)

tech-stack:
  added: []
  patterns:
    - "Deterministic rules engine: ordered item generation from weather + guest + plan inputs"
    - "Affiliate URL rewriting at serialization time (never at storage time)"
    - "Optional DI injection (@Optional) for backwards-compatible service extension"

key-files:
  created:
    - apps/api/src/packing-list/packing-list.service.ts
    - apps/api/src/packing-list/packing-list.module.ts
    - apps/api/src/packing-list/affiliate.service.ts
    - apps/api/tests/packing-list/packing-list.service.test.ts
    - apps/api/tests/packing-list/affiliate.test.ts
  modified:
    - apps/api/src/plans/plans.service.ts
    - apps/api/src/plans/plans.module.ts
    - apps/api/src/app.module.ts

key-decisions:
  - "AffiliateService uses @Optional() injection in PlansService -- existing tests pass without providing it; new tests explicitly inject it"
  - "Packing list loaded via LEFT JOIN on affiliate_items at serialization time -- URLs rewritten in-memory, never stored with tag"
  - "Water rides hardcoded as a Set (not tagged in attractions.yaml) -- attractions.yaml has no gets_wet field; Set is simple and deterministic"
  - "Amazon Associates tag defaults to 'wonderwaltz-20' but sourced from AMAZON_ASSOCIATES_TAG env var -- configurable without code change"

patterns-established:
  - "Packing list rules: baseline items always included, weather/guest/mobility/water-ride rules additive"
  - "Affiliate rewrite at read time, not write time -- storage is tag-free for portability"

requirements-completed: [PLAN-06]

# Metrics
duration: 6 min
completed: 2026-04-16
---

# Phase 03 Plan 18: Packing List Generator + Affiliate Tag Injection Summary

**Deterministic packing list rules engine (weather + guest ages + mobility + water rides) with server-side Amazon Associates tag injection at GET /plans/:id serialization time -- LEGL-03 compliant, 29 tests covering all rules + affiliate contract.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-04-16T18:35:52Z
- **Completed:** 2026-04-16T18:42:00Z
- **Tasks:** 2 (both TDD, combined RED+GREEN)
- **Tests added:** 29 (17 packing rules + 12 affiliate)
- **Files:** 5 created, 3 modified

## Accomplishments

- `PackingListService.generate()` deterministic rules engine: baseline items (sunscreen, water bottle, phone charger, park map, rain poncho) always included; conditional items added by weather (cooling towel >= 85F, rain jacket >= 50% precip), guest ages (stroller/snacks for 0-6, autograph book for 3-9), mobility (ECV backup), and water rides (quick-dry clothes + ziploc for Splash Mountain, Kali River Rapids, etc.).
- `AffiliateService.rewriteUrl()` rewrites Amazon URLs with Associates tag at read time. Handles existing query params, replaces existing tag= param, passes through non-Amazon URLs. Tag sourced from `AMAZON_ASSOCIATES_TAG` env var (default: `wonderwaltz-20`).
- `PlansService.getPlan()` extended to load `packing_list_items` with LEFT JOIN on `affiliate_items`, rewrite all Amazon URLs through `AffiliateService`, and include the packing list in the plan response. Packing list omitted from response when empty (no items).
- Response serialization contract test scans all Amazon URLs in mock response and asserts every one contains `tag=wonderwaltz-20` -- prevents tag leakage regression.
- `PackingListModule` registered in `AppModule`; `PlansModule` imports `PackingListModule` for `AffiliateService` DI injection.

## Task Commits

1. **Task 1: PackingListService rules engine** -- `7f6741b` (feat)
2. **Task 2: AffiliateService + plans.service integration** -- `d90d8c7` (feat)

## Files Created/Modified

### Created

- `apps/api/src/packing-list/packing-list.service.ts` -- deterministic packing list rules engine
- `apps/api/src/packing-list/packing-list.module.ts` -- NestJS module exporting PackingListService + AffiliateService
- `apps/api/src/packing-list/affiliate.service.ts` -- Amazon Associates URL rewriting with env-configurable tag
- `apps/api/tests/packing-list/packing-list.service.test.ts` -- 17 table-driven tests for all packing rules + determinism
- `apps/api/tests/packing-list/affiliate.test.ts` -- 12 tests for URL rewriting + env override + contract scan

### Modified

- `apps/api/src/plans/plans.service.ts` -- added packing list loading + affiliate URL rewriting at serialization
- `apps/api/src/plans/plans.module.ts` -- imports PackingListModule for AffiliateService injection
- `apps/api/src/app.module.ts` -- registered PackingListModule

## Decisions Made

- **Water rides as hardcoded Set:** attractions.yaml does not have a `gets_wet` field. Hardcoding known water rides as a Set is simpler and avoids a catalog schema change for a handful of rides.
- **@Optional() AffiliateService injection:** PlansService constructor uses `@Optional()` for AffiliateService so existing e2e tests (which construct PlansService with only a DB mock) continue working. New code paths gracefully degrade when AffiliateService is absent.
- **LEFT JOIN on affiliate_items:** Packing list items may or may not have an associated affiliate item. LEFT JOIN + null-safe URL rewrite handles both cases.
- **Tag from env var:** `AMAZON_ASSOCIATES_TAG` is the single source of truth. Default `wonderwaltz-20` is a placeholder documented for Phase 8 swap.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Unused `vi` import in affiliate.test.ts**
- **Found during:** Task 2 (commit)
- **Issue:** `vi` imported from vitest but not used -- ESLint `no-unused-vars` error.
- **Fix:** Removed unused import.
- **Files modified:** `apps/api/tests/packing-list/affiliate.test.ts`
- **Committed in:** `d90d8c7` (Task 2 commit, after re-stage)

---

**Total deviations:** 1 auto-fixed (1 lint bug). None required user approval.
**Impact on plan:** Trivial lint fix. No scope creep.

## Authentication Gates

None -- all tests use mocked infrastructure.

## Issues Encountered

- ESLint pre-commit hook caught one unused import in Task 2 commit. Fixed inline and re-staged.
- All 349 tests (44 files) pass consistently.

## User Setup Required

None -- no external service configuration required. `AMAZON_ASSOCIATES_TAG` env var is optional (defaults to `wonderwaltz-20`).

## Next Phase Readiness

Plan 03-18 is the LAST PLAN of Phase 3. All 18 plans complete:

- **Phase 3 delivers:** Full plan generation pipeline from POST to GET, including solver, narrative, persistence, entitlement projection, packing list, and affiliate integration.
- **Phase 4 (auth):** Auth middleware wires `request.user` for RateLimitGuard + CircuitBreakerService. IAP top-up flow consumes the 402 contract. `AMAZON_ASSOCIATES_TAG` env var provisioned in production.
- **Phase 5+ (mobile):** Clients consume all three endpoints (generate-plan, rethink-today, plans/:id) with packing list items already affiliate-tagged in the response.

---

*Phase: 03-engine*
*Completed: 2026-04-16*

## Self-Check: PASSED

- All 5 created files present on disk.
- All 2 task commits present in git log (7f6741b, d90d8c7).
- `pnpm --filter @wonderwaltz/api test --run` -> 44 files, 349 tests, 0 failures.
