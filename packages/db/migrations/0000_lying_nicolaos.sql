CREATE TYPE "public"."age_bracket" AS ENUM('0-2', '3-6', '7-9', '10-13', '14-17', '18+');--> statement-breakpoint
CREATE TYPE "public"."budget_tier" AS ENUM('pixie_dust', 'fairy_tale', 'royal_treatment');--> statement-breakpoint
CREATE TYPE "public"."entitlement_state" AS ENUM('free', 'unlocked');--> statement-breakpoint
CREATE TYPE "public"."lodging_type" AS ENUM('value', 'moderate', 'deluxe', 'deluxe_villa', 'off_site');--> statement-breakpoint
CREATE TYPE "public"."plan_status" AS ENUM('pending', 'generating', 'ready', 'error');--> statement-breakpoint
CREATE TABLE "affiliate_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"category" text NOT NULL,
	"name" text NOT NULL,
	"asin" text,
	"base_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "packing_list_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"category" text NOT NULL,
	"name" text NOT NULL,
	"is_affiliate" boolean DEFAULT false NOT NULL,
	"affiliate_item_id" uuid,
	"sort_index" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attractions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"park_id" uuid NOT NULL,
	"external_id" text NOT NULL,
	"name" text NOT NULL,
	"location_point" geometry(Point, 4326),
	"height_req_cm" integer,
	"queue_times_id" integer,
	"themeparks_wiki_id" text,
	"attraction_type" text DEFAULT 'ride' NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attractions_external_id_unique" UNIQUE("external_id")
);
--> statement-breakpoint
CREATE TABLE "dining" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"park_id" uuid,
	"resort_id" uuid,
	"external_id" text NOT NULL,
	"name" text NOT NULL,
	"dining_type" text NOT NULL,
	"cuisine_tags" text[] DEFAULT '{}' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dining_external_id_unique" UNIQUE("external_id")
);
--> statement-breakpoint
CREATE TABLE "parks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_id" text NOT NULL,
	"name" text NOT NULL,
	"queue_times_id" integer NOT NULL,
	"themeparks_wiki_id" text NOT NULL,
	"timezone" text DEFAULT 'America/New_York' NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "parks_external_id_unique" UNIQUE("external_id")
);
--> statement-breakpoint
CREATE TABLE "resorts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_id" text NOT NULL,
	"name" text NOT NULL,
	"tier" text NOT NULL,
	"is_on_property" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "resorts_external_id_unique" UNIQUE("external_id")
);
--> statement-breakpoint
CREATE TABLE "shows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"park_id" uuid NOT NULL,
	"external_id" text NOT NULL,
	"name" text NOT NULL,
	"show_type" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shows_external_id_unique" UNIQUE("external_id")
);
--> statement-breakpoint
CREATE TABLE "walking_graph" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_node_id" text NOT NULL,
	"to_node_id" text NOT NULL,
	"walking_seconds" integer NOT NULL,
	"park_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entitlements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"trip_id" uuid NOT NULL,
	"revenuecat_id" text NOT NULL,
	"state" text NOT NULL,
	"purchased_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "entitlements_revenuecat_id_unique" UNIQUE("revenuecat_id")
);
--> statement-breakpoint
CREATE TABLE "iap_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"trip_id" uuid,
	"event_type" text NOT NULL,
	"revenuecat_id" text,
	"raw_payload" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "llm_costs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid,
	"plan_id" uuid,
	"model" text NOT NULL,
	"input_tok" integer NOT NULL,
	"cached_read_tok" integer DEFAULT 0 NOT NULL,
	"output_tok" integer NOT NULL,
	"usd_cents" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text,
	"display_name" text,
	"is_anonymous" boolean DEFAULT true NOT NULL,
	"is_admin" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"name" text NOT NULL,
	"age_bracket" "age_bracket" NOT NULL,
	"has_das" boolean DEFAULT false NOT NULL,
	"has_mobility_needs" boolean DEFAULT false NOT NULL,
	"has_sensory_needs" boolean DEFAULT false NOT NULL,
	"dietary_flags" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trip_park_days" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"day_index" integer NOT NULL,
	"park_id" uuid NOT NULL,
	"is_hopper_day" boolean DEFAULT false NOT NULL,
	"date" date NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trip_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"must_do_attraction_ids" uuid[] DEFAULT '{}' NOT NULL,
	"avoid_attraction_ids" uuid[] DEFAULT '{}' NOT NULL,
	"meal_preferences" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trip_preferences_trip_id_unique" UNIQUE("trip_id")
);
--> statement-breakpoint
CREATE TABLE "trips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"budget_tier" "budget_tier" DEFAULT 'fairy_tale' NOT NULL,
	"lodging_type" "lodging_type" DEFAULT 'off_site' NOT NULL,
	"lodging_resort_id" uuid,
	"has_hopper" boolean DEFAULT false NOT NULL,
	"has_das" boolean DEFAULT false NOT NULL,
	"plan_status" "plan_status" DEFAULT 'pending' NOT NULL,
	"entitlement_state" "entitlement_state" DEFAULT 'free' NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wait_times_history" (
	"ride_id" uuid NOT NULL,
	"ts" timestamp with time zone NOT NULL,
	"minutes" integer NOT NULL,
	"is_open" boolean NOT NULL,
	"source" text NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plan_days" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"day_index" integer NOT NULL,
	"park_id" uuid NOT NULL,
	"date" text NOT NULL,
	"narrative" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plan_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_day_id" uuid NOT NULL,
	"item_type" text NOT NULL,
	"ref_id" uuid,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"sort_index" integer NOT NULL,
	"narrative" text,
	"metadata" jsonb,
	"is_completed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"solver_input_hash" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"generated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"platform" text NOT NULL,
	"token" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "push_tokens_token_unique" UNIQUE("token")
);
