# Requirements: WonderWaltz

**Defined:** 2026-04-09
**Core Value:** A first-time Walt Disney World visitor gets a plan that feels like a Disney expert made it for them.

## v1 Requirements

Requirements for initial release. Each maps to exactly one roadmap phase.

### Legal & Trademark

- [x] **LEGL-01**: Trademark clearance search on "WonderWaltz" (USPTO TESS + EUIPO eSearch) returns clear before any public commitment (domain, social, public repo, App Store listing)
- [x] **LEGL-02**: Every API response, web page, and mobile screen carries the "unofficial fan app" disclaimer: *"WonderWaltz is an independent, unofficial planning app. Not affiliated with, endorsed by, or sponsored by The Walt Disney Company."*
- [x] **LEGL-03**: No Disney trademarked imagery anywhere in the product (no logos, Mickey silhouettes, castle imagery, character art, ride photography) unless CC-licensed or user-provided
- [ ] **LEGL-04**: App Store and Play Store metadata strategy excludes trademarked terms ("Disney", "Magic Kingdom", "Epcot", "Hollywood Studios", "Animal Kingdom", "WDW") from the 100-character keyword field (Apple Guideline 2.3.7)
- [ ] **LEGL-05**: IP lawyer engaged by Phase 8 and reviews trademark posture, disclaimers, privacy policy, ToS, and store listings before v1 launch (hard gate)
- [ ] **LEGL-06**: User can delete their account; deletion cascade-removes all trips, guests, plans, entitlements, push tokens, and analytics data (GDPR + CCPA + COPPA deletion right)
- [x] **LEGL-07**: Guest age data is stored as age brackets (`0-2`, `3-6`, `7-9`, `10-13`, `14-17`, `18+`), not birthdates, to minimize COPPA scope; never included in PostHog event properties

### Foundations & Infrastructure

- [x] **FND-01**: Monorepo scaffolded with pnpm workspaces containing `apps/api`, `apps/web`, `apps/ios`, `apps/android`, `packages/shared-openapi`, `packages/design-tokens`, `packages/solver`, `packages/db`, `packages/content/wdw`
- [x] **FND-02**: Node 22 LTS pinned in `.nvmrc`, `.node-version`, Railway config, and `package.json#engines`
- [x] **FND-03**: TypeScript 6.0.2 configured across all TS packages with shared tsconfig
- [x] **FND-04**: GitHub Actions CI runs lint, typecheck, test, and build for every app on every PR; Android + iOS CI wired from day 1 (not deferred)
- [ ] **FND-05**: Supabase project provisioned with Postgres + Auth + Storage + TimescaleDB extension + PostGIS extension
- [x] **FND-06**: Railway project provisioned with two services from the same codebase: `api` (NestJS HTTP) and `worker` (BullMQ processors)
- [ ] **FND-07**: Upstash Redis instance provisioned for BullMQ + live wait cache
- [x] **FND-08**: Vercel project provisioned for `apps/web` with production + preview deploys
- [ ] **FND-09**: RevenueCat account provisioned with iOS + Android app configurations and webhook endpoint wired to backend
- [ ] **FND-10**: Sentry projects provisioned for NestJS, Next.js, iOS, Android with DSNs in environment config
- [ ] **FND-11**: PostHog project provisioned with event schema audit rule blocking any property containing guest age data
- [x] **FND-12**: Secrets managed via Railway + Vercel env vars; local via `.env.local`; no secrets in git

### Design System

- [x] **DSGN-01**: `ui-designer` agent produces three brand direction explorations (vintage travel poster / warm modern minimalism / painterly whimsy) with recommendation
- [x] **DSGN-02**: Brand direction locked before any UI is built; captured in `docs/design/BRAND.md` (voice, palette, type, motion, photography policy)
- [x] **DSGN-03**: Design tokens in `packages/design-tokens/tokens.json` as single source of truth
- [x] **DSGN-04**: Token build script generates Swift constants (for iOS), Compose theme (for Android), and Tailwind v4 + CSS vars (for web); parity enforced at build time
- [x] **DSGN-05**: Component catalog with states in `docs/design/COMPONENTS.md` (loading, empty, error, success, disabled)
- [x] **DSGN-06**: WCAG 2.2 AA accessibility rules documented in `docs/design/ACCESSIBILITY.md` (contrast, tap targets, focus not obscured, dragging alternatives, dynamic type, VoiceOver / TalkBack)
- [x] **DSGN-07**: Iconography from Phosphor or Lucide (permissively licensed, covers iOS + Android + web) documented in `docs/design/ICONOGRAPHY.md`
- [x] **DSGN-08**: `ui-ux-designer` agent reviews every user-facing UI PR with research-backed critique before merge (mandatory gate)

