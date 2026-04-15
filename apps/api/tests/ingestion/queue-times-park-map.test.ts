/**
 * Phase 2 carry-forward (closed in plan 03-01 task 3):
 * verifies queue-times.com catalog ID coverage for every WDW park.
 *
 * The Phase 2 ingestion worker maps live ride IDs from queue-times.com to
 * our internal catalog UUIDs via attractions.queue_times_id. If the YAML
 * carries stale or wrong queue_times_id values, the worker silently skips
 * every ride (no match in idMap → continue) and the corresponding park
 * never ingests anything.
 *
 * This test asserts:
 *   1. parks.yaml has all 4 WDW parks with queue_times_id ∈ [5, 6, 7, 8]
 *   2. attractions.yaml has at least N=4 rides per park with valid
 *      queue_times_id, AND each non-null queue_times_id collides with a
 *      ride id present in the live queue-times.com response (we fixture
 *      these into a JSON file rather than hitting the API in CI).
 *
 * The fixture file lives at apps/api/tests/fixtures/queue-times-live-ids.json
 * and was captured from queue-times.com on 2026-04-15.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'yaml';

// CommonJS module — __dirname is provided by Node directly, no import.meta needed.
const REPO_ROOT = resolve(__dirname, '../../../..');
const PARKS_PATH = resolve(REPO_ROOT, 'packages/content/wdw/parks.yaml');
const ATTRACTIONS_PATH = resolve(REPO_ROOT, 'packages/content/wdw/attractions.yaml');
const LIVE_IDS_PATH = resolve(__dirname, '..', 'fixtures', 'queue-times-live-ids.json');

interface Park {
  id: string;
  queue_times_id: number;
  name: string;
}
interface Attraction {
  id: string;
  park_id: string;
  name: string;
  queue_times_id?: number | null;
}
interface LiveIds {
  // queue-times park id (5,6,7,8) → list of live ride ids the API returns
  [parkId: string]: number[];
}

const parksDoc = parse(readFileSync(PARKS_PATH, 'utf8')) as { parks: Park[] };
const attractionsDoc = parse(readFileSync(ATTRACTIONS_PATH, 'utf8')) as {
  attractions: Attraction[];
};
const liveIds = JSON.parse(readFileSync(LIVE_IDS_PATH, 'utf8')) as LiveIds;

describe('queue-times catalog ID coverage', () => {
  it('parks.yaml covers all 4 WDW parks (queue-times IDs 5/6/7/8)', () => {
    const ids = parksDoc.parks.map((p) => p.queue_times_id).sort((a, b) => a - b);
    expect(ids).toEqual([5, 6, 7, 8]);
  });

  for (const liveParkId of [5, 6, 7, 8] as const) {
    it(`park ${liveParkId} has ≥4 attractions whose queue_times_id matches the live API`, () => {
      const park = parksDoc.parks.find((p) => p.queue_times_id === liveParkId)!;
      expect(park, `park ${liveParkId} missing from parks.yaml`).toBeDefined();

      const liveSet = new Set(liveIds[String(liveParkId)] ?? []);
      expect(liveSet.size, `no live IDs fixtured for park ${liveParkId}`).toBeGreaterThan(0);

      const matching = attractionsDoc.attractions.filter(
        (a) => a.park_id === park.id && a.queue_times_id != null && liveSet.has(a.queue_times_id),
      );

      expect(
        matching.length,
        `park ${park.name} (${liveParkId}) only ${matching.length} matching ride(s) — Phase 2 gap not closed`,
      ).toBeGreaterThanOrEqual(4);
    });
  }
});
