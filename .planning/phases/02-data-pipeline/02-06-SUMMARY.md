---
phase: 02-data-pipeline
plan: "06"
subsystem: rollup-monitor
tags: [bullmq, nestjs, pg_cron, sentry, vitest, tdd, data-03]

# Dependency graph
requires:
  - phase: 02-data-pipeline
    plan: "01"
    provides: WorkerModule root, BullModule.forRoot, global ioredis/Sentry mocks
  - phase: 02-data-pipeline
    plan: "02"
    provides: AlertingModule, SlackAlerterService for dead-letter alerts
  - phase: 02-data-pipeline
    plan: "04"
    provides: SharedInfraModule @Global() DB_TOKEN + REDIS_CLIENT_TOKEN; DB_TOKEN export from queue-times.service.ts

provides:
  - RollupProcessor: pg_cron monitor querying cron.job_run_details; Sentry alerts on miss
  - RollupModule: BullModule.registerQueue('rollup-verify') + AlertingModule wiring
  - WorkerModule updated to import RollupModule

affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "pg_cron monitor pattern: query cron.job_run_details via db.execute(sql`...`) — never REFRESH MATERIALIZED VIEW from worker"
    - "Three-condition alert: no rows (never ran), ageMinutes > 90 (missed), status != 'succeeded' (failed)"
    - "Cron '30 * * * *' for monitor gives 30min grace period after pg_cron's :00 refresh"
    - "Duck-typed DrizzleDb interface in rollup module (same pattern as LagAlertService, QueueTimesService)"

key-files:
  created:
    - apps/api/src/rollup/rollup.processor.ts
    - apps/api/src/rollup/rollup.processor.spec.ts
    - apps/api/src/rollup/rollup.module.ts
  modified:
    - apps/api/src/worker.module.ts

key-decisions:
  - "RollupProcessor is MONITOR ONLY — queries cron.job_run_details, never calls REFRESH MATERIALIZED VIEW; pg_cron handles refresh via migration 0002"
  - "Inline DrizzleDb duck-type interface in rollup.processor.ts (same pattern as LagAlertService/QueueTimesService) — avoids @wonderwaltz/db dist-path mismatch"
  - "cron pattern '30 * * * *' (not every:ms) — runs at :30 past each hour, 30min after pg_cron's :00 refresh, matching CONTEXT.md discretion spec"
  - "Sentry threshold set to 90 minutes (not 70min as in guidance description, but matching plan must_haves truths: > 90min)"

requirements-completed: [DATA-03]

# Metrics
duration: 4min
completed: 2026-04-14
---

# Phase 02, Plan 06: pg_cron Monitor Worker Summary

**RollupProcessor (pg_cron monitor) querying cron.job_run_details and alerting via Sentry on missed/failed/stale refreshes; wired into WorkerModule via RollupModule — DATA-03 complete**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-04-14T20:34:45Z
- **Completed:** 2026-04-14T20:38:25Z
- **Tasks:** 1
- **Files modified:** 4 (3 created, 1 modified)

## Accomplishments

- `RollupProcessor`: `@Processor('rollup-verify', {concurrency: 1})` extends `WorkerHost`; `onModuleInit` calls `upsertJobScheduler('rollup-verify-scheduler', { pattern: '30 * * * *' }, ...)` for idempotent scheduling at :30 past each hour
- `process()`: queries `cron.job_run_details` via `db.execute(sql`...`)` raw SQL (no Drizzle query builder); three alert conditions: no rows (`pg_cron rollup has never run`), `ageMinutes > 90` or `status !== 'succeeded'` (`pg_cron refresh missed`); logs debug on healthy run
- `onFailed`: dead-letter handler via `@OnWorkerEvent('failed')` — calls `Sentry.captureException` + `SlackAlerterService.sendDeadLetter` only when `attemptsMade >= maxAttempts` (3)
- `RollupModule`: registers `'rollup-verify'` BullMQ queue + imports `AlertingModule`
- `WorkerModule`: updated to import `RollupModule`
- 7 new unit tests: DATA-03a (fresh run, no alert), DATA-03b (stale 100min, Sentry fired), failed status recent (Sentry fired), no rows ever (Sentry fired), dead-letter exhausted, transient failure suppressed, upsertJobScheduler cron pattern

