---
id: fix-queue-times-catalog-ids
created: 2026-04-15
resolved: 2026-04-15
resolved_in: 03-01
area: phase-02
priority: medium
status: completed
---

## Resolution (closed in plan 03-01 task 3)

- Fetched live queue_times.com IDs for parks 5/6/7/8 on 2026-04-15 21:35Z.
- Rewrote `packages/content/wdw/attractions.yaml` with correct
  `queue_times_id` values for every WDW attraction.
- Captured the live ride-id snapshot at
  `apps/api/tests/fixtures/queue-times-live-ids.json`.
- Added regression test
  `apps/api/tests/ingestion/queue-times-park-map.test.ts` asserting ≥4
  rides per park match the live API (was 0/4 for MK + AK before fix).
- Reseeded; verification query now shows 21/11/9/6 rides ingesting
  across MK/EPCOT/HS/AK respectively (was 0/N/N/0).

# Fix queue_times_id mismatches in catalog seed

**Problem:** Live queue-times.com API returns ride IDs in a different
namespace than our seed YAML files. For Magic Kingdom specifically:

- Live API returns: `[125, 126, 127, 128, 129, 130, ..., 13764]` (39 rides)
- Our catalog has:  `[17, 18, 19, 20, 22, 23, 25, 37, ...]` (23 rides)
- **Zero overlap** — every live ride is silently skipped by the worker
  (see `queue-times.service.ts:142-144` — no match in `idMap` → `continue`).

Result: only 2 of 4 parks (EPCOT + Hollywood Studios) are ingesting any
rows, and each park has only a handful of matching rides. Animal Kingdom
and Magic Kingdom are at **zero rides** ingesting.

**Impact on Phase 02:** Ingestion IS running (DATA-07 clock started at
2026-04-15 16:08:01 UTC), so the 8-week gate is counting. But crowd
index accuracy and per-park coverage are severely degraded.

**Fix plan (one-time seed correction):**

1. Write a script to fetch live IDs per park from queue-times.com:
   ```
   GET https://queue-times.com/parks/{5,6,7,8}/queue_times.json
   ```
2. For each park, match live ride names to our catalog's `name` field.
   (Fuzzy match — "Seven Dwarfs Mine Train" may appear slightly different.)
3. Emit an update SQL or a corrected YAML with real `queue_times_id`
   values.
4. Re-seed (idempotent upsert handles it).

**Alternative:** Since the script ships in production, we could add a
one-time bootstrap job that runs on worker startup and reconciles IDs
automatically by name-matching — but that's extra complexity. Manual
seed correction is simpler.

**Verification after fix:**
```sql
SELECT p.name, COUNT(DISTINCT ride_id) AS rides_ingesting
FROM wait_times_history w
JOIN attractions a ON a.id = w.ride_id
JOIN parks p ON p.id = a.park_id
WHERE w.fetched_at > now() - INTERVAL '15 minutes'
GROUP BY p.name;
```
Expected after fix: all 4 parks with 15-30+ rides each.

**Not a Phase 02 blocker.** The 8-week clock counts regardless of ride
coverage; the hard gate is time-based, not coverage-based.
