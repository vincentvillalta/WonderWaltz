---
phase: 03-engine
plan: 04
subsystem: solver
tags: [solver, types, sha256, canonical-json, package-boundary, pure-ts, vitest]

requires:
  - phase: 03-engine
    plan: 01
    provides: schema scaffolding (plans.solver_input_hash column + index)
  - phase: 03-engine
    plan: 03
    provides: FullDayPlanDto + PlanItemDto v1 shapes (solver output maps to these)
provides:
  - "SolverInput type — trip + guests + preferences + date window + catalog refs + volatile forecasts/weather/crowd"
  - "DayPlan + PlanItem types structurally aligned with FullDayPlanDto/PlanItemDto (no NestJS decorators)"
  - "computeSolverInputHash + canonicalize — deterministic SHA-256 over canonical JSON; volatile inputs excluded"
  - "Package-boundary test — static import scan enforcing zero NestJS/ORM/I/O coupling"
  - "Solver-owned vitest config (independent of apps/api)"
affects:
  - 03-engine plans 05-10 (solver construction/local-search/LL allocator/snapshot fixtures import these types directly)
  - 03-engine plans 14-17 (plan-generation processor hashes SolverInput, persists plans.solver_input_hash for cache lookup)
  - 03-engine plan 15 (rethink-today — reuses SolverInput shape)

tech-stack:
  added: []
  patterns:
    - "Canonical JSON hashing — recursive key-sort + undefined-drop + array-preserve; ASCII key order"
    - "Volatile inputs (forecasts/weather/crowdCalendar/catalog) excluded from cache key so intra-day regens hit cache"
    - "Priority via array order — mustDoAttractionIds is order-sensitive; reordering produces a different hash"
    - "Package-boundary test as CI gate (static grep) — not a lint rule; fails loudly on forbidden import"

key-files:
  created:
    - packages/solver/src/types.ts
    - packages/solver/src/hash.ts
    - packages/solver/vitest.config.ts
    - packages/solver/tests/hash.test.ts
    - packages/solver/tests/package-boundary.test.ts
    - packages/solver/tests/fixtures/solver-input.ts
  modified:
    - packages/solver/src/index.ts
    - packages/solver/tsconfig.json
    - packages/solver/package.json

key-decisions:
  - "Hash over { trip, guests, preferences, dateStart, dateEnd } — catalog excluded too (not just forecasts/weather/crowd). Catalog changes downstream of the user are essentially a content-version bump; plans will naturally refresh at the next date boundary, and including catalog would force a cache-miss storm every time a YAML edit lands."
  - "mustDoAttractionIds is order-sensitive. User's ranking carries semantic priority for the solver; equal-weight scoring would otherwise collapse the priority signal. Documented in types.ts and tested."
  - "tableServiceReservations: pre-booked ADRs are hard pins; included in hash so solver re-runs whenever the user edits them. Priority choice vs. marking them volatile — chose priority because an edit means the user wants a re-plan."
  - "Catalog types live in types.ts (not re-imported from @wonderwaltz/content). Content package is markdown/yaml + zod at runtime; solver must stay pure-TS and zero-runtime-deps. Types are structurally compatible and map at the API-layer boundary."
  - "Test files may import node:fs + node:path (boundary test needs them to walk src/). Boundary test ONLY forbids I/O modules inside packages/solver/src/**, not inside tests/."
  - "tsconfig.json rootDir widened to '.' and include expanded to [src, tests, vitest.config.ts] for typecheck coverage; tsconfig.build.json already excludes tests from dist emit."

patterns-established:
  - "Pure-TS package with zero runtime deps — enforced by static test, not convention"
  - "Solver package vitest config lives alongside src/, independent of root (root projects config is known-broken per 03-01)"

requirements-completed: [SOLV-01]

# Metrics
duration: 6 min
completed: 2026-04-15
---

# Phase 03 Plan 04: Solver Types Contract + Package Purity Test Summary

**Solver package goes from empty scaffold to strongly-typed pure-TS contract: SolverInput / DayPlan / PlanItem complete, deterministic SHA-256 hash over canonical JSON landed, boundary enforced by a static import scan that fails if @nestjs/ioredis/pg/drizzle/@sentry/bullmq/@anthropic-ai/ ever leak into solver src/.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-04-15T22:38:07Z
- **Completed:** 2026-04-15T22:44:37Z
- **Tasks:** 2 (Task 1 TDD — 2 commits; Task 2 single commit since impl is asserting package.json structure, not algorithmic)
- **Tests added:** 58 (12 hash + 46 boundary across per-file × per-forbidden-package assertions)
- **Files:** 6 created, 3 modified

## Accomplishments

