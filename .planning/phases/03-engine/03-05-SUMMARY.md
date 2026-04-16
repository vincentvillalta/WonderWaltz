---
phase: 03-engine
plan: 05
subsystem: solver
tags: [solver, walking-graph, floyd-warshall, nestjs, preload, pure-ts, solv-13]

requires:
  - phase: 03-engine
    plan: 04
    provides: WalkingEdge + CatalogWalkingGraph types, solver package vitest config, package-boundary test
provides:
  - "buildWalkingGraph(edges) + shortestPath(graph, from, to) — pure-TS Floyd-Warshall precompute"
  - "WalkingGraph type with nodes[] + distances Map<Map<number>> for O(1) path queries"
  - "WalkingGraphLoader NestJS provider — loads edges once at onModuleInit, caches graph"
  - "PlanGenerationModule — umbrella module for solver pipeline (WalkingGraphLoader now; plan 03-16 extends)"
  - "SOLV-13 contract verified: DB query count stays at 1 regardless of solve volume"
affects:
  - 03-engine plans 07-10 (constructive solver + local search consume shortestPath for walk-time costing)
  - 03-engine plan 16 (plan-generation processor injects WalkingGraphLoader to pass graph to solver)

tech-stack:
  added: []
  patterns:
    - "Floyd-Warshall all-pairs shortest paths on Maps — O(n^3) precompute, O(1) query via double Map.get"
    - "ESM solver loaded into CJS api via createRequire + pathToFileURL dynamic import (mirrors SharedInfra DB pattern)"
    - "Mirror types in CJS consumer when direct import type triggers TS1541 ESM-from-CJS resolution error"

key-files:
  created:
    - packages/solver/src/walkingGraph.ts
    - packages/solver/tests/walking-graph.test.ts
    - packages/solver/tests/walking-graph-preload.test.ts
    - apps/api/src/plan-generation/walking-graph.loader.ts
    - apps/api/src/plan-generation/plan-generation.module.ts
    - apps/api/tests/plan-generation/walking-graph-loader.test.ts
  modified:
    - packages/solver/src/index.ts
    - packages/solver/src/types.ts
    - packages/solver/package.json
    - apps/api/src/app.module.ts
    - apps/api/src/worker.module.ts

key-decisions:
  - "CatalogWalkingGraph renamed from WalkingGraph in types.ts — frees the WalkingGraph name for the Floyd-Warshall runtime shape (nodes[] + distances Map) which is the type downstream plans consume"
  - "Edge type defined in walkingGraph.ts (not types.ts) — it is a loader-boundary concern with a simpler shape (fromNodeId, toNodeId, seconds, oneWay?) than the catalog WalkingEdge (which carries parkId + walkSeconds)"
  - "Mirror types in walking-graph.loader.ts instead of import type from @wonderwaltz/solver — TS1541 ESM-from-CJS resolution error. Structural equivalence validated at runtime by the dynamic import call to buildWalkingGraph"
  - "Solver package.json exports subpath ./package.json added — createRequire.resolve needs it for CJS-side ESM resolution; pnpm strict node_modules wont expose unexported subpaths"

patterns-established:
  - "Preload-once-at-boot pattern for solver-domain data: NestJS OnModuleInit loads, solver code stays pure TS"
  - "DB spy test as contract gate: assert db.execute call count == 1 after N getGraph calls"

requirements-completed: [SOLV-13]

# Metrics
duration: 8 min
completed: 2026-04-15
---

# Phase 03 Plan 05: Walking Graph Floyd-Warshall Preload Summary

**Floyd-Warshall all-pairs shortest paths on 32 walking edges precomputed at worker boot via NestJS loader; shortestPath queries are O(1) Map lookups with zero DB hits at solve-time (SOLV-13 verified by DB spy test).**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-15T23:10:33Z
- **Completed:** 2026-04-15T23:18:33Z
- **Tasks:** 2 (both TDD — Task 1: 2 commits RED+GREEN; Task 2: 1 commit)
- **Tests added:** 18 (10 walking-graph + 3 preload-purity + 5 loader)
- **Files:** 6 created, 5 modified

## Accomplishments

- `buildWalkingGraph(edges)` runs Floyd-Warshall over sorted node list, producing a `Map<string, Map<string, number>>` distance matrix. Edges are bidirectional by default (unless `oneWay: true`), duplicates collapse to minimum weight, self-distance is 0, unreachable pairs are Infinity.
- `shortestPath(graph, from, to)` is a double `Map.get` — O(1) with no allocations.
- `WalkingGraphLoader` NestJS provider runs a single `SELECT from_node_id, to_node_id, walking_seconds AS seconds FROM walking_graph` at `onModuleInit`, maps rows to `Edge[]`, calls `buildWalkingGraph`, and caches the result. `getGraph()` returns the cached structure. Throws if called before init.
- `PlanGenerationModule` registered in both `AppModule` (HTTP) and `WorkerModule` (worker) — both processes keep the walking graph hot in memory.
- SOLV-13 contract: after `onModuleInit`, 10 subsequent `getGraph()` calls produce exactly 0 additional `db.execute` invocations. Same graph reference returned every time.
- Solver-side purity test: 1000 `shortestPath` queries do not mutate the distance map.
- Real `walking_graph.yaml` fixture (32 edges, 4 parks) parses and resolves known connected pairs at expected distances.

## Task Commits

1. **Task 1 RED: failing tests for buildWalkingGraph + shortestPath** — `9b7ca2f` (test)
2. **Task 1 GREEN: implement Floyd-Warshall walking-graph precompute** — `717211d` (feat)
3. **Task 2: walking graph loader + SOLV-13 DB spy gate** — `e50e03a` (feat)

