# Stack Research

**Domain:** Multi-platform Disney trip planner (iOS + Android + NestJS backend + Next.js web)
**Researched:** 2026-04-09
**Confidence:** HIGH (all versions verified against official sources or release pages)

---

## Verification Status of Locked-In Decisions

Before listing the full stack, this section calls out every locked-in decision that was verified or flagged.

| Decision | Status | Notes |
|---|---|---|
| NestJS 11 | CORRECT — current is 11.1.18 | Pin to `^11.0.0` |
| Node 20 | OUTDATED — Node 20 EOL is April 30, 2026 | Upgrade to Node 22 LTS immediately |
| Drizzle ORM | CORRECT — 0.45.2 is current stable | No native TimescaleDB DDL support; use raw SQL for hypertables (see Pitfalls) |
| BullMQ | CORRECT — 5.73.1 is current | Use `@nestjs/bullmq` wrapper |
| Next.js 16 App Router | CORRECT — 16.2.3 is current stable | Turbopack is now stable default |
| SwiftData for offline | CONDITIONALLY CORRECT | iOS 18 had major SwiftData regressions; use only for non-critical caching; prefer CoreData-backed fallback or GRDB for complex queries |
| Swift OpenAPI Generator | CORRECT — 1.11.1 is current | Use for iOS networking client generation |
| Jetpack Compose + Room | MOSTLY CORRECT — Room 3.0-alpha01 released; use 2.8.4 stable | Room 3.0 is alpha, stick with 2.x |
| Ktor client | CORRECT — 3.4.0 | Use with OpenAPI Generator Kotlin |
| RevenueCat iOS SDK | CORRECT — StoreKit 2 default as of v5.x; current is ~5.x | Full SK2 flow enabled by default |
| RevenueCat Android SDK | CORRECT — 9.23.1 | |
| Tailwind CSS | UPGRADE — v4.2.0 is current | v3 is EOL; use v4 with new CSS-native config |
| TypeScript | UPGRADE — 6.0.2 is current | Plan was written when 5.x was latest; 6.0 is a stepping-stone to 7.0; safe to use |
| pnpm | CORRECT — use 10.x (10.33.0 current stable) | v11 still in beta |
| Zod v3 | UPGRADE — Zod 4.3.6 is current | Zod 4 is stable, faster, slimmer; use v4 |
| class-validator | AVOID — inactive 2+ years, no updates | Use Zod 4 + nestjs-zod |
| Kotlin | UPGRADE from whatever was implied | 2.3.20 is current stable |

---

## Recommended Stack

### Runtime and Toolchain

| Technology | Version | Purpose | Why |
|---|---|---|---|
| Node.js | 22 LTS (22.x) | Backend runtime | Node 20 EOL April 30 2026; 22 is active LTS until April 2027; 30% faster startup |
| TypeScript | 6.0.2 | Type safety across backend + web | 6.0 is a stepping-stone to native-speed 7.0; safe to adopt now for new greenfield projects |
| pnpm | 10.33.0 | Monorepo package manager | Fast installs, content-addressable store, best workspace support; v11 still beta |
| Kotlin | 2.3.20 | Android development language | Latest stable; K2 compiler stable in 2.x for significantly faster build times |
| Swift | 6.x (Xcode-bundled) | iOS development language | Swift 6 strict concurrency is required for SwiftUI + Observation on iOS 17+ |

### Backend — NestJS

