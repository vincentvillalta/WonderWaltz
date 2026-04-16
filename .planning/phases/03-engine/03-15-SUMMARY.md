---
phase: 03-engine
plan: 15
subsystem: api
tags: [redis, rate-limiting, nestjs, guards, llm]

requires:
  - phase: 03-engine
    plan: 14
    provides: CircuitBreakerService per-trip budget enforcement, PlanGenerationModule registration pattern
provides:
  - "RateLimitService.checkRethinkLimit(userId, isUnlocked) — daily cap counter (15 unlocked / 5 free)"
  - "RateLimitService.checkFreeTierLifetime(userId) — lifetime cap counter (3 per anonymous user)"
  - "RateLimitGuard — NestJS CanActivate guard reading @RateLimit() decorator metadata"
  - "@RateLimit('rethink' | 'free-tier-lifetime') — metadata decorator for controller endpoints"
affects:
  - 03-engine plan 17 (wires @UseGuards(RateLimitGuard) + @RateLimit on generatePlan + rethinkToday endpoints)
  - Phase 4 (auth middleware provides request.user.id + isUnlocked for guard resolution)

tech-stack:
  added: []
  patterns:
    - "Atomic INCR/DECR Redis counter pattern — increment first, check cap, DECR rollback if over"
    - "NestJS Guard + Reflector metadata for declarative rate limiting via @RateLimit() decorator"
    - "UTC date-string key partitioning for daily counters (no TZ ambiguity)"

key-files:
  created:
    - apps/api/src/plan-generation/rate-limit.service.ts
    - apps/api/src/plan-generation/rate-limit.guard.ts
    - apps/api/tests/plan-generation/rethink-rate-limit.test.ts
    - apps/api/tests/plan-generation/free-tier-lifetime.test.ts
    - apps/api/tests/plan-generation/rate-limit-guard.test.ts
  modified:
    - apps/api/src/plan-generation/plan-generation.module.ts

key-decisions:
  - "INCR-then-DECR pattern instead of GET-then-INCR — atomic under concurrency; worst case is momentary over-count that immediately corrects"
  - "Daily rethink key uses UTC date string (YYYY-MM-DD) not epoch — human-readable in Redis CLI, deterministic across timezones"
  - "Free-tier lifetime key has no TTL (permanent) — Redis persistence required for production"
  - "Guard defaults to free-tier (isUnlocked=false) when user tier unknown — safer to apply tighter limit"
  - "Guard reads userId from request.user?.id (Phase 4 auth) or x-anon-user-id header (Phase 3 stub) — forward-compatible"

patterns-established:
  - "Rate limit guard pattern: @RateLimit(type) + @UseGuards(RateLimitGuard) on controller methods"
  - "Redis counter with INCR/DECR rollback for atomic cap enforcement"

requirements-completed: [LLM-08, PLAN-05]

# Metrics
duration: 8 min
completed: 2026-04-16
---

# Phase 03 Plan 15: Rethink Daily Cap + Free-Tier Lifetime Cap Summary

**Redis-backed rethink daily rate limiter (15/5 per day) and free-tier lifetime plan generation cap (3/lifetime) with NestJS guard ready for endpoint wiring.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-16T14:52:36Z
- **Completed:** 2026-04-16T18:49:00Z
- **Tasks:** 2 (both TDD, combined RED+GREEN)
- **Tests added:** 21
- **Files:** 5 created, 1 modified

## Accomplishments

- `RateLimitService` with two independent counter methods: `checkRethinkLimit` (daily, 86400s TTL) and `checkFreeTierLifetime` (permanent, no TTL). Both use atomic Redis INCR with DECR rollback on cap violation.
- `RateLimitGuard` implementing NestJS `CanActivate` with `@RateLimit('rethink' | 'free-tier-lifetime')` decorator metadata. Returns 429 for rethink cap, 403 for lifetime cap, 401 for missing user identity.
- Redis key shapes: `rethink:{userId}:{YYYY-MM-DD}` (daily, auto-expires) and `plans_generated:{userId}` (permanent).
- Guard resolves userId from `request.user?.id` (Phase 4 auth) or `x-anon-user-id` header (Phase 3 stub). Defaults to free-tier when `isUnlocked` is unknown.

