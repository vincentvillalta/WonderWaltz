---
phase: 03-engine
plan: 03
subsystem: contract
tags: [openapi, dto, discriminated-union, class-transformer, swagger, ci-gate, plan-02, llm-07]

requires:
  - phase: 03-engine
    plan: 01
    provides: schema scaffolding (llm_budget_cents column etc.)
  - phase: 03-engine
    plan: 02
    provides: NarrativeModule in AppModule (affects snapshot generator boot)
  - phase: 02-data-pipeline
    plan: 03
    provides: openapi.v1.snapshot.json baseline + CI diff gate
provides:
  - FullDayPlanDto + LockedDayPlanDto discriminated union (type tag)
  - PlanDto.days with oneOf + discriminator.mapping
  - PlanDto.warnings (required, string[])
  - PlanDto.meta.forecast_disclaimer (optional)
  - RethinkRequestDto + LLBookingDto (replaces RethinkTodayDto stub)
  - PlanBudgetExhaustedDto + ResetOptionDto (402 contract for LLM-07)
  - Regenerated openapi.v1.snapshot.json (byte-stable on re-runs)
  - openapi-snapshot.test.ts (11 shape-assertion tests)
  - CI snapshot gate updated to NODE_ENV=test for AppModule boot
affects:
  - 03-engine plans 04-18 — DTOs are frozen for the rest of Phase 3
  - 03-14/03-16 (plan generation) — must produce FullDayPlan or LockedDayPlan
  - 03-15 (rethink) — must accept RethinkRequestDto
  - 03-11 (circuit breaker) — must return PlanBudgetExhaustedDto on 402
  - Phase 4 (entitlements) — ResetOptionDto.sku wires to RevenueCat

tech-stack:
  added:
    - "apps/api: class-transformer ^0.5.1 (runtime) — @Type discriminator"
    - "apps/api: class-validator ^0.14.1 (runtime) — IsUUID/IsISO8601 on RethinkRequestDto"
  patterns:
    - "Discriminated union via @ApiProperty({ oneOf, discriminator }) + class-transformer @Type({ discriminator, keepDiscriminatorProperty: true })"
    - "@ApiExtraModels on container DTO registers subtypes for getSchemaPath() refs"
    - "Snapshot generator must run with NODE_ENV=test (bypasses NarrativeModule Anthropic-key guard from 03-02)"

key-files:
  created:
    - apps/api/src/shared/dto/rethink.dto.ts
    - apps/api/src/shared/dto/plan-budget-exhausted.dto.ts
    - apps/api/tests/dto/plan-dto-discriminator.test.ts
    - apps/api/tests/openapi-snapshot.test.ts
  modified:
    - apps/api/src/shared/dto/plan.dto.ts (rename DayPlanDto → FullDayPlanDto, add LockedDayPlanDto + PlanMetaDto, rewrite PlanDto.days as discriminated union, add warnings + meta)
    - apps/api/src/shared/dto/trip.dto.ts (remove legacy RethinkTodayDto)
    - apps/api/src/trips/trips.controller.ts (wire @ApiBody RethinkRequestDto + @ApiResponse 402 PlanBudgetExhaustedDto on generate-plan + rethink-today)
    - apps/api/package.json (class-transformer + class-validator runtime deps)
    - packages/shared-openapi/openapi.v1.snapshot.json (regenerated — 242 net line change)
    - .github/workflows/ci.yml (NODE_ENV=test for snapshot regen step)
    - pnpm-lock.yaml

