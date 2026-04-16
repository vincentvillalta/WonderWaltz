---
phase: 03-engine
plan: 19
subsystem: database
tags: [postgres, drizzle, migration, schema-alignment]

# Dependency graph
requires:
  - phase: 03-engine
    provides: "plan_days/plan_items/plans tables from 0000 migration; plans.service.ts read path; persist-plan.service.ts write path"
provides:
  - "Migration 0005 adding 8 missing/renamed columns to plan_days, plan_items, plans"
  - "Drizzle schema matching all columns queried by plans.service.ts"
  - "persist-plan.service.ts writing direct columns instead of JSONB metadata"
affects: [03-engine verification, plan generation pipeline, GET /plans/:id]

# Tech tracking
tech-stack:
  added: []
  patterns: ["ALTER TABLE RENAME COLUMN for schema evolution", "IF NOT EXISTS idempotent migration pattern"]

key-files:
  created:
    - "packages/db/migrations/0005_plan_schema_alignment.sql"
  modified:
    - "packages/db/src/schema/plans.ts"
    - "apps/api/src/plan-generation/persist-plan.service.ts"

key-decisions:
  - "RENAME COLUMN (narrative -> narrative_intro/narrative_tip) instead of adding alias columns -- Postgres lacks column aliases; rename is clean since only two services touch these tables"
  - "warnings stored as TEXT with JSON.stringify (not JSONB) -- matches plans.service.ts COALESCE pattern and avoids cast complexity"
  - "metadata column kept as empty JSONB '{}' for future extensibility -- not removed"

patterns-established:
  - "Schema gap closure: migration + Drizzle schema + write path + read path must all align"

requirements-completed: [SC-1, SC-2, SC-5, PLAN-02, PLAN-03, FC-05]

# Metrics
duration: 2min
completed: 2026-04-16
---

# Phase 3 Plan 19: DB Schema Alignment Summary

**Migration 0005 adds 8 missing columns (2 renames + 6 new) to plan_days/plan_items/plans, aligning persist-plan writes and plans.service reads against real Postgres schema**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-16T19:33:10Z
- **Completed:** 2026-04-16T19:35:30Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Created migration 0005 with idempotent DDL for all 8 column gaps identified in 03-VERIFICATION.md Gap 1
- Updated Drizzle schema (plans.ts) with narrativeIntro, forecastConfidence, name, waitMinutes, lightningLaneType, notes, narrativeTip, warnings
- Rewrote persist-plan.service.ts to write name, wait_minutes, lightning_lane_type, notes as direct columns instead of JSONB metadata
- plans.service.ts read path now matches persisted column names exactly (no code changes needed -- it was already written for the target schema)

## Task Commits

Each task was committed atomically:

1. **Task 1: Migration + Drizzle schema for missing columns** - `e5614a5` (feat)
2. **Task 2: Align persist-plan write path and plans.service read path** - `4a033cf` (fix)

## Files Created/Modified
- `packages/db/migrations/0005_plan_schema_alignment.sql` - DDL adding 8 columns via RENAME + ADD COLUMN IF NOT EXISTS
- `packages/db/src/schema/plans.ts` - Drizzle schema updated with all new/renamed columns
- `apps/api/src/plan-generation/persist-plan.service.ts` - Write path uses direct columns; warnings aggregated from solver output

## Decisions Made
- RENAME COLUMN approach for narrative -> narrative_intro/narrative_tip (safe since only persist-plan writes and plans.service reads)
- warnings as TEXT (not JSONB) with JSON.stringify -- matches existing COALESCE pattern in plans.service.ts
- metadata column preserved as empty JSONB for future extensibility

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Gap 1 (CRITICAL) from 03-VERIFICATION.md is now closed
- GET /plans/:id will return structured DayPlan[] with all expected columns
- Migration 0005 must be applied to live Supabase before integration testing
- Remaining gaps (LLM-06 trigger, rate limit guard, packing list wiring) are separate plans

---
*Phase: 03-engine*
*Completed: 2026-04-16*
