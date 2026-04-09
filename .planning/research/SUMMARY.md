# Research Summary — WonderWaltz

**Project:** WonderWaltz — Multi-platform Disney World trip planner
**Domain:** Consumer mobile app with AI itinerary generation, real-time data, offline-first, per-trip IAP
**Researched:** 2026-04-09
**Confidence:** HIGH (stack verified against live sources; architecture grounded in authoritative plan; pitfalls drawn from primary legal/platform/community sources)

---

## Executive Summary

WonderWaltz is a native iOS + Android app (backed by a NestJS API and a Next.js marketing site) that generates personalized, time-blocked Walt Disney World itineraries. The core value engine is a two-stage pipeline: a deterministic solver produces a time-blocked schedule from live and forecast wait-time data, then Claude adds warm narrative, per-item tips, and budget hacks on top of the solver's structured output. This architecture is the product's primary differentiator — every AI-only competitor hallucinates ride names; every data-driven competitor is cold and clinical. Keeping the solver and the narrative layer strictly separated is both an architectural constraint and the business moat.

The recommended approach is: build the data pipeline and solver before any mobile UI, keep platform work strictly sequential (iOS before Android), and use OpenAPI spec generation as the contract that enforces mobile parity at compile time. Plan generation must be async (BullMQ job) from Phase 3 onward — running it inline on an HTTP request is not viable given Claude API latency. The monorepo structure with a pure TypeScript solver package (`packages/solver`) and a shared Drizzle schema (`packages/db`) lets a solo builder with AI coding agents work across the stack without context-switching overheads.

The dominant risks are: (1) Disney IP enforcement, which is existential and must be addressed before any public exposure — trademark search and IP lawyer review are not optional; (2) LLM cost blowout driven by prompt cache invalidation or context growth — the `llm_costs` table and cache-hit monitoring must be live from Phase 3; (3) wait-time forecast cold start — data ingestion must start immediately in Phase 2 and must accumulate 8+ weeks before public beta; and (4) COPPA compliance, now in force (effective April 22, 2026), which directly affects how child ages are stored, analyzed, and deleted. The project plan is sound; these risks are manageable with the mitigations in PITFALLS.md, but each requires deliberate phase allocation, not bolted-on fixes.

---

## Deltas vs. the Approved Plan

These are specific points where the approved plan differs from what research found. The roadmapper must incorporate these into every affected phase.