- `SolverInput` fully typed: `trip + guests + preferences + dateStart/dateEnd + catalog(attractions/dining/shows/walkingGraph) + forecasts/weather/crowdCalendar`. Every sub-record (guest, preference, attraction, dining, show, walking edge, forecast bucket, weather day, crowd entry) has a named type.
- `DayPlan + PlanItem` carry the same field names as `FullDayPlanDto + PlanItemDto` from plan 03-03 (`dayIndex`, `date`, `parkId`, `items`, `warnings` / `id`, `type`, `refId`, `startTime`, `endTime`, `waitMinutes`, `lightningLaneType`, `notes`), with `PlanItemType` extended to include `walk` and `ll_reminder` — solver-internal item kinds the DTO doesn't surface directly.
- `computeSolverInputHash(input)` produces a 64-char lowercase hex SHA-256. Hash is byte-stable across 5 runs on identical input and invariant to top-level + nested key reordering.
- `canonicalize()` is the canonical JSON preprocessor: recursive ASCII key sort, array-order preserved, `undefined` values dropped, `null` and primitives passed through.
- Package-boundary test statically scans every `.ts` file under `packages/solver/src/` for 9 forbidden imports (`@nestjs/`, `ioredis`, `postgres`, `drizzle-orm`, `@wonderwaltz/db`, `@sentry/`, `bullmq`, `pg`, `@anthropic-ai/`) and 5 I/O node modules (`node:fs/http/https/net/dgram`). Fails loudly if any appear.
- `package.json` invariants locked: name = `@wonderwaltz/solver`, zero runtime `dependencies`, devDependencies exactly `{ @types/node, typescript, vitest }`.
- Solver-owned `vitest.config.ts` — `pnpm --filter @wonderwaltz/solver test` runs standalone.
- `pnpm -r typecheck` clean — types export correctly to every workspace consumer.

## Task Commits

1. **Task 1 RED: failing tests for hash + canonicalize** — `4de66a2` (test)
2. **Task 1 GREEN: implement computeSolverInputHash + canonicalize** — `cc068cc` (feat)
3. **Task 2: package-boundary test + pure-TS script policy** — `de2a372` (test)

_Task 2 is a single commit (no RED/GREEN split) because the "implementation" is asserting a structural invariant (package.json + static source scan) that's already true — the test codifies the rule rather than driving new code._

## Files Created / Modified

### Created

- `packages/solver/src/types.ts` — `SolverInput, SolverGuest, SolverPreferences, SolverTrip, SolverCatalog (+ CatalogAttraction/Dining/Show/WalkingGraph/WalkingEdge), SolverForecasts/Weather/CrowdCalendar, DayPlan, PlanItem, Score, Resource` + the enum-literal unions (`AgeBracket, Mobility, SensoryProfile, BudgetTier, LightningLaneType, PlanItemType, CrowdBucket, ForecastConfidence`).
- `packages/solver/src/hash.ts` — `canonicalize + computeSolverInputHash`.
- `packages/solver/vitest.config.ts` — solver-owned vitest config (node env, threads pool, `tests/**/*.test.ts`).
- `packages/solver/tests/hash.test.ts` — 12 assertions: format, 5-run determinism, top-level + nested key-order invariance, sensitivity to trip/guest/date/mustDo-order, stability across volatile inputs, canonicalize sub-tests (sort, undefined-drop, null/array-preserve).
- `packages/solver/tests/package-boundary.test.ts` — 46 assertions: at-least-one source file, per-file × per-forbidden-package × per-syntax (from/import()/require()) checks, per-file × per-forbidden-node-module, plus package.json shape (name, zero runtime deps, minimal devDeps).
- `packages/solver/tests/fixtures/solver-input.ts` — `makeFixture(overrides)` helper used by both test files.

### Modified

- `packages/solver/src/index.ts` — `export * from './types.js'; export * from './hash.js';` + throwing `solve()` stub retained (signature frozen for downstream plans).
- `packages/solver/tsconfig.json` — rootDir widened to `.`, include expanded to `[src, tests, vitest.config.ts]` for typecheck coverage.
- `packages/solver/package.json` — scripts `test` → `vitest` (watch), `test:run` → `vitest --run` per plan spec.

## Decisions Made

See frontmatter `key-decisions`. Highlights:

