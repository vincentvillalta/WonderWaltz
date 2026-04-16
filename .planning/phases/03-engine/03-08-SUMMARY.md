---
phase: 03-engine
plan: 08
subsystem: solver
tags: [solver, local-search, lightning-lane, das, park-hours, pure-ts, vitest]

requires:
  - phase: 03-engine
    plan: 07
    provides: constructDay() greedy construction, score() scoring function, PlanItem/CatalogAttraction types
provides:
  - "adjacentPairSwap() — single-pass deterministic local search on constructed day"
  - "ResourcePool class — shared allocator for LLMP, LLSP, and DAS pools with capacity tracking"
  - "allocateLL() — top-N scored → longest-wait LL assignment with per-tier budget caps and DAS support"
  - "resolveParkHours() — Early Entry (-30min) and Extended Evening Hours (+2h) adjustments by lodging type"
affects:
  - 03-engine plan 09 (LL allocation integrated into solver pipeline)
  - 03-engine plan 10 (park hours feeds constructDay open/close; LL allocation feeds plan items)
  - 03-engine plan 12 (snapshot fixtures exercise LL allocation + DAS + park hours)

tech-stack:
  added: []
  patterns:
    - "ResourcePool pattern — capacity-tracked pool with allocate() returning ReturnWindow or null; shared across LLMP/LLSP/DAS"
    - "Top-N → longest-wait selection — filter candidates to top-N scored rides, then assign resources to highest-wait within that set"
    - "Timezone-naive midnight-crossing — buildIso handles minutes >= 1440 by rolling to next day prefix"

key-files:
  created:
    - packages/solver/src/localSearch.ts
    - packages/solver/src/resources.ts
    - packages/solver/src/lightningLane.ts
    - packages/solver/src/parkHours.ts
    - packages/solver/tests/local-search.test.ts
    - packages/solver/tests/ll-allocation.test.ts
    - packages/solver/tests/das.test.ts
    - packages/solver/tests/park-hours.test.ts
  modified:
    - packages/solver/src/index.ts

key-decisions:
  - "Adjacent-pair swap is a single linear pass (no multi-pass/convergence loop) — determinism and speed over thoroughness; aligns with CONTEXT.md Area 1 constraint"
  - "DAS modeled as a third ResourcePool (capacity 3, any ride eligible) rather than modifying LL pool math — clean separation of concerns, same allocator interface"
  - "LL allocation uses wait time descending as scoring proxy for top-N selection (longest wait = most time saved) — simpler than re-invoking full score() and aligns with CONTEXT.md 'longest-wait rides within filtered set'"
  - "Park hours midnight-crossing uses UTC-based date increment via Date.UTC — consistent with solver's timezone-naive convention"

patterns-established:
  - "ResourcePool allocate() pattern: try allocate(rideId, bookingTime) → ReturnWindow | null with automatic capacity decrement"
  - "Custom isPinned callback on local search: default pins dining, callers can extend for metadata.pinned or other constraints"

requirements-completed: [SOLV-04, SOLV-08, SOLV-09]

# Metrics
duration: 14 min
completed: 2026-04-16
---

# Phase 03 Plan 08: Local Search + LL Allocation + DAS + Park Hours Summary

**Adjacent-pair swap local search, ResourcePool-based LLMP/LLSP/DAS allocation with per-tier budget caps, and Early Entry + Extended Evening Hours park-hours resolution — all pure-TS, deterministic.**

## Performance

- **Duration:** 14 min
- **Started:** 2026-04-16T12:43:25Z
- **Completed:** 2026-04-16T12:57:30Z
- **Tasks:** 3 (all TDD — RED + GREEN per task)
- **Tests added:** 32 (9 local-search + 10 LL-allocation + 4 DAS + 9 park-hours)
- **Files:** 8 created, 1 modified

## Accomplishments

- `adjacentPairSwap()` implements single-pass adjacent-pair swap local search over constructed day items. Dining items are hard-pinned; custom isPinned callback supported. Deterministic — same inputs produce identical output.
- `ResourcePool` class provides a shared allocator for LLMP (cap 3), LLSP (cap 0/1/2 by tier), and DAS (cap 3 when enabled). Each pool tracks allocations via Map and computes 90-min return windows.
- `allocateLL()` filters day items to top-10 scored rides (by wait time descending), then assigns LL slots to longest-wait rides within that set respecting pool eligibility (multi_pass for LLMP, single_pass for LLSP, any for DAS). Must-do rides without budget emit tier-upgrade warnings.
- `resolveParkHours()` applies -30min Early Entry for on-property guests and +2h Extended Evening Hours for deluxe/deluxe_villa on eligible EEH nights. Handles midnight-crossing correctly.
- All functions are pure TS with zero side effects. All 320 solver tests pass (259 pre-existing + 61 new).

