-- 0006_popularity_and_cache.sql
-- Phase 3 revisions:
--  1. Add attractions.popularity_score (1-10, default 5) + seed 12 WDW headliners.
--  2. Drop plans.solver_input_hash (cache was near-useless in practice; guest
--     identity made cache keys unique per trip).
--  3. Add narrative_day_cache for cross-user narrative reuse.

-- ─── 1. attractions.popularity_score ──────────────────────────────────────
ALTER TABLE attractions
  ADD COLUMN popularity_score SMALLINT NOT NULL DEFAULT 5
    CHECK (popularity_score BETWEEN 1 AND 10);

-- Seed real values for the 12 known WDW headliners. Values are a rough blend
-- of Touring Plans quality index + observed peak-wait patterns.
UPDATE attractions SET popularity_score = 10 WHERE external_id = 'wdw-ak-avatar-flight';
UPDATE attractions SET popularity_score = 10 WHERE external_id = 'wdw-hs-rise-resistance';
UPDATE attractions SET popularity_score =  9 WHERE external_id = 'wdw-mk-tron';
UPDATE attractions SET popularity_score =  9 WHERE external_id = 'wdw-mk-seven-dwarfs';
UPDATE attractions SET popularity_score =  9 WHERE external_id = 'wdw-ep-guardians';
UPDATE attractions SET popularity_score =  8 WHERE external_id = 'wdw-hs-slinky-dog';
UPDATE attractions SET popularity_score =  8 WHERE external_id = 'wdw-hs-tower-terror';
UPDATE attractions SET popularity_score =  8 WHERE external_id = 'wdw-ep-test-track';
UPDATE attractions SET popularity_score =  8 WHERE external_id = 'wdw-ep-remy';
UPDATE attractions SET popularity_score =  8 WHERE external_id = 'wdw-mk-space-mountain';
UPDATE attractions SET popularity_score =  8 WHERE external_id = 'wdw-ak-expedition-everest';
UPDATE attractions SET popularity_score =  7 WHERE external_id = 'wdw-ak-kilimanjaro';

-- ─── 2. plans.solver_input_hash — drop ────────────────────────────────────
-- Was included in every plan row + a UNIQUE-ish cache lookup. Guest ids
-- bake into the hash, so two different trips never shared a cache entry.
-- Dev-phase: drop outright; no production data to preserve.
ALTER TABLE plans DROP COLUMN IF EXISTS solver_input_hash;

-- ─── 3. narrative_day_cache — cross-user LLM reuse ────────────────────────
-- Cache key is sha256(parkId|date|sortedAttractionIds|budgetTier). Two
-- trips with the same day structure get the same narrative for free.
CREATE TABLE narrative_day_cache (
  cache_key        TEXT PRIMARY KEY,
  narrative_intro  TEXT NOT NULL,
  tips             JSONB NOT NULL DEFAULT '{}'::jsonb,  -- { [attractionId]: tipText }
  model            TEXT NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_hit_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  hit_count        INTEGER NOT NULL DEFAULT 0
);

-- Allow service role only — users never touch this table directly.
ALTER TABLE narrative_day_cache ENABLE ROW LEVEL SECURITY;
-- No policies = default deny for anon/authenticated; service_role bypasses RLS.

COMMENT ON TABLE narrative_day_cache IS
  'Per-day narrative cache keyed by (park, date, attraction set, budget tier). Shared across trips.';