### Database Schema

- [x] **DB-01**: Drizzle schema for `users`, `trips`, `guests`, `trip_park_days`, `trip_preferences` with soft-delete where appropriate
- [x] **DB-02**: Drizzle schema for `parks`, `attractions` (with PostGIS `location_point`), `dining`, `shows`, `parades`, `fireworks`, `resorts`, `walking_graph`
- [x] **DB-03**: TimescaleDB hypertable `wait_times_history(ride_id, ts, minutes, is_open, source)` created via raw SQL migration (not Drizzle-emitted)
- [x] **DB-04**: Continuous aggregate `wait_times_1h` rolled up hourly via Timescale DDL
- [x] **DB-05**: Drizzle schema for `plans`, `plan_days`, `plan_items` with versioning and polymorphic `ref_id` into catalog
- [x] **DB-06**: Drizzle schema for `entitlements`, `iap_events`, `llm_costs`, `push_tokens`, `affiliate_items`, `packing_list_items`
- [x] **DB-07**: Seed script idempotently loads WDW catalog (parks, attractions, dining, shows, resorts, walking_graph) from versioned YAML/JSON in `packages/content/wdw/`
- [x] **DB-08**: Row-level security (RLS) policies on `trips`, `guests`, `plans`, `plan_days`, `plan_items` limit reads/writes to the owning `user_id`; admin bypass via service role key only

### Data Ingestion

- [x] **DATA-01**: BullMQ worker `fetch_queue_times` pulls queue-times.com every 5 minutes for all WDW parks and writes to Redis (live cache, 2-minute TTL) + TimescaleDB (history)
- [x] **DATA-02**: BullMQ worker `fetch_themeparks_wiki_hours` pulls park hours + scheduled entertainment every 6 hours as secondary source and failover
- [x] **DATA-03**: BullMQ worker `rollup_wait_history` triggers TimescaleDB continuous aggregate refresh hourly
- [x] **DATA-04**: BullMQ worker `refresh_crowd_index` computes global crowd index (normalized average across top-20 rides) hourly and writes to Redis
- [x] **DATA-05**: queue-times.com attribution displayed in app "About" screen and website footer
- [x] **DATA-06**: Sentry alert fires when any ingestion job fails twice in a row or when wait-time lag exceeds 30 minutes
- [x] **DATA-07**: Ingestion begins running in production from the first day Phase 2 completes; 8+ weeks of accumulated history is a hard gate before public beta
- [x] **DATA-08**: OpenWeather integration fetches daily forecast for Orlando, FL for all dates in every active trip; caches by date in Redis with 6-hour TTL

### Wait-Time Forecast

- [x] **FC-01**: `ForecastModule.predictWait(ride_id, target_ts)` returns `{ minutes, confidence }` derived from bucketed median of `wait_times_history` grouped by `(ride_id, dow, hour_of_day, crowd_level_bucket)`
- [x] **FC-02**: Crowd level bucket is derived from rolling calendar heuristic (weekends, federal holidays, school holidays, marathon weekends, festival weeks) with admin-editable static override table
- [x] **FC-03**: Forecast confidence label is `high` (8+ weeks of buckets with >50 samples), `medium` (4-8 weeks), `low` (<4 weeks); always returned and always surfaced in UI
- [x] **FC-04**: Forecast accuracy unit tests cover fixture history and canonical ride/day combinations
- [x] **FC-05**: UI displays "Beta Forecast" framing on every forecasted wait before public beta is 8+ weeks old

### Scheduling Engine (Solver)