key-decisions:
  - "Full rename DayPlanDto → FullDayPlanDto (not deprecated alias). trips.controller is still a 501 stub; no downstream code assumed day_plans. Aliases would double the surface area to freeze."
  - "Installed class-transformer + class-validator as runtime deps rather than substituting Zod. The plan's <action> explicitly requires them for @Type discriminator semantics and field-level decorators on RethinkRequestDto; fighting the spec with a different mechanism would have regenerated a snapshot the plan cannot verify."
  - "Added CI NODE_ENV=test for the snapshot-regen step. The alternative — relaxing the ANTHROPIC_API_KEY factory in 03-02 — would silently allow missing keys in prod. test-mode bypass is the already-documented escape hatch; CI merely opts into it explicitly."
  - "Shape-assertion tests (openapi-snapshot.test.ts) land alongside the byte-diff CI gate. The byte gate only catches regeneration drift; the shape tests catch silent field drops that would still pass a clean regeneration. Belt + suspenders for a contract the Phase 4+ mobile clients depend on."
  - "PlanMetaDto introduced as a nested optional on PlanDto, not on envelope. The outer {data, meta} envelope carries disclaimer; PlanDto.meta is plan-specific (forecast_disclaimer), keeping concerns separate."
  - "LockedDayPlanDto carries park as a display string, not a park_id UUID. Clients render the teaser without needing to resolve the catalog, and the locked card is intentionally informational-only."

requirements-completed: [PLAN-02]

metrics:
  duration_minutes: 19
  tasks: 2
  tests_added: 16
  tests_total_passing: 138
  files_created: 4
  files_modified: 7
  commits: 2

completed: 2026-04-15
---

# Phase 03 Plan 03: OpenAPI v1 Snapshot Amendment Summary

**The ONE deliberate v1 OpenAPI amendment for Phase 3 — PlanDto.days is now a FullDayPlan | LockedDayPlan discriminated union, RethinkRequestDto + PlanBudgetExhaustedDto landed, snapshot regenerates byte-stably, CI gate is green. No further snapshot churn allowed through plans 03-04..03-18.**

## Performance

- **Duration:** 19 min
- **Started:** 2026-04-15T22:12:08Z
- **Completed:** 2026-04-15T22:31:00Z
- **Tasks:** 2 (TDD — Task 1 combined RED+GREEN per 03-02 precedent due to lint blocking RED-only commits)
- **Tests:** 16 new (127 → 138)
- **Files:** 4 created, 7 modified

## Accomplishments

- `FullDayPlanDto` (type: 'full') + `LockedDayPlanDto` (type: 'locked') DTOs with `@ApiProperty` discriminator wiring. Runtime discriminator parsing works end-to-end via `class-transformer.plainToInstance` (5 tests in `plan-dto-discriminator.test.ts`).
- `PlanDto.days: Array<FullDayPlanDto | LockedDayPlanDto>` renders in OpenAPI as `type: array, items: { oneOf, discriminator: { propertyName: 'type', mapping } }`.
- `PlanDto.warnings: string[]` (required, default `[]`) for LL allocator nudges.
- `PlanDto.meta: PlanMetaDto` optional block with `forecast_disclaimer`.
- `RethinkRequestDto` + `LLBookingDto` replace the legacy `RethinkTodayDto` stub. Fields: `current_time` (ISO8601), `completed_item_ids` (UUID[]), `active_ll_bookings: LLBookingDto[]`. LL bookings carry `attraction_id + return_window_start/end`.
- `PlanBudgetExhaustedDto` + `ResetOptionDto` publish the 402 circuit-breaker contract (LLM-07). Wired on both `POST /v1/trips/:id/generate-plan` and `POST /v1/trips/:id/rethink-today`.
- `openapi.v1.snapshot.json` regenerated (242 net line change). Determinism verified — two consecutive runs produce identical sha.
- `openapi-snapshot.test.ts` adds 11 shape assertions that catch silent regenerations: discriminator presence, required-fields lists, 402 wiring, legacy-shape absence.
- CI `Check OpenAPI snapshot` step now runs with `NODE_ENV=test` so AppModule boot doesn't require an Anthropic key.

## Task Commits

1. **Task 1 (combined RED+GREEN): Amend DTOs + discriminator test** — `3b46f01` (feat)
2. **Task 2: Regenerate snapshot + shape tests + CI gate fix** — `ed4afce` (feat)

## Files Created / Modified

### Created

