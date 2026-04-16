---
phase: 03-engine
plan: 06
subsystem: solver
tags: [solver, filters, pure-ts, height, mobility, sensory, dietary, composable, vitest]

requires:
  - phase: 03-engine
    plan: 04
    provides: SolverGuest, CatalogAttraction, CatalogDining types + solver vitest config
provides:
  - "heightOk, mobilityOk, sensoryOk — per-guest per-attraction boolean predicates"
  - "dietaryOk — per-dining multi-guest boolean predicate"
  - "filterAttractionsForParty — composed filter (height + mobility + sensory) with 0-2 exemption"
  - "filterDiningForParty — dietary filter across all guests"
  - "isGuestExempt — 0-2 toddlers exempt from family gating"
  - "accommodates field on CatalogDining type"
affects:
  - 03-engine plans 07-10 (solver construction calls filterAttractionsForParty before scoring)
  - 03-engine plan 08 (local search respects filter invariant — swaps never reintroduce filtered attractions)
  - 03-engine plan 12 (snapshot fixtures must exercise filter edge cases)

tech-stack:
  added: []
  patterns:
    - "Tag-based predicate filtering — attraction tags drive mobility/sensory compatibility instead of explicit boolean fields"
    - "Set-based tag matching — O(1) lookup per tag via const Set instances"
    - "Composable filter pipe — filterAttractionsForParty composes 3 predicates; filterDiningForParty is independent"
    - "Guest exemption gate — 0-2 toddlers never block the family from rides"

key-files:
  created:
    - packages/solver/src/filter.ts
    - packages/solver/tests/filter-height.test.ts
    - packages/solver/tests/filter-mobility.test.ts
    - packages/solver/tests/filter-sensory.test.ts
    - packages/solver/tests/filter-dietary.test.ts
  modified:
    - packages/solver/src/index.ts
    - packages/solver/src/types.ts

key-decisions:
  - "Tag-based mobility/sensory filtering instead of explicit ecvAccessible/walkingRequiredFeet/intensityTier fields — CatalogAttraction only carries tags[], and the YAML data uses descriptive tags (roller-coaster, drop, dark, thrill). Adding redundant boolean fields would create a sync burden with no coverage gain."
  - "ECV_INCOMPATIBLE_TAGS includes water/raft — water rides require raft/boat transfer that's ECV-incompatible"
  - "LOW_SENSORY_TRIGGER_TAGS is a superset of HIGH_SENSORY_TRIGGER_TAGS plus moderate stimuli (water, 3d, 4d, shooter, interactive, immersive) — low-sensory guests tolerate only truly gentle experiences"
  - "accommodates field added as optional to CatalogDining — existing dining YAML has no dietary data yet; filter gracefully handles missing field (undefined = no accommodations declared)"
  - "Conservative height default: child without heightInches + ride with requirement = filtered out (safety-first)"

patterns-established:
  - "Filter predicates are pure (a, g) => boolean — composable, individually testable, no shared state"
  - "Table-driven test pattern for predicates — each test file uses it.each with named cases"

requirements-completed: [SOLV-02]

# Metrics
duration: 5 min
completed: 2026-04-16
---

# Phase 03 Plan 06: Solver Filtering Layer Summary

**Four composable pure-TS filter predicates (height, mobility, sensory, dietary) with tag-based heuristics for ride compatibility and Set-based dietary accommodation matching, gated by 0-2 toddler exemption.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-16T06:57:34Z
- **Completed:** 2026-04-16T07:57:59Z
- **Tasks:** 2 (both TDD; Task 1 = 2 commits RED+GREEN, Task 2 = 1 commit since dietary impl landed in Task 1 GREEN)
- **Tests added:** 50 (7 height predicate + 8 mobility predicate + 9 sensory predicate + 5 height composition + 2 mobility composition + 3 sensory composition + 3 isGuestExempt + 9 dietaryOk + 4 filterDiningForParty)
- **Files:** 5 created, 2 modified

## Accomplishments