- [x] **SOLV-01**: Pure TypeScript package `packages/solver` with `solve(SolverInput): DayPlan[]` signature; zero NestJS dependencies, zero I/O side effects
- [x] **SOLV-02**: Solver filters attractions per guest constraints: height requirement vs minimum guest height, mobility vs walking budget, sensory tolerance vs tag tolerance, dietary restrictions for dining candidates
- [x] **SOLV-03**: Solver greedy + local-search schedules rides using priority function `score = enjoyment_weight / (time_cost + wait_cost + walk_cost)` with must-do pinning as hard constraints
- [x] **SOLV-04**: Solver allocates Lightning Lane Multi Pass bookings (up to ~3/day default) and Lightning Lane Single Pass (0-2/day scaled to budget tier)
- [x] **SOLV-05**: Solver schedules meals: table-service as hard constraints if user supplied them, quick-service in rides-free windows tagged for mobile order
- [x] **SOLV-06**: Solver pins preferred parades, fireworks, and shows as optional blocks with scoring
- [ ] **SOLV-07**: Solver encodes **child fatigue model**: toddlers (0-2 bracket) peak fatigue 12:30-14:00, young kids (3-6) peak 13:00-15:00; rest/resort-return blocks inserted proportionally to age distribution and budget tier
- [x] **SOLV-08**: Solver encodes **DAS constraint**: when `trip.das_flag === true`, DAS return windows are modeled as LL-equivalent resource (same per-day budget math) with narrative explaining DAS application via Disney's video chat
- [x] **SOLV-09**: Solver encodes **on-property advantages**: Early Entry (+30 min) for any on-property hotel; Extended Evening Hours on eligible nights for Deluxe / Deluxe Villa
- [x] **SOLV-10**: Solver encodes **budget tier rules**: Pixie Dust = 0 LL + 1 rest/3hr + value dining; Fairy Tale = LLMP + 0-1 LLSP + 1 rest/2hr + moderate dining; Royal Treatment = LLMP + up to 2 LLSP + resort mid-day break + signature dining
- [ ] **SOLV-11**: Solver output is deterministic: same `SolverInput` produces identical `DayPlan[]`; `solver_input_hash` used to cache results
- [ ] **SOLV-12**: Solver snapshot test suite covers six fixture trips: single-day MK with toddler, 3-day all-parks family, adult thrill-day, mobility-constrained multi-day, ECV guest with DAS flag, 5-day Royal Treatment trip
- [x] **SOLV-13**: Solver walking graph preloaded from Postgres + PostGIS into process memory at worker startup (not queried per job)

### LLM Narrative Layer

- [x] **LLM-01**: `NarrativeModule` sends the solver's structured output + compact trip context to Claude; Claude produces per-day intro + per-item tips + budget hacks + rain/crowd contingency notes + packing-list delta
- [x] **LLM-02**: Anthropic prompt caching is used with the static catalog context before the cache boundary, dynamic trip context after; cache header set correctly
- [ ] **LLM-03**: Claude Sonnet (pinned model ID) runs initial generation; Claude Haiku (pinned model ID) runs "Rethink my day" and free-tier teaser narration
- [x] **LLM-04**: Structured output parsing validates LLM output against a Zod schema; narrative never references a ride not in the solver output (contract test)
- [x] **LLM-05**: `llm_costs` table records every LLM call with `trip_id`, `plan_id`, `model`, `input_tok`, `cached_read_tok`, `output_tok`, `usd_cents`, `created_at`
- [x] **LLM-06**: Sentry alert fires when cache hit rate (`cached_read_tok / input_tok`) drops below 70% over a 1-hour window
- [ ] **LLM-07**: Per-trip LLM cost circuit breaker halts generation at $0.50 accumulated spend and logs incident
- [ ] **LLM-08**: Per-user daily rethink cap: 15/day for unlocked trips, 5/day for free-tier teaser

### Plan Generation API

- [ ] **PLAN-01**: `POST /trips/:id/generate-plan` enqueues a BullMQ job and returns `202` with `{ plan_job_id }`; plan generation is never synchronous
- [x] **PLAN-02**: `GET /plans/:id` returns plan with entitlement projection: free tier sees Day 1 items + blurred summary cards for Days 2+; unlocked tier sees all days
- [ ] **PLAN-03**: Plan generation job: load trip → hydrate solver input (catalog, walking graph, forecasts, weather) → run solver → run NarrativeModule → persist `plans` + `plan_days` + `plan_items` + `llm_costs` → update `trips.plan_status`
- [ ] **PLAN-04**: Plan generation supports on-demand re-optimization: `POST /trips/:id/rethink-today` takes `{ current_time, completed_item_ids }` and regenerates the remaining day with Haiku
- [ ] **PLAN-05**: Free-tier plan generation is rate-limited per device: 3 free plans/lifetime per anonymous user; enforced in middleware
- [ ] **PLAN-06**: Packing list is generated per plan: solver + weather + temperature + guest ages drive item selection; items rewritten with Amazon Associates affiliate tag at read time

