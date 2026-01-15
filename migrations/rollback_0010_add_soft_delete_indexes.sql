-- Rollback 0010: Remove Soft-Delete Performance Indexes
-- Purpose: Drop indexes added in migration 0010 to restore previous state
-- Date: January 15, 2026
-- Reversible: YES - All indexes can be dropped without data loss
-- Safe: Indexes are read-only, dropping has no impact on data integrity

-- =============================================================================
-- Rollback Instructions
-- =============================================================================
-- This script drops all indexes created in migration 0010:
-- 1. idx_users_id_deleted - Users table primary key + soft-delete lookup
-- 2. idx_users_clerk_id_deleted - Users table Clerk ID + soft-delete lookup
-- 3. idx_projects_id_deleted - Projects table primary key + soft-delete lookup
-- 4. idx_user_settings_user_deleted - User settings table user + soft-delete lookup
-- 5. idx_deployments_project_env_deleted - Deployments table project+environment+soft-delete lookup
-- 6. idx_team_members_team_user_deleted - Team members table team+user+soft-delete lookup
--
-- Note: Migration 0008 indexes remain intact:
--   - idx_team_members_team_deleted
--   - idx_team_members_user_deleted
--   - idx_projects_owner_deleted
--   - idx_blueprints_project_deleted
--   - idx_transactions_user_deleted
--   - idx_teams_owner_deleted
--   - Plus 18 other performance indexes

-- =============================================================================
-- Drop Index 1: Users Table - Primary Key Lookup with Soft-Delete
-- =============================================================================
DROP INDEX IF EXISTS idx_users_id_deleted;

-- =============================================================================
-- Drop Index 2: Users Table - Clerk ID Lookup with Soft-Delete
-- =============================================================================
DROP INDEX IF EXISTS idx_users_clerk_id_deleted;

-- =============================================================================
-- Drop Index 3: Projects Table - Primary Key Lookup with Soft-Delete
-- =============================================================================
DROP INDEX IF EXISTS idx_projects_id_deleted;

-- =============================================================================
-- Drop Index 4: User Settings Table - User Lookup with Soft-Delete
-- =============================================================================
DROP INDEX IF EXISTS idx_user_settings_user_deleted;

-- =============================================================================
-- Drop Index 5: Deployments Table - Project + Environment Lookup with Soft-Delete
-- =============================================================================
DROP INDEX IF EXISTS idx_deployments_project_env_deleted;

-- =============================================================================
-- Drop Index 6: Team Members Table - Team + User Lookup with Soft-Delete
-- =============================================================================
DROP INDEX IF EXISTS idx_team_members_team_user_deleted;

-- =============================================================================
-- Rollback Summary
-- =============================================================================
-- Indexes Dropped: 6 total
-- Data Impact: None (indexes are read-only structures)
-- Performance Impact: Queries using these indexes will revert to previous performance
-- Safety: Safe to run - no data modifications or loss
--
-- After rollback, query performance will revert to pre-migration 0010 state.
-- Consideration: If performance degradation is observed, re-run migration 0010.
-- =============================================================================