| Delta | Original Plan | Research Finding | Action |
|-------|--------------|-----------------|--------|
| Node version | Node 20 | Node 20 EOL is April 30, 2026 — the same month this project starts. Node 22 LTS (active until April 2027) must be used from day 1. | Replace every reference to Node 20 with Node 22 |
| TypeScript version | TypeScript 5.x (implied) | TypeScript 6.0.2 is current stable. Stepping-stone to 7.0; not a major breaking change. Safe for greenfield. | Target TS 6.0.2 in all packages |
| Zod | Zod v3 | Zod 4.3.6 is current stable. Faster, slimmer, type-infers DTOs. Use with `nestjs-zod` instead of `class-validator`. `class-validator` is functionally abandoned (2+ years no updates, prototype pollution CVE in `class-transformer`). | Drop `class-validator`; use Zod 4 + nestjs-zod throughout |
| Tailwind CSS | v3 (implied) | Tailwind v4.2.0 is current; v3 is EOL. v4 uses CSS-native config (`@import "tailwindcss"` + `@theme`); no `tailwind.config.js`; shadcn/ui CLI v4 generates v4-compatible components. | Use Tailwind v4 from Phase 1 web setup; no `tailwind.config.js` |
| Plan generation | Synchronous implied | Plan generation must be async (BullMQ job) from day 1. Claude Sonnet narration + solver runs 1.5–3s minimum; inline HTTP will timeout under normal load. Mobile polls `GET /trips/:id/plan-status` or receives a silent push when ready. | Async BullMQ job pattern in Phase 3; mobile polling/push in Phase 5 |
| COPPA scope | Not explicitly phased | COPPA 2.0 compliance deadline was April 22, 2026. Guest profiles include children's ages — this triggers COPPA regardless of whether the account is adult-held. Must store age brackets (not birthdates), exclude child data from PostHog, and cascade-delete on account deletion. | Phase 1 (data model), Phase 4 (deletion API), Phase 8 (privacy policy) |
| Push token table | Not named explicitly | A `push_tokens` table (or `users.push_token` field) is required to store APNs device tokens (iOS) and FCM registration tokens (Android). Token management must be wired in by the time notifications are built. Tokens rotate and must be refreshed on re-registration. | Add to Phase 2 DB schema; NotificationModule manages token lifecycle |
| Free-tier LLM cost exposure | Target ≤$0.20 p95 stated | Research confirms this is achievable but fragile. A single dynamic token before the static system prompt drops cache hit rate from ~98% to ~4%, spiking per-plan cost from $0.02 to $0.35. The `llm_costs` table and `cache_read_input_tokens` monitoring must be live from the first LLM call in Phase 3, not from launch. Per-user daily rethink cap (15/day paid, 5/day free) must be enforced. | Phase 3: cost telemetry on day 1; circuit breaker at $0.50/trip |
| IP lawyer timing | Hard gate at Phase 10 | Trademark search should happen before Phase 1 so the name is locked before any public commit (domain, social, assets). IP lawyer review remains a Phase 10 hard gate, but 6–8 week lead time means engagement must start at Phase 8, not Phase 10. | Phase 0: USPTO/EUIPO trademark search on "WonderWaltz". Phase 8: engage lawyer. Phase 10: sign-off gate. |
| DAS flag | Not in trip wizard | Research flags DAS as a MEDIUM-cost, HIGH-trust differentiator. No competitor handles DAS in plan generation. DAS return windows can be modeled like LLMP bookings in the solver. A guest-level `das_eligible` boolean in the trip wizard is low marginal cost. | Add DAS flag to trip wizard data model in Phase 2; solver constraint encoding in Phase 3 |
| Countdown widget | Contradictory (v1.1 in one note) | PROJECT.md and FEATURES.md both flag countdown widget as v1 (low engineering cost, great App Store screenshot, drives pre-trip engagement). The "next item" widget is v1.1. | Countdown widget = v1 (Phase 5/7). "Next item" widget = v1.1. |

---

## Cross-Cutting Themes

These themes span multiple phases. The roadmapper must allocate explicit work items for each — they are not automatic byproducts of feature phases.

### Theme 1: Legal + Trust Posture (Every Phase)

Legal is not a Phase 10 checklist. It is a thread that runs from Phase 0 through every public-facing surface:

- **Phase 0**: Trademark search on "WonderWaltz" (USPTO TESS + EUIPO) before any public commit
- **Phase 1**: Disclaimer architecture wired into the API response layer, web layout, and mobile app shell from day 1
- **Phase 3**: COPPA-compliant data model confirmed; PostHog event schema audited for child data leakage
- **Phase 4**: Account deletion cascade-deletes all guest profiles and child age data
- **Phase 8**: Privacy policy explicitly covers children's data; website disclaimers on every page; App Store metadata strategy locked (no trademarked keywords in the 100-char keyword field)
- **Phase 10**: IP lawyer review (hard gate), App Store listing audit, consumable IAP framing in review notes

### Theme 2: Data Pipeline as Prerequisite (Phases 2–3 Dependency)

The solver cannot produce a useful plan without wait-time forecast data. The forecast model cannot produce useful predictions without 8+ weeks of historical accumulation:

- Data ingestion (Phase 2) must start running as early as possible and must not slip
- The solver cannot be validated in Phase 3 without real forecast data from Phase 2
- Public beta (Phase 10) must not open until 8+ weeks of ingestion history exist — this is a data gate
- Confidence labels on forecasts must be part of the UI spec from Phase 3, not a post-launch addition

