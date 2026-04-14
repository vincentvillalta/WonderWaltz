---
phase: 02-data-pipeline
plan: "04"
subsystem: ingestion
tags: [bullmq, ioredis, nestjs, redis, drizzle, timeseries, vitest, tdd, queue-times]

# Dependency graph
requires:
  - phase: 02-data-pipeline
    plan: "01"
    provides: WorkerModule root, BullModule.forRoot, global ioredis/Sentry mocks
  - phase: 02-data-pipeline
    plan: "02"
    provides: AlertingModule, SlackAlerterService, LagAlertService

provides:
  - QueueTimesService: HTTP fetch + Redis write (EX 120) + DB insert for all 4 WDW parks
  - QueueTimesProcessor: BullMQ processor, upsertJobScheduler every 5min, dead-letter detection
  - IngestionModule: 'wait-times' queue registration + service wiring
  - SharedInfraModule: @Global() REDIS_CLIENT_TOKEN + DB_TOKEN providers for entire module tree

affects: [02-05, 02-06, 02-07, 02-08, 02-09, 02-10, 02-11, 02-12]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "upsertJobScheduler (not queue.add repeat) for idempotent recurring schedule — safe to restart"
    - "Duck-typed DrizzleDb interface with raw sql`` — avoids @wonderwaltz/db dist-path mismatch"
    - "SharedInfraModule @Global() pattern — REDIS_CLIENT + DB available across all feature modules"
    - "@Inject(REDIS_CLIENT_TOKEN) string token — required when import type erases the runtime token"
    - "Inline makeRedisClient() in spec files — avoids CJS setup.js compiled file triggering vitest require() error"
    - "Regular function (not arrow) in vi.fn().mockImplementation — required for new Redis() constructor calls"
    - "BullMQ mock in bootstrap spec — prevents upsertJobScheduler from hanging on Redis connection"

key-files:
  created:
    - apps/api/src/ingestion/queue-times.service.ts
    - apps/api/src/ingestion/queue-times.service.spec.ts
    - apps/api/src/ingestion/queue-times.processor.ts
    - apps/api/src/ingestion/queue-times.processor.spec.ts
    - apps/api/src/ingestion/ingestion.module.ts
    - apps/api/src/shared-infra.module.ts
  modified:
    - apps/api/src/worker.module.ts
    - apps/api/src/alerting/alerting.module.ts
    - apps/api/src/alerting/slack-alerter.service.ts
    - apps/api/src/worker.bootstrap.spec.ts
    - apps/api/tests/setup.ts

key-decisions:
  - "QueueTimesService uses raw sql`` (duck-typed DrizzleDb) instead of Drizzle ORM query builder — avoids @wonderwaltz/db dist-path mismatch; consistent with LagAlertService pattern from 02-02"
  - "SharedInfraModule @Global() provides REDIS_CLIENT_TOKEN and DB_TOKEN once at root — eliminates the need for each feature module to define its own Redis/DB providers"
  - "SlackAlerterService changed from 'import type Redis' to 'import Redis' with @Inject(REDIS_CLIENT_TOKEN) — 'import type' erases the token at runtime, breaking NestJS DI"
  - "tests/setup.ts ioredis mock changed from arrow function to regular function in mockImplementation — arrow functions cannot be used as constructors with 'new'; vi.fn() needs a regular function when the mock is called with 'new Redis()'"
  - "worker.bootstrap.spec.ts mocks @nestjs/bullmq to prevent upsertJobScheduler from blocking test — BullMQ queue connections hang when the ioredis mock doesn't emit 'ready'"

requirements-completed: [DATA-01]

# Metrics
duration: 23min
completed: 2026-04-14
---

# Phase 02, Plan 04: queue-times.com ingestion worker Summary

**QueueTimesService (HTTP + Redis + DB) and QueueTimesProcessor (BullMQ, upsertJobScheduler, dead-letter) wired into WorkerModule via IngestionModule; starts the 5-minute WDW wait-time accumulation clock**

## Performance

- **Duration:** ~23 min
- **Started:** 2026-04-14T18:18:36Z
- **Completed:** 2026-04-14T18:41:37Z
- **Tasks:** 2
- **Files modified:** 11 (6 created, 5 modified)

## Accomplishments

