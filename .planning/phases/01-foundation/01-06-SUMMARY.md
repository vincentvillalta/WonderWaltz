---
phase: 01-foundation
plan: "06"
subsystem: database
tags: [drizzle, postgres, timescaledb, postgis, supabase, rls, vitest]

# Dependency graph
requires:
  - phase: 01-02
    provides: packages/db package with createDb() stub and drizzle-kit config

provides:
  - 9 Drizzle schema files in packages/db/src/schema/ covering all data domains
  - Initial Drizzle migration 0000 (21 tables)
  - TimescaleDB hypertable migration 0001 for wait_times_history
  - Continuous aggregate migration 0002 for wait_times_1h hourly view
  - RLS policies migration 0003 enabling service-role-only access on all 17 tables
  - Vitest RLS integration test verifying anon key is blocked
  - supabase/config.toml for local dev reproducibility

affects:
  - 01-07
  - phase-02-data-pipeline
  - phase-03-solver
  - phase-05-ios
  - phase-07-android

# Tech tracking
tech-stack:
  added:
    - drizzle-orm customType for PostGIS geometry(Point, 4326)
    - @supabase/supabase-js 2.102.1 (devDependency for RLS tests)
    - drizzle-kit generate --custom for raw SQL migration slots
  patterns:
    - ageBracketEnum pgEnum for LEGL-07 COPPA compliance (no birthdate field anywhere)
    - customType wrapper for PostGIS types not natively in Drizzle
    - Raw SQL migration slots via drizzle-kit generate --custom for TimescaleDB DDL
    - Service-role-only RLS: enable on all tables, no anon policy = blocked by default
    - Vitest integration tests against local Supabase for RLS regression detection

key-files:
  created:
    - packages/db/src/schema/users.ts
    - packages/db/src/schema/trips.ts
    - packages/db/src/schema/catalog.ts
    - packages/db/src/schema/timeseries.ts
    - packages/db/src/schema/plans.ts
    - packages/db/src/schema/entitlements.ts
    - packages/db/src/schema/notifications.ts
    - packages/db/src/schema/affiliate.ts
    - packages/db/src/schema/ops.ts
    - packages/db/src/schema/index.ts
    - packages/db/migrations/0000_lying_nicolaos.sql
    - packages/db/migrations/0001_timescale_hypertable.sql
    - packages/db/migrations/0002_timescale_continuous_agg.sql
    - packages/db/migrations/0003_rls_policies.sql
    - packages/db/migrations/meta/_journal.json
    - packages/db/tests/rls.integration.test.ts
    - supabase/config.toml
  modified:
    - packages/db/src/index.ts
    - packages/db/tsconfig.json

key-decisions:
  - "ageBracketEnum stores age as bracket string ('0-2','3-6','7-9','10-13','14-17','18+') — no birthdate
    field exists anywhere in any schema file (LEGL-07 COPPA compliance)"
  - "Drizzle customType used for PostGIS geometry(Point, 4326) on attractions.location_point and
    dining tables — Drizzle has no native PostGIS support"
  - "wait_times_history has no primary key by design — TimescaleDB hypertables use (ride_id, ts)
    as natural composite key; drizzle-kit generates the table, raw SQL converts it"
  - "RLS posture: enable on all 17 tables, define ownership policies for user data,
    leave catalog tables with NO policy (blocked by default) — all catalog reads via NestJS service role"
  - "tsconfig.json includes tests/ directory so ESLint project service can parse integration test files"

patterns-established:
  - "Pattern: LEGL-07 enforcement via pgEnum — any future guest attribute uses string brackets, never dates"
  - "Pattern: raw SQL migrations for DDL drizzle-kit cannot emit (TimescaleDB, custom extensions)"
  - "Pattern: RLS via no-policy default — adding ENABLE ROW LEVEL SECURITY with no permissive policy blocks all non-service-role access"
  - "Pattern: Vitest integration test against local Supabase for RLS regression detection"

requirements-completed:
  - DB-01
  - DB-02
  - DB-03
  - DB-04
  - DB-05
  - DB-06
  - DB-08
  - LEGL-07

# Metrics
duration: 3min
completed: 2026-04-10
---

# Phase 01 Plan 06: DB Schema + Migrations Summary

**21-table Drizzle schema with TimescaleDB hypertable, PostGIS geometry, and service-role-only RLS across all 17 tables**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-04-10T21:07:56Z
- **Completed:** 2026-04-10T21:10:45Z
- **Tasks:** 2
- **Files modified:** 18

