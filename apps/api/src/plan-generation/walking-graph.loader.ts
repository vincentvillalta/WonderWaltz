import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { createRequire } from 'module';
import { dirname, resolve } from 'path';
import { pathToFileURL } from 'url';
import { DB_TOKEN } from '../ingestion/queue-times.service.js';
// Type-only shapes mirrored from @wonderwaltz/solver. The solver package is
// ESM and this file is compiled as CommonJS — a direct `import type` would
// require a resolution-mode import attribute (TS1541). Local mirror types
// are identical in structure and validated by the Edge[] payload we hand
// to `buildWalkingGraph` at runtime (the real types live in
// packages/solver/src/walkingGraph.ts).
interface Edge {
  fromNodeId: string;
  toNodeId: string;
  seconds: number;
  oneWay?: boolean;
}
interface WalkingGraph {
  nodes: string[];
  distances: Map<string, Map<string, number>>;
}

/**
 * Minimal duck-type for the Drizzle DB — same pattern as
 * `LagAlertService` / `QueueTimesService` (see Phase 2 SUMMARYs). Avoids
 * importing `Db` from `@wonderwaltz/db` directly because of the dist-path
 * mismatch (`exports: ./dist/index.js` vs actual build at `./dist/src/`).
 */
interface DbExecutable {
  execute<T extends Record<string, unknown>>(
    query: ReturnType<typeof sql>,
  ): Promise<T[] | { rows: T[] }>;
}

interface WalkingGraphRow extends Record<string, unknown> {
  from_node_id: string;
  to_node_id: string;
  seconds: number;
}

/**
 * SOLV-13: walking graph is loaded ONCE at worker/API boot.
 *
 * `onModuleInit` runs a single `SELECT from_node_id, to_node_id,
 * walking_seconds AS seconds FROM walking_graph` and hands the rows to
 * the pure-TS `buildWalkingGraph` Floyd-Warshall precompute. Every
 * subsequent `getGraph()` returns the cached structure — the solver
 * never touches the DB at solve-time.
 *
 * The solver package is ESM while `@wonderwaltz/api` is CommonJS, so
 * `buildWalkingGraph` is pulled in via `await import()` — the same
 * boundary pattern `SharedInfraModule` uses for `@wonderwaltz/db`.
 */
@Injectable()
export class WalkingGraphLoader implements OnModuleInit {
  private readonly logger = new Logger(WalkingGraphLoader.name);
  private graph?: WalkingGraph;

  constructor(@Inject(DB_TOKEN) private readonly db: DbExecutable) {}

  async onModuleInit(): Promise<void> {
    const result = await this.db.execute<WalkingGraphRow>(sql`
      SELECT from_node_id, to_node_id, walking_seconds AS seconds
      FROM walking_graph
    `);

    // drizzle postgres-js returns RowList (array); the duck-typed stubs
    // may return `{ rows: [] }`. Normalize both shapes.
    const rows = Array.isArray(result) ? result : (result.rows ?? []);
    const edges: Edge[] = rows.map((r) => ({
      fromNodeId: r.from_node_id,
      toNodeId: r.to_node_id,
      seconds: Number(r.seconds),
    }));

    const solverPkg = await loadSolverPackage();
    this.graph = solverPkg.buildWalkingGraph(edges);
    this.logger.log(
      `WalkingGraph preloaded: ${String(edges.length)} edges, ${String(this.graph.nodes.length)} nodes`,
    );
  }

  getGraph(): WalkingGraph {
    if (!this.graph) {
      throw new Error('WalkingGraphLoader not initialized — call onModuleInit() first');
    }
    return this.graph;
  }
}

// ───────────────────────────────────────────────────────────────────────
// ESM boundary — see Phase 2 SharedInfraModule DB_TOKEN factory for the
// mirroring pattern against @wonderwaltz/db.
// ───────────────────────────────────────────────────────────────────────

interface SolverPkg {
  buildWalkingGraph: (edges: readonly Edge[]) => WalkingGraph;
}

async function loadSolverPackage(): Promise<SolverPkg> {
  // @wonderwaltz/solver is ESM, @wonderwaltz/api is CommonJS. Resolve the
  // solver's package.json via the workspace symlink (works in both tsx
  // test runs and the tsc-compiled dist tree), then hop to the dist/src
  // entry point (mirrors the @wonderwaltz/db dist-path workaround in
  // SharedInfraModule — exports map points at dist/index.js but the tsc
  // output is actually at dist/src/index.js because rootDir='.').
  const require = createRequire(__filename);
  const pkgJsonPath = require.resolve('@wonderwaltz/solver/package.json');
  const solverPath = resolve(dirname(pkgJsonPath), 'dist/src/index.js');

  const mod = (await import(pathToFileURL(solverPath).href)) as SolverPkg;
  return mod;
}
