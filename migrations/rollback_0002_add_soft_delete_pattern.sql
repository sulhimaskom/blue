-- Rollback Migration 0002: Remove Soft-Delete Pattern
-- This rollback safely removes the soft-delete columns and indexes
-- WARNING: This will prevent future data recovery of soft-deleted records

-- ============================================================================
-- Phase 1: Remove composite indexes
-- ============================================================================

DROP INDEX IF EXISTS idx_projects_owner_deleted_at;
DROP INDEX IF EXISTS idx_blueprints_project_deleted_at_version;
DROP INDEX IF EXISTS idx_transactions_user_deleted_at;

-- ============================================================================
-- Phase 2: Remove partial indexes
-- ============================================================================

DROP INDEX IF EXISTS idx_users_deleted_at;
DROP INDEX IF EXISTS idx_projects_deleted_at;
DROP INDEX IF EXISTS idx_blueprints_deleted_at;
DROP INDEX IF EXISTS idx_transactions_deleted_at;

-- ============================================================================
-- Phase 3: Remove deleted_at columns
-- ============================================================================

ALTER TABLE users DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE projects DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE blueprints DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE transactions DROP COLUMN IF EXISTS deleted_at;

-- ============================================================================
-- Rollback Summary
-- ============================================================================
-- Tables Modified: 4 (users, projects, blueprints, transactions)
-- Columns Removed: 4 (deleted_at TIMESTAMP WITH TIME ZONE)
-- Indexes Removed: 7 (4 partial + 3 composite)
-- WARNING: All soft-deleted records will become permanently inaccessible
-- Recommended: Backup database before running this rollback
-- ============================================================================
