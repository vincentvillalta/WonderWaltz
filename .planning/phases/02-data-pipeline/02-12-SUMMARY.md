---
phase: 02-data-pipeline
plan: "12"
status: complete
completed: 2026-04-15
requirements_satisfied:
  - DATA-07
---

# Plan 02-12 Summary — Production Deploy + Ingestion Clock Start

## What shipped

### Task 1 (automated) — committed in `c472517`

- `docs/ops/PHASE2-DEPLOYMENT.md` — Railway worker deployment runbook
  with env-var table, build/start commands, and verification SQL.
- `docs/ops/PROVISIONING_STATE.md` — updated worker service section.

### Task 2 (checkpoint: human-verify) — resolved 2026-04-15

Worker deployed to Railway, verified running, ingestion clock started.

## Ingestion clock t=0

**2026-04-15 16:08:01 UTC** — first row written to `wait_times_history`.

The 8-week DATA-07 / LNCH-07 gate for Phase 10 public beta begins
counting from this timestamp.

## Verification evidence

15-minute snapshot (captured 2026-04-15 ~16:20 UTC):

| Metric | Value |
| --- | --- |
| Rows in last 15 min | 18 |
| Unique rides | 6 |
| Polling cycles observed | 3 (5-min cadence confirmed) |
| Latest fetched_at | 16:18:02 UTC |
| Earliest fetched_at | 16:08:01 UTC |

Per-park coverage (last 15 min):

| Park | Samples | Unique rides |
| --- | --- | --- |
| EPCOT | 15 | 5 |
| Hollywood Studios | 3 | 1 |
| Magic Kingdom | 0 | 0 |
| Animal Kingdom | 0 | 0 |

## Deviations from plan

The plan expected ~200 rows across all 4 parks in the first 15 minutes.
Actual was 18 rows across 2 parks due to a **catalog ID mismatch**: the
seed YAML files used `queue_times_id` values that don't match current
live queue-times.com IDs. Worker silently skips unmatched rides
(`queue-times.service.ts:142-144`).

**Not a Phase 02 blocker:**
- DATA-07 success criterion is "ingestion begins running in production"
  — satisfied (rows are flowing, 5-min cadence is correct).
- DATA-07 gate is **time-based** (8 weeks), not coverage-based.
- The clock has started; partial coverage still accumulates.

Fix tracked at `.planning/todos/pending/fix-queue-times-catalog-ids.md`
— can be resolved any time before Phase 10.

## Code fixes required during deployment

Six production bugs surfaced only when deploying real infrastructure.
Each is fixed and committed:

| Fix | Commit | Root cause |
| --- | --- | --- |
| Docker pnpm monorepo | `1aa7d89` | Railpack's `npm install` chokes on `workspace:*` |
| Lockfile sync | `20760cd` | Plan 01-11 added tsx/yaml without updating lock |
| Copy turbo.json | `ab86a97` | Turbo needs it at build invocation root |
| Remove shared-openapi | `fa178a4` | Not imported at runtime; dist absent |
| Worker entry path | `c38500d` | tsc rootDir=. → dist/src/worker.js not dist/worker.js |
| Full /app copy | `50c1658` | pnpm symlinked node_modules per workspace |
| Content path | `d1b130c` | seed-catalog.ts wrong relative path |
| Drizzle RowList | `dbb2f62` | postgres-js driver returns array, not { rows } |

## Key files

- `apps/api/src/worker.ts` — worker entry (Nest application context, no HTTP)
- `apps/api/src/worker.module.ts` — BullMQ + ioredis config for Upstash
- `Dockerfile` — 3-stage pnpm monorepo build, Node 22, slim runtime
- `docs/ops/PHASE2-DEPLOYMENT.md` — operational runbook

## Commits

- `c472517` — docs(02-12): deployment runbook + provisioning state
- `1aa7d89` — build(deploy): Dockerfile + railway.toml for pnpm monorepo
- `20760cd` — chore(deps): sync pnpm-lock.yaml
- `ab86a97` — fix(deploy): copy turbo.json
- `fa178a4` — fix(deploy): remove shared-openapi from runtime
- `c38500d` — fix(deploy): correct worker entry path
- `50c1658` — fix(deploy): copy entire /app from build stage
- `dda7716` — chore(02-04): log job failures to stdout
- `d1b130c` — fix(seed+02-04): content path + enriched dead-letter errors
- `dbb2f62` — fix(02-04+): drizzle RowList shape
- `64d2512` — docs(phase-02): record t=0 + catalog-ID gap todo

## Self-check

- [x] Worker is deployed and running in Railway
- [x] `DATABASE_URL` uses Session pooler (IPv4-compatible, port 5432)
- [x] All 5 required env vars set on worker service
- [x] `wait_times_history` is receiving rows on a 5-minute cadence
- [x] t=0 timestamp recorded in `PROVISIONING_STATE.md`
- [x] Deployment runbook committed
- [x] Catalog gap logged as todo (non-blocking)
