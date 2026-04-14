---
phase: 01-foundation
plan: "11"
subsystem: database
tags: [yaml, drizzle, seed, catalog, wdw, upsert]

# Dependency graph
requires:
  - phase: 01-06
    provides: Drizzle schema for catalog tables (parks, attractions, dining, shows, resorts, walkingGraph)
provides:
  - 6 YAML catalog data files covering the full WDW attraction/dining/resort catalog
  - Idempotent TypeScript seed script using Drizzle onConflictDoUpdate upserts
  - yaml + tsx dependencies added to @wonderwaltz/db
affects:
  - 02-data-ingestion (needs parks/attractions FK rows before writing wait-time data)
  - solver phases (needs catalog rows for path computation)

# Tech tracking
tech-stack:
  added: [yaml, tsx]
  patterns: [onConflictDoUpdate upsert pattern for catalog seeding, YAML data files as versioned content]

key-files:
  created:
    - packages/content/wdw/parks.yaml
    - packages/content/wdw/attractions.yaml
    - packages/content/wdw/dining.yaml
    - packages/content/wdw/resorts.yaml
    - packages/content/wdw/shows.yaml
    - packages/content/wdw/walking_graph.yaml
    - packages/db/scripts/seed-catalog.ts
  modified:
    - packages/db/tsconfig.json
    - packages/db/package.json

key-decisions:
  - "YAML content files use content_version field for future versioning support"
  - "seed-catalog.ts resolves park/resort UUIDs from external_id strings before inserting FK-dependent rows — insertion order is parks → resorts → attractions → shows → dining → walkingGraph"
  - "walkingGraph uses onConflictDoNothing (edges are immutable); all other tables use onConflictDoUpdate"
  - "tsconfig.json include expanded to cover scripts/ so seed-catalog.ts is typechecked"

patterns-established:
  - "Catalog upsert pattern: insert.onConflictDoUpdate({ target: table.externalId, set: {...} }) for all catalog entities"
  - "ID resolution pattern: load parent rows first, build externalId→uuid Map, look up before insert"

requirements-completed:
  - DB-07

# Metrics
duration: 15min
completed: 2026-04-13
---

# Phase 01 Plan 11: WDW Catalog Seed Data Summary

**6 YAML catalog files (4 parks, 48 rides, 20 shows, 30 resorts, 38 dining, 32 walking edges) + idempotent Drizzle upsert seed script covering the full WDW attraction catalog**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-13T00:00:00Z
- **Completed:** 2026-04-13
- **Tasks:** 2 completed
- **Files modified:** 9

## Accomplishments

- 6 YAML catalog files created covering all WDW parks, attractions, dining, shows, resorts, and walking graph data
- TypeScript seed script implemented with idempotent upsert for all 6 catalog tables using Drizzle's onConflictDoUpdate
- yaml and tsx dependencies installed in @wonderwaltz/db package; tsconfig updated to typecheck scripts/ directory

## Task Commits

Each task was committed atomically:

1. **Task 1: WDW catalog YAML seed data files** - `e77ec25` (feat)
2. **Task 2: Idempotent TypeScript seed script** - `da4359d` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `packages/content/wdw/parks.yaml` - 4 WDW parks with queue_times_id and themeparks_wiki_id
- `packages/content/wdw/attractions.yaml` - 48 attractions across all 4 parks with height reqs and tags
- `packages/content/wdw/shows.yaml` - 20 shows, parades, and fireworks events across all 4 parks
- `packages/content/wdw/resorts.yaml` - 30 Disney-owned WDW resort hotels (value/moderate/deluxe/deluxe_villa)
- `packages/content/wdw/dining.yaml` - 38 dining locations (park quick service, table service, Disney Springs, resort)
- `packages/content/wdw/walking_graph.yaml` - 32 inter-attraction walking time edges across all 4 parks
- `packages/db/scripts/seed-catalog.ts` - Idempotent seed script using onConflictDoUpdate for all catalog tables
- `packages/db/tsconfig.json` - Added scripts/ to include for typecheck coverage
- `packages/db/package.json` - Added yaml dependency, tsx devDependency

## Decisions Made

- Insertion order in seed script: parks → resorts → attractions → shows → dining → walkingGraph (respects FK constraints)
- walkingGraph edges use onConflictDoNothing (edges are immutable by design); all other catalog tables use onConflictDoUpdate
- tsconfig.json include array expanded to cover scripts/ directory — without this, typecheck would silently skip seed-catalog.ts
- YAML files use content_version: "1.0.0" field to support future schema versioning

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added scripts/ to tsconfig.json include array**
- **Found during:** Task 2 (seed script typecheck)
- **Issue:** tsconfig.json only included src/, tests/, drizzle.config.ts — scripts/ was missing, so typecheck would not cover seed-catalog.ts
- **Fix:** Added "scripts" to the include array in packages/db/tsconfig.json
- **Files modified:** packages/db/tsconfig.json
- **Verification:** pnpm --filter @wonderwaltz/db typecheck passes cleanly
- **Committed in:** da4359d (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Fix ensures typecheck covers the seed script as intended. No scope creep.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required for seed file creation. To execute the seed against a running Supabase instance:

```bash
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
  pnpm --filter @wonderwaltz/db tsx scripts/seed-catalog.ts
```

Run twice to verify idempotency (row counts must be identical after both runs).

## Next Phase Readiness

- Phase 2 (data ingestion) can begin: attraction/park catalog rows exist for FK constraints
- Seed script is idempotent; can safely run on any environment without duplicate rows
- Walking graph seed enables Phase 3 solver path computation

---
*Phase: 01-foundation*
*Completed: 2026-04-13*