- `heightOk(a, g)`: checks `heightRequirementInches` with adult bypass and conservative child default (unknown height = fail).
- `mobilityOk(a, g)`: tag-based ECV/reduced-mobility filtering via `ECV_INCOMPATIBLE_TAGS` (roller-coaster, drop, simulator, water, raft) and `REDUCED_MOBILITY_INCOMPATIBLE_TAGS` (roller-coaster, drop, simulator).
- `sensoryOk(a, g)`: tag-based high/low sensory profile filtering. High-sensory guests blocked by thrill/dark/loud/fast/drop/intense/roller-coaster tags. Low-sensory guests additionally blocked by water/3d/4d/shooter/interactive/immersive.
- `dietaryOk(d, guests)`: Set-based union of all guest dietary needs vs dining `accommodates[]`. Missing field = no accommodations.
- `filterAttractionsForParty(attractions, guests)`: composes height + mobility + sensory; 0-2 toddlers exempt. Single guest failure eliminates the attraction (family-won't-split-up assumption).
- `filterDiningForParty(dining, guests)`: dietary filter independent of attraction filters.
- All 149 solver tests pass (99 existing + 50 new).

## Task Commits

1. **Task 1 RED: failing tests for height, mobility, sensory** — `0329bc0` (test)
2. **Task 1 GREEN: implement all filter predicates + export** — `4b727b0` (feat)
3. **Task 2: dietary filter tests** — `81c23b9` (test)

_Task 2 is a single commit because `dietaryOk` and `filterDiningForParty` were implemented in the Task 1 GREEN phase (they share the same file). The dietary test file confirms the behavior._

## Files Created / Modified

### Created

- `packages/solver/src/filter.ts` — `heightOk`, `mobilityOk`, `sensoryOk`, `dietaryOk`, `isGuestExempt`, `filterAttractionsForParty`, `filterDiningForParty` + tag-set constants.
- `packages/solver/tests/filter-height.test.ts` — 15 assertions: 7 heightOk predicate cases + 5 filterAttractionsForParty height-dimension + 3 isGuestExempt.
- `packages/solver/tests/filter-mobility.test.ts` — 10 assertions: 8 mobilityOk predicate cases + 2 composition cases.
- `packages/solver/tests/filter-sensory.test.ts` — 12 assertions: 9 sensoryOk predicate cases + 3 composition cases.
- `packages/solver/tests/filter-dietary.test.ts` — 13 assertions: 9 dietaryOk predicate cases + 4 filterDiningForParty cases.

### Modified

- `packages/solver/src/index.ts` — Added `export * from './filter.js'`.
- `packages/solver/src/types.ts` — Added optional `accommodates?: string[]` field to `CatalogDining`.

## Decisions Made

- **Tag-based mobility/sensory filtering**: `CatalogAttraction` carries `tags: string[]` with descriptive tags (roller-coaster, drop, dark, thrill, etc.) but no explicit `ecvAccessible` or `intensityTier` fields. Rather than adding redundant boolean fields that would need manual sync with the YAML data, the predicates match against tag sets. This is extensible (add new tags to the set) and honest about the data shape.
- **Conservative height default**: A child without `heightInches` and a ride with a height requirement is filtered out. This is safety-first; the user can add height data to resolve it.
- **`accommodates` field optional on `CatalogDining`**: The existing YAML dining data has no dietary accommodation info. The filter handles `undefined` as "no accommodations" so it's conservative — dining with unknown accommodation gets filtered when guests have dietary needs.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added accommodates field to CatalogDining**
- **Found during:** Task 1 (reading CatalogDining type)
- **Issue:** `CatalogDining` had no `accommodates` field, but the dietary filter requires it to know what dietary needs a venue supports.
- **Fix:** Added `accommodates?: string[]` to `CatalogDining` type. Made optional so existing code and dining YAML entries without the field remain valid.
- **Files modified:** `packages/solver/src/types.ts`
- **Verification:** All 149 tests pass; dietary filter handles missing field conservatively.
- **Committed in:** `0329bc0` (Task 1 RED commit, bundled with type changes).

**2. [Rule 3 - Blocking] Plan references ecvAccessible/walkingRequiredFeet/intensityTier — fields don't exist**
- **Found during:** Task 1 (reading behavior spec vs actual types)
- **Issue:** Plan's behavior section references `attraction.ecvAccessible`, `attraction.walkingRequiredFeet`, and `attraction.intensityTier` but none exist on `CatalogAttraction`. The YAML data uses tags (thrill, dark, roller-coaster, drop, etc.) as the classification mechanism.
- **Fix:** Implemented mobility and sensory filters using tag-based Set matching instead of boolean/numeric fields. Tag sets are const-defined for each filter level.
- **Files modified:** `packages/solver/src/filter.ts`
- **Verification:** All mobility and sensory tests pass with tag-based filtering.
- **Committed in:** `4b727b0` (Task 1 GREEN commit).

---

**Total deviations:** 2 auto-fixed (1 missing critical, 1 blocking). None required user approval.

## Authentication Gates

None — this plan is entirely local TS + tests.

## Issues Encountered

None — all tests passed on first GREEN attempt.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

The filter layer is complete and exported. Downstream plans can call:
- `filterAttractionsForParty(catalog.attractions, guests)` before scoring in the greedy construction pass (plan 03-07).
- `filterDiningForParty(catalog.dining, guests)` before dining slot selection.
- Individual predicates (`heightOk`, `mobilityOk`, `sensoryOk`, `dietaryOk`) for fine-grained checks or warnings.

The `accommodates` field on `CatalogDining` will need population in the dining YAML when dietary data is available. Until then, the filter conservatively excludes venues with unknown accommodations when guests have dietary needs.

---

*Phase: 03-engine*
*Completed: 2026-04-16*

## Self-Check: PASSED

- All 5 created files present on disk.
- All 3 task commits present in git log (`0329bc0`, `4b727b0`, `81c23b9`).
- `pnpm --filter @wonderwaltz/solver test --run` -> 8 files, 149 tests, 0 failures.