### Theme 3: OpenAPI Spec as Mobile Contract

The OpenAPI spec emitted by `@nestjs/swagger` is the binding contract between backend and both mobile clients:

- Phase 2 (backend schema + NestJS modules): spec must exist before iOS starts in Phase 5
- Phase 5 (iOS): Swift OpenAPI Generator 1.11.1 generates networking client at compile time — any spec change breaks iOS until regenerated
- Phase 7 (Android): Kotlin OpenAPI Generator 7.18.0 does the same for Ktor
- Any backend API change must update the spec first; CI enforces this

### Theme 4: Observability from Phase 2

Sentry + PostHog + RevenueCat dashboards + `llm_costs` table are not launch-prep activities:

- Phase 2: Sentry on the NestJS API + ingestion worker; ingestion-lag alert configured
- Phase 3: `llm_costs` table seeded and cache-hit-rate alert configured (>80% healthy; <70% pages)
- Phase 5 / Phase 7: Sentry Cocoa / Sentry Android wired in before the first real device test

### Theme 5: Design System Lock Before Any UI

Brand direction (vintage travel poster vs. warm modern minimalism vs. painterly whimsy) and design tokens must be decided before Phase 5 begins. Every UI built before the design system is locked incurs rework. The `ui-ux-designer` agent critique pass must be mandatory on every UI surface.

---

## Stack Summary

All versions verified against official sources (April 2026). See STACK.md for full rationale.

| Layer | Library / Service | Version | Confidence |
|-------|------------------|---------|------------|
| Runtime | Node.js LTS | 22.x | HIGH |
| Language (backend + web) | TypeScript | 6.0.2 | HIGH |
| Package manager | pnpm workspaces | 10.33.0 | HIGH |
| Backend framework | NestJS (`@nestjs/core`) | 11.1.18 | HIGH |
| HTTP transport | `@nestjs/platform-fastify` | 11.x | HIGH |
| ORM | drizzle-orm | 0.45.2 | HIGH |
| Migrations | drizzle-kit | 0.31.x | HIGH |
| Validation | zod + nestjs-zod | 4.3.6 | HIGH |
| Queue / workers | BullMQ + `@nestjs/bullmq` | 5.73.1 | HIGH |
| Cache / BullMQ backing | Upstash Redis (ioredis) | managed | HIGH |
| OpenAPI spec | `@nestjs/swagger` | 8.x | HIGH |
| LLM | `@anthropic-ai/sdk` (Sonnet + Haiku) | 0.85.0 | HIGH |
| Database | Supabase Postgres + TimescaleDB | managed | HIGH |
| Auth | Supabase Auth | 2.102.1 | HIGH |
| Testing (TS) | Vitest | 4.1.3 | HIGH |
| Date/time arithmetic (solver) | @js-joda/core + timezone | 5.x | HIGH |
| Notifications (iOS) | node-apn | 4.x | HIGH |
| Notifications (Android) | firebase-admin | 13.x | HIGH |
| Web framework | Next.js App Router | 16.2.3 | HIGH |
| CSS | Tailwind CSS v4 | 4.2.0 | HIGH |
| UI components | shadcn/ui (CLI v4) | CLI v4 | HIGH |
| iOS language | Swift 6 / SwiftUI | Xcode-bundled | HIGH |
| iOS networking | Swift OpenAPI Generator | 1.11.1 | HIGH |
| iOS offline | SwiftData (fallback: GRDB) | iOS 17+ | MEDIUM |
| iOS IAP | RevenueCat Purchases SDK | 5.x (SPM) | HIGH |
| Android language | Kotlin K2 | 2.3.20 | HIGH |
| Android UI | Jetpack Compose BOM | 2026.03.00 | HIGH |
| Android DI | Hilt | 2.57.1 | HIGH |
| Android offline | Room | 2.8.4 (NOT 3.0-alpha) | HIGH |
| Android networking | Ktor Client | 3.4.0 | HIGH |
| Android client gen | OpenAPI Generator (Kotlin) | 7.18.0 | HIGH |
| Android IAP | RevenueCat Purchases SDK | 9.23.1 | HIGH |
| Error monitoring (all) | Sentry | platform-specific | HIGH |
| Product analytics | PostHog | platform-specific | HIGH |
| Hosting (API) | Railway | managed | HIGH |
| Hosting (web) | Vercel | managed | HIGH |

