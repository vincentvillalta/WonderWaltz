---
phase: 02-data-pipeline
plan: "07"
subsystem: crowd-index
tags: [bullmq, ioredis, nestjs, redis, drizzle, percentile, tdd, crowd-index]

# Dependency graph
requires:
  - phase: 02-data-pipeline
    plan: "01"
    provides: WorkerModule root, BullModule.forRoot, SharedInfraModule
  - phase: 02-data-pipeline
    plan: "02"
    provides: AlertingModule, SlackAlerterService for dead-letter
  - phase: 02-data-pipeline
    plan: "04"
    provides: SharedInfraModule @Global(), REDIS_CLIENT_TOKEN + DB_TOKEN, DB_TOKEN export

provides:
  - CrowdIndexService: bootstrap formula, percentile calculation, auto-switch gate, 5 Redis keys
  - CrowdIndexProcessor: BullMQ processor concurrency=1, upsertJobScheduler hourly cron, dead-letter
  - CrowdIndexModule: 'crowd-index' queue registration + service wiring
  - DATA-04 acceptance criteria satisfied by unit tests

affects: [02-08, 02-09, 02-10, 02-11, 02-12]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "percentile_cont(0.0/0.5/0.95) in raw sql template — p0/p50/p95 anchor-point percentile distribution"
    - "Linear interpolation between [p0→0, p50→50, p95→95] — clamp at 95 in percentile mode"
    - "Bootstrap auto-switch: getSampleSizeDays() COUNT(DISTINCT DATE(ts)) >= 30 at runtime"
    - "park-balanced top-20: top 5 per park × 4 parks (not top 20 globally) — MK headliners don't dominate"
    - "Inline makeRedisClient() in spec files — same CJS setup.js avoidance pattern as 02-04"
    - "CrowdIndexValue type: { value: number|null, confidence: 'bootstrap'|'percentile', sample_size_days: number }"

key-files:
  created:
    - apps/api/src/crowd-index/crowd-index.service.ts
    - apps/api/src/crowd-index/crowd-index.service.spec.ts
    - apps/api/src/crowd-index/crowd-index.processor.ts
    - apps/api/src/crowd-index/crowd-index.processor.spec.ts
    - apps/api/src/crowd-index/crowd-index.module.ts
  modified:
    - apps/api/src/worker.module.ts

key-decisions:
  - "percentile_cont SQL uses rideUuids.map(id => `'${id}'`).join(', ') with sql.raw() for IN clause — uuids are trusted from our own DB queries, not user input; avoids Drizzle array binding complexity with percentile_cont CTEs"
  - "getTopRidesForPark runs one query per park (4 queries) then one global computeIndexForRides — acceptable for hourly cron; not worth CTE complexity to batch"
  - "Bootstrap mode runs computeIndexForRides to get avg_wait even in bootstrap phase — avoids null value for parks with any history; returns null only when truly no data"
  - "computeBootstrap and computePercentileIndex are pure functions (no DI, no async) — enables direct unit testing without mock setup"
  - "CrowdIndexModule exports CrowdIndexService — API HTTP layer (GET /v1/crowd-index endpoint, future plan) can import and read Redis keys without re-querying DB"

requirements-completed: [DATA-04]

# Metrics
duration: 38min
completed: 2026-04-14
---

# Phase 02, Plan 07: Crowd Index Worker Summary

**CrowdIndexService (bootstrap + percentile formulas, 5 Redis keys, auto-switch at 30-day threshold) and CrowdIndexProcessor (BullMQ hourly cron, dead-letter via Sentry + Slack) wired into WorkerModule, satisfying DATA-04**

## Performance

- **Duration:** ~38 min
- **Started:** 2026-04-14T20:55:32Z
- **Completed:** 2026-04-14T21:33:54Z
- **Tasks:** 2
- **Files modified:** 6 (5 created, 1 modified)

## Accomplishments

