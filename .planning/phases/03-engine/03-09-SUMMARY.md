---
phase: 03-engine
plan: 09
subsystem: solver
tags: [solver, fatigue, budget-tier, rest-blocks, age-brackets, pure-ts, vitest]

requires:
  - phase: 03-engine
    plan: 07
    provides: constructDay() greedy construction, PlanItem types, timezone-naive time arithmetic
  - phase: 03-engine
    plan: 08
    provides: ResourcePool class with LLMP/LLSP/DAS capacity tracking
provides:
  - "BUDGET_TIER_RULES constant table — Record<BudgetTier, TierRules> with LL caps, rest frequency, dining tier, rest block duration"
  - "insertRestBlocks() — age-weighted peak fatigue rest block insertion with tier-driven periodic rests"
  - "TierRules type — llmpCap, llspCap, restFrequencyHours, diningTier, restBlockDurationMinutes"
affects:
  - 03-engine plan 10 (solver pipeline wires insertRestBlocks after constructDay)
  - 03-engine plan 12 (snapshot fixtures exercise fatigue + tier rules for toddler/family trips)

tech-stack:
  added: []
  patterns:
    - "Frozen constant table pattern — Object.freeze on both table and each tier entry; runtime mutation throws"
    - "Age-bracket-driven peak fatigue windows — 0-2 and 3-6 get distinct windows that merge when both present"
    - "Soft-constraint rest insertion — must-do items never displaced; rest blocks split around conflicts"

key-files:
  created:
    - packages/solver/src/rules.ts
    - packages/solver/src/fatigue.ts
    - packages/solver/tests/budget-tier.test.ts
    - packages/solver/tests/fatigue.test.ts
  modified:
    - packages/solver/src/index.ts

key-decisions:
  - "Budget tier rules live in packages/solver/src/rules.ts (algorithm constants, not catalog data) — keeps solver zero-dep on @wonderwaltz/content"
  - "Peak fatigue windows are fixed (toddler 12:30-13:30, young kid 13:00-14:00) — based on CONTEXT.md SOLV-07 spec; merge logic handles both-present case"
  - "Rest blocks are soft constraints — must-do items are never displaced; rest splits around conflicts or is skipped"
  - "Royal tier + deluxe lodging triggers 120-min resort mid-day break label — other tiers get 60-min scheduled rests"

patterns-established:
  - "BUDGET_TIER_RULES as single source of truth for tier-dependent solver behavior — LL caps, rest frequency, dining tier, block duration"
  - "Fatigue insertion follows construct pipeline convention: pure function, timezone-naive, returns sorted PlanItem[]"

requirements-completed: [SOLV-07, SOLV-10]

# Metrics
duration: 6 min
completed: 2026-04-16
---

# Phase 03 Plan 09: Child Fatigue Model + Budget Tier Rules Summary

**Age-bracket-weighted fatigue rest blocks with peak windows (toddler 12:30-13:30, young kid 13:00-14:00) and frozen BUDGET_TIER_RULES table encoding LL caps, rest frequency, and dining tier for all three budget tiers.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-04-16T13:02:17Z
- **Completed:** 2026-04-16T13:08:24Z
- **Tasks:** 2 (both TDD -- RED + GREEN per task)
- **Tests added:** 65 (37 budget-tier + 28 fatigue)
- **Files:** 4 created, 1 modified

## Accomplishments

- `BUDGET_TIER_RULES` constant table encodes all three budget tiers (Pixie/Fairy/Royal) with LL caps, rest frequency, dining tier, and rest block duration. Deeply frozen for immutability.
- `insertRestBlocks()` inserts peak fatigue rest blocks based on youngest guest age bracket (0-2: 12:30-13:30, 3-6: 13:00-14:00, both: merged 12:30-14:00) plus tier-driven periodic rests.
- Must-do items are never displaced by rest blocks. When a must-do conflicts with a peak fatigue window, the rest block splits around it or is skipped.
- Royal tier with deluxe lodging gets labeled "Resort mid-day break" blocks at 120 minutes; other tiers get 60-minute scheduled rests.
- All functions are pure TS with zero side effects. All 385 solver tests pass (320 pre-existing + 65 new).

## Task Commits