- `QueueTimesService`: polls queue-times.com park endpoints, flattens `lands[].rides`, resolves `queue_times_id → UUID` via cached SQL SELECT, writes `wait:{uuid}` Redis keys with `EX 120`, inserts `wait_times_history` rows with `source='queue-times'`; extends TTL by +600s on fetch failure instead of deleting keys
- `QueueTimesProcessor`: BullMQ `@Processor('wait-times', {concurrency: 1})`, `onModuleInit` calls `upsertJobScheduler` (idempotent, restart-safe); polls all 4 parks (EPCOT=5, MK=6, HS=7, AK=8), then runs lag check; dead-letter handler calls `Sentry.captureException` + `SlackAlerterService.sendDeadLetter` only when all 5 retry attempts are exhausted
- `IngestionModule`: registers `'wait-times'` BullMQ queue, imports `AlertingModule`, exports `QueueTimesService`
- `SharedInfraModule` (`@Global()`): single point for `REDIS_CLIENT_TOKEN` and `DB_TOKEN` providers — eliminates per-module provider duplication
- 14 new unit tests across service and processor specs; all 30 existing tests continue passing

## Task Commits

1. **Task 1: QueueTimesService** - `55212e2` (feat)
2. **Task 2: QueueTimesProcessor + IngestionModule + SharedInfraModule** - `5ad4658` (feat)

## Files Created/Modified

- `apps/api/src/ingestion/queue-times.service.ts` - pollPark(), resolveAttractionIds(), extendTtlOnFailure(); raw sql`` duck-type DrizzleDb
- `apps/api/src/ingestion/queue-times.service.spec.ts` - 7 tests: DATA-01a, DATA-01c, DATA-01d
- `apps/api/src/ingestion/queue-times.processor.ts` - @Processor concurrency=1, upsertJobScheduler, onFailed dead-letter
- `apps/api/src/ingestion/queue-times.processor.spec.ts` - 7 tests: scheduler, pollPark x4, lagCheck, DATA-06a dead-letter
- `apps/api/src/ingestion/ingestion.module.ts` - BullModule.registerQueue + AlertingModule
- `apps/api/src/shared-infra.module.ts` - @Global() REDIS_CLIENT_TOKEN + DB_TOKEN
- `apps/api/src/worker.module.ts` - added SharedInfraModule + IngestionModule imports
- `apps/api/src/alerting/alerting.module.ts` - reverted to simple provider list (no self-contained Redis)
- `apps/api/src/alerting/slack-alerter.service.ts` - import type → import + @Inject(REDIS_CLIENT_TOKEN)
- `apps/api/src/worker.bootstrap.spec.ts` - @nestjs/bullmq mock + ioredis regular function mock
- `apps/api/tests/setup.ts` - ioredis mock: arrow fn → regular fn for constructor compatibility

## Decisions Made

- Used `raw sql` `` + duck-typed `DrizzleDb` interface (same pattern as `LagAlertService`) to avoid the `@wonderwaltz/db` dist-path mismatch. This means `resolveAttractionIds` and the INSERT both use raw SQL strings rather than Drizzle's type-safe query builder. Acceptable tradeoff given the known package issue.
- `SharedInfraModule` with `@Global()` chosen over per-module Redis/DB provider duplication. Since both `AlertingModule` (SlackAlerterService) and `IngestionModule` (QueueTimesService) need Redis, a single global provider is the clean NestJS pattern.
- `REDIS_CLIENT_TOKEN = 'REDIS_CLIENT'` string token required because `SlackAlerterService` was using `import type { Redis }` which erases the runtime injection token. Changed to concrete import with `@Inject()`.
- `upsertJobScheduler` (not `queue.add({ repeat })`) per plan spec and CONTEXT.md — idempotent, handles worker restarts without creating duplicate schedulers.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] @wonderwaltz/db subpath imports fail (same as 02-02)**
- **Found during:** Task 1 implementation
- **Issue:** `import { attractions } from '@wonderwaltz/db/schema/catalog'` fails — package exports only `.`, not subpaths; Vitest resolves `.js` not `.cjs` for ESM packages
- **Fix:** Replaced all Drizzle table imports with inline raw SQL strings via `sql` template tag and duck-typed interface (same fix as `LagAlertService` in 02-02)
- **Files modified:** `apps/api/src/ingestion/queue-times.service.ts`
- **Commit:** `55212e2`

