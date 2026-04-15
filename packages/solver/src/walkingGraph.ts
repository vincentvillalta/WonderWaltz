/**
 * Pure-TS walking-graph precompute (Floyd-Warshall).
 *
 * Landing plan 03-05 / SOLV-13. Zero runtime deps, zero I/O, zero NestJS.
 * The API layer's `WalkingGraphLoader` is the sole side-effect boundary —
 * it reads edges from Postgres once at worker boot and hands them here.
 *
 * Complexity: Floyd-Warshall is O(n³) up-front; we expect ~60 nodes × ~32
 * edges at launch, so the precompute runs in well under 1ms. After that
 * every `shortestPath(from, to)` is a double `Map.get` → O(1).
 */

/** Raw edge input — matches the shape loaded from `walking_graph` rows. */
export type Edge = {
  fromNodeId: string;
  toNodeId: string;
  seconds: number;
  /** When true, edge is directional (from → to only). Defaults to bidirectional. */
  oneWay?: boolean;
};

/**
 * Precomputed walking graph. Lookups are `Map.get(from).get(to)` — O(1).
 * Nodes are sorted lexicographically for deterministic iteration.
 */
export type WalkingGraph = {
  nodes: string[];
  distances: Map<string, Map<string, number>>;
};

/**
 * Builds a WalkingGraph by running Floyd-Warshall all-pairs shortest paths
 * over the edge list.
 *
 * Invariants:
 *  - Self-distance is 0.
 *  - Unreachable pairs are `Infinity`.
 *  - Bidirectional edges collapse duplicates to the minimum weight.
 *  - Output is deterministic for any input ordering (nodes sorted, triple
 *    loop over sorted node list).
 */
export function buildWalkingGraph(edges: readonly Edge[]): WalkingGraph {
  // 1. Extract unique sorted node IDs for determinism.
  const nodeSet = new Set<string>();
  for (const e of edges) {
    nodeSet.add(e.fromNodeId);
    nodeSet.add(e.toNodeId);
  }
  const nodes = [...nodeSet].sort();

  // 2. Initialize the distance matrix: self = 0, other = Infinity.
  const distances = new Map<string, Map<string, number>>();
  for (const a of nodes) {
    const row = new Map<string, number>();
    for (const b of nodes) {
      row.set(b, a === b ? 0 : Infinity);
    }
    distances.set(a, row);
  }

  // 3. Seed edges. Bidirectional unless oneWay=true. Collapse to min weight.
  for (const e of edges) {
    const curFwd = distances.get(e.fromNodeId)?.get(e.toNodeId) ?? Infinity;
    if (e.seconds < curFwd) {
      distances.get(e.fromNodeId)!.set(e.toNodeId, e.seconds);
    }
    if (!e.oneWay) {
      const curRev = distances.get(e.toNodeId)?.get(e.fromNodeId) ?? Infinity;
      if (e.seconds < curRev) {
        distances.get(e.toNodeId)!.set(e.fromNodeId, e.seconds);
      }
    }
  }

  // 4. Floyd-Warshall. Iterate over sorted node list for determinism.
  for (const k of nodes) {
    const rowK = distances.get(k)!;
    for (const i of nodes) {
      const rowI = distances.get(i)!;
      const ik = rowI.get(k)!;
      if (ik === Infinity) continue; // early-out when i→k is unreachable
      for (const j of nodes) {
        const kj = rowK.get(j)!;
        if (kj === Infinity) continue;
        const viaK = ik + kj;
        if (viaK < rowI.get(j)!) {
          rowI.set(j, viaK);
        }
      }
    }
  }

  return { nodes, distances };
}

/**
 * O(1) shortest-path lookup. Returns walking seconds between `fromId` and
 * `toId`. Same node → 0. Unknown node or unreachable pair → Infinity.
 */
export function shortestPath(graph: WalkingGraph, fromId: string, toId: string): number {
  if (fromId === toId) return 0;
  const row = graph.distances.get(fromId);
  if (!row) return Infinity;
  const d = row.get(toId);
  return d === undefined ? Infinity : d;
}