### Authentication & Accounts

- [ ] **AUTH-01**: User can create an anonymous device-linked account via Supabase Auth without any input (silent onboarding)
- [ ] **AUTH-02**: User can create a trip, configure guests and preferences, and view the free Day 1 teaser without signing up
- [ ] **AUTH-03**: User can upgrade anonymous account to Sign in with Apple or Sign in with Google; upgrade merges the anon account preserving all trips and state
- [ ] **AUTH-04**: Upgrade to a real account is required before IAP purchase (enforced client-side at paywall, server-side on purchase validation)
- [ ] **AUTH-05**: User can log out and back in on the same device preserving their trips
- [ ] **AUTH-06**: User can sign in on a new device and restore their trips (read-only until device-level entitlement re-validated via RevenueCat)
- [ ] **AUTH-07**: User can delete their account from Settings; confirmation required; deletion is hard and cascade-removes all data within 30 days (LEGL-06)

### Monetization & Entitlements

- [ ] **IAP-01**: Single consumable IAP product `trip_unlock` at $9.99 configured in App Store Connect and Google Play Console
- [ ] **IAP-02**: iOS uses StoreKit 2 via RevenueCat Purchases SDK; Android uses Google Play Billing via RevenueCat Purchases SDK
- [ ] **IAP-03**: Purchase flow: user taps "Unlock Trip" → native paywall → transaction committed → RevenueCat receipt validated → webhook to backend → `entitlement` row created → `trips.entitlement_state = unlocked` → UI refreshes
- [ ] **IAP-04**: RevenueCat webhook handles `INITIAL_PURCHASE`, `REFUND`, `CANCELLATION`, `EXPIRATION`, `NON_RENEWING_PURCHASE`; refund revokes entitlement on the specific trip
- [ ] **IAP-05**: User can restore purchases from Settings; RevenueCat SDK `restorePurchases()` is the canonical path; backend entitlements are the source of truth
- [ ] **IAP-06**: App Store review notes explicitly explain the consumable model: "each $9.99 unlock applies to one trip; once applied, the credit is consumed and cannot be reused" (Phase 10 submission asset)
- [ ] **IAP-07**: Affiliate links (Amazon Associates) in packing list are rewritten server-side with the affiliate tag at read time; no client knowledge of the tag

### iOS App (Phase 5 + Phase 6 + Phase 9)

- [ ] **IOS-01**: Xcode project for `apps/ios` targets iOS 17.0 minimum, Swift 6, SwiftUI, Swift Concurrency, Observation framework
- [ ] **IOS-02**: `WWCore` module with Swift OpenAPI Generator 1.11.1 client generated from `packages/shared-openapi/openapi.json` at build time
- [ ] **IOS-03**: `WWDesignSystem` module consuming `packages/design-tokens` generated Swift constants
- [ ] **IOS-04**: `WWOffline` module with SwiftData persistence and background sync coordinator (fallback to GRDB if SwiftData is unstable on iOS 18.x real devices)
- [ ] **IOS-05**: Onboarding flow explains the value prop, requests notification permission contextually (not on first launch)
- [ ] **IOS-06**: Trip wizard: dates → park selection + hopper → guests (with DAS flag, mobility, sensory, diet) → budget tier → lodging + transport → must-do rides → meal preferences → review
- [ ] **IOS-07**: Plan view: day tabs → timeline → item cards (attraction, meal, show, LL book reminder, rest, walk) → item detail → "Rethink my day" button
- [ ] **IOS-08**: Paywall view: locked Days 2+ shown as blurred cards with "Unlock Trip $9.99" CTA → native StoreKit sheet → success animation → unlocked days reveal
- [ ] **IOS-09**: Packing list view: categorized items with affiliate links opening in SafariView; affiliate disclosure visible
- [ ] **IOS-10**: Settings view: account, trip archive, notifications, restore purchases, delete account, about (with disclaimer + data source attribution)
- [ ] **IOS-11**: WidgetKit countdown widget: "X days until your Disney trip" + trip name; small + medium sizes
- [ ] **IOS-12**: Push notifications for LL booking windows (7am on-property / 7am-3days-out off-property) and "walk to X now" schedule events; capped at 3/day default
- [ ] **IOS-13**: Live Activity for "next up" during a park day: shows current + next scheduled item with walking time
- [ ] **IOS-14**: Sentry Cocoa 9.8.0 SDK integrated with release health
- [ ] **IOS-15**: PostHog iOS SDK integrated with event schema that excludes any guest age data
- [ ] **IOS-16**: All strings externalized via `String Catalogs` (`.xcstrings`) for future i18n; English at launch
- [ ] **IOS-17**: Dynamic Type up to `accessibility5`, VoiceOver labels, reduce motion, reduce transparency respected
- [ ] **IOS-18**: Offline mode: trip + plan + catalog subset + walking graph + static maps persisted; full read-only access with no signal; sync when online

