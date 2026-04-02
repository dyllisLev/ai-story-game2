-- ============================================================
-- Database Optimizations - Phase 1
-- Based on analysis on 2026-04-02
-- ============================================================

-- 1. Remove unused indexes that add overhead without benefit
-- These indexes have 0 scans and can be safely removed

-- Drop unused indexes on presets table
DROP INDEX IF EXISTS ai_story_game.idx_sg_presets_status_preset_id;
DROP INDEX IF EXISTS ai_story_game.idx_sg_presets_default;

-- Drop unused indexes on status_presets table
DROP INDEX IF EXISTS ai_story_game.idx_sg_status_presets_default;

-- Drop unused indexes on sessions table (empty table, will be recreated if needed)
DROP INDEX IF EXISTS ai_story_game.idx_sg_sessions_turn_count;
DROP INDEX IF EXISTS ai_story_game.idx_sg_sessions_progress;
DROP INDEX IF EXISTS ai_story_game.idx_sg_sessions_played;
DROP INDEX IF EXISTS ai_story_game.idx_sg_sessions_story_played;

-- ============================================================
-- 2. Create maintenance function for log retention

CREATE OR REPLACE FUNCTION cleanup_old_service_logs(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM ai_story_game.service_logs
  WHERE timestamp < NOW() - (retention_days || ' days')::INTERVAL;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER;

-- Grant execute to service role for automated maintenance
GRANT EXECUTE ON FUNCTION cleanup_old_service_logs(INTEGER) TO service_role;

-- ============================================================
-- 3. Add optimized composite index for service_logs
-- Standard B-tree index covering common query patterns

CREATE INDEX IF NOT EXISTS idx_service_logs_status_timestamp
ON ai_story_game.service_logs(status_code, timestamp DESC);

-- ============================================================
-- 4. Create database health monitoring view

CREATE OR REPLACE VIEW ai_story_game.db_health_metrics AS
SELECT
    schemaname,
    relname as table_name,
    seq_scan,
    seq_tup_read,
    idx_scan,
    idx_tup_fetch,
    n_live_tup,
    n_dead_tup,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||relname)) as total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||relname)) as table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||relname) - pg_relation_size(schemaname||'.'||relname)) as index_size
FROM pg_stat_user_tables
WHERE schemaname = 'ai_story_game'
ORDER BY pg_total_relation_size(schemaname||'.'||relname) DESC;

-- Grant access for monitoring
GRANT SELECT ON ai_story_game.db_health_metrics TO service_role;
GRANT SELECT ON ai_story_game.db_health_metrics TO authenticated;

-- ============================================================
-- 5. Add comments for documentation

COMMENT ON FUNCTION cleanup_old_service_logs(INTEGER) IS
'Removes service_logs entries older than specified retention days.
Default: 90 days. Run weekly to maintain table size.
Returns: Number of deleted rows.';

COMMENT ON INDEX ai_story_game.idx_service_logs_status_timestamp IS
'Composite index for status_code and timestamp queries.
Optimizes log filtering and dashboard queries.
Covers all data with efficient compound ordering.';

COMMENT ON VIEW ai_story_game.db_health_metrics IS
'Database health monitoring view.
Provides table sizes, scan patterns, and index usage statistics.
Updated in real-time from PostgreSQL statistics.';

-- ============================================================
-- 6. Note: VACUUM ANALYZE should be run separately
-- Run these commands manually after migration:
-- VACUUM ANALYZE ai_story_game.service_logs;
-- VACUUM ANALYZE ai_story_game.presets;
-- VACUUM ANALYZE ai_story_game.status_presets;
-- VACUUM ANALYZE ai_story_game.sessions;
