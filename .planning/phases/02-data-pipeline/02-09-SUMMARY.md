---
phase: 02-data-pipeline
plan: "09"
subsystem: api
tags: [nestjs, redis, ioredis, drizzle, wait-times, crowd-index, weather, live-endpoints]

# Dependency graph
requires:
  - phase: 02-data-pipeline
    plan: "03"
    provides: ParksController stub, CrowdIndexController stub, WeatherController stub
  - phase: 02-data-pipeline
    plan: "04"
    provides: SharedInfraModule @Global() REDIS_CLIENT_TOKEN + DB_TOKEN; wait:{uuid} Redis keys
  - phase: 02-data-pipeline
    plan: "07"
    provides: CrowdIndexService; crowd_index:{slug}:{date} Redis keys
  - phase: 02-data-pipeline
    plan: "08"
    provides: WeatherService.getForecast(dateStr); WeatherModule in AppModule

provides:
  - ParksService: Redis reads for wait times (is_stale computation) + crowd index + weather delegation
  - Live endpoints: GET /v1/parks, GET /v1/parks/:parkId/waits, GET /v1/crowd-index, GET /v1/weather
  - DATA-01, DATA-04, DATA-08 read surface wired and queryable

affects: [02-10, 03-*]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "is_stale computed at read time: (Date.now() - new Date(fetched_at).getTime()) > 5*60*1000"
    - "Redis miss fallback: last row of wait_times_history for graceful degradation"
    - "Promise.all for concurrent 5-key Redis read (crowd index)"
    - "WaitTimeDto nullable fields: minutes/fetched_at/source — attractions with no data included"
    - "ParksService as single dependency hub: controllers delegate to service, not Redis directly"

key-files:
  created:
    - apps/api/src/parks/parks.service.ts
  modified:
    - apps/api/src/parks/parks.controller.ts
    - apps/api/src/parks/parks.module.ts
    - apps/api/src/parks/crowd-index.controller.ts
    - apps/api/src/parks/weather.controller.ts
    - apps/api/src/shared/dto/wait-time.dto.ts

key-decisions:
  - "WaitTimeDto.minutes/fetched_at/source made nullable — plan requires returning attractions with no Redis/DB data (is_stale=true, minutes=null); DTO must support the no-data case"
  - "getCrowdIndex reads Redis keys directly in ParksService (not via CrowdIndexService) — CrowdIndexModule has BullMQ dependency; importing it into AppModule/ParksModule would bring unnecessary worker infrastructure into HTTP process"
  - "DB fallback queries wait_times_history by ride_id UUID — last row with ORDER BY ts DESC LIMIT 1 provides freshest available data when Redis is empty"
  - "parkId param is external_id slug (e.g. 'magic-kingdom') — queries use WHERE parks.external_id = parkId for consistent URL-friendly routing"

requirements-completed: [DATA-01, DATA-04, DATA-08]

# Metrics
duration: 15min
completed: 2026-04-15
---

# Phase 02, Plan 09: Live Ingestion Read Endpoints Summary

**ParksService wiring real Redis reads (wait times + crowd index) and WeatherService delegation into all three live endpoints — replacing 02-03 stubs**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-15T00:17:27Z
- **Completed:** 2026-04-15T00:32:27Z
- **Tasks:** 2
- **Files modified:** 6 (1 created, 5 modified)

## Accomplishments

### Task 1: ParksService + updated ParksModule

- `ParksService.getParks()`: raw SQL query against `parks` table, returns `ParkDto[]` ordered by name
- `ParksService.getWaitTimes(parkId)`: queries `attractions` joined to `parks` on `external_id = parkId`; reads `wait:{uuid}` Redis keys per attraction; falls back to last `wait_times_history` row on Redis miss; computes `is_stale = (Date.now() - new Date(fetched_at)) > 5 * 60 * 1000` at read time; includes attractions even with no data (minutes=null, is_stale=true)
- `ParksService.getCrowdIndex()`: reads 5 Redis keys concurrently with `Promise.all` — `crowd_index:{today}` (global) + `crowd_index:{slug}:{today}` for all 4 parks; returns null-stub on missing key
- `ParksService.getWeather(date)`: delegates to `this.weatherService.getForecast(date)` — single-line delegation
- `ParksModule` updated: imports `WeatherModule` for DI; provides `ParksService`; SharedInfraModule @Global() covers REDIS + DB

### Task 2: Controller wiring

- `ParksController`: GET /v1/parks → `parksService.getParks()`; GET /v1/parks/:parkId/waits → `parksService.getWaitTimes(parkId)`
- `CrowdIndexController`: GET /v1/crowd-index → `parksService.getCrowdIndex()`
- `WeatherController`: GET /v1/weather?date= → `parksService.getWeather(date)` (returns null when date param missing)
- All three controllers inject `ParksService` via constructor; no direct Redis/DB access in controllers

