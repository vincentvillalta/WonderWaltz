---
phase: 03-engine
plan: 07
subsystem: solver
tags: [solver, greedy-construction, scoring, must-do-pinning, meals, shows, pure-ts, vitest]

requires:
  - phase: 03-engine
    plan: 04
    provides: SolverInput/PlanItem/CatalogAttraction types + solver vitest config
  - phase: 03-engine
    plan: 05
    provides: shortestPath(graph, from, to) for walk-cost computation
  - phase: 03-engine
    plan: 06
    provides: filterAttractionsForParty/filterDiningForParty for pre-construction filtering
provides:
  - "score() — deterministic attraction scoring: enjoyment_weight / (time_cost + wait_cost + walk_cost) with low-confidence 1.2x penalty"
  - "constructDay() — greedy construction with must-do hard pinning at forecast-optimal windows"
  - "insertMeals() — table-service hard pins + quick-service in 60+ min gaps (SOLV-05)"
  - "insertShows() — preferred shows as optional scored blocks with displacement cost check (SOLV-06)"
  - "deriveEnjoymentWeight() — bridges isHeadliner boolean to numeric score (85/50)"
affects:
  - 03-engine plan 08 (local search operates on constructDay output; adjacent-pair swaps re-score via score())
  - 03-engine plan 09 (LL allocator consumes constructed plan + scores to assign Lightning Lane slots)
  - 03-engine plan 12 (snapshot fixtures validate deterministic output of constructDay + insertMeals + insertShows)

tech-stack:
  added: []
  patterns:
    - "Timezone-naive ISO arithmetic — minutes-since-midnight on a date prefix string avoids Date object TZ surprises"
    - "Slot-based time windowing — 30-min slots for construction, gap analysis for meal insertion"
    - "Displacement cost scoring for optional items (shows) — keep only if showScore > sum(displaced item costs)"
    - "Deterministic tie-breaking by attraction.id lexicographic order when scores are equal"

key-files:
  created:
    - packages/solver/src/score.ts
    - packages/solver/src/construct.ts
    - packages/solver/src/meals.ts
    - packages/solver/src/shows.ts
    - packages/solver/tests/score.test.ts
    - packages/solver/tests/construct-pinning.test.ts
    - packages/solver/tests/meals.test.ts
    - packages/solver/tests/shows.test.ts
  modified:
    - packages/solver/src/index.ts

key-decisions:
  - "deriveEnjoymentWeight bridges isHeadliner boolean (85 for headliners, 50 for non-headliners) since CatalogAttraction has no explicit enjoymentScore field — plan referenced a field that doesn't exist in the type system"
  - "Timezone-naive arithmetic (minutes since midnight + date prefix string) instead of Date objects — prevents timezone conversion bugs that surfaced during initial testing (PDT offset shifted hours by 2)"
  - "Shows use fixed displacement cost per item (40) vs fixed show score (60) rather than computing actual attraction scores — avoids requiring full scoring context (walk graph, forecasts) in the show insertion pass; local search in 03-08 can refine"
  - "guests and budgetTier params accepted but unused in insertMeals — contract preserved for future dietary-aware QS selection and budget-tier-dependent meal count"

patterns-established:
  - "Score formula baseline: enjoyment / (time + wait + walk) with equal weights — calibration via snapshot fixtures in 03-12"
  - "Construction pipeline: filter → constructDay → insertMeals → insertShows (composable pure functions)"

requirements-completed: [SOLV-03, SOLV-05, SOLV-06]

# Metrics
duration: 15 min
completed: 2026-04-16
---

# Phase 03 Plan 07: Solver Greedy Construction Core Summary

**Greedy construction pass with must-do hard pinning at forecast-optimal windows, score-driven fill, table-service meal pins, QS gap insertion, and show displacement scoring — all pure-TS, timezone-naive, deterministic.**

## Performance

- **Duration:** 15 min
- **Started:** 2026-04-16T09:58:08Z
- **Completed:** 2026-04-16T10:12:39Z
- **Tasks:** 3 (all TDD — RED + GREEN per task)
- **Tests added:** 86 (25 score + 22 construct + 18 meals + 21 shows)
- **Files:** 8 created, 1 modified

## Accomplishments

- `score()` implements the CONTEXT.md formula `enjoyment_weight / (time_cost + wait_cost + walk_cost)` with equal weights and 1.2x penalty for low-confidence forecasts. `deriveEnjoymentWeight()` bridges the isHeadliner boolean to a numeric score (85/50) since CatalogAttraction lacks an explicit enjoymentScore field.
- `constructDay()` pins must-do attractions at their forecast-optimal 30-min windows (minimum predicted wait), then greedily fills remaining time by score. Uses `shortestPath()` from the walking graph for walk-cost. Deterministic with lexicographic tie-breaking.
- `insertMeals()` hard-pins table-service reservations (removing conflicting attractions) and inserts quick-service meals in the largest 60+ min gaps within lunch (11:00-13:30) and dinner (17:00-19:30) windows.
- `insertShows()` scores preferred shows against displacement cost (items that would be removed). Shows are kept only when their enjoyment weight exceeds the cost of displaced attractions. Non-preferred shows are skipped entirely.
- All functions are pure TS with zero side effects. Timezone-naive arithmetic avoids Date object surprises.
- All 235 solver tests pass (149 pre-existing + 86 new).

## Task Commits

