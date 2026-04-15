---
phase: 03
slug: engine
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-15
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

The planner fills this table as it decomposes the 31 requirement IDs
into concrete plans. Every task maps to one or more automated checks.

Expected high-level requirement → verification mapping (from research
"Validation Architecture"):

| Requirement | Verification type | Notes |
| ----------- | ----------------- | ----- |
| FC-01 | Integration test: seed wait_times_1h fixtures → assert bucketed median returned | Needs `baseline_wait_minutes` fallback test |
| FC-02 | Unit test (rule engine) + integration test (DB override wins) | Two distinct signals |
| FC-03 | Unit test: confidence label from sample count + window | Table-driven |
| FC-04 | Snapshot test: forecast(ride, ts) for canonical rides across bucket combos | Part of solver fixture suite |
| FC-05 | Contract test: plan response metadata always contains `"framing": "Beta Forecast"` pre-launch | Static check |
| SOLV-01 | Package boundary test: `packages/solver` has zero NestJS / I/O imports | Grep + typecheck |
| SOLV-02 | Unit tests per constraint (height, mobility, sensory, dietary) | Independent signals |
| SOLV-03 | Unit test: scoring function returns known value for known input | Deterministic |
| SOLV-04 | Unit test: LL allocation budget respected per tier | Table-driven |
| SOLV-05 | Unit test: meal windows scheduled in rides-free slots | |
| SOLV-06 | Unit test: parades/fireworks/shows scored as optional blocks | |
| SOLV-07 | Unit test: fatigue model inserts rest blocks by age bracket | Table-driven |
| SOLV-08 | Unit test: DAS budget math equivalent to LL | |
| SOLV-09 | Unit test: EE/EEH rules applied to on-property hotel guests | |
| SOLV-10 | Unit test: tier → LL/rest/dining allocations match | Table-driven |
| SOLV-11 | **Determinism test:** same SolverInput → byte-identical DayPlan[] on 100 repeated runs | Critical; non-negotiable |
| SOLV-12 | **Snapshot suite: 6 canonical fixtures, byte-identical across runs** | Main phase gate |
| SOLV-13 | Unit test: walking graph loaded once at startup; `shortestPath` does not query DB | Spy on DB client |
| LLM-01 | Integration test: NarrativeModule called with solver output → structured narrative returned | Mock Anthropic SDK |
| LLM-02 | Integration test: first call cache_miss, second call cache_hit in same minute | Mock returns cache_control field |
| LLM-03 | Contract test: plan generation uses `claude-sonnet-4-6`; rethink + fallback use `claude-haiku-4-5` | Grep + env-var check |
| LLM-04 | Unit test: Zod schema validates well-formed narrative; rejects narrative referencing a ride not in solver output | Contract test |
| LLM-05 | Integration test: after LLM call, `llm_costs` row exists with correct fields | DB assertion |
| LLM-06 | Unit test: cache hit rate calculator + Sentry trigger when rate < 70% | Mocked metrics |
| LLM-07 | Integration test: spend tracker trips at $0.50; Sonnet→Haiku swap observed mid-generation | Fixture with 2 narrative batches |
| LLM-08 | Unit test: rate limiter returns 429 at 16th rethink/day unlocked, 6th free-tier | Redis-backed counter |
| PLAN-01 | Integration test: POST /trips/:id/generate-plan returns 202 with `{ plan_job_id }`; job completes within 30s in test runner | End-to-end signal |
| PLAN-02 | Contract test: free tier GET /plans/:id returns `Array<FullDayPlan \| LockedDayPlan>` with type discriminator | DTO shape check |
| PLAN-03 | Integration test: after job, all 4 tables (plans, plan_days, plan_items, llm_costs) have rows; trips.plan_status='ready' | Multi-table assertion |
| PLAN-04 | Integration test: POST /trips/:id/rethink-today with completed_item_ids + active_ll_bookings → plan_days for remaining day only | |
| PLAN-05 | Unit test: middleware counts requests per anonymous device; 4th request returns 403 | Redis-backed |
| PLAN-06 | Unit test: packing list generation reads solver output + weather + ages → items array; affiliate tag injected at read time | |