- `apps/api/src/shared/dto/rethink.dto.ts` — `RethinkRequestDto` + `LLBookingDto` with class-validator decorators.
- `apps/api/src/shared/dto/plan-budget-exhausted.dto.ts` — `PlanBudgetExhaustedDto` + `ResetOptionDto`, registered via `@ApiExtraModels`.
- `apps/api/tests/dto/plan-dto-discriminator.test.ts` — 5 cases covering `plainToInstance` discriminator routing (full/locked parsing, field retention, warnings default).
- `apps/api/tests/openapi-snapshot.test.ts` — 11 cases locking the amended contract shape in place (required fields, discriminator mapping, 402 path wiring, legacy DTO absence).

### Modified

- `apps/api/src/shared/dto/plan.dto.ts` — rename `DayPlanDto` → `FullDayPlanDto`; add `LockedDayPlanDto`, `PlanMetaDto`, discriminator literal types. `PlanDto.days` rewritten as `Array<FullDayPlanDto | LockedDayPlanDto>`; add `warnings` + optional `meta`. Register subtypes with `@ApiExtraModels`.
- `apps/api/src/shared/dto/trip.dto.ts` — remove legacy `RethinkTodayDto` (superseded).
- `apps/api/src/trips/trips.controller.ts` — `@ApiBody({ type: RethinkRequestDto })`, `@ApiResponse({ status: 402, type: PlanBudgetExhaustedDto })` on both generate-plan and rethink-today.
- `apps/api/package.json` — runtime deps `class-transformer@^0.5.1`, `class-validator@^0.14.1`.
- `packages/shared-openapi/openapi.v1.snapshot.json` — regenerated (+230 / -12 lines).
- `.github/workflows/ci.yml` — `NODE_ENV: test` on `Check OpenAPI snapshot` step.
- `pnpm-lock.yaml` — dep graph.

## Decisions Made

See frontmatter `key-decisions`. Highlights:

- **Full rename**, not alias. trips.controller is still a stub; no production code assumed `day_plans`. An alias would double the surface frozen by the snapshot gate and create confusion when 03-14 starts populating data.
- **class-transformer/class-validator installed**, not Zod-substituted. The plan's `<action>` prescribed the mechanism precisely because `@Type({ discriminator })` is the runtime counterpart to the `@ApiProperty({ oneOf, discriminator })` OpenAPI spec — they're paired by design.
- **CI `NODE_ENV=test`** for snapshot regen. This isn't a test-only path bleeding into CI — NarrativeModule's factory already documents test-mode as the escape hatch for missing keys. CI is legitimately not a runtime environment.
- **Shape tests + byte-diff CI gate** together. Byte-diff catches regeneration drift; shape tests catch silent field drops from controller refactors that regenerate cleanly. Neither alone is sufficient.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] class-transformer + class-validator not in workspace**
- **Found during:** Task 1 (writing discriminator test, GREEN)
- **Issue:** Plan `<action>` requires `plainToInstance(PlanDto, fixture)` for runtime discriminator routing and `@IsUUID('4')`/`@IsISO8601()`/`@ValidateNested` on RethinkRequestDto. Neither package was installed.
- **Fix:** `pnpm --filter @wonderwaltz/api add class-transformer@^0.5.1 class-validator@^0.14.1`.
- **Files modified:** `apps/api/package.json`, `pnpm-lock.yaml`.
- **Verification:** Discriminator test passes; all 138 tests green; typecheck clean.
- **Committed in:** `3b46f01` (Task 1).

**2. [Rule 3 - Blocking] OpenAPI snapshot generator fails silently without ANTHROPIC_API_KEY**
- **Found during:** Task 2 (running snapshot regen)
- **Issue:** Plan 03-02 added NarrativeModule to AppModule; its `ANTHROPIC_CLIENT_TOKEN` factory throws outside `NODE_ENV=test` when the key is missing. The snapshot generator boots AppModule with no env set, so it exit-1'd silently (fastify logger: false suppressed the trace).
- **Fix:** Run generator with `NODE_ENV=test` locally; update `.github/workflows/ci.yml` step with `env: NODE_ENV: test`. This uses the already-documented test-mode bypass; no production behavior changes.
- **Files modified:** `.github/workflows/ci.yml`.
- **Verification:** Generator completes with "OpenAPI snapshot written to: …". Regenerating twice in a row produces byte-identical output.
- **Committed in:** `ed4afce` (Task 2).

