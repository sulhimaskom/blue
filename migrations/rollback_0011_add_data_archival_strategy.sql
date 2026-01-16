-- Rollback Migration 0011: Remove Data Archival Strategy
-- Purpose: Safely rollback data archival tables and functions
-- Reversible: YES - All changes can be dropped without data loss
-- Warning: Archival data in *_archived tables will be lost

-- =============================================================================
-- Phase 1: Drop Archival Functions
-- =============================================================================

-- Drop master functions first (depend on individual functions)
DROP FUNCTION IF EXISTS run_archival_job() CASCADE;
DROP FUNCTION IF EXISTS purge_archived_records() CASCADE;

-- Drop individual archival functions
DROP FUNCTION IF EXISTS archive_users_older_than(days INT) CASCADE;
DROP FUNCTION IF EXISTS archive_projects_older_than(days INT) CASCADE;
DROP FUNCTION IF EXISTS archive_blueprints_older_than(days INT) CASCADE;
DROP FUNCTION IF EXISTS archive_team_members_older_than(days INT) CASCADE;
DROP FUNCTION IF EXISTS archive_webhook_events_older_than(days INT) CASCADE;
DROP FUNCTION IF EXISTS archive_activity_logs_older_than(days INT) CASCADE;

-- =============================================================================
-- Phase 2: Drop Archive Table Indexes
-- =============================================================================

-- Drop users_archived indexes
DROP INDEX IF EXISTS idx_users_archived_deleted_at;
DROP INDEX IF EXISTS idx_users_archived_clerk_id;

-- Drop projects_archived indexes
DROP INDEX IF EXISTS idx_projects_archived_deleted_at;
DROP INDEX IF EXISTS idx_projects_archived_owner_id;

-- Drop blueprints_archived indexes
DROP INDEX IF EXISTS idx_blueprints_archived_deleted_at;
DROP INDEX IF EXISTS idx_blueprints_archived_project_id;

-- Drop team_members_archived indexes
DROP INDEX IF EXISTS idx_team_members_archived_deleted_at;
DROP INDEX IF EXISTS idx_team_members_archived_team_id;
DROP INDEX IF EXISTS idx_team_members_archived_user_id;

-- Drop webhook_events_archived indexes
DROP INDEX IF EXISTS idx_webhook_events_archived_created_at;
DROP INDEX IF EXISTS idx_webhook_events_archived_webhook_configuration_id;
DROP INDEX IF EXISTS idx_webhook_events_archived_status;

-- Drop activity_logs_archived indexes
DROP INDEX IF EXISTS idx_activity_logs_archived_timestamp;
DROP INDEX IF EXISTS idx_activity_logs_archived_user_id;
DROP INDEX IF EXISTS idx_activity_logs_archived_clerk_id;

-- =============================================================================
-- Phase 3: Drop Archive Tables
-- =============================================================================

-- Drop archive tables (WARNING: This will delete all archived data)
DROP TABLE IF EXISTS activity_logs_archived CASCADE;
DROP TABLE IF EXISTS webhook_events_archived CASCADE;
DROP TABLE IF EXISTS team_members_archived CASCADE;
DROP TABLE IF EXISTS blueprints_archived CASCADE;
DROP TABLE IF EXISTS projects_archived CASCADE;
DROP TABLE IF EXISTS users_archived CASCADE;

-- =============================================================================
-- Rollback Summary
-- =============================================================================
-- Functions Dropped: 8 total
-- Indexes Dropped: 15 total
-- Tables Dropped: 6 total
--
-- Warning:
--   - All archived data in *_archived tables will be permanently deleted
--   - This rollback should only be performed after data export if preservation needed
--   - Consider exporting archived data before running this rollback:
--
--   Example Export Commands:
--   \copy users_archived TO 'users_archived_backup.csv' CSV HEADER
--   \copy projects_archived TO 'projects_archived_backup.csv' CSV HEADER
--   \copy blueprints_archived TO 'blueprints_archived_backup.csv' CSV HEADER
--   \copy team_members_archived TO 'team_members_archived_backup.csv' CSV HEADER
--   \copy webhook_events_archived TO 'webhook_events_archived_backup.csv' CSV HEADER
--   \copy activity_logs_archived TO 'activity_logs_archived_backup.csv' CSV HEADER
-- =============================================================================
