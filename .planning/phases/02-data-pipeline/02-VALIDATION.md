---
phase: 02
slug: data-pipeline
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-14
---

# Phase 02 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> See `02-RESEARCH.md#validation-architecture` for the detailed sampling rationale.

---

## Test Infrastructure

| Property             | Value                                                                 |
| -------------------- | --------------------------------------------------------------------- |
| **Framework**        | Vitest 3.x (workspace-level), @nestjs/testing for module tests         |
| **Config file**      | `vitest.config.ts` (root), per-package `vitest.config.ts` where needed |
| **Quick run command**| `pnpm --filter @wonderwaltz/api test -- --run --changed`               |
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

This is a placeholder — the planner will populate this table as it decomposes
DATA-01..08 into specific tasks. Each row pairs a requirement with an independent
automated signal (Nyquist principle: every requirement testable, no three
consecutive tasks without a verification signal).

Expected requirement→verification mapping:

| Requirement | Verification type                                           | Notes |
| ----------- | ----------------------------------------------------------- | ----- |
| DATA-01     | Integration test: mock queue-times API → verify Redis key + DB row written | Most critical — must run on every worker change |
| DATA-02     | Integration test: mock themeparks.wiki → verify hours row upserted | Separate suite, slower cadence |
| DATA-03     | Unit test: `cron.job_run_details` stub → verify alert triggers on miss | Must exercise the "pg_cron didn't run" branch |
| DATA-04     | Unit test: percentile formula (known input → known output) + bootstrap-switch gate test | Two distinct signals |
| DATA-05     | Static test: `packages/content/legal/attribution.en.json` content-shape test | File exists + correct text |
| DATA-06     | Integration test: trigger 2 dead-letters → Slack webhook mock receives payload | End-to-end signal |
| DATA-07     | Manual ops check (ingestion running in prod 24h+) — tracked in VERIFICATION phase, not automated | The 8-week clock is observed, not tested |
| DATA-08     | Unit test: OpenWeather mock → verify Redis caching + 8-day horizon skip | Two distinct signals |

Planner will expand this into per-task rows with commit hashes and file paths.

*Status legend: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Wave 0 tasks the planner must schedule before any feature work begins:

- [ ] `apps/api/tests/setup.ts` — shared test fixtures (Redis mock, fake pg, Sentry stub)
- [ ] `apps/api/tests/fixtures/queue-times-response.json` — real response captured from queue-times.com for deterministic tests
- [ ] `apps/api/tests/fixtures/themeparks-wiki-response.json` — same for themeparks.wiki
- [ ] `apps/api/tests/fixtures/openweather-response.json` — same for OpenWeather One Call 3.0
- [ ] `.github/workflows/ci.yml` — add OpenAPI snapshot diff step (`shared-openapi` workspace)
- [ ] `packages/shared-openapi/openapi.v1.snapshot.json` — baseline committed (empty initially; filled by first OpenAPI export task)

---

## Manual-Only Verifications

| Behavior                                  | Requirement | Why Manual                                | Test Instructions                                                                            |
| ----------------------------------------- | ----------- | ----------------------------------------- | -------------------------------------------------------------------------------------------- |
| Ingestion runs in production 8+ weeks     | DATA-07     | Time-based; cannot be compressed in tests | Verified at Phase 10 launch gate by checking `wait_times_history` row count and timestamp span |
| Slack webhook actually routes to channel  | DATA-06     | Depends on external Slack workspace       | Trigger a test alert after deploy; verify message appears in Slack                           |
| Sentry alert rules configured correctly   | DATA-06     | Requires Sentry dashboard access          | Open Sentry project → verify 2 alert rules exist (dead-letter + lag) with Slack routing      |
| pg_cron jobs actually running             | DATA-03     | Requires live Supabase query              | Run `SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;` against prod     |
| Attribution text appears in web footer    | DATA-05     | Requires rendering web app                | Load deployed web URL; inspect footer DOM for "Data source: queue-times.com"                 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies (planner fills in)
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING fixture references
- [ ] No watch-mode flags in automated commands
- [ ] Feedback latency < 60s (quick < 10s)
- [ ] `nyquist_compliant: true` set in frontmatter (set by planner once tasks are laid out)

**Approval:** pending
