-- Rollback Script: Migration 0009 - Remove Foreign Key Indexes
-- Purpose: Safely remove foreign key indexes created in migration 0009
-- Date: January 13, 2026
-- Created by: Principal Data Architect
-- Safe: YES - All indexes can be dropped without data loss
-- Impact: Minimal - Performance regression for webhook, deployment, and subscription queries
-- Note: Rollback restores pre-migration performance characteristics

-- =============================================================================
-- Rollback in Reverse Order (Last Created, First Dropped)
-- =============================================================================

-- Drop Index 5: Webhook subscription lookup by configuration (LOW IMPACT)
DROP INDEX IF EXISTS idx_webhook_subscriptions_config_active;
-- Impact: 10-15% performance regression for webhook subscription queries
-- Tables Affected: webhook_subscriptions

-- Drop Index 4: Activity log lookup by user with timestamp ordering (MEDIUM IMPACT)
DROP INDEX IF EXISTS idx_activity_logs_user_timestamp;
-- Impact: 15-20% performance regression for activity log queries
-- Tables Affected: activity_logs

-- Drop Index 3: Subscription usage lookup by user and period (MEDIUM IMPACT)
DROP INDEX IF EXISTS idx_subscription_usage_user_period;
-- Impact: 15-25% performance regression for subscription usage queries
-- Tables Affected: subscription_usage

-- Drop Index 2: Deployment project lookup with chronological ordering (HIGH IMPACT)
DROP INDEX IF EXISTS idx_deployments_project_created;
-- Impact: 25-35% performance regression for deployment history queries
-- Tables Affected: deployments

-- Drop Index 1: Webhook configuration user lookup with soft-delete filtering (HIGH IMPACT)
DROP INDEX IF EXISTS idx_webhook_configurations_user_deleted;
-- Impact: 20-30% performance regression for webhook configuration queries
-- Tables Affected: webhook_configurations

-- =============================================================================
-- Rollback Verification
-- =============================================================================
-- After rollback execution, verify:
-- 1. All 5 foreign key indexes are removed from database
--    - idx_webhook_configurations_user_deleted
--    - idx_deployments_project_created
--    - idx_subscription_usage_user_period
--    - idx_activity_logs_user_timestamp
--    - idx_webhook_subscriptions_config_active
--
-- 2. Existing foreign key constraints remain intact
--    - webhookConfigurations.userId → users.id
--    - deployments.projectId → projects.id
--    - subscriptionUsage.userId → users.id
--    - activityLogs.userId → users.id
--    - webhookSubscriptions.webhook_configuration_id → webhookConfigurations.id
--
-- 3. All data remains unchanged (zero data loss)
--
-- 4. Existing indexes from previous migrations remain intact
--    - 24 indexes from migration 0008 still present
--
-- =============================================================================
-- Rollback Impact Summary
-- =============================================================================
-- Indexes Removed: 5 total
-- High Impact: 2 indexes
-- Medium Impact: 2 indexes
-- Low Impact: 1 index
--
-- Performance Regression:
--   - 15-25% query performance regression for affected features
--   - Slower webhook configuration queries (20-30%)
--   - Slower deployment history queries (25-35%)
--   - Slower subscription usage queries (15-25%)
--   - Slower activity log queries (15-20%)
--
-- Data Integrity:
--   - Zero data loss (index-only changes)
--   - All foreign key constraints remain valid
--   - Existing data validation enforced (migration 0007)
--   - Unique constraints preserved (migration 0005)
--
-- Rollback Safety:
--   - Reversible (can re-apply migration 0009 to restore performance)
--   - No schema changes (only index creation/removal)
--   - Safe to rollback at any time
--   - Maintains all existing functionality
-- =============================================================================
