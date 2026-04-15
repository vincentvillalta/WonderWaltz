-- Phase 3 engine scaffolding.
--
-- Adds the storage shapes every subsequent Phase 3 plan depends on:
--   * crowd_calendar — DB override table for crowd-bucket exceptions
--   * llm_cost_incidents — durable telemetry sink for circuit-breaker events
--   * trips.current_plan_id — pointer to the active plan (history preserved)
--   * trips.llm_budget_cents — per-trip lifetime LLM spend cap (default $0.50)
--   * plans_trip_hash_idx — index for solver_input_hash cache lookups
--   * attractions.baseline_wait_minutes / lightning_lane_type / is_headliner
--
-- All operations are guarded with IF NOT EXISTS so the migration is
-- idempotent against repeated drizzle-kit migrate runs.

-- ---------------------------------------------------------------------------
-- crowd_calendar — override table for crowd-bucket exceptions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "crowd_calendar" (
  "date" date PRIMARY KEY,
  "bucket" text NOT NULL,
  "reason" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "crowd_calendar_bucket_check"
    CHECK ("bucket" IN ('low', 'medium', 'high', 'peak'))
);
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- llm_cost_incidents — durable circuit-breaker telemetry
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "llm_cost_incidents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "trip_id" uuid NOT NULL,
  "event" text NOT NULL,
  "model" text NOT NULL,
  "spent_cents" integer NOT NULL,
  "timestamp" timestamp with time zone DEFAULT now() NOT NULL,
  "metadata" jsonb
);
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- trips: add current_plan_id + llm_budget_cents
-- ---------------------------------------------------------------------------
ALTER TABLE "trips"
  ADD COLUMN IF NOT EXISTS "current_plan_id" uuid;
--> statement-breakpoint

ALTER TABLE "trips"
  ADD COLUMN IF NOT EXISTS "llm_budget_cents" integer DEFAULT 50 NOT NULL;
--> statement-breakpoint

-- FK can fail if plans table doesn't exist yet at the time of bootstrapping a
-- fresh DB; guarded with DO block + exception swallow.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'trips_current_plan_id_fkey'
  ) THEN
    ALTER TABLE "trips"
      ADD CONSTRAINT "trips_current_plan_id_fkey"
      FOREIGN KEY ("current_plan_id") REFERENCES "plans"("id") ON DELETE SET NULL;
  END IF;
END $$;
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- plans: index for solver_input_hash cache lookups
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS "plans_trip_hash_idx"
  ON "plans" ("trip_id", "solver_input_hash");
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- attractions: solver-facing fields
-- ---------------------------------------------------------------------------
ALTER TABLE "attractions"
  ADD COLUMN IF NOT EXISTS "baseline_wait_minutes" integer;
--> statement-breakpoint

ALTER TABLE "attractions"
  ADD COLUMN IF NOT EXISTS "lightning_lane_type" text DEFAULT 'none' NOT NULL;
--> statement-breakpoint

ALTER TABLE "attractions"
  ADD COLUMN IF NOT EXISTS "is_headliner" boolean DEFAULT false NOT NULL;
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'attractions_lightning_lane_type_check'
  ) THEN
    ALTER TABLE "attractions"
      ADD CONSTRAINT "attractions_lightning_lane_type_check"
      CHECK ("lightning_lane_type" IN ('multi_pass', 'single_pass', 'none'));
  END IF;
END $$;
