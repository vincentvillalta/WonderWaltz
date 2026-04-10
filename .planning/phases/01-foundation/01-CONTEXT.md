# Phase 1: Foundation — Context

**Gathered:** 2026-04-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 1 delivers the complete developer environment foundation so that Phase 2 can start writing data without friction. Specifically: monorepo scaffolded with all workspace packages compiling, CI green on every app, Supabase + Railway + Upstash + Vercel provisioned, Postgres schema migrated (including TimescaleDB hypertable via raw SQL), WDW catalog seeded, design system brand direction locked with token pipeline producing Swift/Kotlin/CSS output, and the unofficial-fan-app disclaimer wired into every API response from day one.

**31 requirements:** FND-01..12, DSGN-01..08, DB-01..08, LEGL-02, LEGL-03, LEGL-07

</domain>

<decisions>
## Implementation Decisions

### Monorepo tooling & ordering

- **Turborepo with Vercel Remote Cache** on top of pnpm 10 workspaces. `turbo.json` caches `build`, `lint`, `test`, `typecheck` outputs. Remote cache shared across local + CI for free under Vercel's free tier.
- **Real shell projects for iOS and Android in Phase 1.** `apps/ios` = empty Xcode project targeting iOS 17, Swift 6, SwiftUI. `apps/android` = empty Gradle project targeting min SDK 26, Kotlin K2 2.3.20, Jetpack Compose BOM 2026.03. Both compile and display "Hello WonderWaltz" — nothing else until Phase 5/7. Both pass CI from day 1.
- **Conventional commits enforced** via commitlint + husky + lint-staged. Format: `feat(scope): ...`, `fix(scope): ...`, etc. lint-staged runs ESLint + Prettier on staged files only.
- **Strict toolchain pinning:** `.nvmrc` + `.node-version` + `packageManager` field in root `package.json` (pnpm 10) + `engines` field requiring Node 22. `corepack enable` picks up pnpm automatically.

### CI/CD strategy