1. **Task 1: Scoring function + cost helpers** — `29ed00a` (feat) — TDD RED+GREEN
2. **Task 2: constructDay greedy + must-do hard pinning** — `c4fdee7` (feat) — TDD RED+GREEN
3. **Task 3: Meal + show/parade/fireworks insertion** — `c26d37a` (feat) — TDD RED+GREEN

## Files Created / Modified

### Created

- `packages/solver/src/score.ts` — `score()`, `deriveEnjoymentWeight()`, `ScoreInput` type.
- `packages/solver/src/construct.ts` — `constructDay()`, `ForecastFn`, `ParkHours`, `ConstructDayInput` types.
- `packages/solver/src/meals.ts` — `insertMeals()`, `InsertMealsInput` type. Table-service hard pins + QS gap insertion.
- `packages/solver/src/shows.ts` — `insertShows()`, `InsertShowsInput` type. Preferred show scoring vs displacement.
- `packages/solver/tests/score.test.ts` — 25 assertions: table-driven score cases, low-confidence penalty, determinism, finite output.
- `packages/solver/tests/construct-pinning.test.ts` — 22 assertions: must-do pinning at optimal window, greedy fill, no overlaps, determinism, tie-breaking, empty input.
- `packages/solver/tests/meals.test.ts` — 18 assertions: TS hard pin + conflict removal, QS lunch/dinner insertion, budget tiers, sorted output, determinism.
- `packages/solver/tests/shows.test.ts` — 21 assertions: preferred fireworks kept, non-preferred skipped, displacement cost exceeds show score, no-conflict show kept, sorted output, determinism.

### Modified

- `packages/solver/src/index.ts` — Added exports for `score.js`, `construct.js`, `meals.js`, `shows.js`.

## Decisions Made

- **deriveEnjoymentWeight bridges isHeadliner to numeric score**: Plan referenced `attraction.enjoymentScore` (1-100 from YAML), but `CatalogAttraction` only has `isHeadliner: boolean`. Derived 85 for headliners, 50 for non-headliners. When per-ride enjoyment scores land in YAML, this becomes a direct field read.
- **Timezone-naive arithmetic**: Initial implementation used `new Date()` which applied local timezone (PDT), shifting hours by 2. Switched to minutes-since-midnight + date-prefix string arithmetic. All times are treated as park-local wall-clock.
- **Fixed displacement cost for shows**: Shows use a simplified cost model (60 show score vs 40 per displaced item) rather than computing actual attraction scores in context. This avoids requiring the full scoring context (walk graph, forecasts) in the show insertion pass. Local search in 03-08 can refine.
- **guests/budgetTier accepted but unused in insertMeals**: Contract preserved for future dietary-aware QS venue selection and budget-tier-dependent meal count. Currently all budget tiers get QS meals in gaps.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Plan references attraction.enjoymentScore — field doesn't exist**
- **Found during:** Task 1 (reading behavior spec vs actual types)
- **Issue:** Plan's behavior section references `attraction.enjoymentScore (from YAML, 1-100; headliners 80+)` but `CatalogAttraction` has no such field. Only `isHeadliner: boolean` exists.
- **Fix:** Created `deriveEnjoymentWeight()` that returns 85 for headliners, 50 for non-headliners. Documented as a bridge function to be replaced when per-ride scores land in YAML.
- **Files modified:** `packages/solver/src/score.ts`
- **Verification:** All 25 score tests pass with derived weights.
- **Committed in:** `29ed00a` (Task 1 commit)

**2. [Rule 1 - Bug] Timezone conversion corrupted time calculations**
- **Found during:** Task 2 (first GREEN run)
- **Issue:** `new Date('2026-06-01T09:00:00')` parses as local time (PDT), then `toISOString()` outputs UTC, shifting all times by 2 hours. Must-do pinning at "09:00" appeared as "07:00".
- **Fix:** Replaced all Date-based arithmetic with timezone-naive minutes-since-midnight + date-prefix string approach. `parseIso()` extracts components from the string directly. `buildIso()` reconstructs without any Date object.
- **Files modified:** `packages/solver/src/construct.ts`, `packages/solver/tests/construct-pinning.test.ts`
- **Verification:** Must-do pinning test confirms 09:00 slot correctly; all 22 construct tests pass.
- **Committed in:** `c4fdee7` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug). None required user approval.
**Impact on plan:** Both fixes necessary for correctness. No scope creep.

## Authentication Gates

None — this plan is entirely local TS + tests.

## Issues Encountered

- ESLint caught unused `guests`/`budgetTier` destructured variables in `insertMeals`. Fixed by extracting only used fields and adding a comment explaining the reserved contract.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

The greedy construction pipeline is complete. Downstream plans can now:

- **03-08 (local search):** Operate on `constructDay()` output with adjacent-pair swaps, re-scoring via `score()`.
- **03-09 (LL allocator):** Consume the constructed plan to assign Lightning Lane slots to highest-wait rides.
- **03-12 (snapshot fixtures):** Validate deterministic output of the full pipeline: `filter → constructDay → insertMeals → insertShows`.

The `solve()` function in `index.ts` still throws — plans 03-08..03-10 will compose these building blocks into the full solver body.

---

*Phase: 03-engine*
*Completed: 2026-04-16*

## Self-Check: PASSED

- All 8 created files present on disk.
- All 3 task commits present in git log (29ed00a, c4fdee7, c26d37a).
- `pnpm --filter @wonderwaltz/solver test --run` -- 12 files, 235 tests, 0 failures.
