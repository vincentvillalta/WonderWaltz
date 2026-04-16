import { Test } from '@nestjs/testing';
import { describe, expect, it, vi } from 'vitest';
import { DB_TOKEN } from '../../src/ingestion/queue-times.service.js';
import { WalkingGraphLoader } from '../../src/plan-generation/walking-graph.loader.js';

/**
 * SOLV-13 DB-spy gate: after `onModuleInit`, the loader must never hit
 * the DB again — 10 subsequent `getGraph()` calls produce zero additional
 * `db.execute` invocations.
 *
 * Mirrors the `@wonderwaltz/solver` preload-purity test
 * (`packages/solver/tests/walking-graph-preload.test.ts`). Together they
 * pin the "load once at boot, read-only at solve-time" contract.
 */

type ExecCall = (query: unknown) => Promise<unknown>;

function makeDb(edges: Array<{ from_node_id: string; to_node_id: string; seconds: number }>): {
  execute: ReturnType<typeof vi.fn>;
} {
  const execute = vi.fn<ExecCall>((query: unknown) => {
    // Return an array (drizzle postgres-js RowList shape). If the loader
    // regresses to a non-walking_graph query this fixture will still
    // surface it because we assert the total call count == 1.
    const serialized = JSON.stringify(query);
    if (serialized.includes('walking_graph')) {
      return Promise.resolve(edges);
    }
    return Promise.resolve([]);
  });
  return { execute };
}

async function makeLoader(db: { execute: ReturnType<typeof vi.fn> }): Promise<WalkingGraphLoader> {
  const mod = await Test.createTestingModule({
    providers: [WalkingGraphLoader, { provide: DB_TOKEN, useValue: db }],
  }).compile();
  return mod.get(WalkingGraphLoader);
}

describe('WalkingGraphLoader — SOLV-13', () => {
  it('fires exactly 1 DB query on onModuleInit, zero on subsequent getGraph calls', async () => {
    const db = makeDb([
      { from_node_id: 'A', to_node_id: 'B', seconds: 60 },
      { from_node_id: 'B', to_node_id: 'C', seconds: 90 },
      { from_node_id: 'A', to_node_id: 'C', seconds: 200 },
    ]);
    const loader = await makeLoader(db);

    await loader.onModuleInit();

    // 10 follow-up getGraph() calls — simulating many solve invocations.
    for (let i = 0; i < 10; i++) {
      loader.getGraph();
    }

    expect(db.execute).toHaveBeenCalledTimes(1);
  });

  it('caches the built graph: 10 getGraph calls return the same reference', async () => {
    const db = makeDb([{ from_node_id: 'A', to_node_id: 'B', seconds: 30 }]);
    const loader = await makeLoader(db);
    await loader.onModuleInit();

    const first = loader.getGraph();
    for (let i = 0; i < 10; i++) {
      expect(loader.getGraph()).toBe(first);
    }
  });

  it('resolves known node pairs through the precomputed distance map', async () => {
    const db = makeDb([
      { from_node_id: 'A', to_node_id: 'B', seconds: 60 },
      { from_node_id: 'B', to_node_id: 'C', seconds: 90 },
      { from_node_id: 'A', to_node_id: 'C', seconds: 200 },
    ]);
    const loader = await makeLoader(db);
    await loader.onModuleInit();

    const g = loader.getGraph();
    // Triangle shortcut: A→B→C (60+90=150) beats direct A-C (200).
    expect(g.distances.get('A')?.get('C')).toBe(150);
    expect(g.distances.get('C')?.get('A')).toBe(150);
    expect(g.distances.get('A')?.get('A')).toBe(0);
  });

  it('throws when getGraph() is called before onModuleInit', async () => {
    const db = makeDb([]);
    const loader = await makeLoader(db);
    expect(() => loader.getGraph()).toThrow(/not initialized/i);
    expect(db.execute).not.toHaveBeenCalled();
  });

  it('handles empty walking_graph table (no edges) without crashing', async () => {
    const db = makeDb([]);
    const loader = await makeLoader(db);
    await loader.onModuleInit();
    const g = loader.getGraph();
    expect(g.nodes).toEqual([]);
    expect(g.distances.size).toBe(0);
  });
});
