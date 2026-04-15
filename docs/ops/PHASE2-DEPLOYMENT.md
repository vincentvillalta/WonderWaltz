# Phase 2 Data Pipeline — Deployment Runbook

**Purpose:** Deploy the BullMQ worker service to Railway and start the 8-week
wait-time accumulation clock. This is the ops handoff for DATA-07.

**Date:** (fill in when executed — this is t=0 for the 8-week gate)

---

## Prerequisites

Before starting, confirm these are already provisioned (see `PROVISIONING_STATE.md`):

- [x] Supabase project with all migrations applied (including `wait_times_1h` materialized view + pg_cron)
- [x] Upstash Redis — `REDIS_URL` in `.env.local`
- [x] Sentry API project — `SENTRY_DSN_API` in `.env.local`
- [ ] Railway `api` service deployed and healthy
- [ ] `OPENWEATHER_API_KEY` obtained (OpenWeather dashboard → My API Keys)
- [ ] `SLACK_ALERT_WEBHOOK_URL` obtained (Slack → Apps → Incoming Webhooks → Add to Slack)

---

## Railway Worker Service Setup

### Step 1: Create the worker service

In the Railway dashboard for the `wonderwaltz` project:

1. Click **New Service** → **GitHub Repo**
2. Select the `wonderwaltz` repo
3. Configure the service:
   - **Name:** `worker`
   - **Root Directory:** `apps/api`
   - **Build Command:** `cd ../.. && pnpm install && turbo run build --filter=@wonderwaltz/api...`
   - **Start Command:** `node dist/worker.js`

### Step 2: Copy environment variables from the `api` service

In the `worker` service → **Variables** tab, add the following (copy from `api` service or `.env.local`):

| Variable         | Source                                                                          |
| ---------------- | ------------------------------------------------------------------------------- |
| `DATABASE_URL`   | Supabase → Settings → Database → Connection string (port 5432, NOT pooler 6543) |
| `REDIS_URL`      | Upstash → ioredis-compatible connection string                                  |
| `SENTRY_DSN_API` | Sentry → `wonderwaltz-api` project → Client Keys → DSN                          |

### Step 3: Add new environment variables (worker-only)

| Variable                  | Source                                                                       |
| ------------------------- | ---------------------------------------------------------------------------- |
| `OPENWEATHER_API_KEY`     | [openweathermap.org](https://home.openweathermap.org/api_keys) → My API Keys |
| `SLACK_ALERT_WEBHOOK_URL` | Slack workspace → Apps → Incoming Webhooks → Add to Slack → copy URL         |

> These are NOT needed by the `api` (HTTP) service. Worker-only.

### Step 4: Deploy

Click **Deploy** in the Railway dashboard. Watch the build logs — the
`turbo run build` step compiles `apps/api` (including `worker.ts`) to `dist/`.

Expected build output line: `worker.ts → dist/worker.js`

---

## Verification Steps

**Wait 6 minutes after the worker service shows "Active" in Railway.**
This gives one full 5-minute polling cycle plus a buffer.

### Check 1: wait_times_history is receiving rows

Run in the Supabase SQL editor (Dashboard → SQL Editor):

```sql
SELECT COUNT(*), MAX(fetched_at)
FROM wait_times_history
WHERE fetched_at > now() - INTERVAL '10 minutes';
```

**Expected result:**

- `count` > 100 (one cycle covers ~200+ WDW attractions across 4 parks)
- `max` timestamp is within 6 minutes of now

If `count = 0` after 10 minutes: check Railway worker logs for errors.

### Check 2: Redis wait keys exist

In the Upstash console or Redis CLI:

```
KEYS wait:*
```

**Expected:** Multiple UUID-keyed entries like `wait:550e8400-e29b-41d4-a716-446655440000`

### Check 3: Redis key freshness

Pick any UUID from Check 2 and run:

```
GET wait:{uuid_from_above}
```

**Expected:**

```json
{
  "minutes": 25,
  "fetched_at": "2026-04-14T23:20:00.000Z",
  "source": "queue-times",
  "is_stale": false
}
```

`fetched_at` must be within the last 5 minutes. `is_stale: false`.

### Check 4: Live API endpoint

```bash
curl https://api.wonderwaltz.app/v1/parks/{parkId}/waits
```

Replace `{parkId}` with a valid park UUID (e.g. from Supabase `parks` table).

**Expected:** JSON array where each item has `is_stale: false` and a recent `fetched_at`.

### Check 5: Crowd index endpoint (bootstrap mode on day 1)

```bash
curl https://api.wonderwaltz.app/v1/crowd-index
```

**Expected:**

```json
{
  "data": {
    "global": {
      "value": null,
      "confidence": "bootstrap",
      "sample_size_days": 0
    }
  }
}
```

`sample_size_days = 0` on day 1 is correct. `confidence = "bootstrap"` confirms
the auto-switch logic is running in bootstrap mode.

### Check 6: Sentry alert rules

In the Sentry dashboard → **Alerts**:

Confirm 2 alert rules exist:

1. Dead-letter alert rule (fires when 2 consecutive jobs dead-letter)
2. Lag alert rule (fires when freshest `fetched_at` > 30 minutes old)

Both should route to Slack via the webhook configured in `SLACK_ALERT_WEBHOOK_URL`.

### Check 7: pg_cron is scheduled (run after 1 hour)

After the worker has been live for at least 1 hour, verify pg_cron ran:

```sql
SELECT jobname, start_time, status, return_message
FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 5;
```

**Expected:** Rows showing the `wait_times_1h` refresh job executed successfully.

---

## Ingestion Clock Start

Once **all checks pass**, record the timestamp below. This is **t=0** for the
8-week accumulation gate. Phase 10 (public beta) cannot launch until 8+ weeks
of `wait_times_history` data exist.

```
Ingestion clock start: _____________________________ (fill in when verified)
```

**8-week gate unlocks at:** (add 56 days to the timestamp above)

Update `docs/ops/PROVISIONING_STATE.md`:

- Mark Railway worker service as `provisioned`
- Record the ingestion clock start timestamp
- Check off Phase 02 Readiness Checklist items

---

## Rollback

If the worker fails to start or ingestion errors are persistent:

1. Check Railway worker logs for stack traces
2. Common issues:
   - `DATABASE_URL` pointing to connection pooler (port 6543) instead of direct (port 5432) — fix: use port 5432 URL
   - Missing `REDIS_URL` — worker process exits immediately if Redis connection fails
   - `OPENWEATHER_API_KEY` invalid — weather endpoint returns null (non-fatal; worker continues)
   - `SLACK_ALERT_WEBHOOK_URL` invalid — alerting silently fails; check Sentry events instead
3. After fixing env vars: redeploy from Railway dashboard

---

_Runbook generated: 2026-04-14_
_Phase: 02-data-pipeline, Plan: 12_