### DTO update (Rule 2 auto-fix)

- `WaitTimeDto.minutes` updated to `number | null` — plan requires returning attractions even with no Redis/DB data
- `WaitTimeDto.fetched_at` updated to `string | null` — same reason
- `WaitTimeDto.source` updated to `WaitTimeSource | null` — same reason

## Task Commits

1. **Task 1: ParksService + ParksModule** - `b6c2233` (feat)
2. **Task 2: Controller wiring** - `dea247a` (feat)

## Files Created/Modified

### Created
- `apps/api/src/parks/parks.service.ts` — ParksService with getParks, getWaitTimes (Redis + DB fallback + is_stale), getCrowdIndex (5 Redis keys), getWeather (delegate)

### Modified
- `apps/api/src/parks/parks.controller.ts` — GET /v1/parks + GET /v1/parks/:parkId/waits with ParksService injection
- `apps/api/src/parks/parks.module.ts` — imports WeatherModule, provides ParksService
- `apps/api/src/parks/crowd-index.controller.ts` — GET /v1/crowd-index delegates to ParksService
- `apps/api/src/parks/weather.controller.ts` — GET /v1/weather?date= delegates to ParksService
- `apps/api/src/shared/dto/wait-time.dto.ts` — minutes/fetched_at/source made nullable with @ApiProperty nullable annotations

## Decisions Made

- **WaitTimeDto nullable fields**: The plan explicitly states "include attractions even if Redis miss (is_stale=true, minutes=null)". The original DTO had `minutes!: number` (non-nullable). Changed to `number | null` (and same for `fetched_at`/`source`) to accurately represent the no-data case. This is a minor DTO expansion, not a breaking change — clients that handle null are already correct.

- **Direct Redis reads for crowd index in ParksService**: The plan suggested using `CrowdIndexService` from `CrowdIndexModule` for the crowd index endpoint. However, `CrowdIndexModule` uses `BullModule.registerQueue` which brings BullMQ queue connections into the HTTP process. Instead, `ParksService` reads the 5 Redis keys directly using `Promise.all` — same keys, same format, no BullMQ dependency overhead.

- **parkId as external_id slug**: The API route is `/v1/parks/:parkId` where parkId is "magic-kingdom", "epcot" etc. (URL-friendly slugs). The DB query joins `attractions` to `parks` on `parks.external_id = $parkId`. Consistent with how `CrowdIndexService` uses park slugs.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] WaitTimeDto nullable fields required for no-data case**
- **Found during:** Task 1 — implementing the "include attractions with no data" requirement
- **Issue:** `WaitTimeDto.minutes` was `number` (non-nullable). Plan says "include attractions even if Redis miss (is_stale=true, minutes=null)". Controller return type would fail TypeScript with `null` assignment to non-nullable field.
- **Fix:** Updated `minutes`, `fetched_at`, `source` to nullable types with updated `@ApiProperty` nullable annotations
- **Files modified:** `apps/api/src/shared/dto/wait-time.dto.ts`
- **Commit:** `b6c2233`

---

**Total deviations:** 1 auto-fixed (Rule 2 - missing critical for correct no-data behavior)
**Impact on plan:** Minimal DTO expansion. The OpenAPI spec will show nullable fields for these properties — expected and correct. Plan 02-10 will regenerate the snapshot.

## Pre-existing Issue (Not Introduced by This Plan)

`apps/api/src/alerting/slack-alerter.service.spec.ts` — was failing before this plan started (pre-existing CJS/ESM setup.ts import issue from 02-02). 93/93 other tests pass; 1 pre-existing failure unchanged.

## Next Phase Readiness

- All three live endpoints are now real implementations (no more 501 stubs for DATA-01/04/08 paths)
- `GET /v1/parks/:parkId/waits` reads live Redis data with is_stale computation — Phase 3 solver can query this
- `GET /v1/crowd-index` returns live hourly-computed crowd scores
- `GET /v1/weather?date=` returns cached OpenWeather data on demand
- Plan 02-10 can regenerate the OpenAPI snapshot (DTO changes cause expected drift)

## Self-Check: PASSED

- `apps/api/src/parks/parks.service.ts` — exists, 258 lines
- `apps/api/src/parks/parks.module.ts` — modified, imports WeatherModule
- `b6c2233` Task 1 commit — verified in git log
- `dea247a` Task 2 commit — verified in git log
- `tsc --noEmit` — 0 errors

---
*Phase: 02-data-pipeline*
*Completed: 2026-04-15*