**3. [Rule 1 - Bug] Prettier-ignored snapshot dropped linter unsafe-any on test**
- **Found during:** Task 2 commit (pre-commit hook)
- **Issue:** Initial `openapi-snapshot.test.ts` used `expect.stringContaining(...)` inside `toMatchObject`, which returns `any` and triggered `@typescript-eslint/no-unsafe-assignment`.
- **Fix:** Replaced with explicit property reads (`mapping.full`, `mapping.locked`) and `toContain` assertions. Type-tightens to `Record<string, string>` via the `PropertyNode` local type.
- **Files modified:** `apps/api/tests/openapi-snapshot.test.ts` (intra-commit).
- **Verification:** `pnpm --filter @wonderwaltz/api test -- tests/openapi-snapshot.test.ts --run` — 11/11 green; eslint clean.
- **Committed in:** `ed4afce` (Task 2, within the same commit after re-stage).

---

**Total deviations:** 3 auto-fixed (2 blocking + 1 lint bug). None required user approval.

## Authentication Gates

None for this plan. The `NODE_ENV=test` snapshot-gen bypass is the pre-existing NarrativeModule contract; no new auth required.

## Issues Encountered

- The Fastify adapter's `logger: false` in the generator script swallowed the ANTHROPIC_API_KEY boot error on silent exit 1. Left `logger: false` in place for production snapshot generation (no noise in CI logs), but the diagnostic flow was: (1) notice exit 1, (2) run same boot with `logger: ['error','warn']` to surface the stack, (3) identify NarrativeModule, (4) set `NODE_ENV=test`.
- No other flakes — discriminator test hit green on first GREEN attempt; snapshot regenerated byte-stably on first try.

## User Setup Required

None — all changes are code-level. `ANTHROPIC_API_KEY` remains a Phase 03 prerequisite for live integration (03-12+), but not for this plan.

## Contract Freeze Reminder

**This is the one deliberate v1 OpenAPI amendment for Phase 3.** Every plan from 03-04 through 03-18 must implement endpoint bodies without changing DTO shapes. The CI gate (`git diff --exit-code`) + shape tests (`openapi-snapshot.test.ts`) guard this together:

- The byte-diff gate will fail PRs that regenerate the snapshot into a different form.
- The shape tests will fail PRs that change controllers in a way that drops required fields, removes subtypes from the discriminator, or breaks the 402 wiring — even if the regenerated snapshot happens to land unchanged.

If a later plan (or bug fix) genuinely needs to amend v1, it must:

1. Be an explicit planned amendment, not a drive-by side effect.
2. Update both the snapshot and the shape tests.
3. Document the change in that plan's SUMMARY.md as a deliberate second amendment.

## Next Phase Readiness

Plan 03-04 (ForecastModule, Wave 1) can proceed. The v1 contract is now stable for the solver (03-04..03-08), LLM (03-09..03-12), cost tracking (03-11), plan generation (03-14..03-17), and rethink (03-15) plans to build against.

Ready for **03-04-PLAN.md** (ForecastModule).

---

*Phase: 03-engine*
*Completed: 2026-04-15*

## Self-Check: PASSED

- All 4 created files exist on disk.
- All 7 modified files present.
- Both task commits present in git log (`3b46f01`, `ed4afce`).
- `pnpm --filter @wonderwaltz/api test -- tests/dto tests/openapi-snapshot.test.ts --run` → 17 files, 138 tests, 0 failures.
- `pnpm --filter @wonderwaltz/api typecheck` → clean.
- Snapshot regenerates byte-stably (verified via repeated shasum).
- New schemas present in snapshot: `FullDayPlanDto`, `LockedDayPlanDto`, `RethinkRequestDto`, `LLBookingDto`, `PlanBudgetExhaustedDto`, `ResetOptionDto` (grep count = 15 references).
