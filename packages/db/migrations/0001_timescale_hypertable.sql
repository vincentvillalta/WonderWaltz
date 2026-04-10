-- Enable TimescaleDB extension (Supabase has it, but guard is idempotent)
-- Note: enabling the extension requires superuser access. On Supabase, enable
-- it in the dashboard (Database -> Extensions -> timescaledb) before running migrations.
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- Convert wait_times_history to a TimescaleDB hypertable
-- Partitioned by 'ts' column with 7-day chunk intervals
SELECT create_hypertable(
  'wait_times_history',
  by_range('ts', INTERVAL '7 days'),
  if_not_exists => TRUE
);

-- Composite index for the solver's query pattern (ride_id, time range)
CREATE INDEX IF NOT EXISTS idx_wth_ride_ts
  ON wait_times_history (ride_id, ts DESC);
