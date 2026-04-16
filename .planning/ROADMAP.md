# Roadmap: WonderWaltz

## Overview

WonderWaltz v1 is built in eleven sequential phases — zero parallel platform tracks until Phase 5. The sequence is dictated by three hard gates: (1) name cleared before any public commitment, (2) data ingestion running for 8+ weeks before public beta, and (3) IP lawyer signed off before app store submission. Backend infrastructure and the solver engine are fully proven before any mobile code is written. iOS ships first; Android follows within two weeks. The marketing website and legal surfaces are polished in Phase 8 while notifications are finalized. Phase 10 is the launch gate — nothing ships until both hard gates are satisfied.

## Phases

**Phase Numbering:**
- Integer phases (0–10): Planned milestone work
- Decimal phases (e.g., 2.1): Urgent insertions — created via `/gsd:insert-phase` if needed

- [x] **Phase 0: Name Lock** - Trademark search on "WonderWaltz" before any public commitment (completed 2026-04-09)
- [ ] **Phase 1: Foundation** - Monorepo scaffolding, DB schema, design system, disclaimer architecture
- [ ] **Phase 2: Data Pipeline** - Ingestion workers live in production; 8-week data accumulation clock starts
- [ ] **Phase 3: Engine** - Solver + LLM narrative layer + async plan generation API
- [ ] **Phase 4: Entitlements & Accounts** - Auth, IAP backend, RevenueCat webhook, account deletion
- [ ] **Phase 5: iOS Core** - Trip wizard, plan view, offline sync, design system integration
- [ ] **Phase 6: iOS Paywall & Notifications** - StoreKit 2 paywall, countdown widget, push notifications
- [ ] **Phase 7: Android** - Feature-parity Android app with Compose, Room, Play Billing
- [ ] **Phase 8: Website & Legal** - Marketing site, admin panel, privacy policy, IP lawyer engaged
- [ ] **Phase 9: Live Activities & Push Polish** - iOS Live Activity, Android ongoing notification, rethink-my-day polish
- [ ] **Phase 10: Beta & Launch** - Closed beta, IP lawyer sign-off (hard gate), data gate, App Store submission

## Phase Details

### Phase 0: Name Lock
**Goal**: "WonderWaltz" is cleared for use before any public commitment — domain registration, social handles, public repo, App Store listing, or marketing assets.
**Depends on**: Nothing (first phase)
**Requirements**: LEGL-01
**Success Criteria** (what must be TRUE):
  1. USPTO TESS search on "WonderWaltz" returns no blocking marks in Class 9 (software) or Class 41 (entertainment services)
  2. EUIPO eSearch returns no blocking marks for "WonderWaltz"
  3. A written clearance summary is saved in `docs/legal/trademark-search-2026.md` before any domain, social, or repo is made public
**Plans**: 1 plan

Plans:
- [ ] 00-01-PLAN.md — Scaffold docs/legal/, write memo template, founder self-check, validate, and commit trademark clearance memo

### Phase 1: Foundation
**Goal**: Every developer tool, service account, design token, and database schema is in place so that Phase 2 can start writing data without friction. The monorepo compiles, CI is green, brand direction is locked, and the disclaimer is wired into every API response layer from day one.
**Depends on**: Phase 0
**Requirements**: FND-01, FND-02, FND-03, FND-04, FND-05, FND-06, FND-07, FND-08, FND-09, FND-10, FND-11, FND-12, DSGN-01, DSGN-02, DSGN-03, DSGN-04, DSGN-05, DSGN-06, DSGN-07, DSGN-08, DB-01, DB-02, DB-03, DB-04, DB-05, DB-06, DB-07, DB-08, LEGL-02, LEGL-03, LEGL-07
**Success Criteria** (what must be TRUE):
  1. `pnpm -r build` passes cleanly across all workspace packages; CI is green on the first PR
  2. `npx drizzle-kit migrate` applies all schema migrations to a local Supabase instance with no errors; TimescaleDB hypertable and continuous aggregate DDL executes via raw SQL migration
  3. Catalog seed script loads all WDW parks, attractions, dining, shows, and resorts idempotently with no duplicate rows
  4. Brand direction is locked in `docs/design/BRAND.md`; design token build produces valid Swift constants, Compose theme, and CSS vars from a single `tokens.json`
  5. Every NestJS HTTP response includes the "unofficial fan app" disclaimer header; guest age is stored as bracket strings (not birthdates) in the schema; no guest age field exists in PostHog event schemas
**Plans**: TBD

