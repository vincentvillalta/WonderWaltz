---
phase: 02
slug: data-pipeline
status: planned
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-14
---

# Phase 02 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> See `02-RESEARCH.md#validation-architecture` for the detailed sampling rationale.

---

## Test Infrastructure

| Property             | Value                                                                 |
| -------------------- | --------------------------------------------------------------------- |
| **Framework**        | Vitest 4.1.3 (workspace-level), @nestjs/testing for module tests      |
| **Config file**      | `apps/api/vitest.config.mts` (per-package)                            |
| **Quick run command**| `pnpm --filter @wonderwaltz/api test`                                  |
| **Full suite**       | `pnpm -r test -- --run`                                                |
| **Estimated runtime**| Quick ~5s, full ~45s                                                   |

---

## Sampling Rate

- **After every task commit:** Run quick suite (changed-file mode).
- **After every plan wave:** Run full suite.
- **Before `/gsd:verify-work`:** Full suite green + OpenAPI snapshot diff clean.
- **Max feedback latency:** 10s for quick, 60s for full.

---

## Per-Task Verification Map

| Plan | Task | Requirement | Automated Command | Status |
|------|------|-------------|-------------------|--------|
| 02-01 | Task 1: Worker entry point | DATA-07 (bootstrap smoke) | `pnpm --filter @wonderwaltz/api test -- --run worker.bootstrap` | ⬜ pending |
| 02-01 | Task 2: Test fixtures | DATA-07 | `pnpm --filter @wonderwaltz/api test -- --run worker.bootstrap` | ⬜ pending |
| 02-02 | Task 1: SlackAlerterService | DATA-06a, DATA-06b | `pnpm --filter @wonderwaltz/api test -- --run slack-alerter.service` | ⬜ pending |
| 02-02 | Task 2: LagAlertService + AlertingModule | DATA-06b, DATA-06c | `pnpm --filter @wonderwaltz/api test -- --run lag-alert.service` | ⬜ pending |
| 02-03 | Task 1: DTO layer | DATA-05 (shape), DATA-06 (spec) | `pnpm --filter @wonderwaltz/api tsc --noEmit` | ⬜ pending |
| 02-03 | Task 2: Controllers + snapshot + CI | API-spec | `node scripts/generate-openapi-snapshot.ts && git diff --exit-code packages/shared-openapi/openapi.v1.snapshot.json` | ⬜ pending |
| 02-04 | Task 1: QueueTimesService | DATA-01a, DATA-01c, DATA-01d | `pnpm --filter @wonderwaltz/api test -- --run queue-times.service` | ⬜ pending |
| 02-04 | Task 2: QueueTimesProcessor | DATA-06a | `pnpm --filter @wonderwaltz/api test -- --run "queue-times.processor\|queue-times.service"` | ⬜ pending |
| 02-05 | Task 1: ThemeparksService | DATA-02a, DATA-02b | `pnpm --filter @wonderwaltz/api test -- --run themeparks.service` | ⬜ pending |
| 02-05 | Task 2: ThemeparksProcessor + IngestionModule update | DATA-02 | `pnpm --filter @wonderwaltz/api tsc --noEmit && pnpm --filter @wonderwaltz/api test -- --run themeparks` | ⬜ pending |
| 02-06 | Task 1: RollupProcessor | DATA-03a, DATA-03b | `pnpm --filter @wonderwaltz/api test -- --run rollup.processor` | ⬜ pending |
| 02-07 | Task 1: CrowdIndexService | DATA-04a, DATA-04b, DATA-04c, DATA-04d | `pnpm --filter @wonderwaltz/api test -- --run crowd-index.service` | ⬜ pending |
| 02-07 | Task 2: CrowdIndexProcessor + CrowdIndexModule | DATA-04 | `pnpm --filter @wonderwaltz/api test -- --run "crowd-index"` | ⬜ pending |
| 02-08 | Task 1: WeatherService | DATA-08a, DATA-08b, DATA-08c, DATA-08d | `pnpm --filter @wonderwaltz/api test -- --run weather.service` | ⬜ pending |
| 02-09 | Task 1: ParksService | DATA-01 (read), DATA-04 (read), DATA-08 (read) | `pnpm --filter @wonderwaltz/api tsc --noEmit` | ⬜ pending |
| 02-09 | Task 2: ParksController (live endpoints) | DATA-01, DATA-04, DATA-08 | `pnpm --filter @wonderwaltz/api tsc --noEmit` | ⬜ pending |
| 02-10 | Task 1: Final snapshot freeze | API-spec | `node scripts/generate-openapi-snapshot.ts && git diff --exit-code packages/shared-openapi/openapi.v1.snapshot.json` | ⬜ pending |
| 02-11 | Task 1: Attribution content + web footer | DATA-05 | `pnpm --filter @wonderwaltz/content test -- --run attribution` | ⬜ pending |
| 02-12 | Task 1: Deployment runbook | DATA-07 | `test -f docs/ops/PHASE2-DEPLOYMENT.md && echo "runbook exists"` | ⬜ pending |
| 02-12 | Checkpoint: human verify | DATA-07 | Manual: query wait_times_history in Supabase + curl live endpoints | ⬜ pending |

