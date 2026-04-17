---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
stopped_at: Completed 05-03-PLAN.md
last_updated: "2026-04-17T11:48:26.174Z"
last_activity: "2026-04-17 -- Completed Plan 05-03: App Shell + Onboarding"
progress:
  total_phases: 11
  completed_phases: 5
  total_plans: 56
  completed_plans: 52
  percent: 93
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-09)

**Core value:** A first-time Walt Disney World visitor gets a plan that feels like a Disney expert made it for them.
**Current focus:** Phase 5 — iOS Core

## Current Position

Phase: 5 of 10 (iOS Core)
Plan: 3 of 7 in current phase (complete)
Status: In Progress
Last activity: 2026-04-17 -- Completed Plan 05-03: App Shell + Onboarding

Progress: [█████████░] 93%

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
| Phase 02-data-pipeline P07 | 38 | 2 tasks | 6 files |
| Phase 02-data-pipeline P08 | 27 | 1 tasks | 4 files |
| Phase 02-data-pipeline P09 | 15 | 2 tasks | 6 files |
| Phase 02-data-pipeline P10 | 25 | 1 tasks | 3 files |
| Phase 02-data-pipeline P11 | 7 | 1 tasks | 8 files |
| Phase 03-engine P01 | 15 min | 3 tasks | 19 files |
| Phase 03-engine P02 | 7 min | 3 tasks | 14 files |
| Phase 03-engine P03 | 19 min | 2 tasks | 11 files |
| Phase 03-engine P04 | 6 min | 2 tasks | 9 files |
| Phase 03-engine P04 | 6 min | 2 tasks | 9 files |
| Phase 03-engine P11 | 13 min | 3 tasks | 14 files |
| Phase 03-engine P05 | 8 min | 2 tasks | 11 files |
| Phase 03-engine P06 | 5 min | 2 tasks | 7 files |
| Phase 03-engine P12 | 34 min | 3 tasks | 9 files |
| Phase 03-engine P07 | 15 | 3 tasks | 9 files |
| Phase 03-engine P13 | 7 min | 2 tasks | 9 files |
| Phase 03-engine P08 | 14 min | 3 tasks | 9 files |
| Phase 03-engine P09 | 6 | 2 tasks | 5 files |
| Phase 03-engine P14 | 12 min | 3 tasks | 6 files |
| Phase 03-engine P10 | 60 min | 2 tasks | 13 files |
| Phase 03-engine P15 | 8 | 2 tasks | 6 files |
| Phase 03-engine P16 | 58 min | 3 tasks | 9 files |
| Phase 03-engine P17 | 31 min | 3 tasks | 10 files |
| Phase 03-engine P18 | 6 min | 2 tasks | 8 files |
| Phase 03-engine P19 | 2 min | 2 tasks | 3 files |
| Phase 03-engine P20 | 5 | 2 tasks | 5 files |
| Phase 04-entitlements-accounts P01 | 5 min | 2 tasks | 7 files |
| Phase 04-entitlements-accounts P02 | 3 min | 2 tasks | 9 files |
| Phase 04-entitlements-accounts P03 | 5 min | 2 tasks | 11 files |
| Phase 04-entitlements-accounts P04 | 6 min | 2 tasks | 14 files |
| Phase 04-entitlements-accounts P05 | 5 min | 2 tasks | 8 files |
| Phase 05-ios-core P01 | 22 | 2 tasks | 52 files |
| Phase 05-ios-core P02 | 60 min | 2 tasks | 14 files |
| Phase 05-ios-core P03 | 16 | 2 tasks | 13 files |

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
- [Phase 02-data-pipeline]: CrowdIndexService auto-switches bootstrap/percentile mode based on getSampleSizeDays() COUNT(DISTINCT DATE(ts)) >= 30 at runtime — no manual flag
- [Phase 02-data-pipeline]: CrowdIndexModule exports CrowdIndexService for future GET /v1/crowd-index API endpoint without re-querying DB
- [Phase 02-data-pipeline]: WeatherService uses UTC-based date comparison in isWithinHorizon — avoids local-timezone skew in non-UTC environments
- [Phase 02-data-pipeline]: WeatherModule + SharedInfraModule added to AppModule (HTTP side) for plan 02-09 weather endpoint injection
- [Phase 02-data-pipeline]: WaitTimeDto nullable fields (minutes/fetched_at/source) support no-data case when Redis miss + no history
- [Phase 02-data-pipeline]: ParksService reads crowd_index Redis keys directly — avoids importing CrowdIndexModule (BullMQ) into HTTP process
- [Phase 02-data-pipeline]: generate-openapi-snapshot.js AppModule path is '../src/app.module.js' (not '../app.module.js') — tsc rootDir '.' outputs src files to dist/src/ subdir
- [Phase 02-data-pipeline]: shared-infra.module.ts monorepoRoot: resolve(__dirname, '../../../..') — 4 levels up from dist/src/ to repo root; 3 levels only reached apps/
- [Phase 02-data-pipeline]: ATTRIBUTION exported via createRequire pattern — mirrors disclaimer.ts, avoids ESM/CJS boundary
- [Phase 02-data-pipeline]: Footer component extracted from layout.tsx; attribution rendered as plain text (no hyperlink) per CONTEXT.md Area 7 Q7.4
- [Phase 03-engine]: Migration 0004 applied via direct postgres-js driver against Supabase Session Pooler (MCP not exposed to executor session) — Same project_ref, same DDL, durably applied; equivalent path
- [Phase 03-engine]: lightning_lane_type enforced via SQL CHECK constraint, not pgEnum — Future LL-type additions become a one-line migration instead of an ENUM ALTER
- [Phase 03-engine]: queue-times ID fix landed at YAML data layer, not as a service-level mapping override — apps/api/src/ingestion/queue-times.service.ts uses DB lookup; YAML correction is the natural fix point and the regression test guards it
- [Phase 03-engine]: Anthropic SDK pinned at @anthropic-ai/sdk ^0.65.0; model IDs claude-sonnet-4-6 (generation) and claude-haiku-4-5 (rethink/fallback) surfaced via env vars never -latest aliases
- [Phase 03-engine]: Mock harness locks 96% cache_read_input_tokens ratio on hit; load-bearing for 03-11 llm_costs cost-math tests
- [Phase 03-engine]: CACHED_PREFIX SHA-256 invariant test landed in 03-02 (not 03-12) — hardcoded hex is the forcing function against byte drift in the cached catalog+BRAND prefix
- [Phase 03-engine]: ANTHROPIC_CLIENT_TOKEN factory throws outside NODE_ENV=test when key missing — mis-provisioned envs fail loudly rather than returning a stub that silently no-ops
- [Phase 03-engine]: NarrativeService stubs reject with /03-12/ marker — grep-discoverable index of every unimplemented seam
- [Phase 03-engine]: 03-03: Full rename DayPlanDto to FullDayPlanDto (no alias) — trips.controller still stub, no prod code assumed day_plans
- [Phase 03-engine]: 03-03: Installed class-transformer + class-validator (not Zod-substituted) — @Type discriminator is runtime counterpart to @ApiProperty oneOf discriminator
- [Phase 03-engine]: 03-03: CI snapshot regen step needs NODE_ENV=test so AppModule boots without ANTHROPIC_API_KEY (NarrativeModule factory guard from 03-02)
- [Phase 03-engine]: 03-03: Shape-assertion tests + byte-diff CI gate run together — byte gate catches regen drift, shape tests catch silent field drops
- [Phase 03-engine]: 03-04: Catalog excluded from solver_input_hash (in addition to forecasts/weather/crowd) — content edits would force cache-miss storms otherwise
- [Phase 03-engine]: 03-04: mustDoAttractionIds order is semantic — reordering produces a different hash (user ranking drives solver priority)
- [Phase 03-engine]: 03-04: Solver types are structural duplicates of catalog/DTO shapes, not re-imports from @wonderwaltz/content or @wonderwaltz/api — required to keep packages/solver zero-runtime-dep
- [Phase 03-engine]: 03-04: Package-boundary enforced by static import-scan test (not convention); forbidden list extended beyond plan's six to include bullmq, pg, @anthropic-ai/ and I/O node stdlib in src/
- [Phase 03-engine]: 03-11: Rule engine relocated to apps/api/src/forecast/calendar-rules.ts (not packages/content/wdw) — CJS/ESM package boundary prevents synchronous import of ESM pure function into CJS api; mirrors DISCLAIMER inline pattern
- [Phase 03-engine]: 03-11: Bucket filter intentionally skipped in percentile_cont SQL — baseline-fallback dominates Phase 3 operating mode so bucket-aware median is dead code; Phase 4+ refinement
- [Phase 03-engine]: 03-11: MIN_SAMPLES_FOR_MEDIAN=5 short-circuit forces baseline even when weeks-of-history qualifies for medium — prevents confident-looking medians over near-empty buckets
- [Phase 03-engine]: 03-11: postgres-js numeric-as-string normalizer (toNumber) in ForecastService — Math.round on string NaN-bombs silently; explicit test case pins
- [Phase 03-engine]: 03-05: CatalogWalkingGraph renamed from WalkingGraph in types.ts to free the name for the Floyd-Warshall runtime shape (nodes[] + distances Map)
- [Phase 03-engine]: 03-05: ESM solver loaded into CJS api via createRequire + pathToFileURL dynamic import; mirror types in loader to avoid TS1541
- [Phase 03-engine]: 03-06: Tag-based mobility/sensory filtering instead of explicit ecvAccessible/intensityTier fields — CatalogAttraction tags drive compatibility
- [Phase 03-engine]: 03-06: accommodates field added as optional to CatalogDining — dining YAML has no dietary data yet; filter handles missing field conservatively
- [Phase 03-engine]: 03-12: Cached prefix uses XML-tagged sections (<CATALOG>, <BRAND_VOICE>, <TONE_RULES>) for clear LLM section boundaries; sorted YAML loads ensure byte-stability
- [Phase 03-engine]: 03-12: Retry corrective prompt appended as systemSuffix (not replacing system) — preserves cache_control on the original cached block for cache hit on retry
- [Phase 03-engine]: 03-12: GenerateResult.narrative typed as NarrativeResponse | undefined — exactOptionalPropertyTypes tsconfig requires explicit undefined
- [Phase 03-engine]: 03-07: deriveEnjoymentWeight bridges isHeadliner boolean to numeric score (85/50) since CatalogAttraction lacks enjoymentScore field
- [Phase 03-engine]: 03-13: Frozen rate card with Object.freeze — Sonnet $3/$15 input/output, Haiku $0.80/$4.00, cache_read 10% of input, cache_write 125% of input
- [Phase 03-engine]: 03-13: CostAlertService deps all @Optional() — NarrativeModule resolves without SharedInfraModule/AlertingModule in tests; degrades gracefully
- [Phase 03-engine]: 03-13: SlackAlerterService accessed via string token 'SlackAlerterService' to avoid AlertingModule import cycle in NarrativeModule
- [Phase 03-engine]: 03-13: Cost write is best-effort (try/catch) — telemetry must never crash narrative pipeline
- [Phase 03-engine]: 03-13: Hit rate = cached_read_tok / (cached_read_tok + input_tok), minimum 5 rows for signal, Redis dedup 1h TTL
- [Phase 03-engine]: 03-07: Timezone-naive arithmetic (minutes since midnight + date prefix) instead of Date objects — prevents TZ conversion bugs in solver time calculations
- [Phase 03-engine]: 03-07: Fixed displacement cost model for show insertion (60 show score vs 40 per displaced item) — avoids requiring full scoring context in show pass; local search in 03-08 can refine
- [Phase 03-engine]: 03-08: Adjacent-pair swap is single-pass (no convergence loop) — deterministic by construction per CONTEXT.md Area 1
- [Phase 03-engine]: 03-08: DAS modeled as separate ResourcePool (capacity 3, any ride) rather than modifying LL math — clean separation of concerns
- [Phase 03-engine]: 03-08: LL allocation uses wait-time-descending as scoring proxy for top-N selection — matches CONTEXT.md longest-wait-first rule
- [Phase 03-engine]: 03-09: BUDGET_TIER_RULES frozen constant table in solver (not content) — LL caps, rest frequency, dining tier per tier
- [Phase 03-engine]: 03-09: Peak fatigue windows fixed (toddler 12:30-13:30, young kid 13:00-14:00, both merge to 12:30-14:00); rest blocks are soft constraints never displacing must-do items
- [Phase 03-engine]: 03-14: CircuitBreakerService injected via string token 'CircuitBreakerService' with @Optional() — avoids circular import between NarrativeModule and PlanGenerationModule
- [Phase 03-engine]: 03-14: BudgetExhaustedError is typed Error subclass (not HttpException) — plan-generation orchestrator maps to 402 at controller layer
- [Phase 03-engine]: 03-14: Budget check runs once per generate() call; retry reuses same model decision — avoids double DB query
- [Phase 03-engine]: 03-14: Slack dedup key 'circuit-breaker:slack-dedup' separate from cost-alert dedup — independent hourly rate limits
- [Phase 03-engine]: 03-10: Round-robin park assignment across trip dates using sorted unique parkIds — deterministic, simple
- [Phase 03-engine]: 03-10: Hash-based forecast fallback SHA-256(rideId+slot)[0]%60+baseline/2 when no real buckets exist
- [Phase 03-engine]: 03-10: Multi-day dedup via sorting (visited rides after unvisited) not exclusion — allows re-rides if needed
- [Phase 03-engine]: 03-10: construct.ts buildIso rounds fractional minutes with Math.round — prevents invalid ISO strings from walk-time division
- [Phase 03-engine]: 03-15: INCR/DECR atomic Redis pattern for rate limiting — avoids TOCTOU race vs GET-then-INCR
- [Phase 03-engine]: 03-15: Guard defaults to free-tier (isUnlocked=false) when user tier unknown — safer to apply tighter limit
- [Phase 03-engine]: 03-16: SolverLoader as DI injectable rather than module-level function — enables test mocking without vi.mock on dynamic import boundary
- [Phase 03-engine]: 03-16: hydrateSolverInput returns Record<string, unknown> to avoid maintaining mirror types; casts at solver call boundary via `as never`
- [Phase 03-engine]: 03-16: PersistPlanService uses sequential INSERTs (not transaction API) — drizzle-orm postgres-js transaction edge cases with RowList
- [Phase 03-engine]: 03-16: PlanGenerationModule imports AlertingModule for SlackAlerterService injection into processor dead-letter handler
- [Phase 03-engine]: 03-17: PlansModule standalone (not inside TripsModule) — clean controller separation; PlansService needs its own DB injection for projection queries
- [Phase 03-engine]: 03-17: Budget check at controller layer before BullMQ enqueue — fail fast on 402 without entering queue
- [Phase 03-engine]: 03-17: In-progress inference uses UTC minutes-since-midnight — matches solver timezone-naive convention from 03-07
- [Phase 03-engine]: 03-17: PlansService.getPlan returns null for missing plans — controller maps to 404, keeps service testable without HTTP exceptions
- [Phase 03-engine]: 03-18: Water rides hardcoded as Set (not tagged in attractions.yaml) — YAML has no gets_wet field; Set is simpler for handful of known rides
- [Phase 03-engine]: 03-18: AffiliateService uses @Optional() injection in PlansService — backwards-compatible with existing tests
- [Phase 03-engine]: 03-18: Amazon Associates tag sourced from AMAZON_ASSOCIATES_TAG env var, default wonderwaltz-20 — configurable without code change
- [Phase 03-engine]: 03-19: RENAME COLUMN (narrative -> narrative_intro/narrative_tip) instead of adding alias columns — Postgres lacks aliases; safe since only persist-plan + plans.service touch these tables
- [Phase 03-engine]: 03-19: warnings stored as TEXT with JSON.stringify (not JSONB) — matches plans.service.ts COALESCE pattern
- [Phase 03-engine]: 03-19: metadata column kept as empty JSONB '{}' for future extensibility
- [Phase 03-engine]: 03-20: CostAlertService.checkHitRate() wired inline after writeCostRow (fire-and-forget) instead of BullMQ cron — more responsive, Redis dedup prevents noise
- [Phase 04-entitlements-accounts]: jose used for JWT signing via dynamic import — ESM-only library requires import() in CJS NestJS context
- [Phase 04-entitlements-accounts]: Custom JWT signed with SUPABASE_JWT_SECRET rather than Supabase admin session API — admin.createUser does not return a session
- [Phase 04-entitlements-accounts]: SUPABASE_ADMIN_TOKEN factory returns stub when env vars missing — unit tests run without Supabase credentials
- [Phase 04-entitlements-accounts]: exactOptionalPropertyTypes-safe DTO construction — conditional assignment instead of ?? undefined for optional fields
- [Phase 04-entitlements-accounts]: AnonymousPurchaseGuard is synchronous CanActivate (no async) — reads request.user set by prior SupabaseAuthGuard
- [Phase 04-entitlements-accounts]: WebhookAuthGuard synchronous CanActivate reading REVENUECAT_WEBHOOK_AUTH_KEY from env — no Supabase auth for server-to-server webhooks
- [Phase 04-entitlements-accounts]: createEntitlement uses ON CONFLICT (revenuecat_id) DO NOTHING — duplicate purchase events are idempotent no-ops
- [Phase 04-entitlements-accounts]: REFUND falls back to entitlement record lookup if trip_id missing from subscriber_attributes
- [Phase 04-entitlements-accounts]: PurgeProcessor uses Injectable() not @Processor() -- direct test instantiation without BullMQ dependency
- [Phase 04-entitlements-accounts]: AccountDeletionModule imported by AuthModule (not AppModule) -- keeps DI chain clean via UsersController
- [Phase 04-entitlements-accounts]: Purge cascade uses 14 sequential DELETEs in FK-safe order with per-statement try/catch for best-effort execution
- [Phase 04-entitlements-accounts]: AnonymousTripLimitGuard short-circuits for registered users (no DB call); controller-level SupabaseAuthGuard with method-level compound guard override on POST /trips
- [Phase 04-entitlements-accounts]: AuthModule imported by TripsModule and PlansModule for guard DI resolution (no circular deps)
- [Phase 05-ios-core]: Pre-generated OpenAPI client (CLI) instead of build plugin -- Tuist conflicts with Xcode build tool plugin sandbox
- [Phase 05-ios-core]: sentry-cocoa pinned to exact 8.44.0 -- Swift 6.2 manifest compilation error in newer versions
- [Phase 05-ios-core]: AuthServiceProtocol @MainActor -- enables @Observable without Sendable crossing isolation
- [Phase 05-ios-core]: WWDesignTokens rewritten as enum with CGFloat/String types -- auto-generated had invalid Swift
- [Phase 05-ios-core]: CachedWalkingEdge uses @Attribute(.unique) compoundKey string instead of #Unique macro -- #Unique requires iOS 18, deployment target is iOS 17
- [Phase 05-ios-core]: clearCache uses fetch-then-delete pattern (not modelContext.delete(model:)) -- batch delete triggers constraint violations on inverse relationships
- [Phase 05-ios-core]: Static map tile download deferred to Phase 6 -- OfflinePackageDownloader only handles catalog subset + walking graph
- [Phase 05-ios-core]: MainActor.assumeIsolated in App.init for DI wiring -- App.init runs on main thread but is nonisolated in Swift 6
- [Phase 05-ios-core]: AnalyticsBridge with @retroactive conformance -- PostHogAnalyticsService cannot import WWCore (circular dep)
- [Phase 05-ios-core]: swift-http-types added as explicit WWCore dependency -- transitive dep not resolved by Xcode linker for test target
- [Phase 05-ios-core]: AppConfig reads DSN/API keys from Info.plist -- never hardcoded per security requirements

### Pending Todos

- [restructure-01-09-figma-mcp](.planning/todos/pending/restructure-01-09-figma-mcp.md) — rewrite Plan 01-09 to pull brand tokens from Figma via MCP instead of ui-designer agent; unblocks Phase 01 completion

### Blockers/Concerns

- **Phase 01 paused (2026-04-14):** 10/11 plans complete. 01-09 deferred — brand direction will come from Figma via MCP, not ui-designer agent. Requires Figma MCP connection + plan restructure before resume. Phase 02 cannot start until 01 verified complete.
- **Open question (Phase 0/10):** Should per-trip IAP be consumable or non-consumable in App Store Connect? Decide before Phase 6 starts. (See SUMMARY.md Open Questions)
- **Open question (Phase 2):** TouringPlans historical data commercial use terms need verification before seeding to bootstrap cold start.
- **Open question (Phase 3):** DAS return window operational details need current WDW documentation verification before solver encoding.
- **Open question (Phase 5/7):** Rethink-my-day offline path (on-device solver vs. cached server state) needs architectural decision in Phase 5.

## Session Continuity

Last session: 2026-04-17T11:48:26.171Z
Stopped at: Completed 05-03-PLAN.md
Resume file: None
