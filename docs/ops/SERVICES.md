# External Services — WonderWaltz

All services must be provisioned before Phase 2 data ingestion starts.
Follow each section in order — dependencies are listed where relevant.

## 1. Supabase (Database + Auth)

**Purpose:** Postgres OLTP database with TimescaleDB for wait-time history,
PostGIS for attraction geolocation, and Supabase Auth for user accounts.

**Plan:** Free tier supports dev/staging. Upgrade to Pro ($25/mo) before Phase 10 launch.

### Steps:

1. Create project at https://supabase.com → New Project
   - Name: `wonderwaltz`
   - Database password: generate strong password, save securely
   - Region: US East (closest to WDW servers)

2. Enable extensions (Database → Extensions):
   - `postgis` → Enable (required for attraction location_point)
   - `uuid-ossp` → Enable (for UUID generation, usually pre-enabled)
   - `pg_cron` → Enable (hourly refresh of wait_times_1h materialized view + daily 2-year retention purge)
   - **Do NOT enable `timescaledb`** — not available on Supabase Cloud; migrations 0001/0002 use a standard materialized view + pg_cron instead

3. Enable anonymous sign-ins (Authentication → Providers → Anonymous → Enable)

4. Collect env vars:
   - `DATABASE_URL`: Settings → Database → Connection string → Direct (port 5432)
   - `SUPABASE_URL`: Settings → API → Project URL
   - `SUPABASE_ANON_KEY`: Settings → API → anon public key
   - `SUPABASE_SERVICE_ROLE_KEY`: Settings → API → service_role key

5. Apply migrations:
   ```bash
   DATABASE_URL="<your-direct-connection-url>" \
     pnpm --filter @wonderwaltz/db exec drizzle-kit migrate
   ```

### Important Notes:

- Use the Direct connection URL (port 5432) for DATABASE_URL in Railway.
  Do NOT use the connection pooler URL (port 6543) for long-lived processes.
- The service_role key bypasses RLS. Never expose it to clients. Railway env var only.

---

## 2. Upstash Redis

**Purpose:** BullMQ queue backing + live wait-time cache (2-min TTL) +
rate-limit counters.

### Steps:

1. Create account at https://upstash.com
2. Create Redis database:
   - Name: `wonderwaltz`
   - Type: Global (multi-region for low latency)
   - Consistency: Eventual (sufficient for cache use)
3. Collect env var:
   - `REDIS_URL`: from the ioredis-compatible connection string
     (format: `redis://:password@hostname:port`)

---

## 3. Railway

**Purpose:** NestJS HTTP API and BullMQ worker processes.

### Steps:

1. Create project at https://railway.app → New Project → Empty Project
   - Name: `wonderwaltz`
2. Create `api` service:
   - Source: GitHub repo → `wonderwaltz`
   - Root Directory: `apps/api`
   - Start Command: `node dist/main.js`
   - Build Command: `cd ../.. && pnpm install && turbo run build --filter=@wonderwaltz/api...`
3. Create `worker` service (same repo, different entry point):
   - Root Directory: `apps/api`
   - Start Command: `node dist/worker.js` (Phase 2 will create worker.ts)
4. Add all env vars from `.env.example` to both services (Variables tab).

---

## 4. Vercel (Next.js Web)

**Purpose:** Marketing website + admin panel.

### Steps:

1. Import GitHub repo at https://vercel.com → Add New → Project
   - Root Directory: `apps/web`
   - Framework: Next.js (auto-detected)
2. Connect to Vercel team for Turborepo Remote Cache:
   ```bash
   npx turbo login
   npx turbo link
   ```
3. Add `TURBO_TOKEN` and `TURBO_TEAM` as GitHub Actions secrets:
   - GitHub → Repository → Settings → Secrets and variables → Actions
4. Add env vars to Vercel project (env vars from .env.example that start with NEXT\_).
5. Collect env vars:
   - `VERCEL_URL`: Settings → Domains (your production domain)
   - `TURBO_TOKEN`: Team → Settings → Tokens → Create token
   - `TURBO_TEAM`: Team Settings → Team slug

---

## 5. RevenueCat (IAP)

**Purpose:** Receipt validation and entitlement management for trip_unlock IAP.

### Steps:

1. Create account at https://www.revenuecat.com
2. Create project: `WonderWaltz`
3. Add iOS app:
   - Platform: App Store
   - App name: WonderWaltz
   - Bundle ID: com.wonderwaltz
   - App Store Connect API key (Phase 6)