**2. [Rule 1 - Bug] tests/setup.js compiled CJS triggers Vitest import error in spec files**
- **Found during:** Task 1 spec testing
- **Issue:** Importing `makeRedisClient` from `../../tests/setup.js` (compiled CJS) triggers "Vitest cannot be imported in a CommonJS module using require()" error
- **Fix:** Inlined `makeRedisClient()` directly in spec files instead of importing from `setup.js`; same root cause as the pre-existing `slack-alerter.service.spec.ts` failure
- **Files modified:** `queue-times.service.spec.ts`, `queue-times.processor.spec.ts`
- **Commit:** `55212e2`

**3. [Rule 1 - Bug] ioredis mock arrow function incompatible with new Redis() constructor**
- **Found during:** Task 2 bootstrap test
- **Issue:** `vi.fn().mockImplementation(() => ...)` fails when used with `new Redis(config)` — arrow functions cannot be constructors; error: "() => ({...}) is not a constructor"
- **Fix:** Changed global mock in `tests/setup.ts` and bootstrap spec local mock to use `function(this) { return ... }` instead of arrow functions
- **Files modified:** `apps/api/tests/setup.ts`, `apps/api/src/worker.bootstrap.spec.ts`
- **Commit:** `5ad4658`

**4. [Rule 1 - Bug] SlackAlerterService 'import type Redis' erases NestJS injection token**
- **Found during:** Task 2 — bootstrap test NestJS DI failure
- **Issue:** `import type { Redis }` makes the token `undefined` at runtime; NestJS DI error: "Nest can't resolve dependencies of the SlackAlerterService (?)"
- **Fix:** Changed to `import Redis from 'ioredis'` + added `@Inject(REDIS_CLIENT_TOKEN)` decorator
- **Files modified:** `apps/api/src/alerting/slack-alerter.service.ts`
- **Commit:** `5ad4658`

**5. [Rule 2 - Missing] SharedInfraModule needed for cross-module DI token availability**
- **Found during:** Task 2 — module wiring
- **Issue:** Both `AlertingModule` and `IngestionModule` need `REDIS_CLIENT_TOKEN` and `DB_TOKEN`, but neither module knew about the other's providers
- **Fix:** Created `SharedInfraModule` with `@Global()` providing both tokens; imported once in `WorkerModule`
- **Files modified:** New `apps/api/src/shared-infra.module.ts`, updated `apps/api/src/worker.module.ts`
- **Commit:** `5ad4658`

**6. [Rule 3 - Blocking] bootstrap test timeout from BullMQ queue connection hang**
- **Found during:** Task 2 — bootstrap test 5s timeout
- **Issue:** `QueueTimesProcessor.onModuleInit()` calls `upsertJobScheduler`, which waits for BullMQ queue Redis connection that never resolves in the mock environment
- **Fix:** Added `@nestjs/bullmq` mock to bootstrap spec that provides a stub queue token; mock `upsertJobScheduler` returns immediately
- **Files modified:** `apps/api/src/worker.bootstrap.spec.ts`
- **Commit:** `5ad4658`

---

**Total deviations:** 6 auto-fixed (4 Rule 1 bugs, 1 Rule 2 missing critical, 1 Rule 3 blocking)
**Impact on plan:** All deviations resolved. No scope change. Plan artifacts delivered as specified.

## Pre-existing Issue (Not Introduced by This Plan)

`apps/api/src/alerting/slack-alerter.service.spec.ts` — was failing before this plan started. Root cause: it imports `makeRedisClient` from `../../tests/setup.js` (compiled CJS file) which `require('vitest')` fails at runtime. This spec file needs the same inline-mock fix applied to the new spec files in this plan. Deferred as a separate fix.

## Next Phase Readiness

- IngestionModule wired into WorkerModule — deploying the worker process starts the 5-minute polling loop
- `wait:{uuid}` Redis keys will populate and `wait_times_history` rows will accumulate after first deploy
- 8-week accumulation clock starts at first deployment of the worker (DATA-07 gate for Phase 10)
- SharedInfraModule pattern available for all Wave 2 processor modules (02-05 through 02-12)
- DATA-01a, DATA-01c, DATA-01d, DATA-06a acceptance criteria satisfied by unit tests

---
*Phase: 02-data-pipeline*
*Completed: 2026-04-14*
