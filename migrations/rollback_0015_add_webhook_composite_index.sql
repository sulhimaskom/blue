-- Rollback Migration 0015: Drop Composite Index on Webhook Configurations
-- Purpose: Remove composite index created in migration 0015
-- Date: January 17, 2026
-- Issue: #636
-- Reversible: YES - This is the rollback script
-- Business Impact: Reverts to pre-migration state (slower query performance)
-- Note:
--   - Existing partial index idx_webhook_configurations_user_id_active still provides
--     some optimization for queries filtering by deleted_at IS NULL
--   - Full performance benefit requires re-running migration 0015

DROP INDEX IF EXISTS idx_webhook_configs_user_active;

-- Rollback Summary
-- Indexes Dropped: 1 total
-- Business Impact:
--   - Reverts to full table scan for queries without deleted_at filter
--   - Webhook API queries will be slower without this optimization
--   - Database load will increase as number of webhooks grows
-- Reversibility:
--   - Safe rollback operation (no data modification)
--   - Can reapply migration 0015 to restore performance benefits
--   - No data loss or schema changes
-- Recommendation:
--   - Use rollback only if index causes issues (highly unlikely)
--   - Consider dropping specific problematic indexes instead of full rollback
--   - Re-run migration 0015 after issue resolution to restore performance benefits
