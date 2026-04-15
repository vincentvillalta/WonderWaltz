---
phase: 03
slug: engine
status: planned
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-15
updated: 2026-04-15
---

# Phase 03 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> See `03-RESEARCH.md` "## Validation Architecture" for the detailed
> per-requirement mapping.

---

## Test Infrastructure

| Property             | Value                                                                  |
| -------------------- | ---------------------------------------------------------------------- |
| **Framework**        | Vitest 4.1.3 (workspace-level); @nestjs/testing for module/controller tests; Vitest snapshot mode for SOLV-12 |
| **Config files**     | `apps/api/vitest.config.mts`, `packages/solver/vitest.config.ts` (new) |
| **Quick run command**| `pnpm --filter @wonderwaltz/api test` (changed-file mode)              |
| **Solver suite**     | `pnpm --filter @wonderwaltz/solver test` (runs all 6 snapshots)        |
| **Full suite**       | `pnpm -r test -- --run`                                                |
| **Estimated runtime**| Quick ~5s, solver suite ~3s, full ~60s                                 |

---

## Sampling Rate

- **After every task commit:** Run quick suite (changed-file mode).
- **After every solver change:** Run solver suite (all 6 snapshots MUST pass).
- **After every plan wave:** Run full suite.
- **Before `/gsd:verify-work`:** Full suite green + OpenAPI snapshot diff clean + solver snapshots byte-identical.
- **Max feedback latency:** 10s for quick, 60s for full.

---

## Per-Task Verification Map

Every requirement ID below maps to an automated verify command in exactly one PLAN.md task. See that plan's `<verify><automated>…</automated></verify>` block for the canonical command.

