# Phase 1: Foundation — Research

**Researched:** 2026-04-09
**Domain:** Monorepo scaffolding, database schema, design system, disclaimer architecture
**Confidence:** HIGH (stack verified against STACK.md; tool-specific details verified via official docs and Context7)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- Turborepo with Vercel Remote Cache on pnpm 10 workspaces. `turbo.json` caches `build`, `lint`, `test`, `typecheck` outputs.
- Real iOS shell (Xcode project, Swift 6, SwiftUI iOS 17+) and Android shell (Gradle, Kotlin K2 2.3.20, Jetpack Compose BOM 2026.03) both compiling in Phase 1.
- Xcode Cloud for iOS CI. GitHub Actions for everything else.
- Conventional commits enforced via commitlint + husky + lint-staged. lint-staged runs ESLint + Prettier on staged files only.
- Strict toolchain pinning: `.nvmrc`, `.node-version`, `packageManager` field, `engines` field (Node 22).
- Style Dictionary 4.x with two-tier (primitive → semantic) tokens, dark mode from day 1, outputs to Swift/Compose/CSS/TS.
- Fully restrictive Supabase RLS from day 1 (service-role-only on all tables), Vitest RLS integration tests.
- NestJS global interceptor: `X-WW-Disclaimer` header + `{ data, meta: { disclaimer } }` envelope on every HTTP response.
- Drizzle schema split per domain, raw SQL for TimescaleDB DDL, TypeScript seed script.
- NestJS 11 + Fastify, Drizzle 0.45, Zod 4, BullMQ 5.73 — all pinned in STACK.md.

### Claude's Discretion (builder decides)

- ESLint + Prettier configuration details (flat config, plugin selection)
- tsconfig sharing strategy (base tsconfig in root, extends per app)
- Workspace dependency protocol (`workspace:*` vs exact versions)
- Supabase CLI local dev workflow (docker vs native)
- Drizzle migration naming convention
- Exact Sentry DSN + PostHog key provisioning steps
- GitHub Actions workflow file naming / reusable workflow design
- Turbo pipeline dependency graph (`dependsOn` config in `turbo.json`)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within Phase 1 scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FND-01 | Monorepo scaffolded with pnpm workspaces containing all workspace packages | Turborepo pipeline section covers workspace layout and `turbo.json` shape |
| FND-02 | Node 22 LTS pinned in `.nvmrc`, `.node-version`, Railway config, and `package.json#engines` | Toolchain pinning section |
| FND-03 | TypeScript 6.0.2 configured across all TS packages with shared tsconfig | tsconfig sharing pattern in architecture section |
| FND-04 | GitHub Actions CI runs lint, typecheck, test, build for every app; Android + iOS CI wired from day 1 | CI section covers GHA + Xcode Cloud integration |
| FND-05 | Supabase project provisioned with Postgres + Auth + Storage + TimescaleDB + PostGIS | Drizzle + Supabase section covers provisioning and extension enablement |
| FND-06 | Railway project provisioned with `api` and `worker` services from same codebase | Architecture section; different start commands on Railway |
| FND-07 | Upstash Redis instance provisioned for BullMQ + live wait cache | Infrastructure provisioning note |
| FND-08 | Vercel project provisioned for `apps/web` with production + preview deploys | Turborepo remote cache section; Vercel integration |
| FND-09 | RevenueCat account provisioned with iOS + Android configurations | Provisioning checklist |
| FND-10 | Sentry projects provisioned for NestJS, Next.js, iOS, Android | Provisioning checklist |
| FND-11 | PostHog project provisioned with event schema audit rule blocking guest age data | LEGL-07 tie-in in schema section |
| FND-12 | Secrets managed via Railway + Vercel env vars; local via `.env.local`; no secrets in git | Secrets management section |
| DSGN-01 | `ui-designer` agent produces three brand direction explorations | Design system section |
| DSGN-02 | Brand direction locked in `docs/design/BRAND.md` | Design system section |
| DSGN-03 | Design tokens in `packages/design-tokens/tokens.json` as single source of truth | Style Dictionary section |
| DSGN-04 | Token build generates Swift constants, Compose theme, Tailwind v4 CSS vars | Style Dictionary transform pipeline section |
| DSGN-05 | Component catalog in `docs/design/COMPONENTS.md` | Design docs section |
| DSGN-06 | WCAG 2.2 AA accessibility rules in `docs/design/ACCESSIBILITY.md` | Design docs section |
| DSGN-07 | Iconography (Phosphor or Lucide) in `docs/design/ICONOGRAPHY.md` | Design docs section |
| DSGN-08 | `ui-ux-designer` reviews every UI PR | Process gate — no code change needed |
| DB-01 | Drizzle schema for users, trips, guests, trip_park_days, trip_preferences | Schema section |
| DB-02 | Drizzle schema for parks, attractions (PostGIS), dining, shows, parades, fireworks, resorts, walking_graph | Schema section |
| DB-03 | TimescaleDB hypertable `wait_times_history` via raw SQL migration | Drizzle + TimescaleDB section |
| DB-04 | Continuous aggregate `wait_times_1h` via Timescale DDL | Drizzle + TimescaleDB section |
| DB-05 | Drizzle schema for plans, plan_days, plan_items | Schema section |
| DB-06 | Drizzle schema for entitlements, iap_events, llm_costs, push_tokens, affiliate_items, packing_list_items | Schema section |
| DB-07 | Seed script idempotently loads WDW catalog from versioned YAML/JSON | WDW catalog section |
| DB-08 | RLS policies on trips, guests, plans, plan_days, plan_items limit reads/writes to owning user_id | Supabase RLS section |
| LEGL-02 | Every API response, web page, and mobile screen carries the disclaimer | Disclaimer interceptor section |
| LEGL-03 | No Disney trademarked imagery anywhere | Design docs + brand direction constraint |
| LEGL-07 | Guest age stored as bracket strings, not birthdates; never in PostHog properties | Schema section (guests table age_bracket field) |
</phase_requirements>

---

## Summary

Phase 1 is a scaffolding phase — it produces no user-visible features but creates the load-bearing structure every later phase depends on. The work falls into five domains: monorepo tooling, database schema + migrations, design system token pipeline, service provisioning, and disclaimer architecture.

The single biggest risk in this phase is getting the Turborepo pipeline dependency graph wrong. If `packages/db` or `packages/design-tokens` are not declared as transitive build dependencies of `apps/api`, `apps/web`, and the mobile shells, CI will cache stale build outputs and developers will spend hours debugging why changes to shared packages are not reflected in downstream apps. The dependency graph must be explicit and correct from the first commit.