### Phase 2: Data Pipeline
**Goal**: Wait-time ingestion is running in production and the 8-week accumulation clock has started. Live wait times are queryable from Redis; historical data is accumulating in the Timescale hypertable. The OpenAPI spec is stable enough for mobile clients to generate against.
**Depends on**: Phase 1
**Requirements**: DATA-01, DATA-02, DATA-03, DATA-04, DATA-05, DATA-06, DATA-07, DATA-08
**Success Criteria** (what must be TRUE):
  1. `wait:{ride_id}` Redis keys are refreshed every 5 minutes for all WDW attractions; a spot-check returns a value less than 2 minutes old
  2. The `wait_times_history` Timescale hypertable receives new rows every polling cycle; `wait_times_1h` continuous aggregate is populated and refreshes hourly without manual intervention
  3. Crowd index (`crowd_index:{date}` Redis key) updates hourly and returns a normalized 0–100 value
  4. A Sentry alert fires correctly when a simulated ingestion failure repeats twice in a row; ingestion-lag alert triggers at >30 minutes
  5. OpenWeather daily forecasts for Orlando are cached per trip date; cache misses trigger a live API call and the result is stored with a 6-hour TTL
**Plans**: 12 plans

Plans:
- [ ] 02-01-PLAN.md — Worker entry point (worker.ts), BullModule root config, Wave 0 test fixtures
- [ ] 02-02-PLAN.md — AlertingModule: SlackAlerterService + LagAlertService (DATA-06)
- [ ] 02-03-PLAN.md — OpenAPI v1 shape design: all DTOs, controller stubs, snapshot + CI gate
- [ ] 02-04-PLAN.md — queue-times.com ingestion worker: QueueTimesService + QueueTimesProcessor (DATA-01)
- [ ] 02-05-PLAN.md — themeparks.wiki ingestion worker: ThemeparksService + ThemeparksProcessor (DATA-02)
- [ ] 02-06-PLAN.md — pg_cron monitor worker: RollupProcessor verifies hourly refresh (DATA-03)
- [ ] 02-07-PLAN.md — Crowd index worker: bootstrap + percentile formulas, 5 Redis keys (DATA-04)
- [ ] 02-08-PLAN.md — OpenWeather on-demand cache-aside: WeatherService (DATA-08)
- [ ] 02-09-PLAN.md — Live ingestion read endpoints: /v1/parks/:id/waits, /v1/crowd-index, /v1/weather
- [ ] 02-10-PLAN.md — Final OpenAPI v1 snapshot freeze and CI gate verification
- [ ] 02-11-PLAN.md — Attribution content file + web footer wiring (DATA-05)
- [ ] 02-12-PLAN.md — Production deploy: Railway worker service + ingestion clock start (DATA-07)

### Phase 3: Engine
**Goal**: A real plan can be generated end-to-end: solver produces deterministic time-blocked days, Claude adds warm narrative, and the result persists to the database via an async BullMQ job. LLM cost telemetry is live from the first call. The solver passes all six fixture snapshot tests.
**Depends on**: Phase 2
**Requirements**: FC-01, FC-02, FC-03, FC-04, FC-05, SOLV-01, SOLV-02, SOLV-03, SOLV-04, SOLV-05, SOLV-06, SOLV-07, SOLV-08, SOLV-09, SOLV-10, SOLV-11, SOLV-12, SOLV-13, LLM-01, LLM-02, LLM-03, LLM-04, LLM-05, LLM-06, LLM-07, LLM-08, PLAN-01, PLAN-02, PLAN-03, PLAN-04, PLAN-05, PLAN-06
**Success Criteria** (what must be TRUE):
  1. `POST /trips/:id/generate-plan` returns `202` and the BullMQ job completes within 30 seconds; `GET /plans/:id` returns a fully structured `DayPlan[]` with narrative text on each item
  2. All six solver snapshot tests pass (single-day MK with toddler, 3-day all-parks family, adult thrill-day, mobility-constrained multi-day, ECV+DAS, 5-day Royal Treatment); same `SolverInput` produces byte-identical `DayPlan[]` on repeated runs
  3. Free-tier `GET /plans/:id` returns Day 1 fully detailed and Days 2+ as blurred summary cards; `POST /trips/:id/rethink-today` triggers Haiku and re-generates remaining items
  4. Every LLM call writes a row to `llm_costs`; a simulated cache miss drops the hit rate below 70% and triggers the Sentry alert; circuit breaker halts generation at $0.50 accumulated spend
  5. Forecast confidence label (`high` / `medium` / `low`) is present on every forecasted wait returned by `ForecastModule.predictWait()`; "Beta Forecast" framing is returned in the plan response metadata
