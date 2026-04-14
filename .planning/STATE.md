---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: planning
stopped_at: Completed 02-data-pipeline 02-06-PLAN.md
last_updated: "2026-04-14T20:39:01.909Z"
last_activity: 2026-04-09 — Roadmap created; all 143 v1 REQ-IDs mapped across 11 phases (0–10)
progress:
  total_phases: 11
  completed_phases: 2
  total_plans: 24
  completed_plans: 18
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-09)

**Core value:** A first-time Walt Disney World visitor gets a plan that feels like a Disney expert made it for them.
**Current focus:** Phase 0 — Name Lock

## Current Position

Phase: 0 of 10 (Name Lock)
Plan: 0 of TBD in current phase
Status: Ready to plan
Last activity: 2026-04-09 — Roadmap created; all 143 v1 REQ-IDs mapped across 11 phases (0–10)

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: N/A
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**
- Last 5 plans: N/A
- Trend: N/A

*Updated after each plan completion*
| Phase 01-foundation P01 | 355 | 3 tasks | 23 files |
| Phase 01-foundation P02 | 7 | 3 tasks | 34 files |
| Phase 01-foundation P03 | 15 | 2 tasks | 11 files |
| Phase 01-foundation P04 | 35 | 2 tasks | 25 files |
| Phase 01-foundation P05 | 2 | 2 tasks | 4 files |
| Phase 01-foundation P06 | 3 | 2 tasks | 18 files |
| Phase 01-foundation P08 | 8 | 2 tasks | 3 files |
| Phase 01-foundation P10 | 36 | 2 tasks | 6 files |
| Phase 01-foundation P11 | 15 | 2 tasks | 9 files |
| Phase 01-foundation P09 | 7 | 3 tasks | 10 files |
| Phase 02-data-pipeline P01 | 12 | 2 tasks | 9 files |
| Phase 02-data-pipeline P02 | 4 | 2 tasks | 5 files |
| Phase 02-data-pipeline P03 | 35 | 2 tasks | 18 files |
| Phase 02-data-pipeline P04 | 23 | 2 tasks | 11 files |
| Phase 02-data-pipeline P05 | 5 | 2 tasks | 6 files |
| Phase 02-data-pipeline P06 | 4 | 1 tasks | 4 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: Phase 0 = trademark search only; must complete before ANY public commitment (domain, social, repo, store listing)
- [Roadmap]: Data ingestion clock starts end of Phase 2; 8-week gate is a hard dependency for Phase 10
- [Roadmap]: IP lawyer must be engaged in Phase 8 (6-8 week lead time); sign-off is Phase 10 hard gate
- [Roadmap]: No parallel platform tracks; iOS (Ph 5-6) before Android (Ph 7); backend solid before mobile starts
- [Phase 00-name-lock]: Founder assertion posture: light informal self-check only; no formal trademark database search; attorney engagement reactive-only on receipt of C&D or formal notice
- [Phase 00-name-lock]: Phase 8 IP lawyer (LEGL-05) scoped to disclaimers/privacy/ToS/listings only — not trademark clearance; boundary documented in clearance memo
- [Phase 00-name-lock]: Task 3 delegation: founder delegated memo fill-in to orchestrator; honesty preserved by documenting no-search-results posture rather than fabricating data
- [Phase 01-foundation]: Node 22 installed via nvm; pnpm enabled on both Node 20 and Node 22 via corepack for git hook PATH compatibility
- [Phase 01-foundation]: Root tsconfig.json added to satisfy ESLint projectService for vitest.config.ts; per-package tsconfig.json added to db, design-tokens, api packages
- [Phase 01-foundation]: @eslint/js pinned to v9 series to match eslint@9 peer requirement
- [Phase 01-foundation]: NestJS module system set to Node16 (not Node10/CommonJS) — Node10 deprecated in TypeScript 6
- [Phase 01-foundation]: @nestjs/swagger upgraded to v11, @nestjs/config to v4 for NestJS 11 peer compatibility
- [Phase 01-foundation]: vitest.config renamed to .mts for ESM compat in CommonJS packages
- [Phase 01-foundation]: globals.css tokens.css @import path is 4 levels up from src/app/ (../../../../packages/design-tokens/generated/tokens.css)
- [Phase 01-foundation]: Tailwind v4 uses CSS-native @import tailwindcss + @theme directive — no tailwind.config.js
- [Phase 01-foundation]: DISCLAIMER text inline in layout.tsx for Phase 1; will import from @wonderwaltz/content in Phase 8
- [Phase 01-foundation]: Xcode project.pbxproj created manually (not via Xcode GUI) so it can be bootstrapped headlessly in CI
- [Phase 01-foundation]: kotlinOptions DSL replaced with kotlin { compilerOptions {} } — kotlinOptions is a compile error in Kotlin 2.3.x
- [Phase 01-foundation]: KSP plugin 2.3.20-1.0.32 not yet published; commented out in root build.gradle.kts, wired in Phase 7
- [Phase 01-foundation]: Xcode Cloud handles iOS CI — no macOS GHA runner. Locked in 01-CONTEXT.md.
- [Phase 01-foundation]: Android CI path-filtered to apps/android/** to avoid spurious runs on TS changes
- [Phase 01-foundation]: Gradle cache-read-only on PR branches to prevent cache poisoning from forks
- [Phase 01-foundation]: ageBracketEnum stores age as bracket string (0-2 to 18+) — no birthdate field anywhere (LEGL-07 COPPA compliance)
- [Phase 01-foundation]: RLS posture: enable on all 17 tables, no policy on catalog tables = blocked by default, all reads via NestJS service role
- [Phase Phase 01-foundation]: SERVICES.md is the canonical provisioning checklist for all 7 external services; founder executes each step in order
- [Phase 01-foundation]: SD4 file options pattern: className/packageName must be inside file.options, not at file root — top-level properties silently ignored
- [Phase 01-foundation]: SwiftUI import requires explicit options.import:['SwiftUI'] in SD4 — setSwiftFileProperties defaults to UIKit when no transformGroup set
- [Phase 01-foundation]: DSGN-07: Phosphor Icons selected (MIT license, cross-platform: phosphor-react/phosphor-swift/phosphor-compose)
- [Phase 01-foundation]: DISCLAIMER text inlined in interceptor (not imported from @wonderwaltz/content) due to CommonJS/ESM boundary between packages; APP_INTERCEPTOR DI registration used for Reflector injection enabling @SkipEnvelope()
- [Phase 01-foundation]: YAML content files use content_version field for future versioning; seed-catalog.ts resolves park/resort UUIDs from external_id strings before inserting FK-dependent rows; walkingGraph uses onConflictDoNothing (edges immutable); tsconfig.json include expanded to cover scripts/
- [Phase 01-foundation]: Figma Make 9FLYsReiTPAfLoKAjW3Ahz is canonical brand source — tokens flow from Figma Make via MCP to tokens.json
- [Phase 01-foundation]: DSGN-08 gate: all UI PRs must reference the Figma Make frame they implement
- [Phase 01-foundation]: Gold on Cream fails WCAG text contrast (2.1:1) — gold is decorative/background only, never body text
- [Phase 02-data-pipeline]: worker.ts uses NestFactory.createApplicationContext (not NestFactory.create) — no HTTP server in worker process
- [Phase 02-data-pipeline]: WorkerModule intentionally empty of processors — Wave 2 plans register their processor modules here
- [Phase 02-data-pipeline]: maxRetriesPerRequest: null CRITICAL for BullMQ blocking commands; enforced in WorkerModule and tested
- [Phase 02-data-pipeline]: AlertingModule has no BullModule/queue registrations — purely service providers; Wave 2 processor modules import AlertingModule to avoid circular deps
- [Phase 02-data-pipeline]: LagAlertService uses local DbExecutable duck-type interface instead of importing Db from @wonderwaltz/db — package dist-path mismatch (dist/src vs exports:dist) causes typecheck failures
- [Phase 02-data-pipeline]: CrowdIndex/Weather at root /v1/ path (not /parks/) per CONTEXT.md spec; separate @Controller decorators
- [Phase 02-data-pipeline]: OpenAPI snapshot uses tsc-compiled dist/ (not tsx/esbuild): emitDecoratorMetadata required for NestJS Swagger
- [Phase 02-data-pipeline]: openapi.v1.snapshot.json excluded from prettier: prevents formatting drift in CI git diff check
- [Phase 02-data-pipeline]: QueueTimesService uses raw sql duck-typed DrizzleDb interface — same pattern as LagAlertService, avoids @wonderwaltz/db dist-path mismatch
- [Phase 02-data-pipeline]: SharedInfraModule @Global() provides REDIS_CLIENT_TOKEN + DB_TOKEN once at root — eliminates per-module Redis/DB provider duplication across AlertingModule and IngestionModule
- [Phase 02-data-pipeline]: SlackAlerterService changed from import type Redis to import Redis + @Inject(REDIS_CLIENT_TOKEN) — import type erases NestJS DI token at runtime
- [Phase 02-data-pipeline]: ThemeparksProcessor uses cron 0 1,7,13,19 (staggered) not every:ms for 6hr schedule
- [Phase 02-data-pipeline]: RollupProcessor is MONITOR ONLY — queries cron.job_run_details, never calls REFRESH MATERIALIZED VIEW; pg_cron handles refresh via migration 0002
- [Phase 02-data-pipeline]: cron pattern '30 * * * *' for rollup monitor — 30min grace after pg_cron :00 refresh; ageMinutes > 90 alert threshold

### Pending Todos

- [restructure-01-09-figma-mcp](.planning/todos/pending/restructure-01-09-figma-mcp.md) — rewrite Plan 01-09 to pull brand tokens from Figma via MCP instead of ui-designer agent; unblocks Phase 01 completion

### Blockers/Concerns

- **Phase 01 paused (2026-04-14):** 10/11 plans complete. 01-09 deferred — brand direction will come from Figma via MCP, not ui-designer agent. Requires Figma MCP connection + plan restructure before resume. Phase 02 cannot start until 01 verified complete.
- **Open question (Phase 0/10):** Should per-trip IAP be consumable or non-consumable in App Store Connect? Decide before Phase 6 starts. (See SUMMARY.md Open Questions)
- **Open question (Phase 2):** TouringPlans historical data commercial use terms need verification before seeding to bootstrap cold start.
- **Open question (Phase 3):** DAS return window operational details need current WDW documentation verification before solver encoding.
- **Open question (Phase 5/7):** Rethink-my-day offline path (on-device solver vs. cached server state) needs architectural decision in Phase 5.

## Session Continuity

Last session: 2026-04-14T20:39:01.906Z
Stopped at: Completed 02-data-pipeline 02-06-PLAN.md
Resume file: None