The second biggest risk is the TimescaleDB migration story. Drizzle 0.45 does not emit `create_hypertable` or continuous aggregate DDL. The pattern is to generate a normal Drizzle migration for the `wait_times_history` table, then create a separate custom SQL migration using `drizzle-kit generate --custom` that calls `create_hypertable`. These two migrations must run in order and are both committed to the `packages/db/migrations/` folder. Getting this wrong means the hypertable is never created and Phase 2 data ingestion silently writes to a standard Postgres table with no time-series indexing.

The Style Dictionary 4 transform pipeline requires custom work for two of the four outputs. The `ios-swift` built-in group emits UIKit `UIColor`, not SwiftUI `Color` — a custom transform swapping in `color/ColorSwiftUI` is required. Tailwind v4 uses the `@theme` directive rather than CSS variable injection at `:root`, so no existing Style Dictionary formatter targets it directly; a short custom formatter wrapping the generated CSS in `@theme {}` is needed.

**Primary recommendation:** Scaffold the Turborepo pipeline, Drizzle migration workflow, and Style Dictionary config in that order. These three form the critical path; everything else (provisioning, brand exploration, docs scaffolding) is parallelizable.

---

## 1. Turborepo Pipeline Design

### Correct `turbo.json` Shape (Turborepo 2.x)

Turborepo 2.x uses a `tasks` key (not `pipeline`). The `pipeline` key is v1 and will print a deprecation warning.

```json
{
  "$schema": "https://turborepo.com/schema.json",
  "ui": "tui",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "!.next/cache/**", "generated/**"]
    },
    "typecheck": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "lint": {
      "dependsOn": [],
      "outputs": []
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

**Key rules:**
- `"dependsOn": ["^build"]` means "wait for the `build` task of every workspace this package depends on." This is how `apps/api` waits for `packages/db` to build before it starts its own build.
- `"dependsOn": []` for `lint` means lint is independent and runs in parallel across all packages.
- `outputs` determines what gets cached. Omit or set `[]` to cache only logs. Add the dist path to cache compiled output.
- `"!.next/cache/**"` excludes Next.js internal cache from Turborepo's cache (Next.js manages that separately).

### Workspace Dependency Graph

```
apps/api
  └── packages/db          (drizzle schema + types)
  └── packages/shared-openapi  (OpenAPI types, generated from NestJS swagger)
  └── packages/solver      (pure TS solver, zero NestJS)
  └── packages/content     (WDW YAML catalog, disclaimer text)

apps/web
  └── packages/design-tokens  (generated CSS vars)
  └── packages/shared-openapi  (OpenAPI TS types for web client)
  └── packages/content

apps/ios  (not in turbo pipeline — Xcode Cloud handles iOS)
apps/android  (not in turbo pipeline — Gradle handles Android)

packages/db
  └── (no internal workspace deps — depends only on drizzle-orm)

packages/design-tokens
  └── (no internal workspace deps — depends only on style-dictionary)

packages/solver
  └── packages/db  (type imports only, no runtime dep on NestJS)

packages/shared-openapi
  └── (generated output — no workspace deps)

packages/content
  └── (pure data files + generated constants — no workspace deps)
```

**Critical:** `apps/ios` and `apps/android` must NOT be included in the `turbo run` pipeline. They are compiled by Xcode Cloud and Gradle/GitHub Actions respectively. Including them would cause turbo to try to run `npm run build` on Xcode/Gradle projects which have no `package.json`.

### Remote Cache (Vercel)

Enable Vercel Remote Cache by running `turbo login` and `turbo link` in the project root. This links the repo to a Vercel project and automatically uses Vercel's remote cache endpoint. No additional configuration in `turbo.json` is needed — the token is stored in `~/.turbo/config.json` and in CI via `TURBO_TOKEN` + `TURBO_TEAM` environment variables.

```bash
# One-time setup
npx turbo login
npx turbo link

# CI env vars to set in GitHub Actions secrets:
# TURBO_TOKEN=<vercel_token>
# TURBO_TEAM=<vercel_team_slug>
```

### `pnpm-workspace.yaml`

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

**Exclude `.planning/` from pnpm and Turborepo entirely** — no `package.json` there. It should not appear in workspace globs.

### Per-package `package.json` scripts (standard shape)

Every TS package must declare the same script names so Turborepo can find them:

```json
{
  "scripts": {
    "build": "tsc --project tsconfig.build.json",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src",
    "test": "vitest run"
  }
}
```

`packages/design-tokens` uses `style-dictionary build` as its build command, not `tsc`.

---

## 2. Drizzle + TimescaleDB + PostGIS Migration Workflow

### Core Pattern

**Use `drizzle-kit generate` + `drizzle-kit migrate`. Never use `drizzle-kit push` in production or staging.**

`push` applies changes directly without creating SQL files. It cannot be reviewed, cannot be rolled back, and has no audit trail. `generate` creates versioned `.sql` files in `packages/db/migrations/` that are committed to git and applied by `migrate`.

### Migration Folder Layout

```
packages/db/
  migrations/
    0000_initial_schema.sql          # generated by drizzle-kit generate
    0001_timescale_hypertable.sql     # custom raw SQL (drizzle-kit generate --custom)
    0002_timescale_continuous_agg.sql # custom raw SQL (drizzle-kit generate --custom)
    meta/
      _journal.json                  # drizzle-kit metadata — do not edit manually
  schema/
    users.ts
    trips.ts
    catalog.ts
    timeseries.ts
    entitlements.ts
    notifications.ts
    affiliate.ts
    ops.ts
  drizzle.config.ts
  index.ts                           # re-exports all schema tables + types
```

### Creating the TimescaleDB Hypertable (custom migration)

Step 1: Define `wait_times_history` as a normal Drizzle table in `timeseries.ts`:

```typescript
// packages/db/schema/timeseries.ts
import { pgTable, uuid, integer, boolean, timestamp, text } from 'drizzle-orm/pg-core';

