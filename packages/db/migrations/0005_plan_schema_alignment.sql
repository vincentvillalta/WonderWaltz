-- Phase 3 gap closure: align plan_days / plan_items / plans columns
-- with the read path in plans.service.ts and the write path in
-- persist-plan.service.ts.
--
-- Changes:
--   plan_days:  RENAME narrative -> narrative_intro
--               ADD forecast_confidence TEXT
--   plan_items: RENAME narrative -> narrative_tip
--               ADD name TEXT NOT NULL DEFAULT ''
--               ADD wait_minutes INTEGER
--               ADD lightning_lane_type TEXT (with CHECK constraint)
--               ADD notes TEXT
--   plans:      ADD warnings TEXT DEFAULT '[]'
--
-- All operations are idempotent.

-- ---------------------------------------------------------------------------
-- plan_days: rename narrative -> narrative_intro
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'plan_days' AND column_name = 'narrative'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'plan_days' AND column_name = 'narrative_intro'
  ) THEN
    ALTER TABLE "plan_days" RENAME COLUMN "narrative" TO "narrative_intro";
  END IF;
END $$;
--> statement-breakpoint

-- plan_days: add forecast_confidence
ALTER TABLE "plan_days"
  ADD COLUMN IF NOT EXISTS "forecast_confidence" text;
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- plan_items: rename narrative -> narrative_tip
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'plan_items' AND column_name = 'narrative'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'plan_items' AND column_name = 'narrative_tip'
  ) THEN
    ALTER TABLE "plan_items" RENAME COLUMN "narrative" TO "narrative_tip";
  END IF;
END $$;
--> statement-breakpoint

-- plan_items: add name
ALTER TABLE "plan_items"
  ADD COLUMN IF NOT EXISTS "name" text NOT NULL DEFAULT '';
--> statement-breakpoint

-- plan_items: add wait_minutes
ALTER TABLE "plan_items"
  ADD COLUMN IF NOT EXISTS "wait_minutes" integer;
--> statement-breakpoint

-- plan_items: add lightning_lane_type with CHECK constraint
ALTER TABLE "plan_items"
  ADD COLUMN IF NOT EXISTS "lightning_lane_type" text;
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'plan_items_lightning_lane_type_check'
  ) THEN
    ALTER TABLE "plan_items"
      ADD CONSTRAINT "plan_items_lightning_lane_type_check"
      CHECK ("lightning_lane_type" IN ('multi_pass', 'single_pass', 'none'));
  END IF;
END $$;
--> statement-breakpoint

-- plan_items: add notes
ALTER TABLE "plan_items"
  ADD COLUMN IF NOT EXISTS "notes" text;
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- plans: add warnings
-- ---------------------------------------------------------------------------
ALTER TABLE "plans"
  ADD COLUMN IF NOT EXISTS "warnings" text DEFAULT '[]';