Planner will expand this table with per-plan-per-task rows including
exact paths + commit hashes as execution proceeds.

*Status legend: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

From research findings, Wave 0 must complete these before any feature
work begins:

**New packages / deps:**
- [ ] Install `@anthropic-ai/sdk` in `apps/api/package.json` (NOT
      currently installed despite earlier assumptions)
- [ ] Install `date-fns-tz` for Orlando-local-time handling
- [ ] Set `ANTHROPIC_API_KEY` env var in Railway worker + `.env.local`

**Schema migrations (4):**
- [ ] `crowd_calendar` table: `(date, bucket, reason, created_at)`
- [ ] `llm_cost_incidents` table: `(trip_id, event, model, spent_cents, timestamp, ...)`
- [ ] Add `trips.current_plan_id` column (FK to plans.id, nullable)
- [ ] Add `trips.llm_budget_cents` column (default 50)
- [ ] Add index on `plans(trip_id, solver_input_hash)`

**YAML schema additions:**
- [ ] `attractions.yaml`: add `baseline_wait_minutes`, `lightning_lane_type`, `is_headliner` fields per attraction
- [ ] Update seed script to handle new fields idempotently

**Solver package scaffold:**
- [ ] `packages/solver/src/types.ts` — SolverInput, DayPlan, PlanItem types
- [ ] `packages/solver/vitest.config.ts` — solver-only test config
- [ ] `packages/solver/src/fixtures/` directory for 6 canonical trips
- [ ] Solver snapshot scaffold (empty fixtures; filled in Wave 2)

**Test infrastructure:**
- [ ] `apps/api/tests/anthropic-mock.ts` — deterministic mock for
      Anthropic SDK (prompt caching semantics + token counting)
- [ ] `apps/api/tests/fixtures/narrative-response.json` — real-shape
      Anthropic response captured for replay
- [ ] `packages/solver/tests/deterministic.test.ts` — runs `solve()`
      100× on same input, asserts byte-identical output

**v1 OpenAPI snapshot amendment (ONE deliberate update):**
- [ ] Replace stub `DayPlan` with `FullDayPlan` + `LockedDayPlan` discriminated union
- [ ] Add `Plan.warnings: string[]`
- [ ] Add `RethinkRequestDto` with `active_ll_bookings: LLBookingDto[]`
- [ ] Add `PlanBudgetExhaustedDto` for 402 responses
- [ ] Regenerate snapshot; CI gate should pass cleanly after

**Phase 2 carry-forward (optional but recommended):**
- [ ] Fix queue-times catalog IDs (tracked in `todos/pending/fix-queue-times-catalog-ids.md`) — without this, 2 of 4 parks have zero forecast data which degrades solver quality for Phase 3 fixtures

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

After planner populates per-task map above:

- [ ] No 3 consecutive tasks without automated verification signal
- [ ] Every SOLV-0X requirement maps to a unit or snapshot test
- [ ] Every LLM-0X requirement maps to an integration test with Anthropic mock
- [ ] Every PLAN-0X requirement maps to an HTTP integration test
- [ ] Every FC-0X requirement maps to a unit test
- [ ] SOLV-12 fixture suite is the phase gate (6/6 green = phase complete for solver work)
- [ ] `nyquist_compliant: true` set in frontmatter once tasks are laid out

---

## Validation Sign-Off

- [ ] All 31 requirement IDs have at least one `<automated>` verify or a documented manual verification
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING fixture references
- [ ] No watch-mode flags in automated commands
- [ ] Feedback latency <60s (quick <10s)
- [ ] `nyquist_compliant: true` set once planner finishes laying out tasks

**Approval:** pending (planner completes task map first)
