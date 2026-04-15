import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  buildWalkingGraph,
  shortestPath,
  type Edge,
  type WalkingGraph,
} from '../src/walkingGraph.js';

/**
 * Task 1 — pure-TS walking-graph precompute (Floyd-Warshall).
 * No NestJS, no I/O (the fixture load uses node:fs inside the test file —
 * the package-boundary test only forbids I/O in src/).
 */

describe('buildWalkingGraph', () => {
  it('returns a WalkingGraph with sorted unique nodes and O(1) distances map', () => {
    const edges: Edge[] = [
      { fromNodeId: 'B', toNodeId: 'A', seconds: 60 },
      { fromNodeId: 'B', toNodeId: 'C', seconds: 90 },
    ];
    const g = buildWalkingGraph(edges);
    expect(g.nodes).toEqual(['A', 'B', 'C']);
    expect(g.distances).toBeInstanceOf(Map);
    // Self-distances are 0
    expect(g.distances.get('A')?.get('A')).toBe(0);
    expect(g.distances.get('B')?.get('B')).toBe(0);
  });

  it('triangle A-B(60), B-C(90), A-C(200) → shortestPath(A,C) = 150 via B', () => {
    const edges: Edge[] = [
      { fromNodeId: 'A', toNodeId: 'B', seconds: 60 },
      { fromNodeId: 'B', toNodeId: 'C', seconds: 90 },
      { fromNodeId: 'A', toNodeId: 'C', seconds: 200 },
    ];
    const g = buildWalkingGraph(edges);
    expect(shortestPath(g, 'A', 'C')).toBe(150);
    expect(shortestPath(g, 'C', 'A')).toBe(150); // symmetric
  });

  it('treats edges as bidirectional unless oneWay=true', () => {
    const edges: Edge[] = [{ fromNodeId: 'A', toNodeId: 'B', seconds: 30, oneWay: true }];
    const g = buildWalkingGraph(edges);
    expect(shortestPath(g, 'A', 'B')).toBe(30);
    expect(shortestPath(g, 'B', 'A')).toBe(Infinity);
  });

  it('collapses duplicate edges to the minimum weight', () => {
    const edges: Edge[] = [
      { fromNodeId: 'A', toNodeId: 'B', seconds: 120 },
      { fromNodeId: 'A', toNodeId: 'B', seconds: 60 },
      { fromNodeId: 'B', toNodeId: 'A', seconds: 45 },
    ];
    const g = buildWalkingGraph(edges);
    // Min across all three = 45 (bidirectional collapse).
    expect(shortestPath(g, 'A', 'B')).toBe(45);
  });

  it('disconnected node returns Infinity', () => {
    const edges: Edge[] = [
      { fromNodeId: 'A', toNodeId: 'B', seconds: 30 },
      { fromNodeId: 'C', toNodeId: 'D', seconds: 40 },
    ];
    const g = buildWalkingGraph(edges);
    expect(shortestPath(g, 'A', 'D')).toBe(Infinity);
    expect(shortestPath(g, 'B', 'C')).toBe(Infinity);
  });

  it('same node → 0 seconds', () => {
    const edges: Edge[] = [{ fromNodeId: 'A', toNodeId: 'B', seconds: 30 }];
    const g = buildWalkingGraph(edges);
    expect(shortestPath(g, 'A', 'A')).toBe(0);
    expect(shortestPath(g, 'B', 'B')).toBe(0);
  });

  it('returns Infinity for nodes not in the graph', () => {
    const g = buildWalkingGraph([{ fromNodeId: 'A', toNodeId: 'B', seconds: 30 }]);
    expect(shortestPath(g, 'X', 'A')).toBe(Infinity);
    expect(shortestPath(g, 'A', 'X')).toBe(Infinity);
  });

  it('is deterministic: same edge list → byte-identical distance map', () => {
    const edges: Edge[] = [
      { fromNodeId: 'A', toNodeId: 'B', seconds: 60 },
      { fromNodeId: 'B', toNodeId: 'C', seconds: 90 },
      { fromNodeId: 'C', toNodeId: 'D', seconds: 45 },
      { fromNodeId: 'A', toNodeId: 'D', seconds: 300 },
    ];
    const g1 = buildWalkingGraph(edges);
    const g2 = buildWalkingGraph(edges);
    expect(serialize(g1)).toBe(serialize(g2));
  });

  it('does not mutate input edge array or graph across repeated queries (purity)', () => {
    const edges: Edge[] = [
      { fromNodeId: 'A', toNodeId: 'B', seconds: 60 },
      { fromNodeId: 'B', toNodeId: 'C', seconds: 90 },
    ];
    const edgesSnapshot = JSON.stringify(edges);
    const g = buildWalkingGraph(edges);
    const before = serialize(g);
    for (let i = 0; i < 50; i++) {
      shortestPath(g, 'A', 'C');
      shortestPath(g, 'C', 'A');
    }
    expect(serialize(g)).toBe(before);
    expect(JSON.stringify(edges)).toBe(edgesSnapshot);
  });

  it('handles the real walking_graph.yaml fixture (known-connected nodes finite)', () => {
    const yamlPath = resolve(__dirname, '../../content/wdw/walking_graph.yaml');
    const raw = readFileSync(yamlPath, 'utf8');
    const edges = parseWalkingGraphYaml(raw);
    expect(edges.length).toBeGreaterThan(20); // sanity: phase-2 seeded ~32 edges
    const g = buildWalkingGraph(edges);
    // Space Mountain ↔ Tron: direct edge in fixture (180s).
    expect(shortestPath(g, 'attraction:wdw-mk-space-mountain', 'attraction:wdw-mk-tron')).toBe(180);
    // Space Mountain → Peter Pan: multi-hop via Buzz/People-Mover path is
    // disconnected; via 7-Dwarfs requires a bridge. The YAML as seeded has
    // no bridge between the Tomorrowland and Fantasyland clusters at MK,
    // so assert only that at minimum one known in-cluster pair is finite.
    expect(
      shortestPath(g, 'attraction:wdw-mk-space-mountain', 'attraction:wdw-mk-buzz-lightyear'),
    ).toBe(120);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

function serialize(g: WalkingGraph): string {
  const nodes = [...g.nodes].sort();
  const rows = nodes.map((a) => {
    const row = nodes.map((b) => {
      const d = g.distances.get(a)?.get(b);
      return d === Infinity || d === undefined ? 'Inf' : String(d);
    });
    return `${a}:${row.join(',')}`;
  });
  return rows.join('|');
}

/**
 * Minimal YAML parser for the walking_graph.yaml flow shape used by content/wdw.
 * Parses the list of `{ from, to, walking_seconds, park_id }` entries into the
 * pure-TS `Edge[]` the solver consumes.
 *
 * Kept dependency-free — pulling a YAML lib into tests would force a runtime
 * dep down the road; the boundary test already forbids that.
 */
function parseWalkingGraphYaml(yaml: string): Edge[] {
  const edges: Edge[] = [];
  // Match each `- { from: ..., to: ..., walking_seconds: N, park_id: ... }` block
  // across newlines.
  const blockRegex =
    /-\s*\{\s*from:\s*'([^']+)'\s*,\s*to:\s*'([^']+)'\s*,\s*walking_seconds:\s*(\d+)/g;
  let m: RegExpExecArray | null;
  while ((m = blockRegex.exec(yaml)) !== null) {
    const [, from, to, secs] = m;
    if (!from || !to || !secs) continue;
    edges.push({ fromNodeId: from, toNodeId: to, seconds: Number(secs) });
  }
  return edges;
}