| Requirement | Plan       | Verification type | Automated command (from plan) |
| ----------- | ---------- | ----------------- | ----------------------------- |
| FC-01 | 03-11 | Integration test (bucketed median + baseline fallback) | `pnpm --filter @wonderwaltz/api test -- tests/forecast/forecast.service.test.ts tests/forecast/confidence.test.ts --run` |
| FC-02 | 03-01 + 03-11 | Schema migration test + rule-engine unit + DB override | `pnpm --filter @wonderwaltz/api test -- tests/forecast/calendar-rules.test.ts tests/forecast/calendar.service.test.ts --run` |
| FC-03 | 03-11 | Unit test (confidence classifier) | `pnpm --filter @wonderwaltz/api test -- tests/forecast/confidence.test.ts --run` |
| FC-04 | 03-11 + 03-10 | Forecast exercised inside solver snapshot suite | `pnpm --filter @wonderwaltz/solver test -- tests/snapshot.test.ts --run` |
| FC-05 | 03-11 | Beta-framing contract test | `pnpm --filter @wonderwaltz/api test -- tests/forecast/beta-framing.test.ts --run` |
| SOLV-01 | 03-04 | Package boundary static check + types | `pnpm --filter @wonderwaltz/solver test -- tests/package-boundary.test.ts --run` |
| SOLV-02 | 03-06 | 4 predicate unit tests | `pnpm --filter @wonderwaltz/solver test -- tests/filter-*.test.ts --run` |
| SOLV-03 | 03-07 | Scoring + construct-pinning unit tests | `pnpm --filter @wonderwaltz/solver test -- tests/score.test.ts tests/construct-pinning.test.ts --run` |
| SOLV-04 | 03-08 | LL allocation table-driven test | `pnpm --filter @wonderwaltz/solver test -- tests/ll-allocation.test.ts --run` |
| SOLV-05 | 03-07 | Meal insertion test | `pnpm --filter @wonderwaltz/solver test -- tests/meals.test.ts --run` |
| SOLV-06 | 03-07 | Show/parade/fireworks insertion test | `pnpm --filter @wonderwaltz/solver test -- tests/shows.test.ts --run` |
| SOLV-07 | 03-09 | Fatigue rest-block table-driven test | `pnpm --filter @wonderwaltz/solver test -- tests/fatigue.test.ts --run` |
| SOLV-08 | 03-08 | DAS pool test | `pnpm --filter @wonderwaltz/solver test -- tests/das.test.ts --run` |
| SOLV-09 | 03-08 | Park-hours EE/EEH table-driven test | `pnpm --filter @wonderwaltz/solver test -- tests/park-hours.test.ts --run` |
| SOLV-10 | 03-09 | Budget tier rules test | `pnpm --filter @wonderwaltz/solver test -- tests/budget-tier.test.ts --run` |
| SOLV-11 | 03-10 | 100-run determinism test | `pnpm --filter @wonderwaltz/solver test -- tests/deterministic.test.ts --run` |
| SOLV-12 | 03-10 | 6 canonical fixture snapshots | `pnpm --filter @wonderwaltz/solver test -- tests/snapshot.test.ts --run` |
| SOLV-13 | 03-05 | Walking graph preload + load-once proof | `pnpm --filter @wonderwaltz/api test -- tests/plan-generation/walking-graph-loader.test.ts --run` |
| LLM-01 | 03-02 | NarrativeModule DI + mock resolution | `pnpm --filter @wonderwaltz/api test -- tests/narrative/narrative.module.test.ts --run` |
| LLM-02 | 03-12 | Byte-stable CACHED_PREFIX test | `pnpm --filter @wonderwaltz/api test -- tests/narrative/prompt-cache-prefix.test.ts --run` |
| LLM-03 | 03-14 | Model-ID contract test | `pnpm --filter @wonderwaltz/api test -- tests/narrative/model-id-contract.test.ts --run` |
| LLM-04 | 03-12 | Zod schema + ride-ID subset contract | `pnpm --filter @wonderwaltz/api test -- tests/narrative/zod-schema.test.ts tests/narrative/ride-id-contract.test.ts --run` |
| LLM-05 | 03-13 | Cost math + llm_costs row assertion | `pnpm --filter @wonderwaltz/api test -- tests/narrative/cost.test.ts tests/narrative/narrative-service.test.ts --run` |
| LLM-06 | 03-13 | Rolling hit-rate alert test | `pnpm --filter @wonderwaltz/api test -- tests/narrative/cost-hit-rate-alert.test.ts --run` |
| LLM-07 | 03-14 | Circuit breaker + 3-sink + Sonnet→Haiku swap | `pnpm --filter @wonderwaltz/api test -- tests/plan-generation/circuit-breaker.test.ts tests/narrative/sonnet-haiku-fallback.test.ts --run` |
| LLM-08 | 03-15 | Rethink rate limit test | `pnpm --filter @wonderwaltz/api test -- tests/plan-generation/rethink-rate-limit.test.ts tests/plan-generation/rate-limit-guard.test.ts --run` |
| PLAN-01 | 03-16 | Processor + service integration | `pnpm --filter @wonderwaltz/api test -- tests/plan-generation/plan-generation.service.test.ts tests/plan-generation/plan-generation.processor.test.ts --run` |
| PLAN-02 | 03-03 + 03-17 | Discriminated union DTO + projection e2e | `pnpm --filter @wonderwaltz/api test -- tests/dto/plan-dto-discriminator.test.ts tests/e2e/get-plan-projection.e2e.test.ts --run` |
| PLAN-03 | 03-16 | PersistPlanService multi-table insert | `pnpm --filter @wonderwaltz/api test -- tests/plan-generation/persist-plan.test.ts --run` |
| PLAN-04 | 03-17 | Rethink e2e + roundtrip | `pnpm --filter @wonderwaltz/api test -- tests/e2e/rethink-today.e2e.test.ts tests/e2e/plan-roundtrip.e2e.test.ts --run` |
| PLAN-05 | 03-15 | Free-tier lifetime counter | `pnpm --filter @wonderwaltz/api test -- tests/plan-generation/free-tier-lifetime.test.ts --run` |
| PLAN-06 | 03-18 | Packing list rules + affiliate tag injection | `pnpm --filter @wonderwaltz/api test -- tests/packing-list/packing-list.service.test.ts tests/packing-list/affiliate.test.ts --run` |

*Status legend: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky* — filled during execution.

---

## Wave 0 Requirements

Delivered by plans 03-01, 03-02, 03-03 (all in wave 1). Each is a scaffolding plan without feature logic; Wave 0 is "complete" when all three plans ship.

**New packages / deps** — plan 03-02:
- [ ] Install `@anthropic-ai/sdk` in `apps/api/package.json`
- [ ] Install `date-holidays` in `packages/content` (plan 03-11 also may touch this)
- [ ] Document `ANTHROPIC_API_KEY` in `docs/ops/PROVISIONING_STATE.md`