**Avoid:** `class-validator`, Prisma, `pg` directly, CocoaPods, axios (use Node 22 native fetch), Moment.js, Room 3.0-alpha, Jest.

---

## Features Summary

### Table Stakes — All Covered in v1

Every item below is confirmed in the v1 plan. Absent any one of these = bounce or 1-star review.

- Time-blocked day plan (rides, meals, shows, LL slots, rest)
- Live wait times (queue-times.com feed with freshness indicator)
- Lightning Lane strategy and booking window push reminders
- Park hours, Early Entry, Extended Evening Hours
- Guest profile constraint filtering (age, height, mobility, sensory)
- On-property vs. off-property differentiation (Early Entry, 7-day vs. 3-day LL booking window)
- Crowd level context (implicit in solver; surfaced as a label)
- Park selection recommendation
- Offline-first cached plan (full package: plan, catalog subset, walking graph, static maps)
- Weather awareness (OpenWeather → packing list + rain contingency blocks)
- Clear free vs. paid framing (Day 1 teaser + blurred Days 2+)
- WCAG 2.2 AA accessibility baseline

### Differentiators — WonderWaltz Specific

Ordered by strategic value:

1. **LLM narrative layer** — warm, expert-voice per-item tips and budget hacks; no competitor has this
2. **Budget tier personalization** (Pixie Dust / Fairy Tale / Royal Treatment) — drives all decisions; no competitor does this as a first-class planning dimension
3. **Solver + narrative separation** — deterministic correctness + LLM warmth; grounded AI vs. hallucinating AI
4. **"Rethink my day" on-demand re-optimization** — single tap; TouringPlans is closest but UI is confusing
5. **Live Activities (iOS) / ongoing notification (Android)** — no third-party Disney app offers this
6. **Per-trip $9.99 consumable** — matches visitor pattern; lowers commitment barrier
7. **Guest-profile-aware constraint filtering** — DAS flag, Rider Switch awareness, toddler fatigue model
8. **Countdown widget** — pre-trip engagement; great App Store screenshot; v1
9. **Context-aware affiliate packing list** — trip date + weather + youngest-guest age drives curation

### Anti-Features — Deliberately Not Building

- In-app LL / dining / ticket booking — legal + trust risk; deep-link to MDE instead
- Disney credential storage or MDE integration — privacy non-negotiable
- Social / shareable plan feeds — v1.1 is read-only web trip view, not a social feed
- Crowdsourced wait times — queue-times.com handles this better
- Ad-supported free tier — destroys brand positioning
- Real-time dining reservation availability (v1) — scraping ToS risk; v1.1 watchlist after lawyer review
- AI chatbot / open-ended Q&A — unpredictable cost + hallucination risk

### Deferred to v1.1

Dining watchlist, shareable read-only web trip view, Apple Watch / Wear OS companion, crowd calendar public page, Spanish + Portuguese localization, "next item" home screen widget.

### Deferred to v2+

ML wait-time forecast (needs 8+ weeks of data first), multi-park resort support, full trip cost estimator UI, Rider Switch planner UI.

---

## Architecture Summary

Five distinct layers with explicit process boundaries:

1. **API process (NestJS/Railway)** — AuthModule, TripModule, CatalogModule, PlanModule, ForecastModule, NarrativeModule, EntitlementModule, NotificationModule, AffiliateModule, AdminModule
2. **Worker process (Railway, same codebase, different start command)** — BullMQ job processors for ingestion (every 5 min wait times, 6 hr hours, hourly rollups) and notification scheduling
3. **Solver package (`packages/solver`)** — Pure TypeScript, zero NestJS dependencies, zero side effects. `solve(SolverInput): DayPlan[]`. PlanModule hydrates all I/O; solver never touches DB or network.
4. **Data layer** — Supabase Postgres + TimescaleDB continuous aggregates; Upstash Redis for live wait cache (2-min TTL), BullMQ, crowd index, weather; Supabase Storage for static maps
5. **Client layer** — iOS (SwiftUI + SwiftData), Android (Jetpack Compose + Room), Web (Next.js App Router). All networking generated from `packages/shared-openapi/openapi.json`.

Key patterns:
- **Async plan generation via BullMQ** — mobile polls or receives silent push; never held on HTTP connection
- **Solver as pure package** — cached by `solver_input_hash` to skip redundant LLM calls
- **Entitlement projection at API layer** — blurring applied server-side; mobile never receives unblurred paid-day data
- **Walking graph preloaded into process memory** — PostGIS only at catalog seed time
- **Two Railway services from one codebase** — `api` and `worker` differ only in start command

---

## Top 5 Pitfalls by Severity

### 1. Disney C&D — Existential

Disney aggressively enforces trademark across all platforms. Even apps with no Disney imagery can be targeted if the name creates confusion or marketing copy implies endorsement. C&D → App Store pull → product dead overnight.

**Prevention phases:** Phase 0 (trademark search), Phase 1 (disclaimer on every surface), Phase 8 (engage lawyer), Phase 10 (sign-off hard gate). Never use "Disney" in the App Store keyword field. Zero Disney trademarked imagery in any screenshot or asset.

### 2. LLM Cost Blowout — HIGH

A single dynamic token inserted before the static system prompt drops Anthropic prompt cache hit rate from ~98% to ~4%, spiking per-plan cost from $0.02 to $0.35 (documented in production, March 2025). Regeneration loops can produce $5–10 of LLM costs per user per afternoon.

**Prevention:** Strict prompt structure: [large static system prompt → cache boundary → small dynamic user context]. Log `cache_read_input_tokens` vs `input_tokens` on every call. Alert if cache hit rate <70%. Per-user daily rethink cap (15 paid / 5 free). Circuit breaker at $0.50/trip.

### 3. Forecast Cold Start — HIGH

With less than 8 weeks of historical data, bucketed median forecasts are statistically unreliable. A first-timer plans their trip on a forecast that is wildly wrong. One-star review. Trust destroyed.

**Prevention:** Start ingestion on the first day Phase 2 completes. Do not open public beta until 8+ weeks of history exist. Display explicit confidence labels on every forecast from Phase 3 UI spec.

### 4. App Store Rejection — IAP Classification — HIGH

Apple's Guideline 3.1.1 reviewers may flag a per-trip unlock consumable as "this does not appear to be consumed." A consumable that lasts "forever" reads as a non-consumable. Rejection costs 1–2 weeks.

**Prevention:** Decide IAP type (consumable vs. non-consumable) in Phase 4 entitlement design. In App Store review notes (Phase 10), explicitly explain: "each credit applies to one trip; once applied, the credit is consumed and cannot be reused." Include full unlock flow in TestFlight sandbox credentials.

### 5. COPPA Violation — HIGH (now in force)

COPPA 2.0 is effective April 22, 2026. Guest profiles include children's ages. Even stored on an adult account, this triggers COPPA requirements. FTC fines up to $50K/day; HoYoverse settled for $20M.

**Prevention:** Store age brackets not birthdates from Phase 1. Never pass child ages as PostHog event properties. Account deletion must cascade-delete all guest profile age data. Privacy policy addresses children's data by Phase 8.

---

## Critical Path Implications for the Roadmap

Hard dependencies — skipping or reordering them produces throwaway work:

```
Phase 0: Trademark search + name lock
    └── gates → any public commitment to the WonderWaltz name

Phase 1: Project scaffolding + DB schema + disclaimer architecture
    └── gates → Phase 2 (ingestion writes to DB schema)
    └── gates → Phase 3 (solver depends on catalog schema)

Phase 2: Data pipeline (catalog seed + ingestion workers running in production)
    └── gates → Phase 3 (solver needs forecast data to validate)
    └── gates → Phase 5/7 (OpenAPI spec must exist before mobile clients generate)
    └── data accumulation gate → Phase 10 (8+ weeks before public beta)

Phase 3: Solver + LLM narrative + plan generation API (async BullMQ)
    └── gates → Phase 5 (iOS plan view needs a real plan endpoint)
    └── gates → Phase 7 (Android plan view same)
    └── cost telemetry live from day 1 of this phase

Phase 4: Entitlement + IAP backend (RevenueCat webhook, entitlements table)
    └── gates → Phase 5 (iOS paywall needs entitlement endpoint)
    └── gates → Phase 7 (Android paywall same)
    └── REFUND webhook must be implemented here, not deferred

Phase 5: iOS app (requires: Phase 2 spec, Phase 3 plan API, Phase 4 entitlement)
    └── parity checklist written here for Phase 7 to execute against
    └── design system must be locked before Phase 5 begins

Phase 6: iOS paywall + StoreKit 2 + RevenueCat integration
    └── gates → Phase 7 (Android must mirror the entitlement model)

Phase 7: Android app (requires: Phase 5 parity checklist, same backend phases)
    └── must ship within 2 weeks of iOS to avoid "Android afterthought" perception

Phase 8: Website + design system finalization + legal surfaces
    └── IP lawyer engaged here (6–8 week lead time before Phase 10)
    └── Privacy policy + disclaimer on every page

Phase 9: Notifications + Live Activities + advanced features
    └── requires push token table from Phase 2 DB schema
    └── requires completed plan with time blocks from Phase 3

Phase 10: Beta + IP lawyer sign-off + App Store submission
    └── 8+ weeks of ingestion data gate (hard)
    └── IP lawyer sign-off gate (hard)
    └── Parity checklist verified on real Pixel + Samsung + iPhone
```

There is no parallel platform track before Phase 5. The backend must be solid before mobile starts. Phase 2 is the longest-running phase — the ingestion worker runs continuously from Phase 2 through launch.

---

## Open Questions After Research

Grouped by the phase they affect. Not resolved — flagged for the product owner.

**Affects Phase 0 / Phase 10: App Store IAP Type**
Should the per-trip unlock be typed as a consumable or non-consumable in App Store Connect? Consumable is cleaner for "buy a new unlock per trip" but risks Guideline 3.1.1 rejection. Non-consumable is semantically clearer but cannot be repurchased under the same product ID. The Phase 4 entitlement backend design must accommodate either choice; decide before Phase 6 starts.

**Affects Phase 2: TouringPlans Historical Data Seeding**
TouringPlans publishes historical wait-time data. Before seeding the forecast model with their data to bootstrap the cold-start period, their terms of use for commercial applications must be verified. If permitted, this could reduce the minimum accumulation period. If not, the 8-week gate stands.

**Affects Phase 3: Solver Scoring Weights**
The exact scoring weights that produce plans a first-time Disney visitor judges as "this feels right" are unknown until real plans are generated and reviewed. The roadmapper should allocate explicit manual QA time in Phase 3, not just snapshot tests.

**Affects Phase 3: DAS Return Window Operational Details**
DAS return window logic (whether returns are time-limited, how they interact with LL slots, whether ECV routing and DAS are the same flag) needs verification from current WDW operational documentation before Phase 3 solver encoding. May require a park visit or community research.

**Affects Phase 5/7: Rethink-My-Day Offline Path**
Research recommends the solver run against a cached snapshot offline, with the LLM narrative skipped. The exact mechanism (on-device solver vs. cached server state) needs to be decided in Phase 5 architecture.