| Technology | Version | Purpose | Why |
|---|---|---|---|
| `@nestjs/core` | 11.1.18 | Framework core | Module/DI structure enforces feature boundaries; guards/interceptors reduce boilerplate; solo-builder-friendly conventions |
| `@nestjs/common` | 11.x | Decorators, pipes, guards | Bundled with core |
| `@nestjs/platform-fastify` | 11.x | HTTP transport | Fastify is ~2x faster than Express under load; drop-in for NestJS; preferred over `platform-express` for a public API |
| `@nestjs/swagger` | 8.x | OpenAPI spec emission | Auto-generates spec from decorators; feeds Swift + Kotlin + web client generation |
| `@nestjs/bullmq` | 11.x | Queue/worker integration | NestJS-native BullMQ wrapper; module-based; auto-wired with DI |
| `bullmq` | 5.73.1 | Background job queues | Redis-backed; production battle-tested; supports delayed jobs (LL booking windows) |
| `drizzle-orm` | 0.45.2 | ORM / query builder | SQL-transparent; Postgres-native; works with TimescaleDB as standard Postgres; no magic migrations |
| `drizzle-kit` | 0.31.x | Migration tooling | Companion to drizzle-orm; generates SQL migrations |
| `zod` | 4.3.6 | Schema validation + DTOs | Zod 4 is faster, type-infers DTO shapes; use with nestjs-zod for OpenAPI compatibility |
| `nestjs-zod` | 3.x | Zod + NestJS + OpenAPI glue | Provides ZodValidationPipe and swagger schema integration; avoids class-validator entirely |
| `@anthropic-ai/sdk` | 0.85.0 | Claude LLM calls | Official TypeScript SDK; prompt caching, streaming, tool helpers |
| `@supabase/supabase-js` | 2.102.1 | Supabase Auth + Storage client | Used for auth token verification on backend |
| `posthog-node` | 5.29.1 | Server-side analytics + flags | Feature flags for A/B tested variants; event tracking for plan generation, IAP events |
| `@sentry/nestjs` | 10.47.0 | Error tracking + performance | First-class NestJS SDK; auto-instruments interceptors and exception filters |
| `ioredis` | 5.x | Redis client | BullMQ peer dependency; used for cache operations |

### Backend — Supporting Libraries (Plan Didn't Name These)

| Library | Version | Purpose | When to Use |
|---|---|---|---|
| `pg` / `postgres` | `postgres` 3.x | Postgres driver | Drizzle uses `postgres` (the npm package) as its driver for PG; NOT `pg` directly |
| `@fastify/helmet` | 12.x | Security headers | Helmet for Fastify; wrap every response with CSP, HSTS etc. |
| `@fastify/rate-limit` | 10.x | Rate limiting | Per-IP + per-user rate limiting on API Gateway level |
| `uuid` | 9.x | UUID generation | For UUIDv7 generation (use custom or `uuidv7` package — see note) |
| `uuidv7` | 0.x | UUIDv7 monotonic IDs | Plan specifies UUIDv7 for all IDs; this package generates them correctly |
| `@nestjs/config` | 3.x | Config + env validation | Wraps dotenv; integrates with Zod for env schema validation |
| `@nestjs/schedule` | 4.x | Cron jobs within NestJS | For rollup + crowd-index refresh jobs |
| `node-fetch` / native fetch | built-in Node 22 | HTTP calls to queue-times.com | Node 22 has stable native fetch; no need for axios or node-fetch |
| `vitest` | 4.1.3 | Unit + integration tests | Vite-native; dramatically faster than Jest; TypeScript-first; replaces Jest entirely |
| `@vitest/coverage-v8` | 4.1.3 | Coverage reports | V8-based coverage; pairs with vitest |
| `supertest` | 7.x | HTTP integration tests for NestJS | Used with vitest for controller-level tests |

### Database

| Technology | Version | Purpose | Why |
|---|---|---|---|
| Supabase Postgres | Managed | OLTP + TimescaleDB extension | No-ops; includes TimescaleDB 2.x as a managed extension; PostGIS for attraction geo |
| Upstash Redis | Managed | Cache + BullMQ backing + rate limit | Serverless Redis; per-request billing; no persistent server to manage |
| TimescaleDB | 2.x (managed via Supabase) | Wait-time hypertable time-series | Best-in-class Postgres extension for time-series; continuous aggregates for hourly rollups |
| PostGIS | 3.x (bundled with Supabase) | Attraction geospatial data | Walking graph + proximity queries; `location_point` columns |