**Plans**: 18 plans

Plans:
- [ ] 03-01-PLAN.md — Schema migrations + YAML schema additions + queue-times catalog ID fix (FC-02, SOLV-04, SOLV-10 support)
- [ ] 03-02-PLAN.md — @anthropic-ai/sdk install + mock harness + narrative fixtures + NarrativeModule scaffold (LLM-01)
- [ ] 03-03-PLAN.md — OpenAPI v1 snapshot amendment: FullDayPlan/LockedDayPlan union + warnings + RethinkRequest + PlanBudgetExhausted (PLAN-02)
- [ ] 03-04-PLAN.md — Solver types + SolverInput/DayPlan contract + deterministic hash + package-boundary test (SOLV-01)
- [ ] 03-05-PLAN.md — Walking graph preload + Floyd-Warshall + WalkingGraphLoader (SOLV-13)
- [ ] 03-06-PLAN.md — Solver filtering: height, mobility, sensory, dietary (SOLV-02)
- [ ] 03-07-PLAN.md — Scoring function + greedy construct + must-do pinning + meals + shows (SOLV-03, SOLV-05, SOLV-06)
- [ ] 03-08-PLAN.md — Adjacent-pair local search + ResourcePool + LL allocator + DAS + park-hours EE/EEH (SOLV-04, SOLV-08, SOLV-09)
- [ ] 03-09-PLAN.md — Budget tier rules + age-weighted fatigue rest blocks (SOLV-07, SOLV-10)
- [ ] 03-10-PLAN.md — solve() orchestration + 6 canonical fixture snapshots + 100-run determinism proof (SOLV-11, SOLV-12)
- [ ] 03-11-PLAN.md — ForecastModule bucketed median + baseline fallback + calendar rule engine + Beta Forecast framing (FC-01, FC-03, FC-04, FC-05)
- [ ] 03-12-PLAN.md — Narrative prompt + byte-stable CACHED_PREFIX + Zod schema + ride-ID contract (LLM-02, LLM-04)
- [ ] 03-13-PLAN.md — LLM cost telemetry + USD math + cache-hit-rate rolling alert (LLM-05, LLM-06)
- [ ] 03-14-PLAN.md — Pinned model IDs + circuit breaker + Sonnet→Haiku fallback + 3-sink telemetry + 402 contract (LLM-03, LLM-07)
- [ ] 03-15-PLAN.md — Rate limits: rethink daily cap + free-tier lifetime cap + Guard (LLM-08, PLAN-05)
- [ ] 03-16-PLAN.md — PlanGenerationProcessor + orchestrator + PersistPlanService + cache-hit short-circuit (PLAN-01, PLAN-03)
- [ ] 03-17-PLAN.md — trips.controller endpoints + plans.controller entitlement projection + e2e roundtrip (PLAN-04)
- [ ] 03-18-PLAN.md — Packing list generator + Amazon Associates affiliate tag injection (PLAN-06)

### Phase 4: Entitlements & Accounts
**Goal**: Users can create anonymous accounts, upgrade to Sign in with Apple or Google, purchase a trip unlock, receive refunds, delete their accounts with full data cascade, and restore purchases across devices — all correctly reflected in backend entitlement state.
**Depends on**: Phase 3
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07, IAP-01, IAP-02, IAP-03, IAP-04, IAP-05, IAP-06, IAP-07, LEGL-06
**Success Criteria** (what must be TRUE):
  1. A fresh app install creates an anonymous Supabase Auth session silently; the user can create a trip and receive a free Day 1 plan without entering any credentials
  2. Upgrading to Sign in with Apple or Google preserves the anonymous session's trips and state; the merged account is the single identity in `users`
  3. A RevenueCat `INITIAL_PURCHASE` webhook creates an `entitlement` row and flips `trips.entitlement_state = unlocked` within 5 seconds; a `REFUND` webhook revokes the specific trip's entitlement
  4. `DELETE /users/me` with confirmation removes all rows across `trips`, `guests`, `plans`, `plan_days`, `plan_items`, `entitlements`, `iap_events`, `push_tokens`, `llm_costs`, `affiliate_items` within 30 days; the endpoint requires authentication
  5. Affiliate packing-list items are rewritten server-side with the Amazon Associates tag; no client response contains the raw affiliate tag string
**Plans**: TBD

