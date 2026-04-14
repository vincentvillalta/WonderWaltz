---
phase: 02-data-pipeline
plan: "05"
subsystem: ingestion
tags: [bullmq, ioredis, nestjs, redis, drizzle, themeparks-wiki, vitest, tdd, park-hours]

# Dependency graph
requires:
  - phase: 02-data-pipeline
    plan: "01"
    provides: WorkerModule root, BullModule.forRoot, global ioredis/Sentry mocks
  - phase: 02-data-pipeline
    plan: "02"
    provides: AlertingModule, SlackAlerterService, LagAlertService
  - phase: 02-data-pipeline
    plan: "04"
    provides: SharedInfraModule (REDIS_CLIENT_TOKEN + DB_TOKEN), IngestionModule, QueueTimesService

provides:
  - ThemeparksService: HTTP fetch /schedule + /live endpoints; Redis write park_hours + showtimes;
      DB insert wait_times_history with source='themeparks-wiki'
  - ThemeparksProcessor: BullMQ @Processor('park-hours') concurrency=1; upsertJobScheduler cron
      '0 1,7,13,19 * * *'; dead-letter via Sentry + SlackAlerterService
  - IngestionModule: now registers both 'wait-times' and 'park-hours' queues

affects: [02-06, 02-07, 02-08, 02-09, 02-10, 02-11, 02-12]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Same duck-typed DrizzleDb interface as QueueTimesService — avoids @wonderwaltz/db dist-path mismatch"
    - "Cron pattern upsertJobScheduler (not every:ms) for staggered 6hr schedule — avoids simultaneous firing"
    - "Redis timestamp comparison for conflict resolution: overwrite wait:{uuid} only if fetched_at more recent"
    - "SHOW entities write showtimes:{parkUuid}:{date} Redis keys; ATTRACTION entities write wait_times_history"
    - "Bootstrap mock updated to handle multiple BullMQ queue registrations dynamically"

key-files:
  created:
    - apps/api/src/ingestion/themeparks.service.ts
    - apps/api/src/ingestion/themeparks.service.spec.ts
    - apps/api/src/ingestion/themeparks.processor.ts
    - apps/api/tests/fixtures/themeparks-wiki-schedule-response.json
  modified:
    - apps/api/src/ingestion/ingestion.module.ts
    - apps/api/src/worker.bootstrap.spec.ts

key-decisions:
  - "ThemeparksProcessor uses cron '0 1,7,13,19 * * *' (not every: 21600000ms) to stagger from queue-times"
  - "Conflict resolution for wait:{uuid}: read existing Redis key, compare fetched_at, skip write if existing is same age or newer"
  - "duck-typed DrizzleDb interface reused from QueueTimesService — same @wonderwaltz/db dist-path workaround"
  - "bootstrap spec BullMQ mock generalized to handle any number of queue names via mockImplementation"

requirements-completed: [DATA-02]

# Metrics
duration: 5min
completed: 2026-04-14
---

# Phase 02, Plan 05: themeparks.wiki secondary ingestion worker Summary

**ThemeparksService (schedule + live HTTP + Redis + DB) and ThemeparksProcessor (BullMQ 6hr cron, dead-letter) registered in IngestionModule alongside QueueTimesProcessor — DATA-02 park hours + entertainment pipeline complete**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-04-14T18:46:22Z
- **Completed:** 2026-04-14T18:51:20Z
- **Tasks:** 2
- **Files modified:** 6 (4 created, 2 modified)

## Accomplishments

- `ThemeparksService`: polls themeparks.wiki `/schedule` endpoint for 4 WDW parks, writes `park_hours:{parkUuid}:{date}` Redis keys (EX 86400); polls `/live` endpoint, dispatches ATTRACTION entities to `wait_times_history` + Redis (`wait:{uuid}` EX 120, conflict-resolved) and SHOW entities to `showtimes:{parkUuid}:{date}` Redis keys; uses duck-typed `DrizzleDb` interface (same pattern as `QueueTimesService`)
- `ThemeparksProcessor`: BullMQ `@Processor('park-hours', {concurrency: 1})`, `onModuleInit` calls `upsertJobScheduler` with cron `'0 1,7,13,19 * * *'` (staggered from queue-times); `process()` loops `WDW_PARKS` calling `pollSchedule` then `pollLiveData`; dead-letter handler triggers Sentry + Slack after all 5 retries exhausted
- `IngestionModule`: extended to register `'park-hours'` queue and provide `ThemeparksService` + `ThemeparksProcessor`
- 13 new unit tests: DATA-02a (schedule field mapping), DATA-02b (STANDBY.waitTime → minutes), SHOW/ATTRACTION entity dispatch, conflict resolution, skips unknown rides; all 42 tests passing