**Affects Phase 8 / Phase 10: "WDW" in App Subtitle**
"WonderWaltz — WDW Trip Planner" uses "WDW" in the subtitle. This falls in a gray zone for Apple's trademark metadata policy. The IP lawyer should advise before Phase 10 submission.

---

## Implications for Roadmap

### Suggested Phase Structure

**Phase 0 — Name Lock + Legal Foundation**
Trademark search before any public commitment. Establishes: WonderWaltz name is cleared. Research flag: IP specialist needed, not standard patterns.

**Phase 1 — Monorepo Scaffolding + Schema + Design Direction**
Monorepo, DB schema (COPPA-compliant age brackets, push_tokens table), disclaimer architecture, brand direction locked. Establishes the foundation everything else builds on. Research flag: standard patterns (pnpm workspaces, Drizzle schema); no research phase needed.

**Phase 2 — Data Pipeline + Catalog Seed**
Ingestion workers running in production (queue-times.com every 5 min, themeparks.wiki every 6 hr), catalog seed complete, TimescaleDB hypertable raw SQL migration, OpenAPI spec first draft. Data starts accumulating for the 8-week gate. Research flag: TimescaleDB DDL workaround is documented but requires careful implementation.

**Phase 3 — Solver + LLM + Plan Generation API**
Pure solver package, NarrativeModule with cost telemetry live, async BullMQ job pattern, `llm_costs` table, COPPA event schema audit, DAS solver constraint. Research flag: solver scoring weights need QA iteration; deeper research recommended before finalizing.

**Phase 4 — Entitlement + IAP Backend**
RevenueCat webhook (INITIAL_PURCHASE + REFUND), entitlements table, account deletion cascade, affiliate packing list service. IAP type decision must be made here. Research flag: standard RevenueCat patterns; no research phase needed.

**Phase 5 — iOS App**
Trip wizard (with DAS flag), plan view, offline package sync, SwiftData cache, StoreKit 2 + RevenueCat, countdown widget, WCAG 2.2 AA baseline, parity checklist authored. Research flag: SwiftData iOS 18.x real-device validation; if unstable, GRDB migration path is pre-identified.

**Phase 6 — iOS Paywall + Notifications**
StoreKit 2 full flow, restore purchases from backend entitlement, push notification architecture, LL booking window reminders, notification cap (3/day), park-hours guard. Research flag: Apple external payment rules need monitoring; standard patterns otherwise.

**Phase 7 — Android App**
Jetpack Compose + Room, Ktor OpenAPI-generated client, Hilt DI, Google Play Billing + RevenueCat, countdown widget, Android notification channels from day 1, Pixel + Samsung device testing against parity checklist. Research flag: standard patterns; ensure Android CI is day-1.

