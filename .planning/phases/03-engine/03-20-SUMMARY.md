---
phase: 03-engine
plan: 20
subsystem: api
tags: [nestjs, forecast, weather, packing-list, rate-limit, cost-alert, wiring]

# Dependency graph
requires:
  - phase: 03-engine (plans 13, 15, 18, 11)
    provides: CostAlertService, RateLimitGuard, PackingListService, ForecastService, WeatherService, CalendarService
provides:
  - CostAlertService.checkHitRate() triggered after every LLM cost write (LLM-06)
  - RateLimitGuard applied to generate-plan endpoint (PLAN-05)
  - PackingListService wired into plan pipeline with DB persistence (PLAN-06)
  - ForecastService.predictWait() hydrates SolverInput.forecasts (FC-01..05)
  - WeatherService.getForecast() hydrates SolverInput.weather
  - CalendarService.getBucket() hydrates SolverInput.crowdCalendar
affects: [04-monetization, phase-3-verification]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Fire-and-forget async call pattern: service.method().catch(err => logger.error(...))"
    - "Best-effort wiring: all new service calls wrapped in try/catch, never blocking the main pipeline"
    - "@Optional() DI for backward-compatible service injection"

key-files:
  created: []
  modified:
    - apps/api/src/narrative/narrative.service.ts
    - apps/api/src/narrative/cost-alert.service.ts
    - apps/api/src/trips/trips.controller.ts
    - apps/api/src/plan-generation/plan-generation.service.ts
    - apps/api/src/plan-generation/plan-generation.module.ts

key-decisions:
  - "CostAlertService.checkHitRate() called inline after writeCostRow (fire-and-forget) rather than BullMQ cron -- more responsive, Redis dedup prevents noise"
  - "WeatherDto field is precipitation_pct (not precipitation_probability) -- aligned packing weather adapter to divide by 100 for PackingWeatherDay 0..1 scale"
  - "sort_index cast to String(i) because packing_list_items.sort_index is TEXT type in Drizzle schema"
  - "Forecast hydration iterates all attractions x 4 time slots per day -- may be slow for large catalogs but acceptable for Phase 3"

patterns-established:
  - "Best-effort service wiring: try/catch with logger.error, never blocking pipeline"

requirements-completed: [LLM-06, PLAN-05, PLAN-06, FC-01, FC-02, FC-03, FC-04, FC-05]

# Metrics
duration: 8min
completed: 2026-04-16
---

# Phase 3 Plan 20: Gap Closure -- Wire CostAlert + RateLimit + PackingList + Forecast Summary

**Four orphaned services (CostAlert, RateLimit, PackingList, Forecast+Weather) wired into production code paths, closing Verification Gaps 2-5**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-16T19:37:32Z
- **Completed:** 2026-04-16T19:46:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- CostAlertService.checkHitRate() now fires after every LLM cost write (fire-and-forget with .catch), closing Gap 2 (LLM-06)
- RateLimitGuard + @RateLimit('free-tier-lifetime') applied to POST /trips/:id/generate-plan, closing Gap 3 (PLAN-05)
- PackingListService.generate() called after plan persist, items written to packing_list_items table, closing Gap 4 (PLAN-06)
- ForecastService.predictWait() called for each attraction at 4 time slots per trip day, hydrating SolverInput.forecasts, closing Gap 5
- WeatherService.getForecast() called for each trip date, hydrating SolverInput.weather
- CalendarService.getBucket() called for each trip date, hydrating SolverInput.crowdCalendar
- Null safety bugs fixed in cost-alert.service.ts (redis and slackAlerter optional checks)

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire CostAlertService + RateLimitGuard (Gaps 2 + 3)** - `fd47f7f` (feat)
2. **Task 2: Wire PackingList + Forecast + Weather into plan pipeline (Gaps 4 + 5)** - `b6b444a` (feat)

## Files Created/Modified
- `apps/api/src/narrative/cost-alert.service.ts` - Fixed null safety for optional redis/slackAlerter deps
- `apps/api/src/narrative/narrative.service.ts` - Added CostAlertService injection + checkHitRate() after writeCostRow
- `apps/api/src/trips/trips.controller.ts` - Added @UseGuards(RateLimitGuard) + @RateLimit('free-tier-lifetime') to generatePlan
- `apps/api/src/plan-generation/plan-generation.service.ts` - Wired forecast/weather/calendar hydration + packing list generation after persist
- `apps/api/src/plan-generation/plan-generation.module.ts` - Added PackingListModule + WeatherModule imports

## Decisions Made
- CostAlertService.checkHitRate() called inline after writeCostRow (fire-and-forget) rather than BullMQ cron -- more responsive alerting, Redis dedup (1h TTL) prevents noise
- WeatherDto uses `precipitation_pct` (integer 0-100), adapted to PackingWeatherDay's `precipitationProbability` (0..1) with division by 100
- sort_index cast to String(i) because packing_list_items schema defines sort_index as TEXT
- Used spread with conditional `refId` to satisfy exactOptionalPropertyTypes (avoids undefined vs missing distinction)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed exactOptionalPropertyTypes error for PackingPlanItem.refId**
- **Found during:** Task 2 (PackingList wiring)
- **Issue:** SolverPlanItem.refId is `string | undefined` but PackingPlanItem.refId is `string?` (optional). With exactOptionalPropertyTypes, these are incompatible.
- **Fix:** Used spread pattern `...(item.refId != null ? { refId: item.refId } : {})` to conditionally include the property
- **Files modified:** apps/api/src/plan-generation/plan-generation.service.ts
- **Committed in:** b6b444a (Task 2 commit)

**2. [Rule 1 - Bug] Fixed WeatherDto field name mismatch**
- **Found during:** Task 2 (Weather hydration)
- **Issue:** Plan referenced `precipitation_probability` and `humidity` but WeatherDto uses `precipitation_pct` and `humidity_pct`
- **Fix:** Used correct field names from WeatherDto interface
- **Files modified:** apps/api/src/plan-generation/plan-generation.service.ts
- **Committed in:** b6b444a (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Both fixes necessary for type safety. No scope creep.

## Issues Encountered
None - pre-existing TS errors (plans.service.ts, cost.test.ts) confirmed as unchanged by these changes.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All four verification gaps (2-5) closed
- Phase 3 engine is now fully wired: solver, narrative, cost alert, rate limiting, packing list, forecast, and weather all connected
- Ready for re-verification to confirm all 5 success criteria pass

---
*Phase: 03-engine*
*Completed: 2026-04-16*
