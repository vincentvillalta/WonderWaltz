-- Hourly continuous aggregate for wait times
-- Used by ForecastModule.predictWait() -- queries this view, not the raw hypertable
CREATE MATERIALIZED VIEW IF NOT EXISTS wait_times_1h
WITH (timescaledb.continuous) AS
  SELECT
    ride_id,
    time_bucket('1 hour', ts)   AS hour_bucket,
    AVG(minutes)::integer        AS avg_minutes,
    MIN(minutes)                 AS min_minutes,
    MAX(minutes)                 AS max_minutes,
    COUNT(*)                     AS sample_count,
    BOOL_AND(is_open)            AS was_open
  FROM wait_times_history
  GROUP BY ride_id, hour_bucket
WITH NO DATA;

-- Data retention: keep raw observations for 2 years, then drop
SELECT add_retention_policy('wait_times_history', INTERVAL '2 years');

-- Continuous aggregate refresh: run hourly, 2-hour lag to ensure data completeness
SELECT add_continuous_aggregate_policy(
  'wait_times_1h',
  start_offset      => INTERVAL '3 hours',
  end_offset        => INTERVAL '1 hour',
  schedule_interval => INTERVAL '1 hour'
);