## Task Commits

1. **Task 1: ThemeparksService** - `b7d87f7` (feat)
2. **Task 2: ThemeparksProcessor + IngestionModule** - `99660ce` (feat)

## Files Created/Modified

- `apps/api/src/ingestion/themeparks.service.ts` - pollSchedule(), pollLiveData(), resolveAttractionIds(); duck-typed DrizzleDb; Redis conflict resolution
- `apps/api/src/ingestion/themeparks.service.spec.ts` - 13 tests: DATA-02a, DATA-02b, SHOW/ATTRACTION dispatch
- `apps/api/src/ingestion/themeparks.processor.ts` - @Processor concurrency=1, cron upsertJobScheduler, WDW_PARKS loop, dead-letter handler
- `apps/api/tests/fixtures/themeparks-wiki-schedule-response.json` - schedule endpoint fixture (3 dates)
- `apps/api/src/ingestion/ingestion.module.ts` - added 'park-hours' queue + ThemeparksService/Processor
- `apps/api/src/worker.bootstrap.spec.ts` - generalized BullMQ mock to handle multiple queue tokens

## Decisions Made

- `ThemeparksProcessor` uses cron `'0 1,7,13,19 * * *'` instead of `{ every: 21600000 }` to stagger the 6hr schedule away from queue-times polling cycles. The cron fires at 1am, 7am, 1pm, 7pm UTC — distinct from queue-times which fires every 5 minutes starting at :00.
- Conflict resolution implemented as: read existing `wait:{uuid}` Redis key → compare `fetched_at` timestamps → skip write if existing is same age or newer. This aligns with CONTEXT.md "most recent fetched_at wins" without using NX flag (NX only handles the case where the key doesn't exist).
- `worker.bootstrap.spec.ts` BullMQ mock generalized to `mockImplementation((...configs) => ...)` so it handles any number of queue registrations dynamically. Previously hardcoded to `'wait-times'` only.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] bootstrap test fails when second BullMQ queue token is not provided**
- **Found during:** Task 2 — bootstrap test NestJS DI error: "Nest can't resolve dependencies of the ThemeparksProcessor... BullQueue_park-hours"
- **Issue:** `worker.bootstrap.spec.ts` BullMQ mock was hardcoded to provide only the `'wait-times'` queue token; adding `'park-hours'` queue to IngestionModule exposed the missing token
- **Fix:** Changed `registerQueue` mock from hardcoded `getQueueToken('wait-times')` to dynamic `mockImplementation((...configs) => ...)` that provides a stub token for each registered queue name
- **Files modified:** `apps/api/src/worker.bootstrap.spec.ts`
- **Commit:** `99660ce`

---

**Total deviations:** 1 auto-fixed (Rule 3 blocking)
**Impact on plan:** All deviations resolved. No scope change. Plan artifacts delivered as specified.

## Pre-existing Issue (Not Introduced by This Plan)

`apps/api/src/alerting/slack-alerter.service.spec.ts` — still failing (pre-existing from 02-02). Root cause: imports `makeRedisClient` from `../../tests/setup.js` (compiled CJS) which triggers `require('vitest')` error. Deferred per plan guidance.

## Next Phase Readiness

- Both `'wait-times'` (5min) and `'park-hours'` (6hr) queues are registered in `IngestionModule`
- `park_hours:{parkUuid}:{date}` Redis keys will populate after first 6hr cycle, feeding solver's opening/closing time constraints
- `showtimes:{parkUuid}:{date}` Redis keys will populate, feeding entertainment scheduling (DATA-02)
- `wait_times_history` rows with `source='themeparks-wiki'` will accumulate as fallback wait data
- SharedInfraModule pattern continues working — no new DB/Redis provider needed

---
*Phase: 02-data-pipeline*
*Completed: 2026-04-14*