export const waitTimesHistory = pgTable('wait_times_history', {
  rideId:    uuid('ride_id').notNull(),
  ts:        timestamp('ts', { withTimezone: true }).notNull(),
  minutes:   integer('minutes').notNull(),
  isOpen:    boolean('is_open').notNull(),
  source:    text('source').notNull(), // 'queue-times' | 'themeparks-wiki'
  fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull().defaultNow(),
});
```

Step 2: Generate the standard migration:
```bash
cd packages/db
npx drizzle-kit generate
# Creates 0000_initial_schema.sql
```

Step 3: Create the hypertable custom migration:
```bash
npx drizzle-kit generate --custom --name=timescale_hypertable
# Creates 0001_timescale_hypertable.sql (empty)
```

Step 4: Fill the custom migration file:
```sql
-- 0001_timescale_hypertable.sql
-- Enable TimescaleDB extension (already enabled on Supabase, but idempotent)
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- Convert wait_times_history to hypertable
SELECT create_hypertable(
  'wait_times_history',
  'ts',
  if_not_exists => TRUE,
  chunk_time_interval => INTERVAL '7 days'
);

-- Create composite index for the solver's query pattern
CREATE INDEX IF NOT EXISTS idx_wth_ride_ts
  ON wait_times_history (ride_id, ts DESC);
```

Step 5: Create the continuous aggregate custom migration:
```bash
npx drizzle-kit generate --custom --name=timescale_continuous_agg
# Creates 0002_timescale_continuous_agg.sql (empty)
```

Step 6: Fill the continuous aggregate migration:
```sql
-- 0002_timescale_continuous_agg.sql
CREATE MATERIALIZED VIEW wait_times_1h
WITH (timescaledb.continuous) AS
  SELECT
    ride_id,
    time_bucket('1 hour', ts) AS hour_bucket,
    AVG(minutes)::integer      AS avg_minutes,
    MIN(minutes)               AS min_minutes,
    MAX(minutes)               AS max_minutes,
    COUNT(*)                   AS sample_count,
    BOOL_AND(is_open)          AS was_open
  FROM wait_times_history
  GROUP BY ride_id, hour_bucket
WITH NO DATA;

-- Retention policy: keep raw data for 2 years
SELECT add_retention_policy('wait_times_history', INTERVAL '2 years');

-- Continuous aggregate refresh policy: refresh hourly, 2-hour lag
SELECT add_continuous_aggregate_policy(
  'wait_times_1h',
  start_offset  => INTERVAL '3 hours',
  end_offset    => INTERVAL '1 hour',
  schedule_interval => INTERVAL '1 hour'
);
```

### drizzle.config.ts

```typescript
// packages/db/drizzle.config.ts
import type { Config } from 'drizzle-kit';

