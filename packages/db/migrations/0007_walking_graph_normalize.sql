-- 0007_walking_graph_normalize.sql
-- Normalize walking_graph node IDs and add per-park entrance nodes.
--
-- Before this migration the graph had three ID conventions mixed:
--   * pure attraction UUIDs           (744 edges — correct)
--   * 'attraction:<external-id>'      (32 edges  — stale, catalog re-ID)
--   * no 'entrance' nodes at all      (solver's startNodeId was unreachable)
--
-- The solver did the right thing and fell back to a 300 s default for
-- every unreachable lookup, but that meant distance had no effect on
-- scoring. After this migration every active attraction is connected to
-- its park's entrance by a 360 s (6 min) bidirectional edge, which is
-- good enough until real park geography is seeded.

BEGIN;

-- ─── 1. Kill stale-prefixed rows that would collide on UPDATE ─────────
-- When both endpoints are 'attraction:<ext-id>' and a normalized UUID
-- edge for the same pair already exists, the UPDATE below would hit the
-- unique constraint. Preempt that by deleting the stale row first.
DELETE FROM walking_graph wg
WHERE (wg.from_node_id LIKE 'attraction:%' OR wg.to_node_id LIKE 'attraction:%')
  AND EXISTS (
    SELECT 1 FROM walking_graph wg2, attractions af, attractions at
    WHERE wg2.id <> wg.id
      AND af.external_id = substring(wg.from_node_id FROM 12)
      AND at.external_id = substring(wg.to_node_id FROM 12)
      AND ((wg2.from_node_id = af.id::text AND wg2.to_node_id = at.id::text)
        OR (wg2.from_node_id = at.id::text AND wg2.to_node_id = af.id::text))
      AND wg2.park_id = wg.park_id
  );

-- Mixed-convention edges: one endpoint is a UUID, the other is 'attraction:*'.
DELETE FROM walking_graph wg
WHERE wg.from_node_id LIKE 'attraction:%' AND wg.to_node_id NOT LIKE 'attraction:%'
  AND EXISTS (
    SELECT 1 FROM walking_graph wg2, attractions af
    WHERE wg2.id <> wg.id
      AND af.external_id = substring(wg.from_node_id FROM 12)
      AND wg2.from_node_id = af.id::text
      AND wg2.to_node_id = wg.to_node_id
      AND wg2.park_id = wg.park_id
  );
DELETE FROM walking_graph wg
WHERE wg.to_node_id LIKE 'attraction:%' AND wg.from_node_id NOT LIKE 'attraction:%'
  AND EXISTS (
    SELECT 1 FROM walking_graph wg2, attractions at
    WHERE wg2.id <> wg.id
      AND at.external_id = substring(wg.to_node_id FROM 12)
      AND wg2.to_node_id = at.id::text
      AND wg2.from_node_id = wg.from_node_id
      AND wg2.park_id = wg.park_id
  );

-- ─── 2. Rewrite remaining 'attraction:<ext-id>' to attraction UUIDs ───
UPDATE walking_graph wg
SET from_node_id = a.id::text
FROM attractions a
WHERE wg.from_node_id LIKE 'attraction:%'
  AND a.external_id = substring(wg.from_node_id FROM 12);

UPDATE walking_graph wg
SET to_node_id = a.id::text
FROM attractions a
WHERE wg.to_node_id LIKE 'attraction:%'
  AND a.external_id = substring(wg.to_node_id FROM 12);

-- Any rows still prefixed reference an external_id we can't find. Drop.
DELETE FROM walking_graph
WHERE from_node_id LIKE 'attraction:%'
   OR to_node_id LIKE 'attraction:%';

-- ─── 3. Seed 'entrance' nodes (bidirectional, 360 s default) ──────────
-- The solver's constructDay uses startNodeId = 'entrance'. Give it edges
-- to every active attraction in each park so shortestPath returns finite
-- values instead of falling through to the 300 s default.
INSERT INTO walking_graph (from_node_id, to_node_id, park_id, walking_seconds)
SELECT 'entrance', a.id::text, a.park_id, 360
FROM attractions a
WHERE a.is_active = true
ON CONFLICT DO NOTHING;

INSERT INTO walking_graph (from_node_id, to_node_id, park_id, walking_seconds)
SELECT a.id::text, 'entrance', a.park_id, 360
FROM attractions a
WHERE a.is_active = true
ON CONFLICT DO NOTHING;

COMMIT;