*Status legend: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Requirement → Plan Coverage

| Requirement | Plan(s) | Test Coverage |
|-------------|---------|---------------|
| DATA-01 | 02-04 (worker), 02-09 (read endpoint) | Unit tests: DATA-01a/01c/01d |
| DATA-02 | 02-05 | Unit tests: DATA-02a/02b |
| DATA-03 | 02-06 | Unit tests: DATA-03a/03b |
| DATA-04 | 02-07 (worker), 02-09 (read endpoint) | Unit tests: DATA-04a/04b/04c/04d |
| DATA-05 | 02-11 | Unit test: file content check |
| DATA-06 | 02-02 (alerting), 02-04 (dead-letter) | Unit tests: DATA-06a/06b/06c |
| DATA-07 | 02-01 (bootstrap), 02-12 (deploy) | Bootstrap smoke test + manual deploy verify |
| DATA-08 | 02-08 (service), 02-09 (endpoint) | Unit tests: DATA-08a/08b/08c/08d |

---

## Wave 0 Checklist

- [x] `apps/api/tests/setup.ts` — global Redis mock + Sentry stub (plan 02-01 Task 2)
- [x] `apps/api/tests/fixtures/queue-times-response.json` — real-shape fixture (plan 02-01 Task 2)
- [x] `apps/api/tests/fixtures/themeparks-wiki-response.json` — real-shape fixture (plan 02-01 Task 2)
- [x] `apps/api/tests/fixtures/openweather-response.json` — One Call 3.0 fixture (plan 02-01 Task 2)
- [x] `apps/api/src/worker.bootstrap.spec.ts` — bootstrap smoke test (plan 02-01 Task 1)
- [x] `.github/workflows/ci.yml` — OpenAPI snapshot diff step (plan 02-03 Task 2)
- [x] `packages/shared-openapi/openapi.v1.snapshot.json` — baseline committed (plan 02-03 Task 2)

---

## Nyquist Continuity Check

Wave 1 plans (02-01, 02-02, 02-03) each have automated verify on every task.
Wave 2 plans (02-04 through 02-08) each have automated verify on every task.
Wave 3 plans (02-09, 02-10, 02-11) have automated verify.
Wave 4 plan (02-12) has one automated + one manual checkpoint.

No 3 consecutive tasks without an automated verification signal. ✓ Nyquist compliant.

---

## Manual-Only Verifications

| Behavior                                  | Requirement | Why Manual                                | Test Instructions                                                                            |
| ----------------------------------------- | ----------- | ----------------------------------------- | -------------------------------------------------------------------------------------------- |
| Ingestion runs in production 8+ weeks     | DATA-07     | Time-based; cannot be compressed in tests | Verified at Phase 10 launch gate by checking `wait_times_history` row count and timestamp span |
| Slack webhook actually routes to channel  | DATA-06     | Depends on external Slack workspace       | Trigger a test alert after deploy; verify message appears in Slack                           |
| Sentry alert rules configured correctly   | DATA-06     | Requires Sentry dashboard access          | Open Sentry project → verify 2 alert rules exist (dead-letter + lag) with Slack routing      |
| pg_cron jobs actually running             | DATA-03     | Requires live Supabase query              | Run `SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;` against prod     |
| Attribution text appears in web footer    | DATA-05     | Requires rendering web app                | Load deployed web URL; inspect footer DOM for "Data source: queue-times.com"                 |
| wait_times_history receiving rows         | DATA-07     | Requires live Railway worker deploy       | SELECT COUNT(*), MAX(fetched_at) FROM wait_times_history WHERE fetched_at > now() - INTERVAL '10 minutes'; |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify commands
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING fixture references
- [x] No watch-mode flags in automated commands
- [x] Feedback latency < 60s (quick < 10s)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending execution
