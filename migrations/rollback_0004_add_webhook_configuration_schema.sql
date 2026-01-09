-- Rollback Migration 0004: Add Webhook Configuration and Event History
-- Purpose: Remove webhook tables and revert schema changes
-- Date: January 14, 2026
-- Created by: Principal Data Architect
-- Reversible: YES - This is the rollback script for migration 0004
-- Business Impact: Disables webhook functionality (only run if necessary)
-- Data Impact: ALL WEBHOOK DATA WILL BE PERMANENTLY DELETED - backup before running

-- =============================================================================
-- IMPORTANT WARNING
-- =============================================================================
-- THIS ROLLBACK WILL PERMANENTLY DELETE ALL WEBHOOK CONFIGURATIONS AND EVENT HISTORY
-- CREATE A DATABASE BACKUP BEFORE RUNNING THIS ROLLBACK
-- =============================================================================

-- =============================================================================
-- Phase 1: Drop triggers (reverse of creation)
-- =============================================================================

DROP TRIGGER IF EXISTS webhook_configurations_updated_at_trigger ON webhook_configurations;

-- =============================================================================
-- Phase 2: Drop functions (reverse of creation)
-- =============================================================================

DROP FUNCTION IF EXISTS update_webhook_configurations_updated_at();

-- =============================================================================
-- Phase 3: Drop CHECK constraints (reverse of creation)
-- =============================================================================

-- webhook_events constraints
ALTER TABLE webhook_events
DROP CONSTRAINT IF EXISTS chk_webhook_events_attempt_count_non_negative;

ALTER TABLE webhook_events
DROP CONSTRAINT IF EXISTS chk_webhook_events_status_enum;

-- webhook_configurations constraints
ALTER TABLE webhook_configurations
DROP CONSTRAINT IF EXISTS chk_webhook_configurations_secret_min_length;

ALTER TABLE webhook_configurations
DROP CONSTRAINT IF EXISTS chk_webhook_configurations_event_types_not_empty;

ALTER TABLE webhook_configurations
DROP CONSTRAINT IF EXISTS chk_webhook_configurations_timeout_range;

ALTER TABLE webhook_configurations
DROP CONSTRAINT IF EXISTS chk_webhook_configurations_retry_count_range;

ALTER TABLE webhook_configurations
DROP CONSTRAINT IF EXISTS chk_webhook_configurations_url_format;

-- =============================================================================
-- Phase 4: Drop indexes (reverse of creation)
-- =============================================================================

-- GIN indexes (JSONB)
DROP INDEX IF EXISTS idx_webhook_events_payload;
DROP INDEX IF EXISTS idx_webhook_configurations_event_types;

-- Time-based indexes
DROP INDEX IF EXISTS idx_webhook_events_next_retry_at;
DROP INDEX IF EXISTS idx_webhook_events_created_at;

-- Status and type indexes
DROP INDEX IF EXISTS idx_webhook_events_event_type;
DROP INDEX IF EXISTS idx_webhook_events_status;

-- Foreign key indexes
DROP INDEX IF EXISTS idx_webhook_events_webhook_configuration_id;

-- Partial indexes (soft-delete optimization)
DROP INDEX IF EXISTS idx_webhook_configurations_user_id_active;
DROP INDEX IF EXISTS idx_webhook_configurations_is_active;
DROP INDEX IF EXISTS idx_webhook_configurations_deleted_at;

-- =============================================================================
-- Phase 5: Drop tables (reverse of creation)
-- =============================================================================

-- Drop webhook_events first (has foreign key to webhook_configurations)
DROP TABLE IF EXISTS webhook_events;

-- Drop webhook_configurations
DROP TABLE IF EXISTS webhook_configurations;

-- =============================================================================
-- Rollback Summary
-- =============================================================================
-- Tables Dropped: 2 (webhook_configurations, webhook_events)
-- Columns Removed: 18 total
-- Indexes Dropped: 11 total
-- Constraints Dropped: 7 total
-- Triggers Dropped: 1
-- Functions Dropped: 1
-- Business Impact: Webhook functionality completely disabled
-- Data Impact: ALL WEBHOOK DATA PERMANENTLY DELETED (irreversible)
-- =============================================================================

-- Success notification
DO $$
BEGIN
  RAISE NOTICE '✅ Rollback completed: Webhook configuration and event history tables removed';
  RAISE NOTICE '⚠️  WARNING: All webhook data has been permanently deleted';
  RAISE NOTICE '🔒 Recommendation: Verify database state before production deployment';
END $$;