### Phase 5: iOS Core
**Goal**: A working iOS app can be installed on a real iPhone, takes a user through onboarding and the trip wizard, displays a plan view with real backend data, caches the full trip package for offline use, and meets WCAG 2.2 AA accessibility criteria — all before the paywall is connected.
**Depends on**: Phase 4 (entitlement endpoints), Phase 2 (stable OpenAPI spec)
**Requirements**: IOS-01, IOS-02, IOS-03, IOS-04, IOS-05, IOS-06, IOS-07, IOS-14, IOS-15, IOS-16, IOS-17, IOS-18
**Success Criteria** (what must be TRUE):
  1. App builds with `xcodebuild` in CI on every PR; Swift OpenAPI Generator regenerates the networking client from `packages/shared-openapi/openapi.json` at build time and the build is clean
  2. A tester can complete the full trip wizard (dates → guests with DAS flag → budget tier → must-do rides → review) and see a real Day 1 plan on their iPhone
  3. Airplane mode engaged after plan sync: all plan items, catalog subset, walking graph, and static maps are readable without network; no spinner or error state appears
  4. VoiceOver navigates all screens without getting stuck; Dynamic Type at `accessibility5` does not clip or truncate any critical text; reduced motion suppresses animations
  5. Sentry Cocoa is initialized before the first screen renders; PostHog tracks `plan_viewed` without including any guest age data in event properties
**Plans**: TBD

### Phase 6: iOS Paywall & Notifications
**Goal**: Users can purchase a trip unlock via the native StoreKit 2 paywall, restore purchases from Settings, see a countdown widget on their home screen, and receive push notifications for Lightning Lane booking windows — all working on real devices against the production RevenueCat environment.
**Depends on**: Phase 5
**Requirements**: IOS-08, IOS-09, IOS-10, IOS-11, IOS-12
**Success Criteria** (what must be TRUE):
  1. Tapping "Unlock Trip $9.99" on a blurred day presents the native StoreKit sheet; completing the sandbox purchase reveals all days within 5 seconds; the success animation plays
  2. "Restore Purchases" in Settings correctly re-links a prior purchase to the current account via RevenueCat `restorePurchases()`; previously unlocked trips become accessible
  3. The WidgetKit countdown widget appears in the iOS widget gallery in small and medium sizes; it displays the correct number of days until the next upcoming trip and updates daily
  4. Push notification permission is requested contextually (not on first launch); a test LL booking-window notification fires at the scheduled time and tapping it deep-links to the correct plan day
  5. The Settings screen shows the account email (or "Anonymous"), links to delete account with confirmation, displays the "unofficial fan app" disclaimer, and lists queue-times.com attribution
**Plans**: TBD

### Phase 7: Android
**Goal**: A feature-parity Android app is installable from an APK (pre-Play Store), covers every user flow that the iOS app covers, passes the iOS parity checklist, and launches within two weeks of iOS being submitted to the App Store.
**Depends on**: Phase 6 (iOS parity checklist authored)
**Requirements**: AND-01, AND-02, AND-03, AND-04, AND-05, AND-06, AND-07, AND-10, AND-11, AND-12, AND-13, AND-14, AND-15, AND-16
**Success Criteria** (what must be TRUE):
  1. Gradle build passes CI on every PR from day 1 of Phase 7; Ktor OpenAPI client is regenerated at build time from the same `openapi.json`; no manual networking code
  2. A tester on a Pixel 8 and a Samsung Galaxy S25 completes the full trip wizard, views a plan, and goes offline — all flows match the iOS parity checklist line-for-line
  3. Google Play Billing consumable purchase flow completes in the RevenueCat sandbox; `INITIAL_PURCHASE` webhook fires and the Android entitlement matches the iOS model
  4. Glance countdown widget appears in the Android widget picker; TalkBack navigates all interactive elements with audible labels; dark mode renders without color contrast failures
  5. Android CI runs on the first PR of the phase with lint, typecheck, unit tests, and build; no "add CI later" pattern
**Plans**: TBD