**Phase 8 — Website + Design System Finalization + Legal**
Next.js marketing site, admin panel, Tailwind v4 design system, disclaimer on every page, privacy policy (children's data), IP lawyer engaged, App Store metadata strategy. Research flag: standard Next.js patterns; legal review is domain-specific.

**Phase 9 — Live Activities + Advanced Notifications + Rethink-My-Day Polish**
iOS Live Activities, Android ongoing notification, "Rethink my day" full flow including offline degraded mode. Research flag: Live Activities + ActivityKit is niche; may benefit from a targeted research phase.

**Phase 10 — Beta + Launch**
IP lawyer sign-off (hard gate), 8-week data gate confirmed, App Store and Play Store submissions, beta with ECV users and families with toddlers. Research flag: consumable IAP review notes strategy should be validated against current reviewer feedback patterns before submission.

### Research Flags

Phases likely needing `/gsd:research-phase` during planning:
- **Phase 3 (Solver)**: Solver scoring weights and DAS operational details need domain-specific research before the solver is coded
- **Phase 9 (Live Activities)**: ActivityKit + Live Activities is niche API territory; sparse documentation for complex update patterns
- **Phase 10 (App Store submission)**: Consumable IAP classification risk; current reviewer feedback patterns should be researched immediately before submission

Phases with standard patterns (skip research phase):
- **Phase 1** (pnpm + Drizzle + NestJS scaffolding): well-documented
- **Phase 4** (RevenueCat webhook integration): RevenueCat docs are excellent
- **Phase 7** (Android): standard Jetpack Compose + Hilt patterns; OpenAPI generator is documented
- **Phase 8** (Next.js + Tailwind v4): standard patterns; Tailwind v4 migration guide is comprehensive

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All versions verified against official release pages and npm/GitHub registries |
| Features | MEDIUM-HIGH | Competitive landscape from live sources; user sentiment from forums; no direct WonderWaltz user survey yet |
| Architecture | HIGH | Grounded in authoritative project plan; patterns are well-established for this class of product |
| Pitfalls | HIGH (legal), MEDIUM (solver/UX) | Legal pitfalls from primary sources; solver/UX pitfalls from community + domain inference |

**Overall confidence:** HIGH — the research is internally consistent and the approved plan is architecturally sound. The deltas are version updates and targeted scope additions, not fundamental rethinks.

### Gaps to Address During Planning

- **SwiftData stability at iOS 18.2+**: Conditionally correct for simple offline cache; GRDB is the named fallback. Monitor during Phase 5. Migrate to GRDB if unstable on real devices before Phase 10 beta.
- **TimescaleDB DDL via Drizzle**: Drizzle does not emit `create_hypertable` DDL. A raw SQL migration file is required. Must be explicit in Phase 2 migration plan.
- **Rethink-my-day offline path**: Exact mechanism (on-device solver vs. cached server state) needs architectural decision in Phase 5.
- **OpenWeather API tier**: Free tier allows 1,000 calls/day; insufficient beyond ~100 daily active users generating plans. Phase 4 infrastructure planning should assume the $40/month tier at launch.

---

## Sources

### Primary (HIGH confidence)
- Node.js endoflife.date — Node 20 EOL April 2026 confirmed
- TypeScript devblog — 6.0.2 release confirmed
- Anthropic platform docs — prompt caching behavior, cache_control header
- Apple App Store Review Guidelines (2.3.7, 3.1.1, 5.2.1) — trademark keyword and IAP rules
- FTC COPPA amended rule — effective April 22, 2026 compliance deadline
- Disney C&D to Character.AI (September 2025) and ByteDance/Seedance (February 2026) — confirmed via Variety and DisneyByMark
- NestJS, Drizzle, BullMQ, Vitest, Zod, Next.js, Tailwind, shadcn/ui — versions confirmed via npm/GitHub release pages
- Compose BOM 2026.03.00, Kotlin 2.3.20, Ktor 3.4.0, Room 2.8.4, Hilt 2.57.1 — confirmed via Android developer release pages
- Swift OpenAPI Generator 1.11.1, Sentry Cocoa 9.8.0, RevenueCat iOS 5.x, PostHog iOS 3.49.1 — confirmed via Swift Package Index
- RevenueCat Android 9.23.1, Sentry Android 8.38.0, PostHog Android 3.25.0 — confirmed via GitHub releases

### Secondary (MEDIUM confidence)
- TouringPlans, Park Autopilot, RideMax, WDW Trip Planner Pro feature comparisons (WebFetch, April 2026)
- DISboards.com, Reddit r/WaltDisneyWorld user sentiment threads (2024–2025)
- AllEars.net LL strategy 2026 guide
- queue-times.com API terms, themeparks.wiki API docs
- LLM prompt cache invalidation bug documentation (Kilo Blog, March 2025)
- Push notification fatigue statistics (ContextSDK, Pushwoosh)

### Tertiary (needs validation)
- DAS return window operational details — needs current WDW operational documentation verification
- TouringPlans historical data commercial use terms — needs direct verification before seeding
- SwiftData iOS 18.2+ stability — conditionally acceptable; requires real-device validation in Phase 5

---

*Research completed: 2026-04-09*
*Ready for roadmap: yes*
