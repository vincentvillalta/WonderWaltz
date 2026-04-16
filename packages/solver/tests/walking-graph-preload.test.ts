import { describe, expect, it } from 'vitest';
import {
  buildWalkingGraph,
  shortestPath,
  type Edge,
  type WalkingGraph,
} from '../src/walkingGraph.js';

/**
 * SOLV-13 pure-TS proof: once a WalkingGraph is built, repeated
 * `shortestPath()` queries do not mutate it. Complements the API-side
 * spy test (`apps/api/tests/plan-generation/walking-graph-loader.test.ts`)
 * which proves the same at the DI boundary by counting DB calls.
 *
 * Together the two tests pin the SOLV-13 contract: graph load is a
 * one-shot preload, solve-time is read-only + DB-free.
 */

describe('walking-graph preload — purity under repeated queries', () => {
  const edges: Edge[] = [
    { fromNodeId: 'space-mountain', toNodeId: 'buzz', seconds: 120 },
    { fromNodeId: 'buzz', toNodeId: 'people-mover', seconds: 60 },
    { fromNodeId: 'space-mountain', toNodeId: 'tron', seconds: 180 },
    { fromNodeId: 'haunted-mansion', toNodeId: 'peter-pan', seconds: 300 },
  ];

  it('graph built once serves 1000 queries without mutating distance map', () => {
    const g = buildWalkingGraph(edges);
    const snapshot = serialize(g);

    for (let i = 0; i < 1000; i++) {
      shortestPath(g, 'space-mountain', 'tron');
      shortestPath(g, 'buzz', 'space-mountain');
      shortestPath(g, 'haunted-mansion', 'peter-pan');
      shortestPath(g, 'space-mountain', 'peter-pan'); // Infinity case
    }

    expect(serialize(g)).toBe(snapshot);
  });

  it('same edge list → two separately-built graphs produce identical results', () => {
    const g1 = buildWalkingGraph(edges);
    const g2 = buildWalkingGraph(edges);
    for (const a of g1.nodes) {
      for (const b of g1.nodes) {
        expect(shortestPath(g1, a, b)).toBe(shortestPath(g2, a, b));
      }
    }
  });

  it('input edge array is not mutated by buildWalkingGraph', () => {
    const input: Edge[] = edges.map((e) => ({ ...e }));
    const frozen = JSON.stringify(input);
    buildWalkingGraph(input);
    expect(JSON.stringify(input)).toBe(frozen);
  });
});

function serialize(g: WalkingGraph): string {
  const rows = g.nodes.map((a) => {
    const row = g.nodes.map((b) => {
      const d = g.distances.get(a)?.get(b);
      return d === Infinity || d === undefined ? 'Inf' : String(d);
    });
    return `${a}:${row.join(',')}`;
  });
  return rows.join('|');
}