- **iOS CI: Xcode Cloud from day 1.** Apple-hosted. Free tier: 25 hours/month. Runs `xcodebuild build` (compile check, no tests, no archive) on every PR. Separate dashboard from GitHub Actions — a webhook or badge integration is needed to reflect Xcode Cloud build status in the GitHub PR UI.
- **Android CI: GitHub Actions Linux runner** running `./gradlew assembleDebug` on every PR from day 1. Lint + unit test hooks wired as no-ops until Phase 7 writes code.
- **Backend + web CI: GitHub Actions Linux runner.** Turborepo runs `turbo run build lint typecheck test` across `apps/api`, `apps/web`, and all `packages/`.
- **Branch protection on `main`:** Required CI green + squash merge + linear history + no force push. Each PR = one atomic squash commit on main.
- **Preview deploys:** Vercel preview deploys for `apps/web` only on every PR (native Vercel integration). No Railway preview environments in Phase 1 (deferred to Phase 2 when there's API surface to review).

### Supabase RLS posture

- **Fully restrictive RLS from day 1** on all tables. Only the service role key can read/write. NestJS is the sole data access path — no Supabase client SDK direct DB access from mobile/web.
- **Catalog tables** (parks, attractions, dining, shows, resorts, walking_graph): RLS enabled, service-role-only. All catalog reads go through NestJS `/catalog/*` endpoints.
- **TimescaleDB tables** (`wait_times_history`, `wait_times_1h`) and `llm_costs`: RLS enabled, service-role-only. Ingestion workers + NestJS admin endpoints are the only consumers.
- **RLS integration tests in Phase 1:** Vitest integration tests against a local Supabase instance (`supabase start`) that verify RLS blocks non-service-role reads. Two-user test: create user A trip, verify user B (via anon key) cannot read it. This catches RLS regressions forever.

### Design system token pipeline

- **Style Dictionary 4.x** as the build tool. `packages/design-tokens/tokens.json` is the single source, organized as two-tier primitives → semantics.
- **Two-tier naming scheme:** `color.primitive.blue.500` (raw palette) → `color.semantic.surface.raised` (role). Semantics reference primitives. Components only use semantics — never reference primitives directly.
- **Dark mode from day 1.** Both light and dark semantic token sets defined in `tokens.json`. Generators emit both variants for each platform.
- **Build outputs (all committed to `packages/design-tokens/generated/`):**
  1. Swift constants file (`WWDesignTokens.swift`) — `Color.WWBrand.primary`, dynamic light/dark
  2. Compose theme Kotlin file (`WWTheme.kt`) — `WWTheme.colors.primary`, light/dark ColorScheme
  3. Tailwind v4 CSS variables — `--color-primary-500` + `@theme` directive in the Tailwind config layer
  4. TypeScript constants file (`tokens.ts`) — for Next.js admin UI logic that isn't purely CSS (chart colors, etc.)
- **Brand direction exploration** delegated to `ui-designer` agent: three directions (vintage travel poster / warm modern minimalism / painterly whimsy) with a recommendation. Brand direction locked in `docs/design/BRAND.md` before any UI is built. Palette, type, icon set, motion language, voice guide, and per-park accent colors all defined in BRAND.md. Tokens derived from the selected direction.

### Disclaimer injection mechanism

- **NestJS global interceptor** adds `X-WW-Disclaimer` response header on every HTTP response AND wraps all JSON responses in `{ data, meta: { disclaimer } }` envelope. Disclaimer text: *"WonderWaltz is an independent, unofficial planning app. Not affiliated with, endorsed by, or sponsored by The Walt Disney Company."*
- **Web (Next.js):** Footer component on every page containing the disclaimer text. No banner. Footer is part of the root layout, so it renders on every route (marketing + admin).
- **Mobile (iOS + Android):** Disclaimer text stored in a shared i18n-ready constant. Rendered in Settings > About screen + on the Paywall screen (before the user pays — strongest legal defense point).
- **i18n readiness:** English only at launch. Disclaimer text externalized into a single source of truth file (`packages/content/legal/disclaimer.en.json` or `.md`) that all platforms read from. Scripts generate Swift/Kotlin/TS constants from it. When Spanish/PT translations ship in v1.1, they're drop-in additions to the same file.

### Drizzle schema organization (Claude's Discretion — not discussed, using sensible defaults)

- Split schema files per domain: `users.ts`, `trips.ts`, `catalog.ts`, `timeseries.ts`, `entitlements.ts`, `notifications.ts`, `affiliate.ts`, `ops.ts` — all inside `packages/db/schema/`
- Raw SQL migrations for TimescaleDB DDL (hypertable creation, continuous aggregate) in `packages/db/migrations/raw/` — executed after Drizzle migrations
- WDW catalog seed via TypeScript script reading from versioned YAML/JSON in `packages/content/wdw/`
- Content package versioning: git-tracked YAML files with a `content_version` field; seed script is idempotent (upserts by external ID)

### Claude's Discretion (not discussed, builder decides)

- ESLint + Prettier configuration details (flat config, plugin selection)
- tsconfig sharing strategy (base tsconfig in root, extends per app)
- Workspace dependency protocol (`workspace:*` vs exact versions)
- Supabase CLI local dev workflow (docker vs native)
- Drizzle migration naming convention
- Exact Sentry DSN + PostHog key provisioning steps
- GitHub Actions workflow file naming / reusable workflow design
- Turbo pipeline dependency graph (`dependsOn` config in `turbo.json`)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets

- None. Repo contains only `.planning/`, `.claude/agents/`, and `docs/legal/trademark-search-2026.md`. Phase 1 is entirely greenfield scaffolding.

### Established Patterns

- **GSD commit format** (`feat(scope): ...`, `docs(scope): ...`) already in use via `gsd-tools commit`. commitlint convention should match this format (type: `feat`, `fix`, `chore`, `docs`, `test`, `refactor`, `ci`, `style`; scope: app/package name or phase number).
- **Planning directory structure** (`.planning/phases/XX-name/`) is established and should not be disturbed by monorepo tooling (not included in Turborepo pipeline, not linted, not formatted).

### Integration Points

- Phase 2 (Data Pipeline) depends on: `packages/db` schema being migrated, Supabase running, Redis provisioned, NestJS `apps/api` compiling, BullMQ wired.
- Phase 3 (Engine) depends on: `packages/solver` package existing (empty but compiling), `packages/db` schema for plans/plan_days/plan_items, OpenAPI spec first draft from `@nestjs/swagger`.
- Phase 5 (iOS) depends on: `apps/ios` shell project compiling, `packages/design-tokens/generated/WWDesignTokens.swift` existing, `packages/shared-openapi/openapi.json` existing.
- Phase 7 (Android) depends on: `apps/android` shell project compiling, `packages/design-tokens/generated/WWTheme.kt` existing.

</code_context>

<specifics>
## Specific Ideas

- The `ui-designer` agent produces the brand exploration with three concrete directions including mood boards, palette proposals, type pairings, and a recommendation. The founder picks. Once locked, BRAND.md is the canonical reference for all downstream design work. No UI PR should merge without `ui-ux-designer` review.
- The `docs/design/` folder is created in Phase 1 with at minimum: `BRAND.md`, `COMPONENTS.md` (empty template), `ACCESSIBILITY.md`, `ICONOGRAPHY.md`.
- Supabase local dev: `supabase init` + `supabase start` should be runnable from the repo root. RLS integration tests assume a running local Supabase instance.
- The NestJS API response envelope `{ data, meta: { disclaimer } }` becomes the standard API response shape for the entire project. All downstream modules (Phase 2+) should use it — this is an architectural decision, not just a legal one.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within Phase 1 scope.

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-04-09*