## Files Created / Modified

### Created

- `packages/solver/src/walkingGraph.ts` — `Edge` type, `WalkingGraph` type, `buildWalkingGraph()`, `shortestPath()`.
- `packages/solver/tests/walking-graph.test.ts` — 10 tests: triangle routing, oneWay, duplicate collapse, disconnected=Infinity, same=0, determinism, purity, real YAML fixture.
- `packages/solver/tests/walking-graph-preload.test.ts` — 3 tests: 1000-query purity, separate-build determinism, input immutability.
- `apps/api/src/plan-generation/walking-graph.loader.ts` — `WalkingGraphLoader` NestJS provider (OnModuleInit + getGraph).
- `apps/api/src/plan-generation/plan-generation.module.ts` — module exports `WalkingGraphLoader`.
- `apps/api/tests/plan-generation/walking-graph-loader.test.ts` — 5 tests: DB call count=1, reference caching, distance resolution, pre-init throw, empty table.

### Modified

- `packages/solver/src/index.ts` — added `export * from './walkingGraph.js'`.
- `packages/solver/src/types.ts` — renamed `WalkingGraph` to `CatalogWalkingGraph` (frees name for runtime shape).
- `packages/solver/package.json` — added `"./package.json"` exports subpath.
- `apps/api/src/app.module.ts` — imports `PlanGenerationModule`.
- `apps/api/src/worker.module.ts` — imports `PlanGenerationModule`.

## Decisions Made

See frontmatter `key-decisions`. Highlights:

- **CatalogWalkingGraph renamed** to avoid collision with the Floyd-Warshall runtime type. The catalog shape stays a plain `{ edges: WalkingEdge[] }` for serialization; the runtime shape has `Map` instances that are not JSON-friendly.
- **Edge type scoped to walkingGraph.ts** — simpler shape (no parkId, uses `seconds` not `walkSeconds`) matches the SELECT alias the loader produces. Catalog's `WalkingEdge` retains its richer shape for content-pipeline use.
- **Mirror types in CJS loader** instead of `import type` from ESM solver — TS1541 prevents cross-module-system type-only imports under Node16 resolution. Structural equivalence is enforced at runtime when the dynamic import hands `Edge[]` to the real `buildWalkingGraph`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] WalkingGraph type name collision between catalog and runtime shapes**
- **Found during:** Task 1 (writing test imports)
- **Issue:** `types.ts` already exported `WalkingGraph = { edges: WalkingEdge[] }` (catalog shape from 03-04). Plan 03-05 defines a new `WalkingGraph = { nodes: string[], distances: Map<...> }` for the Floyd-Warshall output. Both cannot coexist under the same name.
- **Fix:** Renamed the catalog type to `CatalogWalkingGraph`. `SolverCatalog.walkingGraph` field type updated accordingly. Fixture `solver-input.ts` unchanged (structural shape matches new name).
- **Files modified:** `packages/solver/src/types.ts`
- **Committed in:** `9b7ca2f` (Task 1 RED commit)

**2. [Rule 3 - Blocking] ESM/CJS boundary: import type from solver triggers TS1541**
- **Found during:** Task 2 (typecheck after writing loader)
- **Issue:** `import type { Edge, WalkingGraph } from '@wonderwaltz/solver'` fails with TS1541 — "Type-only import of an ECMAScript module from a CommonJS module must have a resolution-mode attribute." Using `resolution-mode` requires a TS 5.3+ import attribute that commitlint/prettier choke on.
- **Fix:** Defined local mirror interfaces in `walking-graph.loader.ts`. Structural equivalence validated at runtime via the dynamic import + function call boundary.
- **Files modified:** `apps/api/src/plan-generation/walking-graph.loader.ts`
- **Committed in:** `e50e03a` (Task 2 commit)

**3. [Rule 3 - Blocking] solver package.json missing ./package.json exports subpath**
- **Found during:** Task 2 (loader createRequire.resolve failing)
- **Issue:** `require.resolve('@wonderwaltz/solver/package.json')` fails because pnpm strict mode only exposes subpaths declared in `exports`.
- **Fix:** Added `"./package.json": "./package.json"` to solver `package.json` exports map.
- **Files modified:** `packages/solver/package.json`
- **Committed in:** `e50e03a` (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (all Rule 3 blocking). None required user approval.
**Impact on plan:** All fixes necessary for type safety and module resolution. No scope creep.

## Authentication Gates

None — this plan is entirely local TS + NestJS tests.

## Issues Encountered

None — all blocking items resolved via deviation rules above.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

The walking-graph preload is live. Downstream plans can now:

- **03-07..03-10 (solver construction / local-search / LL allocator):** call `shortestPath(graph, fromId, toId)` for walk-time costing between attractions. The graph is injected from the loader, keeping solver code pure TS.
- **03-16 (plan-generation processor):** inject `WalkingGraphLoader` into the orchestrator, call `loader.getGraph()` per solve invocation — zero DB overhead guaranteed by SOLV-13 gate.

`PlanGenerationModule` is the extensibility point: 03-16 will add the generation processor, 03-15 the rethink handler.

---

*Phase: 03-engine*
*Completed: 2026-04-15*

## Self-Check: PASSED

- All 6 created files present on disk.
- All 3 task commits present in git log (9b7ca2f, 717211d, e50e03a).
- `pnpm --filter @wonderwaltz/solver test:run` — 4 files, 85 tests, 0 failures.
- `pnpm --filter @wonderwaltz/api test --run` — 23 files, 192 tests, 0 failures.
- `pnpm -r typecheck` clean across all packages.