- **Catalog excluded from hash** (in addition to forecasts/weather/crowd specified in the plan). Content package edits would otherwise force cache-miss storms; catalog changes are a content-version concern, not a user-input concern.
- **`mustDoAttractionIds` order is semantic** — reordering changes the hash because the user's ranking drives solver priority. The plan called this out explicitly; the test pins it.
- **Pre-booked ADRs (`tableServiceReservations`) are hashed** — an edit means the user wants a re-plan, so they're treated as priority input.
- **Types not re-imported from `@wonderwaltz/content`** — would violate the zero-runtime-dep policy. Catalog types are structural duplicates the API layer validates at the boundary (Zod validation already happens in 03-01).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] tsconfig.json rootDir='./src' excluded tests from typecheck**
- **Found during:** Task 1 (typecheck after writing tests)
- **Issue:** `tsconfig.json` had `rootDir: './src'` and `include: ['src']`, so `tests/hash.test.ts` never typechecked. Plan success criterion #3 is "`pnpm -r typecheck` clean (types export correctly to any consumer)"; tests going unchecked would silently permit type errors into the suite.
- **Fix:** Widened `rootDir` to `.` and expanded `include` to `[src, tests, vitest.config.ts]`. `tsconfig.build.json` already excludes tests via `exclude: ['tests/**', '**/*.spec.ts', '**/*.test.ts']`, so build emit is unchanged.
- **Files modified:** `packages/solver/tsconfig.json`
- **Verification:** `pnpm --filter @wonderwaltz/solver typecheck` clean; `pnpm -r typecheck` clean.
- **Committed in:** `4de66a2` (Task 1 RED commit, bundled with test-infra setup).

**2. [Rule 2 - Missing Critical] Plan's forbidden-imports list didn't include bullmq, pg, or @anthropic-ai/**
- **Found during:** Task 2 (writing boundary test)
- **Issue:** Plan listed `@nestjs/`, `ioredis`, `postgres`, `drizzle-orm`, `@wonderwaltz/db`, `@sentry/`. But the solver must also be free of `bullmq` (queue — 02-data-pipeline artifact), `pg` (sibling of `postgres`), and `@anthropic-ai/` (03-02 artifact). Omitting them would create latent violations the test couldn't catch — exactly the "convention instead of gate" failure mode the plan names in success criteria.
- **Fix:** Added all three to the `FORBIDDEN_PACKAGES` constant. Also added a complementary `FORBIDDEN_NODE_MODULES` set (`node:fs/http/https/net/dgram`) to forbid I/O stdlib inside `src/` — `node:crypto` remains allowed (needed by `hash.ts`).
- **Files modified:** `packages/solver/tests/package-boundary.test.ts`
- **Verification:** Boundary test green (46/46); solver src/ has only `node:crypto` as its lone node-module import.
- **Committed in:** `de2a372` (Task 2 commit).

**3. [Rule 3 - Blocking] Plan's package.json spec omits main/types/exports guidance; existing file had them**
- **Found during:** Task 2 (comparing current package.json to plan's spec)
- **Issue:** Plan's literal package.json fragment lists only `name, type, main, types, scripts, devDependencies`. Existing file also has `version, private, exports`. Stripping those would break resolver behavior in downstream consumers.
- **Fix:** Kept `version, private, exports` intact — the plan's spec is a minimum, not a whitelist. Only touched `scripts` (added `test:run`, changed `test` to `vitest` watch per plan) and left the rest unchanged. No-op for devDependencies since they already matched.
- **Files modified:** `packages/solver/package.json`
- **Verification:** `pnpm --filter @wonderwaltz/solver test:run` works; package.json boundary test green (asserts name + zero deps + minimal devDeps — doesn't forbid the other well-formed fields).
- **Committed in:** `de2a372` (Task 2 commit).

---

**Total deviations:** 3 auto-fixed (1 missing critical, 2 blocking). None required user approval.

## Authentication Gates

None — this plan is entirely local TS + tests.

## Issues Encountered

- First RED test run produced 12/12 failures with the expected "unimplemented (RED phase)" error — clean TDD signal. Second run after restoring the real hash went 12/12 green on first attempt. No iterations.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

The solver contract is frozen. Plans 03-05..03-10 can import every type directly from `@wonderwaltz/solver` without additional refactors:

- **03-05 (forecast module consumer):** imports `ForecastBucket + ForecastConfidence` to shape its return type.
- **03-06 (crowd calendar rule engine):** imports `CrowdBucket + CrowdCalendarEntry`.
- **03-07..03-10 (solver construction / local search / LL allocator / snapshot fixtures):** fill in the `solve()` body; signature is already committed.
- **03-14..03-17 (plan-generation processor):** hashes `SolverInput` via `computeSolverInputHash`, persists to `plans.solver_input_hash`, reuses the DB index landed in 03-01.
- **03-15 (rethink-today):** reuses `SolverInput` shape; `active_ll_bookings` from the RethinkRequestDto will map to a future `SolverInput.activeLLBookings` field (to be added when the rethink solver path lands — not needed for 03-05..03-10).

The `solve()` function still throws — that's the deliberate contract. Any plan that forgets to implement before depending on its output will fail loudly at test time.

Ready for **03-05-PLAN.md** (next Wave 2 plan per roadmap).

---

*Phase: 03-engine*
*Completed: 2026-04-15*

## Self-Check: PASSED

- All 6 created files present on disk.
- All 3 task commits present in git log (`4de66a2`, `cc068cc`, `de2a372`).
- `pnpm --filter @wonderwaltz/solver test:run` → 2 files, 58 tests, 0 failures.
- `pnpm -r typecheck` clean across all 7 packages/apps.