## Accomplishments

- All 9 Drizzle schema files written with full LEGL-07 compliance (ageBracketEnum, zero birthdate fields)
- 4 migration files generated: 1 Drizzle-generated (21 tables) + 3 custom raw SQL (hypertable, continuous aggregate, RLS)
- RLS enabled on all 17 tables with service-role-only posture; Vitest integration tests verify anon key is blocked
- supabase/config.toml committed for reproducible local dev setup

## Task Commits

Each task was committed atomically:

1. **Task 1: Drizzle schema files (all 9 domains)** - `1aaaa4a` (feat)
2. **Task 2: Raw SQL migrations + RLS + Supabase config** - `b1046ae` (feat)

## Files Created/Modified

- `packages/db/src/schema/users.ts` - users table with soft-delete
- `packages/db/src/schema/trips.ts` - trips/guests/trip_park_days/trip_preferences; ageBracketEnum (LEGL-07)
- `packages/db/src/schema/catalog.ts` - parks/attractions (PostGIS)/dining/shows/resorts/walking_graph
- `packages/db/src/schema/timeseries.ts` - wait_times_history (becomes hypertable via migration)
- `packages/db/src/schema/plans.ts` - plans/plan_days/plan_items
- `packages/db/src/schema/entitlements.ts` - entitlements/iap_events/llm_costs
- `packages/db/src/schema/notifications.ts` - push_tokens
- `packages/db/src/schema/affiliate.ts` - affiliate_items/packing_list_items
- `packages/db/src/schema/ops.ts` - placeholder for future ops tables
- `packages/db/src/schema/index.ts` - barrel exports all domain schemas
- `packages/db/src/index.ts` - updated createDb() with schema; re-exports all tables
- `packages/db/migrations/0000_lying_nicolaos.sql` - initial Drizzle-generated migration
- `packages/db/migrations/0001_timescale_hypertable.sql` - create_hypertable for wait_times_history
- `packages/db/migrations/0002_timescale_continuous_agg.sql` - wait_times_1h continuous aggregate
- `packages/db/migrations/0003_rls_policies.sql` - ENABLE ROW LEVEL SECURITY on all 17 tables
- `packages/db/tests/rls.integration.test.ts` - Vitest RLS integration tests with real assertions
- `supabase/config.toml` - local Supabase configuration committed to repo
- `packages/db/tsconfig.json` - added tests/ to includes for ESLint project service

## Decisions Made

- Used `drizzle-orm customType` for PostGIS geometry(Point, 4326) — Drizzle has no native PostGIS support
- wait_times_history has no primary key by design; TimescaleDB uses (ride_id, ts) as composite key
- RLS posture: ENABLE on all tables, define ownership policies for user data, leave catalog with NO policy (blocked by default — all catalog reads via NestJS service role only)
- tsconfig.json includes tests/ so ESLint project service can parse RLS integration test files

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added tests/ to tsconfig.json includes**
- **Found during:** Task 2 (committing RLS integration test)
- **Issue:** ESLint project service could not parse rls.integration.test.ts because tests/ was not in tsconfig includes, causing pre-commit hook failure
- **Fix:** Added "tests" to the "include" array in packages/db/tsconfig.json
- **Files modified:** packages/db/tsconfig.json
- **Verification:** ESLint passed on re-commit attempt
- **Committed in:** b1046ae (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 2 - missing critical)
**Impact on plan:** Minor tsconfig fix required for ESLint compatibility. No scope creep.

## Issues Encountered

- lint-staged commitlint rejects commit messages with body lines over 100 chars — kept bullet points concise in subsequent attempt

## User Setup Required

None - no external service configuration required. Local Supabase setup is via `supabase start` (requires Supabase CLI installed separately).

## Next Phase Readiness

- All schema types available to downstream packages via `@wonderwaltz/db` exports
- Phase 2 (Data Pipeline) can begin writing to wait_times_history once TimescaleDB is enabled and migrations run
- Phase 3 (Solver) has plans/plan_days/plan_items schema ready
- To run migrations locally: `supabase start` then `DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres pnpm --filter @wonderwaltz/db exec drizzle-kit migrate`
- DB-07 (seed script) deferred to separate plan — not in this plan's scope

---
*Phase: 01-foundation*
*Completed: 2026-04-10*
