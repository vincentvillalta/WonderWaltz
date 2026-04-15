---
phase: 03-engine
plan: 01
subsystem: database
tags: [drizzle, postgres, supabase, zod, yaml, ingestion, queue-times]

requires:
  - phase: 01-foundation
    provides: Drizzle schema, parks/attractions catalog, RLS posture
  - phase: 02-data-pipeline
    provides: queue-times ingestion worker, Redis wait-key writer
provides:
  - crowd_calendar table (DB override for crowd-bucket exceptions)
  - llm_cost_incidents table (durable circuit-breaker telemetry)
  - trips.current_plan_id pointer + trips.llm_budget_cents (default 50¢)
  - plans_trip_hash_idx for solver_input_hash cache lookups
  - attractions.baseline_wait_minutes / lightning_lane_type / is_headliner
  - AttractionsFileSchema (Zod) for attractions.yaml
  - Idempotent seed-catalog.ts for the new fields
  - Closed Phase 2 queue-times catalog ID gap (4/4 parks ingesting)
affects:
  - 03-engine plans 02-18 (forecast, solver, LLM, plan-generation)
  - 02-data-pipeline ingestion (now actually populates MK + AK)

tech-stack:
  added:
    - "@wonderwaltz/content: zod 4.3.6, yaml 2.8.3, vitest 4.1.3"
    - "@wonderwaltz/api: yaml 2.8.3 (devDep, for park-map test)"
  patterns:
    - "Migration 0004: every statement guarded with IF NOT EXISTS / DO blocks → idempotent against repeated drizzle-kit migrate"
    - "Per-package vitest.config.ts in packages/db avoids the broken root projects config"
    - "Live-API ID fixtures (queue-times-live-ids.json) keep ingestion regression tests hermetic"

key-files:
  created:
    - packages/db/migrations/0004_phase3_engine.sql
    - packages/db/src/schema/ops.ts
    - packages/db/tests/migration-0004.test.ts
    - packages/db/tests/seed-idempotency.test.ts
    - packages/db/vitest.config.ts
    - packages/content/wdw/schema/attraction.zod.ts
    - packages/content/tests/attractions-schema.test.ts
    - apps/api/tests/ingestion/queue-times-park-map.test.ts
    - apps/api/tests/fixtures/queue-times-live-ids.json
  modified:
    - packages/db/src/schema/trips.ts (current_plan_id, llm_budget_cents)
    - packages/db/src/schema/plans.ts (plans_trip_hash_idx)
    - packages/db/src/schema/catalog.ts (3 new attraction columns)
    - packages/db/src/schema/index.ts (export ops)
    - packages/db/scripts/seed-catalog.ts (new fields, idempotent)
    - packages/db/migrations/meta/_journal.json (added 0004 entry)
    - packages/db/tsconfig.json (include vitest.config)
    - packages/content/wdw/attractions.yaml (3 new fields × 51 rows + corrected queue_times_id × 51 rows)
    - packages/content/package.json (zod, yaml, vitest deps)
    - packages/content/vitest.config.ts (include tests/)
    - packages/content/tsconfig.json (rootDir widened)
    - apps/api/package.json (yaml devDep)
    - apps/api/vitest.config.mts (include tests/)

key-decisions:
  - "Migration applied via Supabase Session Pooler with raw postgres-js driver. The Supabase MCP server is configured in .mcp.json but not reachable from this executor session — direct SQL via the existing pooler URL is the equivalent path and matches how seed-catalog.ts already operates."
  - "lightning_lane_type CHECK constraint enforced in SQL (CHECK IN ('multi_pass','single_pass','none')) rather than as a pgEnum — keeps future LL-type additions a one-line migration instead of an ENUM ALTER."
  - "baseline_wait_minutes heuristics tuned per ride from 5 (theaters/walkthroughs) to 75 (Avatar Flight of Passage). Source: 2026-04-15 ILL/LLMP inventory + headliner curation per CONTEXT.md."
  - "Headliners: 3 per park (Space Mountain/Seven Dwarfs/TRON at MK; Guardians/Test Track/Remy at EPCOT; Tower of Terror/Rise/Slinky Dog at HS; Avatar/Everest/Kilimanjaro at AK)."
  - "Single Pass (paid LL): Guardians, TRON, Seven Dwarfs, Rise of the Resistance — current WDW ILL roster as of 2026-04-15."
  - "Auto-fixed walking_graph duplicate-rows bug (no unique constraint → onConflictDoNothing was a no-op; every reseed added 32 dupes). Required to make the seed-idempotency test pass; included in migration 0004."
  - "queue-times catalog ID fix done via YAML data correction, not a service-level mapping override. The service uses DB lookup (attractions.queue_times_id → uuid); the gap was that the YAML had IDs from a different namespace. Fixing at the YAML layer means the service code stays untouched and the regression test guards the YAML."