- `CrowdIndexService`: pure formula functions (`computeBootstrap`, `computePercentileIndex`), DB queries (`getSampleSizeDays`, `getTopRidesForPark`, `computeIndexForRides` with Pattern 7 percentile_cont SQL), `refreshAll()` auto-switches mode based on `sampleSizeDays >= 30`, `writeToRedis()` writes all 5 keys with EX 7200
- `CrowdIndexProcessor`: BullMQ `@Processor('crowd-index', {concurrency:1})`, `onModuleInit` calls `upsertJobScheduler` with cron `'0 * * * *'`, `process()` calls `crowdIndexService.refreshAll(today)`, dead-letter triggers Sentry + SlackAlerterService when `attemptsMade >= maxAttempts`
- `CrowdIndexModule`: registers `'crowd-index'` BullMQ queue, imports `AlertingModule`, exports `CrowdIndexService`
- `WorkerModule`: `CrowdIndexModule` added to imports
- 24 unit tests covering DATA-04a/04b/04c/04d acceptance criteria; all 24 pass

## Task Commits

1. **Task 1: CrowdIndexService + specs (TDD)** - `a1f66c2` (test + feat combined via lint-staged)
2. **Task 2: CrowdIndexProcessor + CrowdIndexModule** - `200c0fe` (feat)

## Files Created/Modified

- `apps/api/src/crowd-index/crowd-index.service.ts` - computeBootstrap(), computePercentileIndex(), getSampleSizeDays(), getTopRidesForPark(), computeIndexForRides() (Pattern 7 percentile_cont SQL), refreshAll(), writeToRedis()
- `apps/api/src/crowd-index/crowd-index.service.spec.ts` - 18 tests: DATA-04a (bootstrap formula × 4), DATA-04b (percentile formula × 6), DATA-04c (5 Redis keys × 3), DATA-04d (confidence metadata × 5)
- `apps/api/src/crowd-index/crowd-index.processor.ts` - @Processor concurrency=1, upsertJobScheduler '0 * * * *', onFailed dead-letter, onCompleted reset counter
- `apps/api/src/crowd-index/crowd-index.processor.spec.ts` - 6 tests: scheduler cron pattern, refreshAll date arg, Sentry dead-letter, Slack dead-letter, transient no-alert, onCompleted reset
- `apps/api/src/crowd-index/crowd-index.module.ts` - BullModule.registerQueue + AlertingModule import, CrowdIndexService export
- `apps/api/src/worker.module.ts` - added CrowdIndexModule import

## Decisions Made

- `computeBootstrap` and `computePercentileIndex` are pure functions — no injection, no async. This enables clean unit testing with direct invocation (no mock setup) and matches the plan spec for DATA-04a/04b.
- `refreshAll()` calls `computeIndexForRides` for both bootstrap and percentile modes. Even in bootstrap mode, fetching `avg_wait` from recent data is more accurate than a static default. When no data is available (empty top-rides or no history), `value` is `null` — clients are expected to handle null gracefully.
- The `IN (...)` clause in `computeIndexForRides` uses `sql.raw(uuidList)` where `uuidList` is built from ride UUIDs returned by our own `getTopRidesForPark` queries. These are internal UUIDs, not user-supplied strings — safe to use with `sql.raw()`.
- `CrowdIndexModule` exports `CrowdIndexService` so future API HTTP endpoints (GET /v1/crowd-index) can read the Redis keys via the service rather than building a separate Redis reader.

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written. The inline `makeRedisClient()` pattern (documented from 02-04) was applied proactively for the spec files, avoiding the CJS setup.js issue before it could surface.

---

**Total deviations:** 0
**Impact on plan:** Clean execution. All plan artifacts delivered as specified.

## Pre-existing Issue (Not Introduced by This Plan)

`apps/api/src/alerting/slack-alerter.service.spec.ts` — was failing before this plan started (pre-existing CJS mock issue from 02-02). Not introduced or worsened by this plan. Deferred item tracked in 02-04 SUMMARY.

## Next Phase Readiness

- CrowdIndexModule wired into WorkerModule — deploying the worker process starts the hourly crowd index computation
- Bootstrap mode (confidence='bootstrap') will run for the first 30 days; auto-switches to percentile mode on day 31
- All 5 Redis keys (`crowd_index:{date}`, `crowd_index:{park-slug}:{date}` × 4) available for API HTTP endpoints
- DATA-04a, DATA-04b, DATA-04c, DATA-04d acceptance criteria satisfied by unit tests
- `CrowdIndexService` exported and available for GET /v1/crowd-index endpoint (future plan)

---
*Phase: 02-data-pipeline*
*Completed: 2026-04-14*
