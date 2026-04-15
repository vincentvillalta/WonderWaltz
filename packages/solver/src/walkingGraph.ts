/**
 * Pure-TS walking-graph precompute (Floyd-Warshall).
 *
 * Landing plan 03-05 / SOLV-13. RED-phase stub — real implementation lands
 * in the GREEN commit of Task 1.
 */

export type Edge = {
  fromNodeId: string;
  toNodeId: string;
  seconds: number;
  oneWay?: boolean;
};

export type WalkingGraph = {
  nodes: string[];
  distances: Map<string, Map<string, number>>;
};

export function buildWalkingGraph(_edges: readonly Edge[]): WalkingGraph {
  throw new Error('buildWalkingGraph not implemented (03-05 RED phase)');
}

export function shortestPath(_graph: WalkingGraph, _fromId: string, _toId: string): number {
  throw new Error('shortestPath not implemented (03-05 RED phase)');
}
