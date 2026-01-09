-- Rollback Migration 0006: Remove Updated At Timestamps and Triggers
-- Purpose: Safely remove updated_at columns and triggers added in migration 0006
-- Date: January 14, 2026
-- Created by: Principal Data Architect
-- Reversible: YES - Zero data loss, only removes columns and triggers

-- =============================================================================
-- Phase 1: Drop triggers from all tables
-- =============================================================================

-- Remove trigger from users table
DROP TRIGGER IF EXISTS users_updated_at_trigger ON users;

-- Remove trigger from projects table
DROP TRIGGER IF EXISTS projects_updated_at_trigger ON projects;

-- Remove trigger from blueprints table
DROP TRIGGER IF EXISTS blueprints_updated_at_trigger ON blueprints;

-- Remove trigger from transactions table
DROP TRIGGER IF EXISTS transactions_updated_at_trigger ON transactions;

-- =============================================================================
-- Phase 2: Drop indexes on updated_at columns
-- =============================================================================

-- Remove index from users table
DROP INDEX IF EXISTS idx_users_updated_at;

-- Remove index from projects table
DROP INDEX IF EXISTS idx_projects_updated_at;

-- Remove index from blueprints table
DROP INDEX IF EXISTS idx_blueprints_updated_at;

-- Remove index from transactions table
DROP INDEX IF EXISTS idx_transactions_updated_at;

-- =============================================================================
-- Phase 3: Drop update trigger function
-- =============================================================================

-- Remove the automatic update function
DROP FUNCTION IF EXISTS update_updated_at_column();

-- =============================================================================
-- Phase 4: Remove updated_at columns from all tables
-- =============================================================================

-- Users table
ALTER TABLE users
DROP COLUMN IF EXISTS updated_at;

-- Projects table
ALTER TABLE projects
DROP COLUMN IF EXISTS updated_at;

-- Blueprints table
ALTER TABLE blueprints
DROP COLUMN IF EXISTS updated_at;

-- Transactions table
ALTER TABLE transactions
DROP COLUMN IF EXISTS updated_at;

-- =============================================================================
-- Rollback Summary
-- =============================================================================
-- Triggers Removed: 4 (users, projects, blueprints, transactions)
-- Indexes Removed: 4 (idx_users_updated_at, idx_projects_updated_at, idx_blueprints_updated_at, idx_transactions_updated_at)
-- Functions Removed: 1 (update_updated_at_column)
-- Columns Removed: 4 (updated_at TIMESTAMP)
-- Business Impact:
--   - Removes audit trail capability for data modifications
--   - Removes analytics support for last modification tracking
--   - Removes cache invalidation optimization based on updated_at
--   - Removes GDPR compliance support for data modification tracking
-- Performance Impact:
--   - Removes trigger overhead on UPDATE operations
--   - Removes index maintenance overhead
--   - Loses optimized sorting/filtering by updated_at
-- Recommendation:
--   - Only rollback if updated_at columns cause production issues
--   - Consider alternative audit trail strategies if rollback necessary
-- =============================================================================