### Android App (Phase 7)

- [ ] **AND-01**: Gradle project for `apps/android` targets min SDK 26 (Android 8.0), Kotlin K2 2.3.20, Jetpack Compose BOM 2026.03.00, single-activity + Navigation Compose, Hilt DI
- [ ] **AND-02**: Ktor 3.4.0 client generated via OpenAPI Generator Kotlin 7.18.0 from `packages/shared-openapi/openapi.json` at build time
- [ ] **AND-03**: `designsystem` module consuming `packages/design-tokens` generated Compose theme
- [ ] **AND-04**: `offline` module using Room 2.8.4 (not 3.0-alpha) with WorkManager background sync and booking-window alarms
- [ ] **AND-05**: Feature parity with iOS v1: onboarding, trip wizard (with DAS flag), plan view, paywall, packing list, settings — all screens mirrored
- [ ] **AND-06**: Paywall uses Google Play Billing via RevenueCat Purchases SDK 9.23.1
- [ ] **AND-07**: Glance countdown widget mirrors iOS WidgetKit countdown
- [ ] **AND-08**: FCM push notifications for LL booking windows and "walk to X now" events; same 3/day cap
- [ ] **AND-09**: Ongoing foreground notification for "next up" during a park day (Android equivalent of Live Activity)
- [ ] **AND-10**: Sentry Android 8.38.0 SDK integrated
- [ ] **AND-11**: PostHog Android SDK integrated with the same event schema exclusions
- [ ] **AND-12**: All strings externalized via `strings.xml`; English at launch
- [ ] **AND-13**: TalkBack labels on every interactive element; `contentDescription` set; dark mode supported
- [ ] **AND-14**: Offline mode: same trip package caching as iOS
- [ ] **AND-15**: Android CI runs on every PR from day 1 of Phase 7 (no "added later" pattern)
- [ ] **AND-16**: Launch within 2 weeks of iOS to avoid "Android afterthought" perception (parity launch gate)

### Marketing Website + Admin (Phase 8)

- [ ] **WEB-01**: Next.js 16 App Router project in `apps/web` with Tailwind v4 + shadcn/ui (v4 CLI) consuming `packages/design-tokens` generated CSS vars
- [ ] **WEB-02**: Landing page: hero, core value proposition, how it works, sample plan preview, pricing, CTA to App Store + Play Store
- [ ] **WEB-03**: How It Works page: visual walkthrough of trip wizard → plan view → execution
- [ ] **WEB-04**: Pricing page: explicit per-trip $9.99 model, what's included, free teaser explained
- [ ] **WEB-05**: FAQ page: ticket buying guide, DAS explanation, LL Multi Pass vs Single Pass, refund policy, accessibility
- [ ] **WEB-06**: 3-5 SEO park guides (one per WDW park + one "first timer" guide) with human-reviewed content
- [ ] **WEB-07**: Privacy policy covering GDPR + CCPA + COPPA, children's data handling, data retention, deletion rights
- [ ] **WEB-08**: Terms of service covering the unofficial fan app posture, data sources, IAP model, disclaimer
- [ ] **WEB-09**: "Not affiliated with The Walt Disney Company" disclaimer on every page footer
- [ ] **WEB-10**: Admin panel gated route behind Supabase Auth with `admin` role: catalog CRUD, crowd index override editor, trip lookup, entitlement grant (promo code), plan regeneration, LLM cost dashboard, ingestion health dashboard
- [ ] **WEB-11**: Sentry Next.js SDK + PostHog JS integrated with same event schema exclusions
- [ ] **WEB-12**: Lighthouse score ≥ 95 on marketing pages (performance, accessibility, best practices, SEO)