## Task Commits

1. **Task 1: Adjacent-pair swap local search** — `2875d25` (feat) — TDD RED+GREEN
2. **Task 2: Shared ResourcePool + LL allocator + DAS path** — `e706f5c` (feat) — TDD RED+GREEN
3. **Task 3: Park hours resolution with EE + EEH** — `0f8e389` (feat) — TDD RED+GREEN

## Files Created / Modified

### Created

- `packages/solver/src/localSearch.ts` — `adjacentPairSwap()`, `AdjacentPairSwapOptions` type. Single-pass adjacent swap with pinning.
- `packages/solver/src/resources.ts` — `ResourcePool` class with `allocate()`, `ReturnWindow` type. Shared across LLMP/LLSP/DAS.
- `packages/solver/src/lightningLane.ts` — `allocateLL()`, `AllocateLLInput`/`AllocateLLResult` types. Top-N selection, per-tier caps, DAS integration, upgrade warnings.
- `packages/solver/src/parkHours.ts` — `resolveParkHours()`, `LodgingType`, `ResolveParkHoursInput` types. EE + EEH adjustments.
- `packages/solver/tests/local-search.test.ts` — 9 assertions: swap improvement, dining pinning, custom isPinned, determinism, already-optimal, edge cases.
- `packages/solver/tests/ll-allocation.test.ts` — 10 assertions: fairy/pixie/royal tier caps, must-do warnings, longest-wait selection, return window.
- `packages/solver/tests/das.test.ts` — 4 assertions: DAS enabled vs disabled, distinct label, capacity cap.
- `packages/solver/tests/park-hours.test.ts` — 9 assertions: off-property, value, moderate, deluxe (EEH + non-EEH), deluxe_villa, determinism.

### Modified

- `packages/solver/src/index.ts` — Added exports for `localSearch.js`, `resources.js`, `lightningLane.js`, `parkHours.js`.

## Decisions Made

- **Single-pass local search (no convergence loop):** Plan specified "no recursion, no multi-pass" and CONTEXT.md Area 1 says "adjacent-pair swap only." A single linear pass is deterministic by construction — no risk of oscillation or non-termination. If quality proves insufficient, multi-pass can be added later.
- **Wait-time-descending as scoring proxy:** Rather than re-invoking the full `score()` function (which needs walking graph + forecast context), LL allocation sorts candidates by `waitMinutes` descending. This matches CONTEXT.md's "longest-wait rides within that filtered set" and maximizes time saved per LL slot.
- **DAS as separate ResourcePool:** DAS is modeled as a third pool with capacity 3 that can serve any ride, not as a modification to LLMP/LLSP math. This keeps the allocator logic clean and makes DAS budget independently tunable.
- **Midnight-crossing in park hours:** EEH can push close time past midnight (22:00 + 2h = 24:00). `buildIso()` handles this by rolling to the next calendar day using `Date.UTC` for date arithmetic while keeping the solver's timezone-naive convention.

## Deviations from Plan

None — plan executed exactly as written. All three features (local search, LL allocation with DAS, park hours) implemented per the behavior specs.

## Authentication Gates

None — this plan is entirely local TS + tests.

## Issues Encountered

- ESLint caught unused `BudgetTier` type import in ll-allocation test. Fixed by removing the unused import before commit.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

The solver building blocks are nearly complete. Downstream plans can now:

- **03-09/03-10 (solver composition):** Wire `constructDay → adjacentPairSwap → allocateLL` into the full `solve()` pipeline, feeding `resolveParkHours()` output as park hours.
- **03-12 (snapshot fixtures):** Exercise the complete pipeline including LL allocation with DAS and park-hours expansion for on-property guests.

---

*Phase: 03-engine*
*Completed: 2026-04-16*

## Self-Check: PASSED

- All 8 created files present on disk.
- All 3 task commits present in git log (2875d25, e706f5c, 0f8e389).
- `pnpm --filter @wonderwaltz/solver test --run` -- 16 files, 320 tests, 0 failures.