**Schema migrations** — plan 03-01:
- [ ] `crowd_calendar` table
- [ ] `llm_cost_incidents` table
- [ ] `trips.current_plan_id` column
- [ ] `trips.llm_budget_cents` column (default 50)
- [ ] `plans(trip_id, solver_input_hash)` index
- [ ] `attractions` columns: `baseline_wait_minutes`, `lightning_lane_type`, `is_headliner` (same migration)

**YAML schema additions** — plan 03-01 (task 2):
- [ ] `attractions.yaml` populated with 3 new fields on every row
- [ ] `attraction.zod.ts` validator green
- [ ] Seed script idempotent

**Solver package scaffold** — plan 03-04:
- [ ] `packages/solver/src/types.ts` complete
- [ ] `packages/solver/vitest.config.ts` present
- [ ] `packages/solver/src/hash.ts` + deterministic hash test green
- [ ] Package boundary static check green

Fixture directory `packages/solver/src/__fixtures__/` and snapshot suite land in plan 03-10 (not Wave 0 — they depend on the implemented solver).

**Test infrastructure** — plan 03-02:
- [ ] `apps/api/tests/anthropic-mock.ts` with cache-aware usage reporting
- [ ] `apps/api/tests/fixtures/narrative-response.json` (happy path)
- [ ] `apps/api/tests/fixtures/narrative-response.invalid-ride.json` (hallucinated-ride negative fixture)

**v1 OpenAPI snapshot amendment (ONE deliberate update)** — plan 03-03:
- [ ] Replace stub `DayPlan` with `FullDayPlan` + `LockedDayPlan` discriminated union
- [ ] Add `Plan.warnings: string[]`
- [ ] Add `RethinkRequestDto` with `active_ll_bookings: LLBookingDto[]`
- [ ] Add `PlanBudgetExhaustedDto` for 402 responses
- [ ] Regenerate snapshot; CI gate passes cleanly after

**Phase 2 carry-forward** — plan 03-01 (task 3):
- [ ] Queue-times catalog ID gap closed — all 4 WDW parks resolve correctly

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
| -------- | ----------- | ---------- | ----------------- |
| Anthropic API key routes billing correctly | LLM-05 | Depends on external account setup | Generate one plan, observe `llm_costs` row + Anthropic dashboard shows usage |
| Prompt cache hit rate achieves ≥70% after warmup | LLM-06 | Requires real API + production traffic | Generate 20 plans in sequence, check cache_read_input_tokens > 70% of input_tokens |
| End-to-end plan generation within 30s against prod infra | PLAN-01, PLAN-03 | Test environment may not reflect real latency | Deploy to Railway, time 10 plan requests, p95 ≤ 30s |
| Zod validation actually catches hallucinated rides | LLM-04 | Requires adversarial narrative inputs | Prompt Claude with instructions to reference non-existent rides; validation should reject |
| Circuit breaker trips at $0.50 across real Anthropic costs | LLM-07 | Requires real billed calls | Generate plans until breaker trips; verify `llm_cost_incidents` row + Slack alert |
| DAS video-chat narrative accuracy | SOLV-08 | Depends on Disney's current DAS policy | Cross-reference narrative text against current [Disney DAS FAQ](https://disneyworld.disney.go.com/guest-services/disability-access-service/) before Phase 10 |

---

## Nyquist Continuity Check

- [x] No 3 consecutive tasks without automated verification signal — every task in every Phase 3 plan has an `<automated>` command.
- [x] Every SOLV-0X requirement maps to a unit or snapshot test (see table above).
- [x] Every LLM-0X requirement maps to an integration test with Anthropic mock (or cost/rate-limit equivalent).
- [x] Every PLAN-0X requirement maps to an HTTP integration test or multi-table insert test.
- [x] Every FC-0X requirement maps to a unit or integration test.
- [x] SOLV-12 fixture suite is the phase gate (6/6 green = phase complete for solver work).
- [x] `nyquist_compliant: true` set in frontmatter (this file).

---

## Validation Sign-Off

- [x] All 31 requirement IDs have at least one `<automated>` verify command assigned (per table above).
- [x] Sampling continuity: no 3 consecutive tasks without automated verify.
- [x] Wave 0 covers all MISSING fixture references (plans 03-01 through 03-03).
- [x] No watch-mode flags in automated commands (every command uses `--run`).
- [x] Feedback latency <60s (quick <10s).
- [x] `nyquist_compliant: true` set.

**Approval:** validation mapping complete; execute-phase may proceed once plans are committed.
