---
phase: 02-data-pipeline
plan: "02"
subsystem: infra
tags: [nestjs, bullmq, slack, redis, sentry, alerting, ioredis, vitest, tdd]

# Dependency graph
requires:
  - phase: 02-data-pipeline
    plan: "01"
    provides: WorkerModule root, global ioredis/Sentry mocks in tests/setup.ts
provides:
  - AlertingModule exporting SlackAlerterService and LagAlertService
  - SlackAlerterService: Slack webhook POST + Redis consecutive dead-letter counter
  - LagAlertService: global ingestion lag check with quiet-hours gate (2am-6am ET)
  - Unit test coverage for DATA-06a, DATA-06b, DATA-06c
affects: [02-03, 02-04, 02-05, 02-06, 02-07, 02-08, 02-09, 02-10, 02-11, 02-12]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "AlertingModule is purely a service provider — no BullModule import; avoids circular deps with Wave 2 feature modules"
    - "Best-effort alerting: all Slack/Redis calls wrapped in try/catch; never throws from alert handler"
    - "Quiet-hours gate: toLocaleString America/New_York hour-based check, no timezone library needed"
    - "Duck-typed DbExecutable interface in LagAlertService avoids @wonderwaltz/db dist-path issue"

key-files:
  created:
    - apps/api/src/alerting/slack-alerter.service.ts
    - apps/api/src/alerting/slack-alerter.service.spec.ts
    - apps/api/src/alerting/lag-alert.service.ts
    - apps/api/src/alerting/lag-alert.service.spec.ts
    - apps/api/src/alerting/alerting.module.ts
  modified: []

key-decisions:
  - "AlertingModule has no BullModule/queue registrations — purely service providers; Wave 2 processor modules import AlertingModule to avoid circular deps"
  - "LagAlertService uses a local DbExecutable duck-type interface instead of importing Db from @wonderwaltz/db — the package's dist output path (dist/src/) doesn't match its package.json exports (dist/) causing typecheck failures"
  - "Best-effort alerting posture: all Slack webhook calls and Redis INCR/SET wrapped in try/catch; alerting failures are logged but never propagate to processor error handling"

patterns-established:
  - "Alerting pattern: sendDeadLetter calls (1) Sentry.captureException, (2) Slack POST, (3) Redis INCR — in that order, each independently wrapped"
  - "Consecutive counter pattern: Redis INCR on dead-letter, SET 0 EX 86400 on success — 24h TTL auto-expires stale counters"
  - "Quiet-hours suppression: isQuietHours() is a public method to allow unit-test spying without exposing internals"

requirements-completed: [DATA-06]

# Metrics
duration: 4min
completed: 2026-04-14
---

# Phase 02, Plan 02: AlertingModule Summary

**SlackAlerterService (Slack webhook + Redis dead-letter counter) and LagAlertService (30-min global lag check with 2am-6am ET quiet-hours suppression), exported from AlertingModule for Wave 2 processor imports**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-04-14T17:56:33Z
- **Completed:** 2026-04-14T17:59:40Z
- **Tasks:** 2
- **Files modified:** 5 (5 created, 0 modified)

## Accomplishments

- `SlackAlerterService`: Slack webhook POST with `fetch`, Sentry.captureException on dead-letters (DATA-06a/06b), Redis INCR/SET consecutive counter, best-effort error handling (never throws)
- `LagAlertService`: queries `MAX(fetched_at)` from `wait_times_history` (last hour), fires lag alert when > 30min old and outside 2am-6am ET quiet hours (DATA-06b/06c)
- `AlertingModule`: NestJS module exporting both services — no BullModule dependency, Wave 2 processors import it cleanly
- 23 unit tests covering all DATA-06 acceptance criteria: captureException spy, fetch payload, Redis key patterns, quiet-hours gate at boundaries, null MAX treated as Infinity

## Task Commits

1. **Task 1: SlackAlerterService with Redis consecutive counter** - `a5ab76f` (feat)
2. **Task 2: LagAlertService + AlertingModule export** - `6038661` (feat)

## Files Created/Modified

