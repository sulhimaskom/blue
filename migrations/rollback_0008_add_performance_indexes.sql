-- Rollback Migration 0008: Drop Performance-Critical Database Indexes
-- Purpose: Remove indexes created in migration 0008
-- Date: January 22, 2026
-- Created by: Principal Data Architect
-- Reversible: YES - This is the rollback script
-- Business Impact: Reverts to pre-migration state (slower query performance)
-- Source: lib/db/indexes.ts - RECOMMENDED_INDEXES and ADVANCED_INDEX_RECOMMENDATIONS

-- =============================================================================
-- Phase 1: Drop High Impact Indexes - Core User Dashboard Queries
-- =============================================================================

DROP INDEX IF EXISTS idx_projects_owner_status_created;

DROP INDEX IF EXISTS idx_blueprints_project_created_version;

DROP INDEX IF EXISTS idx_transactions_user_amount_created;

-- =============================================================================
-- Phase 2: Drop Legacy/Standard Indexes - Basic Query Optimization
-- =============================================================================

DROP INDEX IF EXISTS idx_projects_owner_created;

DROP INDEX IF EXISTS idx_blueprints_project_version;

DROP INDEX IF EXISTS idx_transactions_user_created;

-- =============================================================================
-- Phase 3: Drop Primary Key Lookup Optimization
-- =============================================================================

DROP INDEX IF EXISTS idx_blueprints_id;

DROP INDEX IF EXISTS idx_projects_id;

DROP INDEX IF EXISTS idx_users_clerk_id;

-- =============================================================================
-- Phase 4: Drop Composite Indexes for Enhanced Filtering
-- =============================================================================

DROP INDEX IF EXISTS idx_blueprints_project_created;

DROP INDEX IF EXISTS idx_transactions_stripe_payment;

-- =============================================================================
-- Phase 5: Drop Advanced Composite Indexes - Analytics and Reporting
-- =============================================================================

DROP INDEX IF EXISTS idx_composite_user_metrics;

-- =============================================================================
-- Phase 6: Drop Team-Related Indexes - Collaboration Features
-- =============================================================================

DROP INDEX IF EXISTS idx_teams_owner_created;

DROP INDEX IF EXISTS idx_team_members_user_deleted;

DROP INDEX IF EXISTS idx_team_members_team_deleted;

DROP INDEX IF EXISTS idx_team_projects_team;

DROP INDEX IF EXISTS idx_team_projects_project;

-- =============================================================================
-- Phase 7: Drop Webhook Event Processing Indexes - Queue Optimization
-- =============================================================================

DROP INDEX IF EXISTS idx_webhook_events_status_created;

DROP INDEX IF EXISTS idx_webhook_events_retry_queue;

DROP INDEX IF EXISTS idx_webhook_events_config_created;

-- =============================================================================
-- Phase 8: Drop Soft-Delete Optimization Indexes
-- =============================================================================

DROP INDEX IF EXISTS idx_projects_owner_deleted;

DROP INDEX IF EXISTS idx_blueprints_project_deleted;

DROP INDEX IF EXISTS idx_transactions_user_deleted;

DROP INDEX IF EXISTS idx_teams_owner_deleted;

-- =============================================================================
-- Rollback Summary
-- =============================================================================
-- Indexes Dropped: 24 total
-- High Impact: 10 indexes
-- Medium Impact: 11 indexes
-- Low Impact: 3 indexes
-- Business Impact:
--   - Reverts to pre-migration query performance (40-60% slower)
--   - Dashboard queries will be slower without optimization indexes
--   - Webhook queue processing may become less reliable
--   - Team collaboration queries will experience performance degradation
--   - Soft-delete filtering will require full table scans
-- Reversibility:
--   - Safe rollback operation (no data modification)
--   - Can reapply migration with up script to restore performance
--   - No data loss or schema changes
-- Recommendation:
--   - Use rollback only if indexes cause issues (highly unlikely)
--   - Consider dropping specific problematic indexes instead of full rollback
--   - Re-run migration after issue resolution to restore performance benefits
-- =============================================================================
