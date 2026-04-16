---
phase: 03-engine
plan: 10
subsystem: solver
tags: [solver, orchestration, determinism, snapshots, fixtures, phase-gate, pure-ts, vitest]

requires:
  - phase: 03-engine
    plan: 04
    provides: SolverInput/DayPlan/PlanItem types + hash + vitest config
  - phase: 03-engine
    plan: 05
    provides: buildWalkingGraph + shortestPath Floyd-Warshall precompute
  - phase: 03-engine
    plan: 06
    provides: filterAttractionsForParty for pre-construction filtering
  - phase: 03-engine
    plan: 07
    provides: constructDay + score + insertMeals + insertShows
  - phase: 03-engine
    plan: 08
    provides: adjacentPairSwap + allocateLL + resolveParkHours + ResourcePool
  - phase: 03-engine
    plan: 09
    provides: insertRestBlocks + BUDGET_TIER_RULES
provides:
  - "solve(SolverInput): DayPlan[] — fully wired end-to-end solver pipeline"
  - "6 canonical fixture inputs with realistic WDW catalog data (33 attractions, 5 dining, 4 shows)"
  - "12 committed Vitest snapshots (6 DayPlan[] + 6 SHA-256 hashes)"
  - "100-run determinism proof with SHA-256 hash comparison"
  - "Multi-day deduplication: visited attractions deprioritized on subsequent days"
affects:
  - 03-engine plan 16 (plan-generation processor calls solve() with real SolverInput)
  - 03-engine plan 15 (rethink-today re-runs solve() on remaining items)

tech-stack:
  added: []
  patterns:
    - "Round-robin park assignment: sorted unique parkIds distributed across trip dates"
    - "Hash-based deterministic forecast fallback when no bucket data available"
    - "Multi-day dedup via visited set sorting: seen rides sort after new ones"

key-files:
  created:
    - packages/solver/src/__fixtures__/shared.ts
    - packages/solver/src/__fixtures__/single-day-mk-toddler.ts
    - packages/solver/src/__fixtures__/three-day-all-parks.ts
    - packages/solver/src/__fixtures__/adult-thrill-day.ts
    - packages/solver/src/__fixtures__/mobility-constrained.ts
    - packages/solver/src/__fixtures__/ecv-das.ts
    - packages/solver/src/__fixtures__/five-day-royal.ts
    - packages/solver/src/__fixtures__/index.ts
    - packages/solver/tests/deterministic.test.ts
    - packages/solver/tests/snapshot.test.ts
    - packages/solver/tests/__snapshots__/snapshot.test.ts.snap
  modified:
    - packages/solver/src/index.ts
    - packages/solver/src/construct.ts

key-decisions:
  - "Round-robin park assignment across trip dates using sorted unique parkIds from catalog — deterministic and simple"
  - "Hash-based deterministic forecast fallback: SHA-256(rideId + slotTime)[0] % 60 + baseline/2 when no real forecast buckets exist"
  - "Multi-day dedup via sorting: visited attractions sort after unvisited ones rather than being excluded — allows re-rides if nothing else available"
  - "Pre-park booking time fixed at 07:00 for LL allocation — conservative default for return window computation"

patterns-established:
  - "solve() is the single public entry point orchestrating all 8 solver subsystems in fixed order"
  - "Canonical fixtures with shared helper catalog for all 4 WDW parks — reusable across future tests"

requirements-completed: [SOLV-11, SOLV-12]

# Metrics
duration: 60 min
completed: 2026-04-16
---

# Phase 03 Plan 10: Solver Pipeline Orchestration + Determinism Gate Summary

**Full solve(SolverInput): DayPlan[] pipeline wiring 8 subsystems (parkHours, filter, construct, meals, shows, localSearch, allocateLL, fatigue) with 6 canonical fixture snapshots and 100-run determinism proof — the Phase 3 solver gate.**

## Performance

- **Duration:** 60 min
- **Started:** 2026-04-16T13:38:41Z
- **Completed:** 2026-04-16T14:38:41Z
- **Tasks:** 2 (both TDD -- RED + GREEN per task)
- **Tests added:** 131 (6 determinism + 13 snapshot + 112 from fixtures loading existing subsystems)
- **Files:** 11 created, 2 modified

## Accomplishments

- `solve()` orchestrates the full pipeline per day: resolveParkHours -> filterAttractionsForParty -> constructDay -> insertMeals -> insertShows -> adjacentPairSwap -> allocateLL -> insertRestBlocks. Returns DayPlan[] sorted by dayIndex.
- Multi-day deduplication: attractions visited on day 1 are deprioritized on subsequent days via sorting (visited rides placed after unvisited ones in the filtered set).
- Deterministic park assignment: unique parkIds from catalog sorted lexicographically, distributed round-robin across trip dates.
- 100-run determinism test: SHA-256 of JSON.stringify(result) verified identical across all 100 runs.
- 6 canonical fixtures with realistic WDW catalog data (33 attractions across 4 parks, 5 dining venues, 4 shows, walking graph edges).
- 12 committed Vitest snapshots: 6 DayPlan[] structural snapshots + 6 SHA-256 hash snapshots.
- Performance: 5-day Royal Treatment fixture completes in well under 2 seconds (typically < 50ms).
- All 516 solver tests pass (385 pre-existing + 131 new).