4. Add Android app:
   - Platform: Google Play
   - Package name: com.wonderwaltz
   - Service account JSON (Phase 7)
5. Configure webhook after API is deployed (Phase 2+):
   - Endpoint: POST https://api.wonderwaltz.app/webhooks/revenuecat
   - Authorization header: generate secret → store as `REVENUECAT_WEBHOOK_SECRET`

---

## 6. Sentry (Error Tracking)

**Purpose:** Crash reporting and performance monitoring for all 4 platforms.

### Steps:

1. Create account at https://sentry.io
2. Create 4 projects:
   | Project Name | Platform | SDK |
   |---|---|---|
   | wonderwaltz-api | Node.js | @sentry/nestjs 10.47.0 |
   | wonderwaltz-web | Next.js | @sentry/nextjs 10.47.0 |
   | wonderwaltz-ios | iOS/Swift | sentry-cocoa 9.8.0 |
   | wonderwaltz-android | Android/Kotlin | sentry-android 8.38.0 |
3. Collect DSN for each project:
   - Settings → Client Keys → DSN
   - Store as: SENTRY_DSN_API, SENTRY_DSN_WEB, SENTRY_DSN_IOS, SENTRY_DSN_ANDROID

---

## 7. PostHog (Product Analytics)

**Purpose:** Event tracking with LEGL-07 enforcement (no guest age in events).

### Steps:

1. Create account at https://posthog.com
2. Create project: `WonderWaltz`
3. Set up blocked properties (LEGL-07 / FND-11):
   - Data Management → Property definitions
   - Mark as blocked: `age_bracket`, `guest_age`, `birthdate`, `dob`, `age`
   - Note: Only `has_young_children: boolean` is allowed (derived, not stored)
4. Collect env var:
   - `POSTHOG_KEY`: Project → Project Settings → Project API key
   - `POSTHOG_HOST`: `https://us.i.posthog.com` (US cloud)

---

## Environment Variables Reference

| Variable                  | Service    | Where Used                   | Example Value                                               |
| ------------------------- | ---------- | ---------------------------- | ----------------------------------------------------------- |
| DATABASE_URL              | Supabase   | apps/api, packages/db        | postgresql://postgres:pass@db.xxx.supabase.co:5432/postgres |
| SUPABASE_URL              | Supabase   | apps/api                     | https://xxx.supabase.co                                     |
| SUPABASE_ANON_KEY         | Supabase   | apps/api (auth verification) | eyJ...                                                      |
| SUPABASE_SERVICE_ROLE_KEY | Supabase   | apps/api (admin)             | eyJ...                                                      |
| REDIS_URL                 | Upstash    | apps/api                     | redis://:pass@xxx.upstash.io:6379                           |
| SENTRY_DSN_API            | Sentry     | apps/api                     | https://xxx@o0.ingest.sentry.io/0                           |
| SENTRY_DSN_WEB            | Sentry     | apps/web                     | https://xxx@o0.ingest.sentry.io/0                           |
| SENTRY_DSN_IOS            | Sentry     | apps/ios                     | https://xxx@o0.ingest.sentry.io/0                           |
| SENTRY_DSN_ANDROID        | Sentry     | apps/android                 | https://xxx@o0.ingest.sentry.io/0                           |
| POSTHOG_KEY               | PostHog    | apps/api, apps/web           | phc_xxx                                                     |
| POSTHOG_HOST              | PostHog    | apps/api, apps/web           | https://us.i.posthog.com                                    |
| REVENUECAT_WEBHOOK_SECRET | RevenueCat | apps/api                     | wh_secret_xxx                                               |
| VERCEL_URL                | Vercel     | CI, apps/web                 | https://wonderwaltz.app                                     |
| TURBO_TOKEN               | Vercel     | CI (GitHub Actions)          | vc_xxx                                                      |
| TURBO_TEAM                | Vercel     | CI (GitHub Actions)          | your-team-slug                                              |

**Security rules:**

- Never commit any of these values to git
- Local dev: copy .env.example to .env.local and fill in values
- Railway: add all vars via the Railway dashboard Variables tab
- Vercel: add NEXT*PUBLIC*\* vars in Vercel dashboard
- iOS/Android: use Xcode build settings / build config for DSN values