1. **Task 1: Budget tier rules constant table** -- `4ce20f9` (feat) -- TDD RED+GREEN
2. **Task 2: Age-weighted fatigue rest block insertion** -- `7ccf63b` (feat) -- TDD RED+GREEN

## Files Created / Modified

### Created

- `packages/solver/src/rules.ts` -- `BUDGET_TIER_RULES`, `TierRules`, `DiningTier` types. Frozen constant table for all three budget tiers.
- `packages/solver/src/fatigue.ts` -- `insertRestBlocks()`, `InsertRestBlocksOptions` type. Peak fatigue windows + periodic rest insertion.
- `packages/solver/tests/budget-tier.test.ts` -- 37 assertions: per-tier values, shape, immutability, table-driven cross-tier validation.
- `packages/solver/tests/fatigue.test.ts` -- 28 assertions: peak windows per age bracket, merged windows, tier frequency, royal resort break, must-do displacement, sorting, determinism.

### Modified

- `packages/solver/src/index.ts` -- Added exports for `rules.js` and `fatigue.js`.

## Decisions Made

- **Budget tier rules in solver, not content:** `BUDGET_TIER_RULES` lives in `packages/solver/src/rules.ts` because these are algorithm constants that drive solver behavior (LL caps, rest frequency), not catalog data. Keeps the solver zero-dep on `@wonderwaltz/content`.
- **Fixed peak fatigue windows:** Toddler (0-2) window is 12:30-13:30, young kid (3-6) is 13:00-14:00, per CONTEXT.md SOLV-07 spec. When both brackets are present, windows merge to 12:30-14:00 (union of both ranges).
- **Soft constraint for rest blocks:** Must-do items are never displaced by fatigue rest. When a must-do conflicts with a peak window, the rest splits around it or is dropped. This matches the plan's "fatigue is a soft constraint" requirement.
- **Royal + deluxe lodging label:** Royal tier with deluxe/deluxe_villa lodging gets "Resort mid-day break" labeling and 120-minute blocks. This differentiates the premium experience in the plan output.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test assertion checked wrong condition for adults-only case**
- **Found during:** Task 2 (first GREEN run)
- **Issue:** Test checked that no rest blocks exist in 12:00-14:00 time range for adults-only party, but tier-driven periodic rests (fairy = every 2hr) legitimately land at 13:00.
- **Fix:** Changed assertion to check for absence of "peak fatigue" labeled rests rather than absence of any rest in that time range.
- **Files modified:** `packages/solver/tests/fatigue.test.ts`
- **Verification:** All 28 fatigue tests pass.
- **Committed in:** `7ccf63b` (Task 2 commit)

**2. [Rule 3 - Blocking] ESLint caught unused imports in fatigue test**
- **Found during:** Task 2 (pre-commit hook)
- **Issue:** `BUDGET_TIER_RULES` and `BudgetTier` imported but unused in test file.
- **Fix:** Removed unused imports.
- **Files modified:** `packages/solver/tests/fatigue.test.ts`
- **Verification:** ESLint passes, all tests pass.
- **Committed in:** `7ccf63b` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking)
**Impact on plan:** Both fixes necessary for correctness. No scope creep.

## Authentication Gates

None -- this plan is entirely local TS + tests.

## Issues Encountered

None -- both tasks executed cleanly after the minor test assertion fix.

## User Setup Required

None -- no external service configuration required.

## Next Phase Readiness

The solver building blocks for fatigue and budget tiers are complete. Downstream plans can now:

- **03-10 (solver composition):** Wire `insertRestBlocks()` into the full `solve()` pipeline after `constructDay → insertMeals → insertShows`. `BUDGET_TIER_RULES` feeds `ResourcePool` capacity via `llmpCap`/`llspCap`.
- **03-12 (snapshot fixtures):** Exercise fatigue insertion for toddler and family party compositions across all three budget tiers.

---

*Phase: 03-engine*
*Completed: 2026-04-16*

## Self-Check: PASSED

- All 4 created files present on disk.
- All 2 task commits present in git log (4ce20f9, 7ccf63b).
- `pnpm --filter @wonderwaltz/solver test --run` -- 18 files, 385 tests, 0 failures.