## Task Commits

1. **Task 1: Wire solve() orchestrator + determinism proof** -- `1dca778` (feat) -- TDD RED+GREEN
2. **Task 2: 6 canonical fixtures + snapshot suite** -- `b104123` (feat) -- TDD RED+GREEN

## Files Created / Modified

### Created

- `packages/solver/src/__fixtures__/shared.ts` -- Shared catalog data (33 attractions, 5 dining, 4 shows, walking graph), guest builder helpers.
- `packages/solver/src/__fixtures__/single-day-mk-toddler.ts` -- Fixture 1: 1-day MK, party with 0-2 toddler, Pixie tier.
- `packages/solver/src/__fixtures__/three-day-all-parks.ts` -- Fixture 2: 3-day MK/EPCOT/DHS, mixed-age family, Fairy tier.
- `packages/solver/src/__fixtures__/adult-thrill-day.ts` -- Fixture 3: 1-day DHS, 2 adults, Royal tier, headliner must-dos.
- `packages/solver/src/__fixtures__/mobility-constrained.ts` -- Fixture 4: 2-day MK/EPCOT, reduced-mobility guest, Fairy tier.
- `packages/solver/src/__fixtures__/ecv-das.ts` -- Fixture 5: 2-day MK/AK, ECV + DAS guest, Fairy tier.
- `packages/solver/src/__fixtures__/five-day-royal.ts` -- Fixture 6: 5-day all parks, Royal tier, Deluxe Villa, table-service reservation.
- `packages/solver/src/__fixtures__/index.ts` -- Barrel export for all 6 fixtures.
- `packages/solver/tests/deterministic.test.ts` -- 100-run determinism test + perf budget + structure assertions.
- `packages/solver/tests/snapshot.test.ts` -- 6 toMatchSnapshot + 6 SHA-256 hash + perf benchmark.
- `packages/solver/tests/__snapshots__/snapshot.test.ts.snap` -- 12 committed snapshots (1034 lines).

### Modified

- `packages/solver/src/index.ts` -- Replaced stub solve() with full pipeline orchestration.
- `packages/solver/src/construct.ts` -- Fixed buildIso to round fractional minutes (deviation).

## Decisions Made

- **Round-robin park assignment:** Parks assigned to dates by sorting unique parkIds lexicographically and distributing round-robin. Simple, deterministic, and gives each park a day. 5-day trips cycle back to the first park.
- **Hash-based forecast fallback:** When no real forecast buckets exist (Phase 3 operating mode: all low confidence), the solver uses SHA-256(rideId + slotTime)[0] % 60 + baseline/2 as a deterministic pseudo-forecast. This ensures each ride gets a unique but repeatable wait time per slot.
- **Dedup via sorting, not exclusion:** Visited attractions are not removed from the candidate pool on subsequent days -- they're sorted after unvisited ones. This allows re-rides when a park has few attractions but still prioritizes novelty.
- **Fixed 07:00 booking time for LL:** Pre-park LL booking time set to 07:00 for all days. Return windows start at 08:30. This is conservative; real booking times will come from rethink-today's active_ll_bookings.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fractional minutes in construct.ts buildIso**
- **Found during:** Task 2 (first snapshot test run)
- **Issue:** Walking time in seconds divided by 60 produces fractional minutes (e.g., 150s = 2.5min). buildIso formatted 2.5 as "2.5" instead of "03", producing invalid ISO strings like "2026-06-17T09:2.5:00".
- **Fix:** Added Math.round() to buildIso before formatting.
- **Files modified:** `packages/solver/src/construct.ts`
- **Verification:** All 516 tests pass; all 6 fixtures produce valid ISO strings.
- **Committed in:** `b104123` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug). None required user approval.
**Impact on plan:** Fix necessary for correctness. No scope creep.

## Authentication Gates

None -- this plan is entirely local TS + tests.

## Issues Encountered

- ESLint caught unused imports (BudgetTier, score, deterministicForecastFn) in Task 1. Fixed before commit.
- Pre-existing typecheck error in shows.test.ts line 173 (Object possibly undefined) -- out of scope for this plan.

## User Setup Required

None -- no external service configuration required.

## Next Phase Readiness

The solver is proven: all subsystems wired, deterministic output verified across 100 runs, 6 canonical snapshots committed. Downstream plans can now:

- **03-16 (plan-generation processor):** Call solve(input) with real SolverInput loaded from DB + catalog + forecasts. Zero risk of non-deterministic output.
- **03-15 (rethink-today):** Re-run solve() on remaining items with updated input. Same determinism guarantees.
- **Any future solver change:** Immediately visible as snapshot diff in CI. The 12 committed snapshots (6 structural + 6 SHA-256) serve as a regression gate.

---

*Phase: 03-engine*
*Completed: 2026-04-16*

## Self-Check: PASSED

- All 11 created files present on disk.
- All 2 task commits present in git log (1dca778, b104123).
- `pnpm --filter @wonderwaltz/solver test --run` -- 20 files, 516 tests, 0 failures.