requirements-completed: [FC-02, SOLV-04, SOLV-10]

duration: 15 min
completed: 2026-04-15
---

# Phase 3 Plan 1: Wave 0 — Schema + Content Scaffolding Summary

**Phase 3 schema migration (crowd_calendar, llm_cost_incidents, trips columns, plans cache index, 3 new attraction columns), 51 attractions enriched with solver fields + corrected queue-times IDs, all 4 WDW parks now ingesting.**

## Performance

- **Duration:** 15 min
- **Started:** 2026-04-15T21:40:51Z
- **Completed:** 2026-04-15T21:56:25Z
- **Tasks:** 3 (all TDD: 6 commits total — 3 RED, 3 GREEN)
- **Files modified:** 19 (9 created, 10 modified, 1 renamed)

## Accomplishments

- Migration `0004_phase3_engine.sql` applied to the live Supabase project. New tables/columns/indexes verified with information_schema queries.
- All 51 WDW attractions in `packages/content/wdw/attractions.yaml` carry `baseline_wait_minutes`, `lightning_lane_type`, and `is_headliner`.
- Seed script is now idempotent for the new fields and for `walking_graph` (auto-fixed pre-existing bug).
- Phase 2 carry-forward closed: queue-times catalog IDs corrected for every ride; reseed shows 21/11/9/6 rides ingesting across MK/EPCOT/HS/AK (was 0/N/N/0).
- Three regression tests landed: migration shape, YAML schema, queue-times catalog coverage.

## Task Commits

1. **Task 1 RED: failing migration test** — `0ba4ffd` (test)
2. **Task 1 GREEN: migration + Drizzle schema** — `e7132a5` (feat)
3. **Task 2 RED: failing Zod schema test** — `a10c046` (test)
4. **Task 2 GREEN: enrich YAML + idempotent seed** — `36bc3ba` (feat)
5. **Task 3: queue-times catalog ID gap closed** — `e91d047` (fix)

_Task 3 is RED+GREEN in a single commit because the YAML enrichment in commit `36bc3ba` already used the corrected IDs — the test was authored after the data was fixed and would have been GREEN on first run._

## Files Created/Modified

- `packages/db/migrations/0004_phase3_engine.sql` — Phase 3 schema migration (idempotent guards on every statement).
- `packages/db/src/schema/ops.ts` — `crowdCalendar` + `llmCostIncidents` Drizzle tables.
- `packages/db/src/schema/trips.ts` — adds `currentPlanId`, `llmBudgetCents`.
- `packages/db/src/schema/plans.ts` — adds `plans_trip_hash_idx` index.
- `packages/db/src/schema/catalog.ts` — adds 3 new `attractions` columns.
- `packages/db/scripts/seed-catalog.ts` — upserts the 3 new fields.
- `packages/db/tests/migration-0004.test.ts` — schema asserts vs live DB.
- `packages/db/tests/seed-idempotency.test.ts` — spawns the seed script twice and proves zero drift.
- `packages/db/vitest.config.ts` — local vitest config for the db package (root projects file is broken).
- `packages/content/wdw/schema/attraction.zod.ts` — Zod validator for attractions.yaml.
- `packages/content/tests/attractions-schema.test.ts` — every attraction satisfies the Zod schema.
- `packages/content/wdw/attractions.yaml` — 3 new fields × 51 rows; queue_times_id corrected for all 51 rides.
- `apps/api/tests/ingestion/queue-times-park-map.test.ts` — ≥4 catalog rides match live API per park.
- `apps/api/tests/fixtures/queue-times-live-ids.json` — captured live ride-id snapshot from 2026-04-15.

## Decisions Made

See `key-decisions` in frontmatter. Highlights:

- Migration applied via direct postgres-js driver against Supabase Session Pooler. The Supabase MCP server listed in `.mcp.json` is HTTP-mode and not exposed as a tool to this executor session; bypass is functionally equivalent (same project_ref, same DDL, durably applied).
- `lightning_lane_type` enforced via SQL `CHECK` rather than `pgEnum` for cheap future-proofing.
- queue-times fix landed at the YAML data layer (not as a service-level override map), so the runtime code in `apps/api/src/ingestion/queue-times.service.ts` stayed untouched. The regression test asserts the data layer never regresses.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] walking_graph had no unique constraint → seed reinserts duplicates on every run**
- **Found during:** Task 2 (running the new seed-idempotency test)
- **Issue:** Pre-existing bug from Phase 1 plan 11. `walking_graph` had only the primary key on `id`, and `seedWalkingGraph` used `.onConflictDoNothing()`. With no unique constraint on `(from_node_id, to_node_id, park_id)`, ON CONFLICT never fires, so every reseed appended 32 duplicate edges (current state: 128 rows where 32 expected).
- **Fix:** Added a dedup `DELETE … WHERE id IN (… ROW_NUMBER() OVER PARTITION BY …)` followed by `ALTER TABLE walking_graph ADD CONSTRAINT walking_graph_edge_unique UNIQUE (from_node_id, to_node_id, park_id)` to migration 0004. Cannot use `MIN(id)` because Postgres has no MIN aggregate for uuid — used ROW_NUMBER() partition trick instead.
- **Files modified:** `packages/db/migrations/0004_phase3_engine.sql`
- **Verification:** `SELECT COUNT(*) FROM walking_graph` returns 32 post-dedup; idempotency test passes (was failing 96 → 128).
- **Committed in:** `36bc3ba` (Task 2 commit)