### Phase 8: Website & Legal
**Goal**: The marketing website is live on Vercel with all required pages, the admin panel is accessible behind auth, the IP lawyer is engaged (6-8 week lead time before Phase 10), the privacy policy covers GDPR + CCPA + COPPA children's data, and App Store metadata strategy is locked.
**Depends on**: Phase 7
**Requirements**: WEB-01, WEB-02, WEB-03, WEB-04, WEB-05, WEB-06, WEB-07, WEB-08, WEB-09, WEB-10, WEB-11, WEB-12, LEGL-04, LEGL-05
**Success Criteria** (what must be TRUE):
  1. Marketing pages (landing, how it works, pricing, FAQ, 3-5 SEO guides) are live on the production Vercel URL; Lighthouse scores ≥ 95 on performance, accessibility, best practices, and SEO
  2. The "unofficial fan app" disclaimer appears in the footer of every page; the privacy policy explicitly covers children's data handling (COPPA bracket storage), data retention, and deletion rights
  3. The admin panel at `/admin` requires Supabase Auth with `admin` role; an admin can view the LLM cost dashboard and trigger a plan regeneration without touching the database directly
  4. IP lawyer is formally engaged with a written engagement letter; App Store keyword strategy (no trademarked terms in the 100-character keyword field) is documented and reviewed by the lawyer
  5. `AND-16` parity launch gate is documented: Android submits within 2 weeks of iOS; review notes template for consumable IAP framing is drafted
**Plans**: TBD

### Phase 9: Live Activities & Push Polish
**Goal**: iOS Live Activity shows the current and next plan item during a park day; the Android ongoing notification mirrors this; the "Rethink my day" full flow (including an offline-degraded mode) is polished and working.
**Depends on**: Phase 8
**Requirements**: IOS-13, AND-08, AND-09
**Success Criteria** (what must be TRUE):
  1. During an active park day on iOS, the Dynamic Island and Lock Screen display the current plan item + next item + walking time; the Live Activity updates when the plan advances without a full app foreground
  2. On Android, the foreground service notification shows the current and next plan item during a park day; the notification is sticky and updates correctly when the plan advances
  3. FCM push notifications fire for LL booking windows and "walk to X now" events on Android at the scheduled times; the 3/day notification cap is enforced
  4. "Rethink my day" completes successfully when offline: it uses a cached solver snapshot and skips LLM narrative, returning a re-ordered remaining day with a "Narrative unavailable offline" notice
**Plans**: TBD

### Phase 10: Beta & Launch
**Goal**: Both apps are live in the App Store and Play Store, the IP lawyer has signed off on all legal surfaces, 8+ weeks of ingestion data exist, a closed beta with real families has achieved NPS ≥ 40 with zero P0 bugs, and the first 10 paying customers have been acquired.
**Depends on**: Phase 9; 8+ weeks of ingestion history (hard gate from Phase 2); IP lawyer sign-off (hard gate from Phase 8 engagement)
**Requirements**: LNCH-01, LNCH-02, LNCH-03, LNCH-04, LNCH-05, LNCH-06, LNCH-07, LNCH-08
**Success Criteria** (what must be TRUE):
  1. Both iOS and Android apps are live in their respective stores with first-submission approval (no rejection-and-resubmit cycle); App Store review notes include the consumable IAP framing as drafted in Phase 8
  2. IP lawyer has provided written sign-off on: WonderWaltz trademark posture, all in-app and website disclaimers, the privacy policy and ToS, and both store listings — this sign-off is on file before any submission
  3. The Timescale `wait_times_history` hypertable contains ≥ 8 weeks of uninterrupted data; ingestion uptime over the 30 days preceding launch is ≥ 99% (verified from Sentry ingestion health dashboard)
  4. Closed beta with ≥ 20 real WDW trip-planning families completes; NPS is ≥ 40; zero P0 bugs are open; crash-free sessions ≥ 99.5% on both platforms (Sentry release health)
  5. p95 LLM cost per generated plan is ≤ $0.20 (verified from `llm_costs` telemetry over ≥ 100 generated plans); the first 10 paying customers are acquired within 30 days of launch
**Plans**: TBD

## Progress

**Execution Order:** 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 0. Name Lock | 1/1 | Complete    | 2026-04-09 |
| 1. Foundation | 10/11 | In Progress|  |
| 2. Data Pipeline | 11/12 | In Progress|  |
| 3. Engine | 13/18 | In Progress|  |
| 4. Entitlements & Accounts | 0/TBD | Not started | - |
| 5. iOS Core | 0/TBD | Not started | - |
| 6. iOS Paywall & Notifications | 0/TBD | Not started | - |
| 7. Android | 0/TBD | Not started | - |
| 8. Website & Legal | 0/TBD | Not started | - |
| 9. Live Activities & Push Polish | 0/TBD | Not started | - |
| 10. Beta & Launch | 0/TBD | Not started | - |

---
*Roadmap created: 2026-04-09*
*Requirements coverage: 143/143 v1 REQ-IDs mapped (note: REQUIREMENTS.md header states 144; actual count from traceability table is 143)*