## Task Commits

1. **Task 1: RateLimitService (rethink + free-tier lifetime counters)** -- `f6f466f` (feat)
2. **Task 2: RateLimitGuard** -- `81eb568` (feat)

## Files Created/Modified

### Created

- `apps/api/src/plan-generation/rate-limit.service.ts` -- RateLimitService with checkRethinkLimit + checkFreeTierLifetime
- `apps/api/src/plan-generation/rate-limit.guard.ts` -- RateLimitGuard + @RateLimit() decorator
- `apps/api/tests/plan-generation/rethink-rate-limit.test.ts` -- 9 tests: cap enforcement (15/5), TTL, cross-day reset, remaining field
- `apps/api/tests/plan-generation/free-tier-lifetime.test.ts` -- 5 tests: cap at 3, no TTL, independent users
- `apps/api/tests/plan-generation/rate-limit-guard.test.ts` -- 7 tests: 429/403/401 paths, passthrough, free-tier default

### Modified

- `apps/api/src/plan-generation/plan-generation.module.ts` -- Registered RateLimitService in providers + exports

## Decisions Made

See frontmatter `key-decisions`. Highlights:

- **INCR/DECR atomic pattern** -- GET-then-conditionally-INCR has a TOCTOU race window. INCR-first-then-DECR-if-over is atomic at the Redis command level; the only edge case is a momentary over-count visible to concurrent reads, which immediately self-corrects.
- **UTC date string for daily keys** -- Using `new Date().toISOString().slice(0, 10)` ensures all servers partition by the same UTC day regardless of local timezone. Keys are also human-readable when inspecting Redis directly.
- **No TTL on lifetime keys** -- `plans_generated:{userId}` must survive Redis restarts. Production Redis must have persistence (RDB/AOF) enabled, or these counters are lost.
- **Guard falls back to free-tier** -- When `isUnlocked` is not on the request user object (e.g., auth middleware not yet wired in Phase 3), the guard applies the tighter 5/day rethink cap rather than the looser 15/day.

## Deviations from Plan

None -- plan executed exactly as written.

## Authentication Gates

None -- all tests use mocked Redis and direct service instantiation.

## Issues Encountered

- ESLint `@typescript-eslint/unbound-method` triggered on `expect(redis.expire)` assertions in tests. Fixed with targeted eslint-disable comments on the specific assertion lines.
- ESLint `@typescript-eslint/require-await` triggered on async mock implementations that return Promise.resolve synchronously. Fixed by removing `async` keyword and using explicit `Promise.resolve()` returns.
- Commitlint `subject-case` rejected sentence-case subject. Fixed by using lowercase first word after colon.

## User Setup Required

None -- all tests use mocked Redis. Rate limiting activates automatically when guard is wired to endpoints in plan 03-17.

## Next Phase Readiness

The rate limit infrastructure is complete. Downstream plans can now:

- **03-17 (endpoints):** Apply `@UseGuards(RateLimitGuard)` + `@RateLimit('rethink')` on `rethinkToday` and `@RateLimit('free-tier-lifetime')` on `generatePlan` endpoints.
- **Phase 4 (auth):** Auth middleware populates `request.user.id` and `request.user.isUnlocked` -- guard automatically picks these up without code changes.

Redis key shapes are published and ready for monitoring/alerting integration.

---
*Phase: 03-engine*
*Completed: 2026-04-16*

## Self-Check: PASSED

- All 5 created files present on disk.
- Both task commits present in git log (`f6f466f`, `81eb568`).
- `pnpm --filter @wonderwaltz/api test --run` -> 35 files, 280 tests, 0 failures.