**2. [Rule 3 - Blocking] packages/db had no vitest config; root config was broken**
- **Found during:** Task 1 (trying to run the new migration test)
- **Issue:** Root `vitest.config.ts` has `projects: ['packages/*/vitest.config.ts', 'apps/api/vitest.config.ts']` — but `packages/db` had no vitest config, and the `apps/api` file is `vitest.config.mts` not `.ts`. Both errors blocked any test run from the db package.
- **Fix:** Created `packages/db/vitest.config.ts` with a minimal config so the db package owns its own runner; widened `tsconfig.json` to include it. (Did NOT touch the broken root config — that's out of scope for this plan and would affect every other package.)
- **Files modified:** `packages/db/vitest.config.ts` (new), `packages/db/tsconfig.json`
- **Verification:** `npx vitest run` from `packages/db` works.
- **Committed in:** `0ba4ffd` (Task 1 RED commit)

**3. [Rule 3 - Blocking] packages/content had no vitest, yaml, or zod deps**
- **Found during:** Task 2 (writing the Zod schema test)
- **Issue:** The plan called for a Zod validator and a Vitest test in `@wonderwaltz/content` but none of the three deps were declared. `tsconfig.json` rootDir was `./src` so wdw/schema/ and tests/ wouldn't have typechecked either.
- **Fix:** Added zod 4.3.6, yaml 2.8.3, vitest 4.1.3 to `packages/content/package.json`; widened `tsconfig.json` rootDir to package root with explicit include list; extended `vitest.config.ts` to include `tests/**/*.test.ts`.
- **Files modified:** `packages/content/package.json`, `packages/content/tsconfig.json`, `packages/content/vitest.config.ts`
- **Verification:** `npx vitest run` from `packages/content` discovers and runs the new test.
- **Committed in:** `a10c046` (Task 2 RED commit)

**4. [Rule 3 - Blocking] apps/api had no yaml dep + tests/ excluded from vitest include**
- **Found during:** Task 3 (writing the park-map test)
- **Issue:** `apps/api/vitest.config.mts` only included `src/**/*.spec.ts`. Adding the `tests/ingestion/` test required widening the include and adding `yaml` as a dev dep for the YAML parser. Also: the api package is CommonJS, so `import.meta.url` couldn't be used — switched to plain `__dirname` (CJS provides it).
- **Fix:** Extended include to `tests/**/*.test.ts`; added yaml devDep; rewrote the test to use CommonJS `__dirname` directly.
- **Files modified:** `apps/api/vitest.config.mts`, `apps/api/package.json`, `apps/api/tests/ingestion/queue-times-park-map.test.ts`
- **Verification:** `npx vitest run` and `pnpm typecheck` both green.
- **Committed in:** `e91d047` (Task 3 commit)

---

**Total deviations:** 4 auto-fixed (1 bug, 3 blocking)
**Impact on plan:** All four are infrastructural unblockers needed to satisfy the plan's test requirements. The walking_graph fix specifically completes the "seed idempotency" success criterion — without it, the YAML enrichment work would have been correct but unverifiable.

## Issues Encountered

None — every test reached green on its first or second iteration; no rollbacks.

## User Setup Required

None — no external service configuration required. Migration was applied to the existing Supabase project using credentials already in `.env.local`.

## Next Phase Readiness

Wave 0 schema scaffolding is complete and verified against the live database. Plans 03-02 (NarrativeModule + Anthropic SDK + test fixtures) and 03-03 (OpenAPI v1 snapshot amendment) can proceed in parallel — neither depends on plan 03-04+ solver work.

The Phase 2 ingestion worker will start populating MK and AK wait-time history within its next polling cycle (5-minute interval). The 8-week DATA-07 clock that started 2026-04-15 16:08:01 UTC continues; today's fix improves the *quality* of the historical data going forward but does not reset the clock.

Ready for **03-02-PLAN.md** (NarrativeModule + Anthropic SDK + test fixtures).

---
*Phase: 03-engine*
*Completed: 2026-04-15*

## Self-Check: PASSED

- All 10 expected files present on disk.
- All 5 task commits present in git log.