- `apps/api/src/alerting/slack-alerter.service.ts` - @Injectable with sendDeadLetter (Sentry + Slack + Redis INCR), resetConsecutiveCount (Redis SET), sendLagAlert (Slack only)
- `apps/api/src/alerting/slack-alerter.service.spec.ts` - 7 tests: DATA-06a (captureException), DATA-06b (fetch payload), Redis INCR key, missing webhook URL no-throw, resetConsecutiveCount TTL, sendLagAlert payload, no Sentry on lag alert
- `apps/api/src/alerting/lag-alert.service.ts` - @Injectable with checkAndAlert (SQL MAX query, 30min threshold, quiet-hours gate), isQuietHours (toLocaleString ET)
- `apps/api/src/alerting/lag-alert.service.spec.ts` - 8 tests: DATA-06b (lag=35min afternoon), DATA-06c (lag=35min 3am suppressed), lag=20min no alert, null MAX infinite lag, isQuietHours boundaries at hour 2/5/6/14
- `apps/api/src/alerting/alerting.module.ts` - @Module with providers/exports [SlackAlerterService, LagAlertService], no BullModule

## Decisions Made

- Used a local `DbExecutable` duck-type interface in LagAlertService rather than importing `Db` from `@wonderwaltz/db`. The `@wonderwaltz/db` package's build outputs to `dist/src/` but its `package.json` exports field points to `dist/` — causing TypeScript to fail on import. The duck-type (`execute<T>(sql): Promise<{ rows: T[] }>`) is sufficient for LagAlertService's single SQL call and avoids the dist issue.
- `isQuietHours()` is a public method (not private) to allow `vi.spyOn` in unit tests to control the time-of-day gate without mocking `Date`. This is simpler than using `vi.useFakeTimers` and avoids non-determinism from actual timezone offsets in CI.
- AlertingModule registers no queues — it is purely a NestJS service provider module. Wave 2 feature modules (QueueTimesModule, etc.) import AlertingModule to get both services injected. This separation prevents circular dependencies.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Unsafe TypeScript array access on vi.fn mock calls in spec file**
- **Found during:** Task 1 commit (lint-staged pre-commit hook)
- **Issue:** `fetchSpy.mock.calls[0]` is typed as `any[][]` — destructuring and member access flagged as `@typescript-eslint/no-unsafe-assignment` (14 errors)
- **Fix:** Added explicit cast `as [string, { method: string; headers: ...; body: string }]` at each call site in the spec
- **Files modified:** `apps/api/src/alerting/slack-alerter.service.spec.ts`
- **Verification:** ESLint passed on second commit attempt; all 7 tests still green
- **Committed in:** `a5ab76f` (Task 1 commit)

**2. [Rule 3 - Blocking] @wonderwaltz/db import causes typecheck failure**
- **Found during:** Task 2, post-test typecheck step
- **Issue:** `import type { Db } from '@wonderwaltz/db'` fails — package's `exports` points to `dist/index.js` but build output is `dist/src/index.js`
- **Fix:** Replaced with local `DbExecutable` interface scoped to LagAlertService; sufficient for single `db.execute()` call
- **Files modified:** `apps/api/src/alerting/lag-alert.service.ts`
- **Verification:** `pnpm typecheck` exits 0 after fix
- **Committed in:** `6038661` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 Rule 1 - type safety in test, 1 Rule 3 - blocking typecheck issue)
**Impact on plan:** Both auto-fixes necessary for linting and compilation correctness. No scope change.

## Issues Encountered

- The `@wonderwaltz/db` package has a latent build configuration mismatch (dist path vs exports). Noted as a deferred item — Wave 2 plans that need full `Db` type access will need to either fix the package build or use the same duck-type pattern.

## User Setup Required

None — no external service configuration required for this plan. `SLACK_ALERT_WEBHOOK_URL` is consumed at runtime only; tests mock it via `process.env`. It must be added to `.env.local` before deploying the worker.

## Next Phase Readiness

- AlertingModule is ready for Wave 2 processor imports
- SlackAlerterService and LagAlertService are fully injectable via NestJS DI
- DATA-06a, DATA-06b, DATA-06c acceptance criteria satisfied by unit tests
- Wave 2 plans (02-03+) import AlertingModule to enable dead-letter Slack alerts and lag monitoring
- Pre-existing `@wonderwaltz/db` dist-path issue should be resolved before any Wave 2 plan imports `Db` type — deferred item

---
*Phase: 02-data-pipeline*
*Completed: 2026-04-14*
