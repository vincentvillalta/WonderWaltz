---
phase: 02-data-pipeline
plan: "08"
subsystem: api
tags: [openweather, ioredis, redis, nestjs, cache-aside, vitest, tdd, weather]

# Dependency graph
requires:
  - phase: 02-data-pipeline
    plan: "01"
    provides: REDIS_CLIENT_TOKEN, SharedInfraModule pattern
  - phase: 02-data-pipeline
    plan: "04"
    provides: SharedInfraModule @Global() REDIS_CLIENT_TOKEN provider

provides:
  - WeatherService: on-demand cache-aside weather forecast; OpenWeather One Call 3.0; 8-day horizon cap; 6hr TTL
  - WeatherModule: exported provider for HTTP endpoints; registered in AppModule
  - WeatherDto interface: { high_f, low_f, condition, precipitation_pct, humidity_pct, uv_index }

affects: [02-09, 02-10, 02-11, 02-12]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "On-demand cache-aside pattern: check Redis first, fetch on miss, cache all 8 days, return requested date"
    - "UTC-based date comparison for horizon checks — avoids local-timezone drift across server environments"
    - "1 API call → 8 Redis keys: fetch full 8-day forecast and cache each day simultaneously"
    - "SharedInfraModule @Global() reuse: WeatherModule gets REDIS_CLIENT_TOKEN without re-declaring it"
    - "Best-effort null return: any error (network, Redis, parse) silently returns null — no throws from getForecast"

key-files:
  created:
    - apps/api/src/weather/weather.service.ts
    - apps/api/src/weather/weather.service.spec.ts
    - apps/api/src/weather/weather.module.ts
  modified:
    - apps/api/src/app.module.ts

key-decisions:
  - "UTC-based date comparison in isWithinHorizon — new Date().toISOString().split('T')[0] for today string, then compare with T00:00:00Z suffix for both sides; avoids local-timezone skewing diffDays in non-UTC server environments"
  - "WeatherModule added to AppModule (HTTP side), not WorkerModule — plan 02-09 will inject WeatherService from HTTP endpoints"
  - "SharedInfraModule imported in AppModule to provide REDIS_CLIENT_TOKEN globally to WeatherService"
  - "diffDays <= 7 (not < 8) gives 8 days total: today (index 0) through 7 days from now (index 7)"

requirements-completed: [DATA-08]

# Metrics
duration: 27min
completed: 2026-04-15
---

# Phase 02, Plan 08: OpenWeather Cache-Aside Module Summary

**WeatherService with Redis cache-aside, 6hr TTL, 8-day horizon cap, and 1-API-call-for-8-days optimization; registered in AppModule for Phase 02-09 weather endpoint**

## Performance

- **Duration:** ~27 min
- **Started:** 2026-04-14T21:38:26Z
- **Completed:** 2026-04-15T00:05:00Z
- **Tasks:** 1
- **Files modified:** 4 (3 created, 1 modified)

## Accomplishments

- `WeatherService`: `getForecast(dateStr)` checks Redis first; on miss fetches OpenWeather One Call 3.0 with `units=imperial`; caches all 8 days simultaneously (EX 21600); returns null beyond 8-day horizon or on any error
- `WeatherModule`: no BullMQ, no scheduler — pure on-demand service; exported for HTTP layer injection
- `AppModule` updated: imports `SharedInfraModule` (for `REDIS_CLIENT_TOKEN`) + `WeatherModule`; ready for plan 02-09 endpoint wiring
- 30 unit tests covering all four DATA-08 acceptance criteria: horizon skip (DATA-08a), cache hit (DATA-08b), cache miss with 8-key caching (DATA-08c), API failure null (DATA-08d)

## Task Commits

1. **Task 1: WeatherService — cache-aside + OpenWeather + horizon cap + WeatherModule** - `cd19977` (feat)

## Files Created/Modified

- `apps/api/src/weather/weather.service.ts` — getForecast(), isWithinHorizon(), fetchAndCacheAll(); UTC date comparison; imperial units
- `apps/api/src/weather/weather.service.spec.ts` — 30 tests: DATA-08a/08b/08c/08d + boundary checks; inline makeRedisClient(); vi.stubGlobal('fetch')
- `apps/api/src/weather/weather.module.ts` — @Module providers/exports WeatherService only; no BullMQ
- `apps/api/src/app.module.ts` — added SharedInfraModule + WeatherModule to imports

## Decisions Made

- UTC-based date comparison chosen for `isWithinHorizon` to be environment-agnostic. Initial implementation used `today.setHours(0,0,0,0)` (local time) which failed in GMT+2 test environment. Fixed to `new Date().toISOString().split('T')[0]` for UTC today, then compare both sides with `T00:00:00Z` suffix.
- `SharedInfraModule` added to `AppModule` imports (it was only in `WorkerModule` previously). WeatherService needs `REDIS_CLIENT_TOKEN` on the HTTP side.
- `diffDays <= 7` (not `< 8`) — plan spec says "diffDays >= 0 && diffDays <= 7" which gives 8 days total: index 0 (today) through index 7 (7 days out), matching One Call 3.0's `daily[0..7]`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] UTC vs local timezone skew in isWithinHorizon**
- **Found during:** Task 1 — GREEN phase, test run
- **Issue:** `today.setHours(0,0,0,0)` gives local midnight; `new Date(dateStr)` without timezone suffix is parsed as UTC midnight. In GMT+2 environment, local midnight is UTC 22:00 of the previous calendar day, making `dateFromNow(0)` return yesterday's UTC date, so diffDays = -0.91 and today is considered "outside horizon"
- **Fix:** Changed both sides to use UTC: `new Date().toISOString().split('T')[0]` for today string; `new Date(dateStr + 'T00:00:00Z')` for target. Also updated `dateFromNow()` in the spec to use `Date.UTC()` for consistency
- **Files modified:** `apps/api/src/weather/weather.service.ts`, `apps/api/src/weather/weather.service.spec.ts`
- **Verification:** All 30 tests pass including boundary checks (today=true, 7d=true, 8d=false, past=false)
- **Committed in:** `cd19977`

---

**Total deviations:** 1 auto-fixed (1 Rule 1 bug)
**Impact on plan:** Fix necessary for correctness in non-UTC server environments. No scope change.

## Issues Encountered

Pre-existing `apps/api/src/alerting/slack-alerter.service.spec.ts` failure (CJS/ESM setup.ts import issue) — not introduced by this plan, documented in 02-04 SUMMARY as a known pre-existing issue.

## Next Phase Readiness

- `WeatherService` exported from `WeatherModule` → ready for plan 02-09 to inject into the weather HTTP endpoint
- `WeatherModule` in `AppModule` → HTTP process can resolve the dependency without additional wiring
- `DATA-08` acceptance criteria satisfied by unit tests

---
*Phase: 02-data-pipeline*
*Completed: 2026-04-15*