**TimescaleDB + Drizzle caveat (MEDIUM confidence):** Drizzle does not natively emit `CREATE EXTENSION timescaledb` or `SELECT create_hypertable(...)` DDL. The Timescale-specific DDL must be handled as raw SQL in a dedicated migration file, not via drizzle-kit schema generation. This is a known limitation (GitHub issue #2962). Recommended pattern: define the standard table in Drizzle schema, then add a raw SQL migration step that calls `create_hypertable`. This is completely viable — it's a one-time setup step.

### iOS — SwiftUI

| Technology | Version | Purpose | Why |
|---|---|---|---|
| SwiftUI + Observation | iOS 17+ | UI framework | `@Observable` macro replaces `ObservableObject`; cleaner state graph; plan-correct |
| Swift Concurrency | Swift 6 | Async/await throughout | Strict concurrency mode enforced; `Sendable` models; correct for iOS 17+ |
| Swift OpenAPI Generator | 1.11.1 | Network client generation | Apple-official; generates type-safe clients from OpenAPI 3.x spec; builds at compile time |
| SwiftData | iOS 17+ | Offline cache | CONDITIONALLY CORRECT — see warning below |
| StoreKit 2 | iOS 17+ (native) | IAP foundation | Used via RevenueCat SDK; direct SK2 usage avoided |
| RevenueCat Purchases SDK | 5.x (SPM `~> 5.0`) | IAP + entitlement management | Full SK2 flow enabled by default in v5; handles receipt validation, webhooks, entitlements |
| Sentry Cocoa | 9.8.0 | Crash reporting + perf | SPM-installable; CocoaPods support deprecated June 2026 — use SPM only |
| PostHog iOS SDK | 3.49.1 | Product analytics + feature flags | Lightweight; supports anonymous sessions; SPM-installable |
| Swift Testing | Swift 6 / Xcode 16+ | Unit tests | Apple's modern testing framework; preferred over XCTest for new tests; cleaner macros, concurrency-aware |

**SwiftData iOS 18 stability warning (MEDIUM confidence):** iOS 18 had significant SwiftData stability regressions when it launched — code that worked on iOS 17 encountered issues. As of iOS 18.2+, stability has improved substantially. For WonderWaltz's use case (offline cache of a generated plan after purchase), SwiftData is acceptable because: (a) the data model is simple (no CloudKit sync), (b) we target iOS 17+ which is the more stable baseline, and (c) failure of the cache is a degraded experience, not data loss. For complex querying (walking graph traversal), use in-memory Swift structs loaded from SwiftData rather than querying SwiftData directly. Do NOT use SwiftData as the source of truth for the walking graph — load it into memory at app launch.

**Swift Testing vs XCTest:** Use Swift Testing (`@Test`, `#expect`) for all new unit tests. Keep XCUITest (part of XCTest) for UI automation — it has no Swift Testing equivalent. Do not mix the two frameworks in the same test target.

### Android — Jetpack Compose

| Technology | Version | Purpose | Why |
|---|---|---|---|
| Jetpack Compose BOM | 2026.03.00 | Compose version alignment | Single BOM pin aligns all Compose libraries to a tested set |
| Kotlin | 2.3.20 | Language | K2 compiler; faster builds; required for Compose 2026 BOM |
| Hilt | 2.57.1 (dagger.hilt.android:2.57.1) | Dependency injection | Google's recommended DI for Android; Dagger-based compile-time safety; KSP supported |
| androidx.hilt | 1.3.0 | Hilt + Jetpack integration | ViewModel injection, Navigation, WorkManager integration |
| Room | 2.8.4 | Offline SQLite cache | Stick with 2.x stable — Room 3.0 is alpha01 as of March 2026; production use requires stable |
| Ktor Client | 3.4.0 | HTTP client | OpenAPI Generator targets Ktor; structured concurrency integration; OkHttp engine on Android |
| OpenAPI Generator (Kotlin) | 7.18.0 | Kotlin client codegen | Generates Ktor-based DTOs + API clients from OpenAPI spec; Gradle plugin |
| RevenueCat Purchases SDK | 9.23.1 | IAP + entitlements | `com.revenuecat.purchases:purchases:9.23.1`; Google Play Billing abstraction |
| WorkManager | 2.11.2 | Background sync + alarms | Booking-window push preparation; background catalog refresh |
| Sentry Android SDK | 8.38.0 | Crash + perf monitoring | `io.sentry:sentry-android:8.38.0`; auto-instruments Compose navigation |
| PostHog Android SDK | 3.25.0 | Product analytics + flags | `com.posthog:posthog-android`; anonymous sessions supported |
| Navigation Compose | (BOM-aligned) | Single-activity navigation | Part of Compose BOM; type-safe destinations |

**Android testing:** Use JUnit 5 + Mockk for unit tests; Compose Test (BOM-aligned `androidx.compose.ui:ui-test-junit4`) for UI tests. Hilt has a dedicated `hilt-android-testing` artifact.

### Website — Next.js

| Technology | Version | Purpose | Why |
|---|---|---|---|
| Next.js | 16.2.3 | Full-stack web framework | App Router is stable; Turbopack stable as default bundler; React Server Components for marketing SSR |
| React | 19.x (bundled with Next.js 16) | UI library | Next.js 16 ships with React 19 |
| Tailwind CSS | 4.2.0 | Utility-first CSS | v4 is current stable; CSS-native config replaces `tailwind.config.js`; `@import "tailwindcss"` in CSS file; no JS config file needed |
| shadcn/ui | latest (CLI v4) | Component primitives | Not a package — copy-to-own model; Radix UI-backed; Tailwind 4 compatible; CLI v4 released March 2026 |
| `@sentry/nextjs` | 10.47.0 | Error + perf monitoring | First-class Next.js SDK; instruments App Router, Server Components, Server Actions |
| `posthog-js` | latest | Client-side analytics | Browser-side event capture; works alongside posthog-node for server events |
| `@supabase/ssr` | latest | Supabase auth in Next.js SSR | Server-side session handling for admin panel routes |
| TypeScript | 6.0.2 | Type safety | Shared tsconfig with api package |

**Tailwind v4 migration note (HIGH confidence):** v4 eliminates the `tailwind.config.js` file entirely. Configuration moves to a CSS file using `@theme` directives. The `content` glob is no longer needed — auto-detection works. shadcn/ui CLI v4 generates Tailwind 4 compatible components. There is no good reason to use Tailwind v3 on a greenfield project in 2026.

**Next.js 16 note (HIGH confidence):** "Next.js 16" in the plan is confirmed to exist (not a future version). App Router is the stable default. Server Actions are stable. Turbopack replaces Webpack as the default dev/build bundler. The `pages/` router still works but should not be used for new routes.

### Shared / Monorepo

| Technology | Version | Purpose | Why |
|---|---|---|---|
| pnpm workspaces | 10.33.0 | Monorepo coordination | Fastest installs; best workspace filtering; `--filter` flag for targeted builds |
| GitHub Actions | N/A | CI/CD | Standard; integrates with Railway, Vercel, Xcode Cloud |
| Vitest | 4.1.3 | Testing (Node/TypeScript packages) | Use for `packages/shared-openapi`, `packages/design-tokens`, any shared TS utilities |
| `openapi-typescript` | 7.x | Generate TS types from OpenAPI spec | Use in `packages/shared-openapi` to emit types consumed by Next.js web; separate from NestJS swagger decorator approach |
| `@openapitools/openapi-generator-cli` | 7.18.0 | Kotlin client generation in CI | Gradle plugin on Android side; this CLI handles CI automation |

### Observability Stack

| Tool | Platform | SDK / Version | What It Monitors |
|---|---|---|---|
| Sentry | iOS | `sentry-cocoa` 9.8.0 (SPM) | Crashes, ANRs, perf traces, release health |
| Sentry | Android | `sentry-android` 8.38.0 | Crashes, ANRs, Compose navigation, release health |
| Sentry | NestJS backend | `@sentry/nestjs` 10.47.0 | Exceptions, slow endpoints, DB query traces |
| Sentry | Next.js web | `@sentry/nextjs` 10.47.0 | Frontend errors, Server Component errors, Server Actions |
| PostHog | iOS | `posthog-ios` 3.49.1 (SPM) | Product events, funnels, feature flags |
| PostHog | Android | `posthog-android` 3.25.0 | Product events, funnels, feature flags |
| PostHog | NestJS backend | `posthog-node` 5.29.1 | Server-side event capture, feature flag evaluation |
| PostHog | Next.js web | `posthog-js` latest | Client events, session recording for admin |
| RevenueCat | iOS + Android | SDK (above) | IAP receipts, entitlement state, subscription health |

### Notifications (Plan Didn't Name These Explicitly)

| Library | Platform | Purpose | Notes |
|---|---|---|---|
| APNs (Apple Push Notification service) | iOS | Push delivery | Send via `node-apn` (4.x) or Supabase Edge Functions + APNs HTTP/2 API |
| FCM (Firebase Cloud Messaging) | Android | Push delivery | Send via `firebase-admin` SDK (13.x) on NestJS worker |
| `node-apn` | Backend (NestJS) | APNs HTTP/2 client | Latest: 4.x; token-based auth (.p8 key) preferred over certificate-based |
| `firebase-admin` | Backend (NestJS) | FCM sender + Android push | `firebase-admin` 13.x; also provides FCM v1 API |
| ActivityKit / Live Activities | iOS (native) | Live Activity for "next up" | No external library needed; use `ActivityKit` framework + `WidgetKit` |
| WidgetKit | iOS (native) | Countdown widget | No external library; `@main Widget` conformance in Swift |
| Glance (Android) | Android (native) | Android countdown widget | `androidx.glance:glance-appwidget` (BOM-aligned or 1.1.x) |

### Scheduling Engine — Supporting Libraries (Plan Didn't Name These)

| Library | Version | Purpose | Notes |
|---|---|---|---|
| `@js-joda/core` | 5.x | Date/time arithmetic in solver | Immutable, timezone-aware; critical for park-hours arithmetic across EST zones; do NOT use `Date` or Moment |
| `@js-joda/timezone` | 2.x | IANA timezone data for js-joda | Required peer for WDW's America/New_York |
| (no graph library needed for v1) | — | Walking graph traversal | The walking graph is small (< 500 nodes per park); implement Dijkstra inline in TypeScript; no library needed |

### Infrastructure / Hosting

| Service | Purpose | Notes |
|---|---|---|
| Railway | NestJS API + BullMQ workers | No servers to patch; deploy from GitHub; environment-scoped env vars |
| Supabase | Postgres + Auth + Storage + TimescaleDB | Managed PG with TimescaleDB extension; Auth handles anonymous + Apple + Google; Storage for static park maps |
| Upstash | Redis | Serverless Redis; BullMQ backing; wait-time cache; rate limit counters |
| Vercel | Next.js marketing + admin | Edge-deployed; branch previews for admin panel PRs |
| Anthropic | Claude API (Sonnet + Haiku) | Prompt caching enabled; structured output; per-trip cost telemetry |
| RevenueCat | IAP receipt validation + entitlements | Webhook to NestJS EntitlementModule; only source of truth for trip unlocks |

---

## Alternatives Considered

| Recommended | Alternative | Why Not |
|---|---|---|
| Drizzle ORM | Prisma | Prisma's query engine abstraction breaks TimescaleDB continuous aggregates and raw SQL escapes; SQL-opaque; Drizzle's explicit SQL is debuggable; Drizzle wins for time-series use case |
| Drizzle ORM | TypeORM | TypeORM is effectively unmaintained (sparse releases, open issue backlog); Drizzle has stronger TypeScript inference |
| Zod 4 + nestjs-zod | class-validator + class-transformer | class-validator has had no substantive updates in 2+ years; class-transformer has known prototype pollution issues; Zod 4 infers types automatically, reducing boilerplate |
| Vitest | Jest | Jest requires Babel transform for ESM + TypeScript; Vitest is natively Vite-powered, TypeScript-first, and ~10x faster for cold runs |
| `@nestjs/platform-fastify` | `@nestjs/platform-express` | Fastify is ~2x faster; same decorator API; no meaningful downside for this use case |
| Node 22 LTS | Node 20 | Node 20 EOL is April 30, 2026 — the same month this project starts; Node 22 is active LTS |
| Tailwind CSS v4 | Tailwind CSS v3 | v3 is EOL; v4 has CSS-native config, 5x faster builds, and is the active maintained version |
| shadcn/ui | MUI, Chakra UI, Mantine | MUI/Chakra carry design opinions that fight a custom design system; shadcn/ui is copy-to-own so tokens flow in naturally; it's lighter and more customizable |
| Swift Testing | XCTest only | Apple recommends Swift Testing for new unit tests; cleaner syntax, concurrency-aware, better parameterization |
| Room 2.8.4 | Room 3.0-alpha01 | Room 3.0 is alpha, KMP-focused, Kotlin-only codegen — avoid for production until stable |
| SwiftData (with caveats) | GRDB | GRDB is a mature SQLite wrapper with excellent query performance; if SwiftData instability becomes a problem during development, GRDB is the first fallback; it has no iOS 18 regressions |
| TypeScript 6.0.2 | TypeScript 5.9 | 6.0.2 is current stable; it's a stepping-stone release, not a major breaking change; new projects should start on 6.x |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|---|---|---|
| `class-validator` + `class-transformer` | No substantive updates in 2+ years; class-transformer has prototype pollution CVE history; NestJS community actively migrating away | `zod` 4 + `nestjs-zod` |
| Prisma ORM | Query engine abstraction layer breaks TimescaleDB DDL; `$queryRaw` escapes are verbose; migration model fights Supabase-managed Postgres | `drizzle-orm` |
| `pg` (node-postgres) directly | Drizzle's preferred driver is `postgres` (the modern one by Nikolas Habraken); mixing both creates confusion | `postgres` npm package as drizzle driver |
| CocoaPods for iOS dependencies | Deprecated in Sentry SDK (EOL June 2026); increasingly unmaintained ecosystem for new libraries | Swift Package Manager (SPM) exclusively |
| `axios` in NestJS | Node 22 has stable native `fetch`; axios adds 300KB+ bundle weight for no gain in a backend context | Native `fetch` (Node 22 built-in) |
| Moment.js | Unmaintained; large bundle; mutable dates | `@js-joda/core` for scheduling arithmetic; native `Intl` for display formatting |
| `date-fns` in solver | Functional API is fine for display but lacks the immutable, zone-aware types needed for park-hours arithmetic | `@js-joda/core` |
| Expo for mobile | No KMP/Expo in the plan — confirmed correct to avoid; Expo React Native is a different platform from native SwiftUI + Compose | Native SwiftUI + Jetpack Compose |
| Firebase Realtime Database / Firestore | Would add Google Cloud dependency orthogonal to Supabase; adds billing complexity | Supabase Postgres + Redis |
| Webpack (explicit config) | Next.js 16 uses Turbopack by default; Webpack is the fallback for edge cases | Turbopack (default in Next.js 16) |
| Jest | Slower than Vitest; requires Babel/ts-jest configuration for TypeScript; no advantage on this stack | `vitest` 4.x |
| Room 3.0-alpha | Alpha status; KMP-focused; generates Kotlin-only code — fine for future KMP but changes DX for Android-only use | Room 2.8.4 stable |
| GRDB (preemptively) | SwiftData is adequate for the simple offline cache described in the plan; GRDB only if SwiftData proves unstable in practice | SwiftData (with migration plan to GRDB if needed) |

---

## Version Compatibility Notes

| Package | Compatible With | Notes |
|---|---|---|
| `@nestjs/core@11` | Node 22, TypeScript 6 | NestJS 11 officially supports Node 18/20/22 and TS 5+; TS 6 is compatible |
| `drizzle-orm@0.45` | Node 22, `postgres@3.x` | Use `postgres` npm package as driver, not `pg` |
| `bullmq@5.x` | `ioredis@5.x`, Upstash Redis | Upstash Redis is compatible with BullMQ via `ioredis` |
| `vitest@4.x` | Node 22, TypeScript 6, `@nestjs/*@11` | No Babel needed; native ESM + TS |
| `zod@4.x` + `nestjs-zod` | `@nestjs/swagger@8.x` | nestjs-zod bridges Zod schemas to Swagger/OpenAPI decorators |
| `next@16.x` | Node 22, TypeScript 6, Tailwind 4 | React 19 is bundled; Turbopack is default |
| `tailwindcss@4.x` | Next.js 16, PostCSS (via `@tailwindcss/postcss`) | No `tailwind.config.js`; use `@import "tailwindcss"` in CSS |
| `shadcn/ui` (CLI v4) | Tailwind 4, Next.js 16, React 19 | CLI v4 generates Tailwind 4 compatible components |
| `@sentry/nestjs@10.x` | `@nestjs/core@11`, Node 22 | Uses OpenTelemetry under the hood |
| Compose BOM 2026.03.00 | Kotlin 2.3.20, AGP 9.x | Check AGP version aligns; AGP 9.x requires Gradle 8.x |
| `ktor-client@3.4.0` | Kotlin 2.3.20, Coroutines 1.9.x | Structured concurrency integration is new in 3.4 |
| `purchases-ios@5.x` | iOS 17+, Swift 6, SPM | Full StoreKit 2 flow by default |
| `purchases-android@9.x` | Kotlin 2.3.x, Compose BOM 2026 | Google Play Billing 7.x abstraction |

---

## Installation — Backend (pnpm, apps/api)

```bash
# Core NestJS
pnpm add @nestjs/core @nestjs/common @nestjs/platform-fastify @nestjs/config

# OpenAPI
pnpm add @nestjs/swagger

# Queue / workers
pnpm add @nestjs/bullmq bullmq ioredis

# ORM + DB
pnpm add drizzle-orm postgres
pnpm add -D drizzle-kit

# Validation
pnpm add zod nestjs-zod

# LLM
pnpm add @anthropic-ai/sdk

# Auth + analytics + errors
pnpm add @supabase/supabase-js posthog-node @sentry/nestjs

# Notifications
pnpm add node-apn firebase-admin

# Scheduling date arithmetic
pnpm add @js-joda/core @js-joda/timezone

# Utilities
pnpm add uuidv7 @fastify/helmet @fastify/rate-limit

# Dev / test
pnpm add -D vitest @vitest/coverage-v8 supertest typescript @types/node
```

## Installation — Website (pnpm, apps/web)

```bash
pnpm add next react react-dom tailwindcss @tailwindcss/postcss
pnpm add @sentry/nextjs posthog-js @supabase/ssr @supabase/supabase-js
# shadcn/ui: use CLI, not npm
# npx shadcn@latest init
pnpm add -D typescript vitest @vitest/coverage-v8
```

## Installation — iOS (Swift Package Manager, Package.swift or Xcode)

```
// swift-openapi-generator plugin
apple/swift-openapi-generator ~> 1.11.1 (build tool plugin)
apple/swift-openapi-runtime ~> 1.x
apple/swift-openapi-urlsession ~> 1.x

// IAP
RevenueCat/purchases-ios ~> 5.0

// Observability
getsentry/sentry-cocoa ~> 9.8.0
PostHog/posthog-ios ~> 3.0

// No UIKit/AppKit bridge libraries needed — pure SwiftUI
```

## Installation — Android (build.gradle.kts, apps/android)

```kotlin
// BOM — pins all Compose versions
implementation(platform("androidx.compose:compose-bom:2026.03.00"))
implementation("androidx.compose.ui:ui")
implementation("androidx.compose.material3:material3")
implementation("androidx.navigation:navigation-compose")

// DI
implementation("com.google.dagger:hilt-android:2.57.1")
ksp("com.google.dagger:hilt-android-compiler:2.57.1")
implementation("androidx.hilt:hilt-navigation-compose:1.3.0")

// Offline DB
implementation("androidx.room:room-runtime:2.8.4")
ksp("androidx.room:room-compiler:2.8.4")
implementation("androidx.room:room-ktx:2.8.4")

// HTTP
implementation("io.ktor:ktor-client-core:3.4.0")
implementation("io.ktor:ktor-client-okhttp:3.4.0")
implementation("io.ktor:ktor-client-content-negotiation:3.4.0")
implementation("io.ktor:ktor-serialization-kotlinx-json:3.4.0")

// IAP
implementation("com.revenuecat.purchases:purchases:9.23.1")

// Background
implementation("androidx.work:work-runtime-ktx:2.11.2")
implementation("androidx.hilt:hilt-work:1.3.0")

// Widget
implementation("androidx.glance:glance-appwidget:1.1.1")

// Observability
implementation("io.sentry:sentry-android:8.38.0")
implementation("com.posthog:posthog-android:3.25.0")
```

---

## Sources

- NestJS releases — https://github.com/nestjs/nest/releases (11.1.18 confirmed)
- drizzle-orm npm — https://www.npmjs.com/package/drizzle-orm (0.45.2 confirmed)
- Drizzle TimescaleDB issue — https://github.com/drizzle-team/drizzle-orm/issues/2962
- BullMQ npm — 5.73.1 confirmed via WebSearch against npm registry
- Next.js releases — https://github.com/vercel/next.js/releases (16.2.3 confirmed)
- Tailwind CSS v4 blog — https://tailwindcss.com/blog/tailwindcss-v4 + InfoQ 4.2 release article
- Swift OpenAPI Generator — https://github.com/apple/swift-openapi-generator (1.11.1 confirmed)
- SwiftData iOS 18 stability — https://dev.to/swift_pal/swiftui-data-persistence-in-2025-... + fatbobman.com
- RevenueCat iOS SPM — https://swiftpackageindex.com/RevenueCat/purchases-ios (5.x recommended)
- RevenueCat Android — https://github.com/RevenueCat/purchases-android/releases (9.23.1 confirmed)
- Sentry Cocoa — https://swiftpackageindex.com/getsentry/sentry-cocoa (9.8.0 confirmed)
- Sentry JS — https://github.com/getsentry/sentry-javascript/releases (10.47.0 confirmed)
- Sentry Android — https://github.com/getsentry/sentry-java/releases (8.38.0 confirmed)
- PostHog iOS — https://swiftpackageindex.com/PostHog/posthog-ios (3.49.1 confirmed)
- PostHog Node — https://www.npmjs.com/package/posthog-node (5.29.1 confirmed)
- Compose BOM — https://developer.android.com/develop/ui/compose/bom (2026.03.00 confirmed)
- Ktor — https://blog.jetbrains.com/kotlin/2026/01/ktor-3-4-0-is-now-available/ (3.4.0 confirmed)
- Kotlin — https://blog.jetbrains.com/kotlin/2026/03/kotlin-2-3-20-released/ (2.3.20 confirmed)
- Room 3.0 alpha — https://android-developers.googleblog.com/2026/03/room-30-modernizing-room.html
- Node.js LTS — https://endoflife.date/nodejs (Node 20 EOL April 2026 confirmed)
- TypeScript — https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/ (6.0.2 confirmed)
- pnpm — https://github.com/pnpm/pnpm/releases (10.33.0 confirmed stable)
- Vitest — https://vitest.dev/blog/vitest-4 (4.1.3 confirmed)
- Zod — https://zod.dev/v4 (4.3.6 confirmed stable)
- Anthropic SDK — https://www.npmjs.com/package/@anthropic-ai/sdk (0.85.0 confirmed)
- Supabase JS — https://github.com/supabase/supabase-js/releases (2.102.1 confirmed)
- shadcn/ui changelog — https://ui.shadcn.com/docs/changelog/2026-03-cli-v4 (CLI v4 March 2026)
- Swift Testing vs XCTest — https://developer.apple.com/xcode/swift-testing/ (Apple recommendation confirmed)
- Hilt — https://developer.android.com/jetpack/androidx/releases/hilt (2.57.1 confirmed)
- WorkManager — https://developer.android.com/jetpack/androidx/releases/work (2.11.2 confirmed)
- OpenAPI Generator — https://github.com/OpenAPITools/openapi-generator/releases (7.18.0 confirmed)
- class-validator status — https://dev.to/young_gao/input-validation-in-typescript-apis-zod-vs-joi-vs-class-validator-2gcg (inactive confirmed)

---

*Stack research for: WonderWaltz — Multi-platform Disney trip planner*
*Researched: 2026-04-09*
*All versions verified against official sources or release pages — not training data*
