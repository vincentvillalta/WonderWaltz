-- Enable RLS on user-owned tables (service role bypasses via direct connection)
-- Catalog tables also get RLS so anon clients cannot bypass NestJS

-- User-owned tables
ALTER TABLE trips      ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests     ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans      ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_days  ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE iap_events   ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_tokens  ENABLE ROW LEVEL SECURITY;
ALTER TABLE packing_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE llm_costs          ENABLE ROW LEVEL SECURITY;

-- Catalog tables: RLS enabled, no public read policy
-- (forces all reads through NestJS service role -- Pitfall 7 prevention)
ALTER TABLE parks          ENABLE ROW LEVEL SECURITY;
ALTER TABLE attractions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE dining         ENABLE ROW LEVEL SECURITY;
ALTER TABLE shows          ENABLE ROW LEVEL SECURITY;
ALTER TABLE resorts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE walking_graph  ENABLE ROW LEVEL SECURITY;

-- User ownership policies
CREATE POLICY trips_owner ON trips
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY guests_owner ON guests
  FOR ALL USING (
    trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid())
  );

CREATE POLICY plans_owner ON plans
  FOR ALL USING (
    trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid())
  );

CREATE POLICY plan_days_owner ON plan_days
  FOR ALL USING (
    plan_id IN (
      SELECT p.id FROM plans p
      JOIN trips t ON p.trip_id = t.id
      WHERE t.user_id = auth.uid()
    )
  );

CREATE POLICY plan_items_owner ON plan_items
  FOR ALL USING (
    plan_day_id IN (
      SELECT pd.id FROM plan_days pd
      JOIN plans p ON pd.plan_id = p.id
      JOIN trips t ON p.trip_id = t.id
      WHERE t.user_id = auth.uid()
    )
  );

CREATE POLICY entitlements_owner ON entitlements
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY push_tokens_owner ON push_tokens
  FOR ALL USING (user_id = auth.uid());

-- No public policy on catalog tables -- service role only
-- NestJS uses direct Postgres connection (postgres:// URL) which bypasses RLS