export default {
  schema:    './schema/*',
  out:       './migrations',
  dialect:   'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
```

### Applying Migrations

```bash
# Local dev (supabase start must be running)
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
  npx drizzle-kit migrate

# Production (run as part of Railway deploy hook)
DATABASE_URL="$DATABASE_URL" npx drizzle-kit migrate
```

**Important:** TimescaleDB custom migrations will fail if the TimescaleDB extension is not enabled. On Supabase, enable it manually in the dashboard (Database → Extensions → timescaledb) before running migrations for the first time. The `CREATE EXTENSION IF NOT EXISTS timescaledb` in the migration is a safety guard but extension enablement on Supabase requires superuser access that the migration user may not have.

### PostGIS for Attractions

The `attractions` table needs a PostGIS `geometry` column for `location_point`. Supabase has PostGIS enabled by default.

```typescript
// In packages/db/schema/catalog.ts
import { customType } from 'drizzle-orm/pg-core';

// Drizzle has no native PostGIS type — use customType
const point = customType<{ data: string; driverData: string }>({
  dataType() {
    return 'geometry(Point, 4326)';
  },
});

export const attractions = pgTable('attractions', {
  id:            uuid('id').primaryKey().defaultRandom(),
  parkId:        uuid('park_id').notNull(),
  externalId:    text('external_id').notNull().unique(), // queue-times.com id
  name:          text('name').notNull(),
  locationPoint: point('location_point'), // nullable — not all attractions have coords
  heightReqCm:   integer('height_req_cm'),  // null = no height requirement
  // ... other fields
});
```

---

## 3. Style Dictionary 4 Transform Pipeline

### What Style Dictionary 4 Provides Out of the Box

**Confidence: HIGH** — verified against styledictionary.com official docs.

| Output Target | Built-in Format | Built-in Transform Group | Color Output |
|---|---|---|---|
| iOS Swift | `ios-swift/class.swift` or `ios-swift/enum.swift` | `ios-swift` | `UIColor` (UIKit) |
| Android Compose | `compose/object` | `compose` | `Color(0xFF...)` (Compose) |
| CSS variables | `css/variables` | `css` | `rgba(r, g, b, a)` |
| TypeScript | `javascript/es6` | `js` | hex string |

### The iOS Problem: UIColor vs SwiftUI Color

The built-in `ios-swift` transform group uses `color/UIColorSwift` which emits `UIColor`. WonderWaltz targets SwiftUI exclusively. You need `color/ColorSwiftUI` instead.

**Solution:** Override the transform group or specify transforms explicitly:

```javascript
// packages/design-tokens/style-dictionary.config.mjs
import StyleDictionary from 'style-dictionary';

export default {
  source: ['tokens.json'],
  platforms: {
    swift: {
      transformGroup: 'ios-swift',
      transforms: [
        'attribute/cti',
        'name/camel',
        'color/ColorSwiftUI',   // <-- swap UIColorSwift for ColorSwiftUI
        'content/swift/literal',
        'asset/swift/literal',
        'size/swift/remToCGFloat',
      ],
      buildPath: 'generated/',
      files: [{
        destination: 'WWDesignTokens.swift',
        format: 'ios-swift/class.swift',
        className: 'WWDesignTokens',
        filter: { attributes: { category: 'color' } },
        options: {
          outputReferences: false,
        },
      }],
    },
    compose: {
      transformGroup: 'compose',
      buildPath: 'generated/',
      files: [{
        destination: 'WWTheme.kt',
        format: 'compose/object',
        className: 'WWThemeTokens',
        packageName: 'com.wonderwaltz.design',
        filter: { attributes: { category: 'color' } },
      }],
    },
    css: {
      transformGroup: 'css',
      buildPath: 'generated/',
      files: [{
        destination: 'tokens.css',
        format: 'css/variables',
      }],
    },
    typescript: {
      transformGroup: 'js',
      buildPath: 'generated/',
      files: [{
        destination: 'tokens.ts',
        format: 'javascript/es6',
      }],
    },
  },
};
```

### Dark Mode Strategy

Style Dictionary 4 does not have a built-in dark mode mechanism. The recommended pattern is to define two token sets and run two separate builds.

**tokens.json structure:**
```json
{
  "color": {
    "primitive": {
      "blue": { "500": { "value": "#2563EB", "type": "color" } }
    },
    "semantic": {
      "surface": {
        "raised": {
          "light": { "value": "{color.primitive.neutral.100}", "type": "color" },
          "dark":  { "value": "{color.primitive.neutral.900}", "type": "color" }
        }
      }
    }
  }
}
```

**Build script produces two Swift files:**
- `WWDesignTokens.swift` — static tokens (primitives, non-adaptive)
- `WWDesignTokensDark.swift` — dark mode semantic overrides

For SwiftUI, wrap colors in a `Color(light:dark:)` pattern using `UITraitCollection` under the hood, or use the Xcode asset catalog approach where Style Dictionary generates two asset catalog entries per semantic token.

**For Compose:** The `compose/object` format generates a `MaterialTheme`-compatible ColorScheme. Pass `lightColors` and `darkColors` objects to `MaterialTheme { colorScheme = ... }`.

**For Tailwind v4:** Tailwind v4 uses `@theme` directives, not `:root` CSS variables directly. No existing Style Dictionary formatter targets `@theme` natively.

**Tailwind v4 custom formatter:**
```javascript
// In style-dictionary.config.mjs — register a custom format
StyleDictionary.registerFormat({
  name: 'css/tailwind-v4',
  format: ({ dictionary }) => {
    const vars = dictionary.allTokens
      .map(token => `  --${token.name}: ${token.value};`)
      .join('\n');
    return `@theme {\n${vars}\n}\n`;
  },
});
```

Then use `format: 'css/tailwind-v4'` for the Tailwind output file. This file is imported in `apps/web/src/app/globals.css` alongside `@import "tailwindcss"`.

### Two-Tier Token Naming in tokens.json

```json
{
  "color": {
    "primitive": {
      "blue":    { "500": { "value": "#2563EB", "type": "color" } },
      "neutral": { "100": { "value": "#F3F4F6", "type": "color" },
                   "900": { "value": "#111827", "type": "color" } }
    },
    "semantic": {
      "brand": {
        "primary": { "value": "{color.primitive.blue.500}", "type": "color" }
      },
      "surface": {
        "default": { "light": { "value": "{color.primitive.neutral.100}" },
                     "dark":  { "value": "{color.primitive.neutral.900}" } }
      }
    }
  },
  "spacing": {
    "primitive": {
      "4":  { "value": "4px",  "type": "dimension" },
      "8":  { "value": "8px",  "type": "dimension" },
      "16": { "value": "16px", "type": "dimension" }
    }
  }
}
```

**Rule enforced in code review:** Components reference only semantic tokens. Never `color.primitive.blue.500` in a component file.

---

## 4. Supabase RLS + Drizzle Integration

### How RLS Bypass Works with Service Role

**Confidence: HIGH** — verified against Supabase official docs.

The service role key bypasses RLS. Critically, the bypass is driven by the `Authorization: Bearer <service_role_key>` header, NOT the `apikey` header. NestJS's Drizzle client must be configured with the service role key in the connection string, not via the Supabase JS client headers.

**The correct pattern for NestJS:** Use Drizzle directly with the Postgres driver (`postgres` npm package) pointing at Supabase's `DATABASE_URL` (which includes the password). This connection bypasses RLS entirely because it connects as the `postgres` superuser, not as an authenticated Supabase user. This is the intended pattern for a backend service that is the sole data-access layer.

```typescript
// packages/db/index.ts — database client factory
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export function createDb(connectionString: string) {
  const client = postgres(connectionString, { prepare: false });
  // prepare: false required for Supabase PgBouncer (transaction mode)
  return drizzle(client, { schema });
}

// In NestJS AppModule:
// DATABASE_URL = Supabase's "Direct connection" URL (port 5432)
// NOT the connection pooler URL — use pooler (port 6543) only for
// short-lived serverless functions; Railway runs long-lived processes
// so direct connection is correct.
```

### RLS Policies (Schema-Level Declaration)

Define RLS policies in the Supabase dashboard or via raw SQL migration. Do NOT attempt to use Drizzle's `drizzle-orm/pg-core` `pgPolicy` API for complex policies — it is new and has rough edges as of 0.45. Use raw SQL custom migrations for RLS policies.

```sql
-- Custom migration: 0003_rls_policies.sql

-- Enable RLS on user-owned tables
ALTER TABLE trips      ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests     ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans      ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_days  ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_items ENABLE ROW LEVEL SECURITY;

-- Policy: users can only see their own trips
CREATE POLICY "trips_owner_only" ON trips
  FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "guests_owner_only" ON guests
  FOR ALL
  USING (
    trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid())
  );

-- Catalog tables: read-only for authenticated users, write blocked
-- (NestJS service role bypasses these via direct connection)
ALTER TABLE parks       ENABLE ROW LEVEL SECURITY;
ALTER TABLE attractions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "catalog_read_only" ON parks
  FOR SELECT
  USING (true); -- public read

CREATE POLICY "catalog_read_only" ON attractions
  FOR SELECT
  USING (true); -- public read
```

### Local Dev Workflow

```bash
# Install Supabase CLI
brew install supabase/tap/supabase

# Init (creates supabase/ folder with config.toml)
supabase init

# Start local Supabase (runs Docker containers)
supabase start
# Outputs:
#   API URL: http://127.0.0.1:54321
#   DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
#   Anon key: eyJ...
#   Service role key: eyJ...

# Apply Drizzle migrations to local Supabase
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
  pnpm --filter @wonderwaltz/db drizzle-kit migrate
```

### RLS Integration Test Pattern (Vitest)

```typescript
// packages/db/tests/rls.integration.test.ts
import { createClient } from '@supabase/supabase-js';
import { describe, it, expect, beforeAll } from 'vitest';

const SUPABASE_URL = 'http://127.0.0.1:54321';
const ANON_KEY = process.env.SUPABASE_ANON_KEY!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