### Success Criteria — v1 Launch

- [ ] **LNCH-01**: Both iOS and Android apps live in their respective stores with review passed on first submission
- [ ] **LNCH-02**: First 10 paying customers acquired through organic + store discoverability within the first 30 days
- [ ] **LNCH-03**: Crash-free sessions ≥ 99.5% on both iOS and Android (Sentry release health)
- [ ] **LNCH-04**: Ingestion uptime ≥ 99% over the 30 days preceding launch
- [ ] **LNCH-05**: LLM cost per generated plan p95 ≤ $0.20 (from `llm_costs` telemetry)
- [ ] **LNCH-06**: IP lawyer sign-off on trademark posture, disclaimers, privacy policy, ToS, and store listings (LEGL-05, hard gate)
- [ ] **LNCH-07**: 8+ weeks of accumulated wait-time history on the Timescale hypertable before public beta opens (DATA-07, hard gate)
- [ ] **LNCH-08**: Closed beta with ≥20 real WDW trip-planning families completes with NPS ≥ 40 and zero P0 bugs outstanding

## v2 Requirements

Deferred to post-v1 releases. Tracked but not in current roadmap.

### Expansion

- **EXP-01**: Disneyland Anaheim catalog + data ingestion + park guides
- **EXP-02**: Disneyland Paris catalog + data ingestion + "Premier Access" (Paris's LL equivalent) + EUR pricing + French localization
- **EXP-03**: Spanish + Portuguese i18n across iOS + Android + web

### Features

- **FEAT-01**: Dining reservation watchlist with push alerts when a slot opens (requires Disney public dining endpoint research + IP lawyer sign-off on polling posture)
- **FEAT-02**: Shareable read-only web trip view URL for travel companions
- **FEAT-03**: Home Screen / Lock Screen "next item" widget (iOS WidgetKit + Android Glance)
- **FEAT-04**: Apple Watch + Wear OS companion with complication showing next item
- **FEAT-05**: Crowd calendar public web page (SEO magnet) + in-app deep dive
- **FEAT-06**: Saver Planner — in-app goal tracker for trip budget with progress visualization (no real money movement; pairs with budget tiers)
- **FEAT-07**: Automatic live rerouting with push-driven updates (behind feature flag; monitors plan vs reality and pushes updates)
- **FEAT-08**: ML-based wait-time forecast (gradient boosting or small transformer) trained on accumulated history
- **FEAT-09**: Own park-data scraper as kill-switch fallback (legal + ToS review required before enabling)
- **FEAT-10**: Rider Switch planner UI
- **FEAT-11**: Full trip cost estimator (tickets + lodging + dining + LL + transport) with side-by-side budget tier comparison
- **FEAT-12**: Pre-trip planning milestone notifications (180 days, 60 days, 30 days before trip)
- **FEAT-13**: Deep-link integration with Disney's My Disney Experience app for dining and LL booking (external link, no credential storage)

## Out of Scope

Explicit non-goals. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| In-app booking of Lightning Lanes, dining, park tickets, hotels | Legal simplicity and trust. We recommend and deep-link; we never process payments for Disney services |
| Storage of Disney account credentials or My Disney Experience integration with user auth | Privacy and trust non-negotiable. We never ask for Disney passwords, never scrape their MDE account |
| Real money movement (bank transfers, held funds, gift card custody) in any savings feature | Money transmitter licensing (FinCEN + state MSBs + bank partner) is not viable for a solo founder |
| Ad-supported free tier | Monetization is purchase + affiliate only. No banners, no interstitials, no sponsored itineraries |
| Crowdsourced user-generated plans marketplace or social feed | Not a social platform; stays focused on personal trip planning |
| Character meet-and-greet tracking, autograph book, or PhotoPass / Memory Maker integration | Scope creep risk; fan communities already handle this well |
| AI chatbot or open-ended Q&A | Unpredictable cost and hallucination risk; the LLM narrative layer produces bounded output only |
| Crowdsourced wait times | queue-times.com handles this better than we ever could |
| Child accounts | Guest profiles are attributes on the trip owner's adult account; no child accounts reduces COPPA surface area |

## Traceability

Populated during roadmap creation by `gsd-roadmapper`. Every v1 REQ-ID maps to exactly one phase.

| Requirement | Phase | Status |
|-------------|-------|--------|
| LEGL-01 | Phase 0 | Complete |
| LEGL-02 | Phase 1 | Complete |
| LEGL-03 | Phase 1 | Complete |
| LEGL-04 | Phase 8 | Pending |
| LEGL-05 | Phase 8 | Pending |
| LEGL-06 | Phase 4 | Pending |
| LEGL-07 | Phase 1 | Complete |
| FND-01 | Phase 1 | Complete |
| FND-02 | Phase 1 | Complete |
| FND-03 | Phase 1 | Complete |
| FND-04 | Phase 1 | Complete |
| FND-05 | Phase 1 | Pending |
| FND-06 | Phase 1 | Complete |
| FND-07 | Phase 1 | Pending |
| FND-08 | Phase 1 | Complete |
| FND-09 | Phase 1 | Pending |
| FND-10 | Phase 1 | Pending |
| FND-11 | Phase 1 | Pending |
| FND-12 | Phase 1 | Complete |
| DSGN-01 | Phase 1 | Complete |
| DSGN-02 | Phase 1 | Complete |
| DSGN-03 | Phase 1 | Complete |
| DSGN-04 | Phase 1 | Complete |
| DSGN-05 | Phase 1 | Complete |
| DSGN-06 | Phase 1 | Complete |
| DSGN-07 | Phase 1 | Complete |
| DSGN-08 | Phase 1 | Complete |
| DB-01 | Phase 1 | Complete |
| DB-02 | Phase 1 | Complete |
| DB-03 | Phase 1 | Complete |
| DB-04 | Phase 1 | Complete |
| DB-05 | Phase 1 | Complete |
| DB-06 | Phase 1 | Complete |
| DB-07 | Phase 1 | Complete |
| DB-08 | Phase 1 | Complete |
| DATA-01 | Phase 2 | Complete |
| DATA-02 | Phase 2 | Complete |
| DATA-03 | Phase 2 | Complete |
| DATA-04 | Phase 2 | Complete |
| DATA-05 | Phase 2 | Complete |
| DATA-06 | Phase 2 | Complete |
| DATA-07 | Phase 2 | Complete |
| DATA-08 | Phase 2 | Complete |
| FC-01 | Phase 3 | Complete |
| FC-02 | Phase 3 | Complete |
| FC-03 | Phase 3 | Complete |
| FC-04 | Phase 3 | Complete |
| FC-05 | Phase 3 | Complete |
| SOLV-01 | Phase 3 | Complete |
| SOLV-02 | Phase 3 | Complete |
| SOLV-03 | Phase 3 | Complete |
| SOLV-04 | Phase 3 | Complete |
| SOLV-05 | Phase 3 | Complete |
| SOLV-06 | Phase 3 | Complete |
| SOLV-07 | Phase 3 | Pending |
| SOLV-08 | Phase 3 | Complete |
| SOLV-09 | Phase 3 | Complete |
| SOLV-10 | Phase 3 | Complete |
| SOLV-11 | Phase 3 | Pending |
| SOLV-12 | Phase 3 | Pending |
| SOLV-13 | Phase 3 | Complete |
| LLM-01 | Phase 3 | Complete |
| LLM-02 | Phase 3 | Complete |
| LLM-03 | Phase 3 | Pending |
| LLM-04 | Phase 3 | Complete |
| LLM-05 | Phase 3 | Complete |
| LLM-06 | Phase 3 | Complete |
| LLM-07 | Phase 3 | Pending |
| LLM-08 | Phase 3 | Pending |
| PLAN-01 | Phase 3 | Pending |
| PLAN-02 | Phase 3 | Complete |
| PLAN-03 | Phase 3 | Pending |
| PLAN-04 | Phase 3 | Pending |
| PLAN-05 | Phase 3 | Pending |
| PLAN-06 | Phase 3 | Pending |
| AUTH-01 | Phase 4 | Pending |
| AUTH-02 | Phase 4 | Pending |
| AUTH-03 | Phase 4 | Pending |
| AUTH-04 | Phase 4 | Pending |
| AUTH-05 | Phase 4 | Pending |
| AUTH-06 | Phase 4 | Pending |
| AUTH-07 | Phase 4 | Pending |
| IAP-01 | Phase 4 | Pending |
| IAP-02 | Phase 4 | Pending |
| IAP-03 | Phase 4 | Pending |
| IAP-04 | Phase 4 | Pending |
| IAP-05 | Phase 4 | Pending |
| IAP-06 | Phase 4 | Pending |
| IAP-07 | Phase 4 | Pending |
| IOS-01 | Phase 5 | Pending |
| IOS-02 | Phase 5 | Pending |
| IOS-03 | Phase 5 | Pending |
| IOS-04 | Phase 5 | Pending |
| IOS-05 | Phase 5 | Pending |
| IOS-06 | Phase 5 | Pending |
| IOS-07 | Phase 5 | Pending |
| IOS-08 | Phase 6 | Pending |
| IOS-09 | Phase 6 | Pending |
| IOS-10 | Phase 6 | Pending |
| IOS-11 | Phase 6 | Pending |
| IOS-12 | Phase 6 | Pending |
| IOS-13 | Phase 9 | Pending |
| IOS-14 | Phase 5 | Pending |
| IOS-15 | Phase 5 | Pending |
| IOS-16 | Phase 5 | Pending |
| IOS-17 | Phase 5 | Pending |
| IOS-18 | Phase 5 | Pending |
| AND-01 | Phase 7 | Pending |
| AND-02 | Phase 7 | Pending |
| AND-03 | Phase 7 | Pending |
| AND-04 | Phase 7 | Pending |
| AND-05 | Phase 7 | Pending |
| AND-06 | Phase 7 | Pending |
| AND-07 | Phase 7 | Pending |
| AND-08 | Phase 9 | Pending |
| AND-09 | Phase 9 | Pending |
| AND-10 | Phase 7 | Pending |
| AND-11 | Phase 7 | Pending |
| AND-12 | Phase 7 | Pending |
| AND-13 | Phase 7 | Pending |
| AND-14 | Phase 7 | Pending |
| AND-15 | Phase 7 | Pending |
| AND-16 | Phase 7 | Pending |
| WEB-01 | Phase 8 | Pending |
| WEB-02 | Phase 8 | Pending |
| WEB-03 | Phase 8 | Pending |
| WEB-04 | Phase 8 | Pending |
| WEB-05 | Phase 8 | Pending |
| WEB-06 | Phase 8 | Pending |
| WEB-07 | Phase 8 | Pending |
| WEB-08 | Phase 8 | Pending |
| WEB-09 | Phase 8 | Pending |
| WEB-10 | Phase 8 | Pending |
| WEB-11 | Phase 8 | Pending |
| WEB-12 | Phase 8 | Pending |
| LNCH-01 | Phase 10 | Pending |
| LNCH-02 | Phase 10 | Pending |
| LNCH-03 | Phase 10 | Pending |
| LNCH-04 | Phase 10 | Pending |
| LNCH-05 | Phase 10 | Pending |
| LNCH-06 | Phase 10 | Pending |
| LNCH-07 | Phase 10 | Pending |
| LNCH-08 | Phase 10 | Pending |

**Coverage:**
- v1 requirements: 143 total (REQUIREMENTS.md header states 144; traceability table count is 143 — no REQ-ID is missing or double-mapped)
- Mapped to phases: 143
- Unmapped: 0

**Phase distribution:**
- Phase 0: 1 (LEGL-01)
- Phase 1: 31 (FND-01–12, DSGN-01–08, DB-01–08, LEGL-02, LEGL-03, LEGL-07)
- Phase 2: 8 (DATA-01–08)
- Phase 3: 32 (FC-01–05, SOLV-01–13, LLM-01–08, PLAN-01–06)
- Phase 4: 15 (AUTH-01–07, IAP-01–07, LEGL-06)
- Phase 5: 12 (IOS-01–07, IOS-14–18)
- Phase 6: 5 (IOS-08–12)
- Phase 7: 14 (AND-01–07, AND-10–16)
- Phase 8: 14 (WEB-01–12, LEGL-04, LEGL-05)
- Phase 9: 3 (IOS-13, AND-08, AND-09)
- Phase 10: 8 (LNCH-01–08)

---
*Requirements defined: 2026-04-09*
*Last updated: 2026-04-09 — traceability populated by gsd-roadmapper*
