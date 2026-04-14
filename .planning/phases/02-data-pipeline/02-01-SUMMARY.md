---
phase: 02-data-pipeline
plan: "01"
subsystem: infra
tags: [bullmq, ioredis, nestjs, redis, vitest, testing, worker]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: NestJS API scaffold (apps/api), vitest config, ConfigModule setup
provides:
  - BullMQ worker process entry point (worker.ts) for Railway worker service
  - WorkerModule root module with Upstash-safe ioredis connection config
  - Global test setup with ioredis and Sentry mocks
  - Wave 0 test fixtures for queue-times.com, themeparks.wiki, and OpenWeather APIs
affects: [02-02, 02-03, 02-04, 02-05, 02-06, 02-07, 02-08, 02-09, 02-10, 02-11, 02-12]

# Tech tracking
tech-stack:
  added:
    - "@nestjs/bullmq: BullModule.forRoot registration for ioredis connection"
    - "vitest setupFiles: global test setup registered via tests/setup.ts"
  patterns:
    - "NestFactory.createApplicationContext for worker processes (no HTTP server)"
    - "ioredis connection parsed from REDIS_URL env var with TLS + maxRetriesPerRequest: null"
    - "Global vi.mock for ioredis and Sentry in tests"
    - "Fixture JSON files in tests/fixtures/ for deterministic HTTP mock data"

key-files:
  created:
    - apps/api/src/worker.ts
    - apps/api/src/worker.module.ts
    - apps/api/src/worker.bootstrap.spec.ts
    - apps/api/tests/setup.ts
    - apps/api/tests/fixtures/queue-times-response.json
    - apps/api/tests/fixtures/themeparks-wiki-response.json
    - apps/api/tests/fixtures/openweather-response.json
  modified:
    - apps/api/vitest.config.mts
    - apps/api/tsconfig.json

key-decisions:
  - "worker.ts uses NestFactory.createApplicationContext (not NestFactory.create) — no HTTP server or FastifyAdapter in worker process"
  - "REDIS_URL parsed via URL constructor to extract host/port/password; tls: {} added for Upstash TLS"
  - "maxRetriesPerRequest: null is CRITICAL for BullMQ blocking commands — enforced in WorkerModule and tested"
  - "WorkerModule is intentionally empty of processor modules; Wave 2 plans will register their processors here"
  - "tests/setup.ts registers global ioredis and Sentry mocks via vitest setupFiles — all spec files benefit automatically"

patterns-established:
  - "Worker entry: all BullMQ processors use createApplicationContext, never NestFactory.create"
  - "Fixture pattern: real-shape JSON files in tests/fixtures/ keyed by source API name"
  - "Global mock pattern: vi.mock in tests/setup.ts for infrastructure deps (ioredis, Sentry)"
  - "TDD pattern: test commits as test() type, then implementation as feat() type"

requirements-completed: [DATA-07]

# Metrics
duration: 12min
completed: 2026-04-14
---

# Phase 02, Plan 01: Worker Process Foundation Summary

**NestJS BullMQ worker entry point with Upstash-safe ioredis config, graceful SIGTERM shutdown, and Vitest infrastructure with real-shape API fixtures for all three ingestion sources**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-04-14T19:52:00Z
- **Completed:** 2026-04-14T19:54:40Z
- **Tasks:** 2
- **Files modified:** 9 (7 created, 2 modified)

## Accomplishments

- `worker.ts` entry point for Railway worker service: uses `createApplicationContext`, not `NestFactory.create` — zero HTTP surface
- `worker.module.ts` with `BullModule.forRoot` — REDIS_URL parsed for host/port/password, `tls: {}` for Upstash, `maxRetriesPerRequest: null` for BullMQ blocking commands
- Global test infrastructure: `tests/setup.ts` registered in vitest.config.mts; ioredis and Sentry globally mocked
- Three API fixture files with real response shapes: queue-times.com, themeparks.wiki, OpenWeather One Call 3.0

## Task Commits

1. **Task 1: Worker entry point and BullModule root config** - `284f6e9` (feat)
2. **Task 2: Wave 0 test infrastructure and API fixtures** - `7ce1e16` (feat)

## Files Created/Modified

- `apps/api/src/worker.ts` - Railway worker service entry point; `createApplicationContext(WorkerModule)` + `enableShutdownHooks()`
- `apps/api/src/worker.module.ts` - BullModule.forRoot with Upstash-safe ioredis config; WorkerModule shell for Wave 2 processors
- `apps/api/src/worker.bootstrap.spec.ts` - Smoke test: creates app context, verifies no HTTP server, checks worker.ts source for no `app.listen` calls (DATA-07)
- `apps/api/tests/setup.ts` - Global Vitest setup: ioredis mock + Sentry stub + `makeRedisClient()` helper
- `apps/api/tests/fixtures/queue-times-response.json` - 2 lands, 4 rides (IDs 56, 62, 78, 91); mixed open/closed state
- `apps/api/tests/fixtures/themeparks-wiki-response.json` - 2 ATTRACTION entities + 1 SHOW with showtimes
- `apps/api/tests/fixtures/openweather-response.json` - 8-day One Call 3.0 daily array (Orlando lat/lon)
- `apps/api/vitest.config.mts` - Added `setupFiles: ['./tests/setup.ts']`
- `apps/api/tsconfig.json` - Added `tests/` to `include` array

## Decisions Made

- Used `new URL(process.env['REDIS_URL'])` to parse `rediss://` URL for host/port/password extraction, then set `tls: {}` separately. This is more explicit than trusting ioredis to auto-infer TLS from scheme.
- `WorkerModule` has no processors registered — intentionally minimal. Wave 2 plans (02-03 through 02-12) will import their processor modules here.
- Fixture IDs 56 and 62 match the seeded WDW catalog `queue_times_id` values for Jungle Cruise and Pirates of the Caribbean.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed unused `beforeAll`/`afterAll` imports from spec file**
- **Found during:** Task 1 (lint-staged pre-commit hook)
- **Issue:** `@typescript-eslint/no-unused-vars` error on `beforeAll` and `afterAll` imports in bootstrap spec
- **Fix:** Removed the two unused imports from the import line
- **Files modified:** `apps/api/src/worker.bootstrap.spec.ts`
- **Verification:** ESLint passed on second commit attempt
- **Committed in:** `284f6e9` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug)
**Impact on plan:** Trivial fix. No scope change.

## Issues Encountered

None beyond the unused import lint error above.

## User Setup Required

None — no external service configuration required for this plan. Worker process requires `REDIS_URL` in `.env.local` which is already documented as populated.

## Next Phase Readiness

- Worker foundation is complete; all Wave 2 processor plans can now import into `WorkerModule`
- `tests/setup.ts` provides global ioredis mock — all future spec files in `apps/api/src/` benefit automatically
- Fixture files are ready for wait-time ingestion processor tests (02-03)
- DATA-07 automated signal satisfied: `worker.bootstrap.spec.ts` is green

---
*Phase: 02-data-pipeline*
*Completed: 2026-04-14*