## Task Commits

1. **Task 1: RollupProcessor + RollupModule + WorkerModule wire-up (TDD GREEN)** - `3ba2195` (feat)

## Files Created/Modified

- `apps/api/src/rollup/rollup.processor.ts` - @Processor('rollup-verify'), cron.job_run_details query, three Sentry alert conditions, onFailed dead-letter handler
- `apps/api/src/rollup/rollup.processor.spec.ts` - 7 tests: DATA-03a/03b, failed status, no rows, dead-letter, transient suppression, upsertJobScheduler
- `apps/api/src/rollup/rollup.module.ts` - BullModule.registerQueue('rollup-verify') + AlertingModule
- `apps/api/src/worker.module.ts` - RollupModule added to imports

## Decisions Made

- `RollupProcessor` is MONITOR ONLY. `pg_cron` handles the actual `wait_times_1h` materialized view refresh (migration 0002). This worker exclusively reads `cron.job_run_details` to verify the refresh occurred and alerts via Sentry if it missed or failed. No DDL or DML touching `wait_times_1h`.
- Inline `DrizzleDb` duck-type interface (same pattern as `LagAlertService` in 02-02 and `QueueTimesService` in 02-04) — the `@wonderwaltz/db` package dist-path mismatch makes direct import fragile; the duck-type is sufficient for the single `db.execute()` call.
- Cron pattern `'30 * * * *'` (runs at :30 past each hour) rather than `every: ms` — gives pg_cron a 30-minute grace window to complete its :00 refresh before the monitor checks. Per CONTEXT.md: "pg_cron job timing inside the hour for crowd-index rollup" is Claude's discretion.
- Sentry threshold `ageMinutes > 90` matches plan `must_haves.truths` ("If the last successful refresh is > 90 minutes ago"). This gives a full missed-cycle (60min) plus 30min grace = 90min total window before alerting.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] ESLint type safety errors on spec file before source file existed**
- **Found during:** Task 1 RED commit attempt
- **Issue:** ESLint flagged 17 `@typescript-eslint/no-unsafe-*` errors in spec because `rollup.processor.ts` didn't exist — TypeScript couldn't resolve the type import, making all method calls untyped
- **Fix:** Created `rollup.processor.ts` stub concurrently with spec; both committed together in single GREEN commit (TypeScript resolved types, ESLint passed)
- **Files modified:** Both `rollup.processor.ts` and `rollup.processor.spec.ts` staged together
- **Commit:** `3ba2195`

---

**Total deviations:** 1 auto-fixed (Rule 1 - ESLint type resolution requires source file to exist at commit time)
**Impact on plan:** TDD RED/GREEN phases compressed to a single commit due to lint-staged enforcement; test logic was written first (RED mindset preserved), then implementation to satisfy types.

## Pre-existing Issue (Not Introduced by This Plan)

`apps/api/src/alerting/slack-alerter.service.spec.ts` — pre-existing failure from before plan 02-02. Root cause: imports `makeRedisClient` from `../../tests/setup.js` (compiled CJS) which triggers `require('vitest')` error. Not touched by this plan.

## Success Criteria Verification

- [x] DATA-03a: query returns recent run (10min, succeeded) -> no Sentry call (unit test green)
- [x] DATA-03b: query returns stale run (100min) -> Sentry.captureException called (unit test green)
- [x] Worker does NOT trigger materialized view refresh (monitor role only — confirmed no REFRESH/DDL)
- [x] RollupProcessor runs at :30 past each hour ('30 * * * *' cron pattern)
- [x] Uses upsertJobScheduler (idempotent, restart-safe)
- [x] Concurrency: 1
- [x] RollupModule wired into WorkerModule

---
*Phase: 02-data-pipeline*
*Completed: 2026-04-14*