describe('RLS policies', () => {
  it('anon key cannot read trips of another user', async () => {
    // 1. Create user A trip via service role
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: trip } = await admin
      .from('trips')
      .insert({ user_id: 'user-a-uuid', name: 'Test Trip' })
      .select()
      .single();

    // 2. Try to read as unauthenticated anon
    const anon = createClient(SUPABASE_URL, ANON_KEY);
    const { data, error } = await anon
      .from('trips')
      .select('*')
      .eq('id', trip.id);

    expect(data).toHaveLength(0); // RLS blocks the read
    // Clean up
    await admin.from('trips').delete().eq('id', trip.id);
  });
});
```

Run with: `vitest run packages/db/tests/rls.integration.test.ts`
Requires: `supabase start` running locally.

---

## 5. Xcode Cloud + GitHub Status Reporting

### How the Integration Works

**Confidence: HIGH** — verified against official Apple documentation and community sources.

Xcode Cloud integrates with GitHub through the **"Xcode Cloud" GitHub App** (installable at `github.com/apps/xcode-cloud`). When you connect Xcode Cloud to a GitHub repository, it installs this App on your GitHub account or org. The App then:

1. **Receives webhook events** from GitHub (push, pull_request)
2. **Triggers Xcode Cloud builds** in response
3. **Reports build results back as GitHub status checks** — these appear as the standard "Checks" section on a PR

**This is automatic.** No custom webhook receiver, no badge URL generation, no GitHub Actions step is needed to report Xcode Cloud results to GitHub PRs. The Xcode Cloud GitHub App handles it natively.

### Minimal Compile-Only Workflow

Xcode Cloud workflows are configured in Xcode (Product → Xcode Cloud → Create Workflow), not in YAML files. The equivalent of "compile only" is:

- **Action type:** Build
- **Scheme:** WonderWaltz
- **Configuration:** Debug
- **Platform:** iOS Simulator (fastest, no provisioning needed)
- **Archive:** Disabled
- **Test action:** Disabled (do not add a Test action)
- **Post-action:** None

**Start condition:** Pull Request changes to `main` or any branch.

Custom shell scripts go in `apps/ios/ci_scripts/` alongside the `.xcodeproj`. For Phase 1 a compile-only workflow has no custom scripts needed.

### CI Configuration in Xcode

The workflow is stored in Xcode project metadata (`.xcworkspace/xcshareddata/WorkspaceSettings.xcsettings` and App Store Connect). It is not a file you commit — it lives in Apple's infrastructure. What you DO commit is the `ci_scripts/` folder if you have pre/post-build scripts.

### Branch Protection Requirement

After connecting the Xcode Cloud GitHub App and creating the workflow, add `Xcode Cloud` as a required status check in GitHub branch protection rules for `main`. The check name in GitHub will be `ci/xcode-cloud` or the workflow name you configured.

**Known limitation:** The Xcode Cloud free tier is 25 compute hours/month. A compile-only build for an empty SwiftUI "Hello World" project typically takes 5-8 minutes including VM spin-up, so 25 hours covers approximately 180-300 PR builds per month — more than enough for a solo founder.

---

## 6. NestJS Envelope Interceptor + OpenAPI Impact

### The Interceptor

```typescript
// apps/api/src/common/interceptors/response-envelope.interceptor.ts
import {
  Injectable, NestInterceptor, ExecutionContext, CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

const DISCLAIMER =
  'WonderWaltz is an independent, unofficial planning app. ' +
  'Not affiliated with, endorsed by, or sponsored by The Walt Disney Company.';

export interface EnvelopedResponse<T> {
  data: T;
  meta: {
    disclaimer: string;
  };
}

@Injectable()
export class ResponseEnvelopeInterceptor<T>
  implements NestInterceptor<T, EnvelopedResponse<T>> {

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<EnvelopedResponse<T>> {
    const response = context.switchToHttp().getResponse();
    response.header('X-WW-Disclaimer', DISCLAIMER);

    return next.handle().pipe(
      map(data => ({
        data,
        meta: { disclaimer: DISCLAIMER },
      })),
    );
  }
}
```

Register globally in `AppModule` or `main.ts`:
```typescript
app.useGlobalInterceptors(new ResponseEnvelopeInterceptor());
```

### OpenAPI Impact: The Problem

When `@nestjs/swagger` generates the OpenAPI spec, it reads decorator metadata from controllers (`@ApiOkResponse({ type: TripDto })`). The global interceptor transforms the runtime response, but **Swagger does not know about the interceptor** — it will document `TripDto` directly, not `{ data: TripDto, meta: { disclaimer: string } }`.

This means:
- The OpenAPI spec shows `TripDto` as the response schema
- The actual runtime response is `{ data: TripDto, meta: { disclaimer } }`
- Mobile clients generated from the spec will try to deserialize `TripDto` directly and fail unless they unwrap the envelope first

### Solution: Generic Envelope DTO + Custom Decorator

```typescript
// apps/api/src/common/dto/api-response.dto.ts
export class ApiMetaDto {
  disclaimer: string;
}

export class ApiResponseDto<T> {
  data: T;
  meta: ApiMetaDto;
}
```

Create a decorator that wraps the Swagger schema:
```typescript
// apps/api/src/common/decorators/api-response.decorator.ts
import { applyDecorators } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from '@nestjs/swagger';
import { ApiMetaDto } from '../dto/api-response.dto';

export function ApiEnvelopedResponse<T>(model: new () => T) {
  return applyDecorators(
    ApiExtraModels(ApiMetaDto, model),
    ApiOkResponse({
      schema: {
        allOf: [
          {
            properties: {
              data: { $ref: getSchemaPath(model) },
              meta: { $ref: getSchemaPath(ApiMetaDto) },
            },
            required: ['data', 'meta'],
          },
        ],
      },
    }),
  );
}
```

Use on every controller endpoint instead of `@ApiOkResponse`:
```typescript
@Get(':id')
@ApiEnvelopedResponse(TripDto)
findOne(@Param('id') id: string) {
  return this.tripService.findOne(id);
}
```

This makes the generated OpenAPI spec show the correct envelope shape, so Swift OpenAPI Generator and the Kotlin Ktor generator produce correct envelope-aware clients.

### Mobile Client Considerations

Swift OpenAPI Generator and Ktor OpenAPI Generator will generate a type like:
```swift
// Swift — generated from OpenAPI spec
struct GetTripResponse: Codable {
  let data: TripDTO
  let meta: MetaDTO
}
```

This is correct. The mobile client decodes the envelope and accesses `.data` for the actual payload.

**Do NOT** have mobile clients strip the envelope at a base layer — the `meta.disclaimer` field must be accessible for the About screen and required LEGL-02 compliance.

---

## 7. WDW Catalog Seed Data Shape + Row Counts

### Data Sources

**queue-times.com API:**
- `GET https://queue-times.com/parks.json` — all parks with IDs, grouped by company
- `GET https://queue-times.com/parks/{id}/queue_times.json` — live wait times for rides in a park, organized by land

**themeparks.wiki entity IDs (WDW Resort):**
- WDW Resort entity ID: `e957da41-3552-4cf6-b636-5babc5cbc4e5`
- API: `https://api.themeparks.wiki/v1/entity/{id}/children` for park list
- API: `https://api.themeparks.wiki/v1/entity/{id}/live` for live wait data
- API: `https://api.themeparks.wiki/v1/entity/{id}/schedule` for park hours + entertainment

### Approximate Row Counts for WDW Catalog

| Table | Approx Rows | Source |
|---|---|---|
| `parks` | 4 | Magic Kingdom, EPCOT, Hollywood Studios, Animal Kingdom |
| `attractions` | 50–60 rides + 20 shows/parades = ~75 total | queue-times.com + themeparks.wiki |
| `dining` | 100–164 locations (parks + resorts + Disney Springs) | STACK.md cites 164 total |
| `shows` | ~20 (recurring daily shows, parades, fireworks) | themeparks.wiki schedule endpoint |
| `resorts` | 25–30 (all Disney-owned WDW resort hotels) | Static data, manually curated |
| `walking_graph` nodes | ~200–400 per park (~800–1,600 total) | Manually derived from attraction lat/lon |
| `walking_graph` edges | ~500–1,000 per park (~2,000–4,000 total) | Computed from PostGIS proximity |

**Rides per park (for seed data planning):**
- Magic Kingdom: ~22 rides (flagged as rideable attractions in queue-times.com)
- EPCOT: ~11 rides
- Hollywood Studios: ~9 rides
- Animal Kingdom: ~6 rides
- **Total rideable attractions: ~48**

### YAML Seed File Structure

```
packages/content/wdw/
  parks.yaml              # 4 rows
  attractions.yaml        # ~75 rows (rides + shows)
  dining.yaml             # ~164 rows
  resorts.yaml            # ~28 rows
  content_version: "1.0.0"
```

```yaml
# packages/content/wdw/parks.yaml
- id: "wdw-magic-kingdom"
  name: "Magic Kingdom"
  queue_times_id: 6        # queue-times.com numeric park ID
  themeparks_wiki_id: "75ea578a-adc8-4116-a54d-dccb60765ef9"
  timezone: "America/New_York"
  latitude: 28.4177
  longitude: -81.5812
```

```yaml
# packages/content/wdw/attractions.yaml
- id: "wdw-mk-space-mountain"
  park_id: "wdw-magic-kingdom"
  name: "Space Mountain"
  queue_times_id: 52         # queue-times.com ride ID
  themeparks_wiki_id: "abc..."
  height_req_cm: 112
  tags: ["thrill", "indoor", "dark"]
  latitude: 28.4188
  longitude: -81.5766
```

### Seed Script Pattern (Idempotent Upsert)

```typescript
// packages/db/scripts/seed-catalog.ts
import { createDb } from '../index';
import { parks, attractions, dining } from '../schema/catalog';
import { parse } from 'yaml';
import { readFileSync } from 'fs';
import { eq } from 'drizzle-orm';

const db = createDb(process.env.DATABASE_URL!);

async function seedParks() {
  const parksData = parse(readFileSync('../../content/wdw/parks.yaml', 'utf8'));
  for (const park of parksData) {
    await db.insert(parks)
      .values(park)
      .onConflictDoUpdate({
        target: parks.externalId,
        set: { name: park.name, latitude: park.latitude, longitude: park.longitude },
      });
  }
}
```

Run with: `pnpm --filter @wonderwaltz/db tsx scripts/seed-catalog.ts`

---

## 8. Key Architecture Patterns for Phase 1

### tsconfig Sharing

```
tsconfig.base.json          # root — shared strictness settings
apps/api/tsconfig.json      # extends ../../tsconfig.base.json
apps/web/tsconfig.json      # extends ../../tsconfig.base.json
packages/db/tsconfig.json   # extends ../../tsconfig.base.json
```

```json
// tsconfig.base.json (root)
{
  "compilerOptions": {
    "target":         "ES2022",
    "module":         "NodeNext",
    "moduleResolution": "NodeNext",
    "strict":         true,
    "exactOptionalPropertyTypes": true,
    "noUncheckedIndexedAccess": true,
    "declaration":    true,
    "declarationMap": true,
    "sourceMap":      true,
    "skipLibCheck":   true
  }
}
```

### Disclaimer Content Package

```
packages/content/
  legal/
    disclaimer.en.json   # { "text": "WonderWaltz is an independent..." }
  wdw/
    parks.yaml
    attractions.yaml
    dining.yaml
    resorts.yaml
```

The NestJS interceptor, iOS About screen, Android About screen, and Next.js footer all consume from this single source. A build script generates:
- `packages/content/generated/disclaimer.swift` — `enum Disclaimer { static let text = "..." }`
- `packages/content/generated/disclaimer.kt` — `object Disclaimer { const val text = "..." }`
- `packages/content/generated/disclaimer.ts` — `export const DISCLAIMER = "..."`

### Guest Age Bracket Schema (LEGL-07)

```typescript
// packages/db/schema/trips.ts
export const ageBracketEnum = pgEnum('age_bracket', [
  '0-2', '3-6', '7-9', '10-13', '14-17', '18+'
]);

export const guests = pgTable('guests', {
  id:         uuid('id').primaryKey().defaultRandom(),
  tripId:     uuid('trip_id').notNull(),
  name:       text('name').notNull(),
  ageBracket: ageBracketEnum('age_bracket').notNull(),  // NO birthdate field
  // mobility, sensory, dietary flags...
});
```

**There is no `birthdate` column, no `age` integer column, no date-of-birth anywhere in the schema.** PostHog events must never include `age_bracket` in their properties — only `has_young_children: boolean` (derived at event-capture time, never stored in PostHog).

---

## 9. Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.3 |
| Config file | `vitest.config.ts` at repo root (references per-package configs via `projects`) |
| Quick run command | `pnpm --filter @wonderwaltz/db vitest run` |
| Full suite command | `turbo run test` |
| RLS integration tests | `vitest run --project rls-integration` (requires `supabase start`) |

### Phase 1 Success Criteria → Test Map

| Criterion | Test Type | Automated Command | Notes |
|---|---|---|---|
| SC-1: `pnpm -r build` passes cleanly | Build check | `turbo run build` | Fails if any package has TS errors |
| SC-1: CI green on first PR | CI check | GitHub Actions `turbo run build lint typecheck test` | Checked via CI logs |
| SC-2: `drizzle-kit migrate` applies without errors | Integration | `DATABASE_URL=... npx drizzle-kit migrate 2>&1 \| grep -v ERROR` | Requires local Supabase |
| SC-2: TimescaleDB hypertable + continuous aggregate DDL executes | Integration | `psql $DATABASE_URL -c "SELECT * FROM timescaledb_information.hypertables WHERE hypertable_name='wait_times_history'"` | Returns 1 row on success |
| SC-3: Catalog seed loads idempotently, no duplicate rows | Integration | `pnpm --filter @wonderwaltz/db tsx scripts/seed-catalog.ts && pnpm --filter @wonderwaltz/db tsx scripts/seed-catalog.ts` (run twice, count unchanged) | Idempotency test |
| SC-4: Design token build produces Swift constants | Build check | `pnpm --filter @wonderwaltz/design-tokens build && test -f packages/design-tokens/generated/WWDesignTokens.swift` | File existence + non-empty check |
| SC-4: Design token build produces Compose theme | Build check | `test -f packages/design-tokens/generated/WWTheme.kt` | File existence check |
| SC-4: Design token build produces CSS vars | Build check | `test -f packages/design-tokens/generated/tokens.css && grep -c "@theme" packages/design-tokens/generated/tokens.css` | Must contain @theme block |
| SC-4: Brand direction locked in BRAND.md | Manual | File existence: `test -f docs/design/BRAND.md` | Human approval required |
| SC-5: Every NestJS response has X-WW-Disclaimer header | Unit + Integration | Vitest: `expect(response.headers['x-ww-disclaimer']).toBeTruthy()` | NestJS interceptor unit test |
| SC-5: Response body wraps in `{ data, meta: { disclaimer } }` | Unit | Vitest: `expect(response.body.meta.disclaimer).toBe(DISCLAIMER)` | Interceptor unit test |
| SC-5: Guest age stored as bracket (no birthdates in schema) | Static | `grep -r "birthdate\|date_of_birth\|birth_date" packages/db/schema/` returns empty | Schema text search |
| RLS blocks anon reads | Integration | `vitest run packages/db/tests/rls.integration.test.ts` | Requires `supabase start` |

### Sampling Rate

- **Per task commit:** `turbo run lint typecheck` (fast, < 30s)
- **Per wave merge:** `turbo run build test` + `pnpm --filter @wonderwaltz/db vitest run` (includes RLS tests if supabase running)
- **Phase gate:** All commands above green + manual check of BRAND.md existence + Xcode Cloud build green on iOS shell PR

### Wave 0 Gaps (Test Infrastructure to Create)

- [ ] `packages/db/tests/rls.integration.test.ts` — covers DB-08, RLS policy verification
- [ ] `apps/api/src/common/interceptors/response-envelope.interceptor.spec.ts` — covers LEGL-02, SC-5
- [ ] `packages/design-tokens/tests/build.test.ts` — verifies all four output files exist and contain expected token names
- [ ] `vitest.config.ts` at repo root with `projects` array pointing to per-package configs
- [ ] `supabase/config.toml` — local Supabase config committed to repo

---

## 10. Common Pitfalls for Phase 1

### Pitfall 1: Turborepo `pipeline` key (v1) instead of `tasks` key (v2)
**What goes wrong:** Turborepo 2.x silently falls back or prints a deprecation warning. CI may behave differently from local.
**Fix:** Use `tasks`, not `pipeline`, in `turbo.json`.

### Pitfall 2: Including `apps/ios` and `apps/android` in the Turborepo pipeline
**What goes wrong:** Turborepo tries to run `npm run build` on Xcode/Gradle projects with no `package.json`, causing CI failures.
**Fix:** Xcode and Android builds are never included in `turbo run`. They are handled by Xcode Cloud and GitHub Actions Gradle workflows respectively.

### Pitfall 3: Using `drizzle-kit push` for TimescaleDB migration
**What goes wrong:** `push` does not run custom SQL migrations. The hypertable is never created. `wait_times_history` is a normal Postgres table with no time-series indexing. Phase 2 ingestion silently works but historical queries degrade.
**Fix:** Always use `drizzle-kit generate` + `drizzle-kit migrate`. Never use `push` in any non-ephemeral environment.

### Pitfall 4: `prepare: false` missing on Supabase Drizzle client
**What goes wrong:** Supabase uses PgBouncer in transaction pooling mode by default. Prepared statements do not work in transaction pooling mode. Drizzle throws `prepared statement already exists` errors under any load.
**Fix:** Pass `{ prepare: false }` to the `postgres()` constructor. Use the direct connection URL (port 5432), not the pooler URL (port 6543), for a long-lived Railway service.

### Pitfall 5: Style Dictionary `ios-swift` group emits UIKit, not SwiftUI
**What goes wrong:** `WWDesignTokens.swift` contains `UIColor` references. SwiftUI code referencing these tokens gets type errors since `Color` and `UIColor` are different types in Swift.
**Fix:** Override the `color/UIColorSwift` transform with `color/ColorSwiftUI` as shown in section 3.

### Pitfall 6: Tailwind v4 `@theme` not emitted by Style Dictionary
**What goes wrong:** The CSS variables file uses `:root { --color-primary: ... }` format. Tailwind v4 only generates utility classes for tokens inside `@theme {}`. The tokens exist as CSS variables but no utility classes (`bg-primary`, `text-primary`) are generated.
**Fix:** Register the custom `css/tailwind-v4` format shown in section 3.

### Pitfall 7: RLS not enabled on catalog tables
**What goes wrong:** Mobile apps can query `attractions`, `parks`, etc. directly via Supabase client SDK with the anon key, bypassing NestJS entirely. This breaks the architecture contract (NestJS is the sole data access path) and exposes catalog data without the disclaimer envelope.
**Fix:** Enable RLS on all catalog tables and add read-only policies. Service role bypasses for admin/seed operations.

### Pitfall 8: Xcode Cloud GitHub App not installed before setting branch protection
**What goes wrong:** Branch protection requires "Xcode Cloud" status check but the App is not installed, so the check never appears and PRs can never merge.
**Fix:** Install the Xcode Cloud GitHub App BEFORE creating the branch protection rule. Create a test PR with the iOS shell to verify the check appears.

### Pitfall 9: NestJS response envelope interceptor breaks non-JSON responses
**What goes wrong:** The `ResponseEnvelopeInterceptor` wraps ALL responses, including health check endpoints that return strings, file downloads, or redirect responses.
**Fix:** Add a guard in the interceptor: if `data` is a string (health check `'ok'`) or a `StreamableFile`, pass through without wrapping. Add an `@SkipEnvelope()` decorator option for routes that need raw responses.

### Pitfall 10: Monorepo `.planning/` folder polluting pnpm workspace
**What goes wrong:** `pnpm install` finds a `package.json` in `.planning/` (if one is accidentally created) and includes it as a workspace package.
**Fix:** Ensure `.planning/` never contains a `package.json`. Add `!.planning` to `pnpm-workspace.yaml` exclusions as a safety measure.

---

## Open Questions

1. **Supabase TimescaleDB extension enablement**
   - What we know: Supabase supports TimescaleDB as a managed extension.
   - What's unclear: Whether enabling it in the Supabase dashboard requires a paid plan tier or is available on the free tier. Some managed TimescaleDB features (compression, multi-node) are unavailable on free Supabase.
   - Recommendation: Verify in Supabase dashboard before writing migrations. If TimescaleDB is not available, the fallback is partitioned Postgres tables — less ergonomic but functional for Phase 2.

2. **queue-times.com WDW park IDs**
   - What we know: The API endpoint is `https://queue-times.com/parks/{id}/queue_times.json`. IDs are discovered by calling `/parks.json`.
   - What's unclear: The exact numeric IDs for Magic Kingdom, EPCOT, Hollywood Studios, and Animal Kingdom must be fetched live. Historical sources suggest: MK=6, EPCOT=5, HS=7, AK=8 — but these must be verified by calling the API before hardcoding them in YAML seed files.
   - Recommendation: The seed script should fetch the park list from queue-times.com and match by name, not hardcode IDs.

3. **Style Dictionary 4 dark mode in SwiftUI Asset Catalog format**
   - What we know: `color/ColorSwiftUI` emits SwiftUI `Color` initializers. SwiftUI supports dynamic colors via asset catalogs.
   - What's unclear: Whether Style Dictionary 4 has a built-in formatter that generates `.xcassets` color set entries (the cleanest SwiftUI dark mode approach) or whether the approach must be custom-built.
   - Recommendation: Start with two separate Swift files (light + dark constants) and use `Color(uiColor:)` with trait collection. Revisit to asset catalog approach in Phase 5 if the two-file approach creates friction.

4. **Android AGP version for Compose BOM 2026.03.00**
   - What we know: Compose BOM 2026.03.00 requires Kotlin 2.3.20. AGP 9.x is required for Kotlin 2.3.x.
   - What's unclear: The exact AGP version that is compatible with Gradle 8.x and Kotlin 2.3.20 in the Android shell project.
   - Recommendation: Start with AGP 8.10.x (last stable 8.x) and Gradle 8.11.x. If AGP 9.x is required by Compose BOM 2026.03.00, upgrade before Xcode Cloud / GitHub Actions CI is wired for Android.

---

## Sources

### Primary (HIGH confidence)
- Turborepo official docs — https://turborepo.dev/repo/docs/reference/configuration — `tasks` schema, `dependsOn`, remote cache
- Style Dictionary official docs — https://styledictionary.com/reference/hooks/transforms/predefined/ — transform names; https://styledictionary.com/reference/hooks/transform-groups/predefined/ — group compositions
- Style Dictionary formats — https://styledictionary.com/reference/hooks/formats/predefined/ — `ios-swift` outputs UIKit, `compose/object` outputs Compose Color
- Drizzle custom migrations — https://orm.drizzle.team/docs/kit-custom-migrations — `drizzle-kit generate --custom` workflow
- Drizzle migrations overview — https://orm.drizzle.team/docs/migrations — push vs. migrate decision framework
- Supabase service role RLS — https://supabase.com/docs/guides/troubleshooting/why-is-my-service-role-key-client-getting-rls-errors-or-not-returning-data-7_1K9z
- Xcode Cloud GitHub status checks — https://github.com/apps/xcode-cloud (GitHub App) — automatic PR status checks confirmed
- queue-times.com API — https://queue-times.com/pages/api — park structure, attribution requirement

### Secondary (MEDIUM confidence)
- Xcode Cloud PR workflow — https://medium.com/kinandcartacreated/getting-started-with-xcode-cloud-pull-request-pr-workflow-ce02bb83f9e5 — confirms GitHub App status check integration
- Polpiella.dev on Xcode Cloud webhooks — https://www.polpiella.dev/github-webhooks-and-xcode-cloud/ — webhook pattern for advanced integrations
- NestJS Swagger generic response — https://aalonso.dev/blog/2021/how-to-generate-generics-dtos-with-nestjsswagger-422g/ — `ApiExtraModels` + `getSchemaPath` pattern
- themeparks.wiki — https://themeparks.wiki/browse/e957da41-3552-4cf6-b636-5babc5cbc4e5 — WDW resort entity ID confirmed
- WDW ride counts — https://magicguides.com/which-disney-world-park-has-the-most-rides/ + Wikipedia list — ~48 total rideable attractions

### Tertiary (LOW confidence — verify before use)
- WDW dining count of 164 — https://disneyparknerds.com/list-of-all-the-restaurants-at-disney-world/ — approximate, includes Disney Springs; seed file will include parks + resorts only (~100 rows)
- queue-times.com park IDs (MK=6, EPCOT=5, HS=7, AK=8) — inferred from community tooling; must be verified by calling `/parks.json` directly before hardcoding in seed files

---

## Metadata

**Confidence breakdown:**
- Turborepo pipeline: HIGH — official docs verified
- Drizzle + TimescaleDB migration: HIGH — official Drizzle docs; TimescaleDB custom migration pattern confirmed
- Style Dictionary 4 transforms: HIGH — official docs list exact transforms and groups
- Supabase RLS + Drizzle: HIGH — official Supabase docs on service role behavior
- Xcode Cloud GitHub integration: HIGH — GitHub App exists, auto status checks confirmed
- NestJS envelope + OpenAPI: HIGH — NestJS Swagger docs confirm generic decorator pattern
- WDW catalog row counts: MEDIUM — approximate from public sources; exact counts emerge from seed data build
- Dark mode in SwiftUI via Style Dictionary: MEDIUM — pattern clear, but no Style Dictionary 4 example specifically for xcassets format found

**Research date:** 2026-04-09
**Valid until:** 2026-07-09 (90 days; stack is stable; Turborepo and Drizzle release frequently but breaking changes are unlikely in the timeframe)
