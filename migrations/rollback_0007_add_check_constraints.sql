-- Rollback Script: Migration 0007 - Drop CHECK Constraints
-- Purpose: Safely rollback CHECK constraint additions from Migration 0007
-- Date: January 17, 2026
-- Created by: Principal Data Architect
-- Safe to Run: YES - All constraints can be dropped without data loss

-- =============================================================================
-- Phase 1: Users Table Constraints (Rollback)
-- =============================================================================

-- Drop user credits non-negative constraint
ALTER TABLE users
DROP CONSTRAINT IF EXISTS chk_users_credits_non_negative;

-- =============================================================================
-- Phase 2: Projects Table Constraints (Rollback)
-- =============================================================================

-- Drop project status enum constraint
ALTER TABLE projects
DROP CONSTRAINT IF EXISTS chk_projects_status_valid;

-- Drop project repo URL format constraint
ALTER TABLE projects
DROP CONSTRAINT IF EXISTS chk_projects_repo_url_format;

-- =============================================================================
-- Phase 3: Deployments Table Constraints (Rollback)
-- =============================================================================

-- Drop deployment environment enum constraint
ALTER TABLE deployments
DROP CONSTRAINT IF EXISTS chk_deployments_environment_valid;

-- Drop deployment status enum constraint
ALTER TABLE deployments
DROP CONSTRAINT IF EXISTS chk_deployments_status_valid;

-- Drop deployment blueprint version positive constraint
ALTER TABLE deployments
DROP CONSTRAINT IF EXISTS chk_deployments_blueprint_version_positive;

-- Drop deployment expires after created constraint
ALTER TABLE deployments
DROP CONSTRAINT IF EXISTS chk_deployments_expires_after_created;

-- =============================================================================
-- Phase 4: Blueprints Table Constraints (Rollback)
-- =============================================================================

-- Drop blueprint version positive constraint
ALTER TABLE blueprints
DROP CONSTRAINT IF EXISTS chk_blueprints_version_positive;

-- =============================================================================
-- Phase 5: Transactions Table Constraints (Rollback)
-- =============================================================================

-- Drop transaction amount positive constraint
ALTER TABLE transactions
DROP CONSTRAINT IF EXISTS chk_transactions_amount_positive;

-- Drop transaction credits added non-negative constraint
ALTER TABLE transactions
DROP CONSTRAINT IF EXISTS chk_transactions_credits_added_non_negative;

-- =============================================================================
-- Phase 6: Webhook Configurations Table Constraints (Rollback)
-- =============================================================================

-- Drop webhook retry range constraint
ALTER TABLE webhook_configurations
DROP CONSTRAINT IF EXISTS chk_webhook_configurations_retry_range;

-- Drop webhook timeout range constraint
ALTER TABLE webhook_configurations
DROP CONSTRAINT IF EXISTS chk_webhook_configurations_timeout_range;

-- Drop webhook URL format constraint
ALTER TABLE webhook_configurations
DROP CONSTRAINT IF EXISTS chk_webhook_configurations_url_format;

-- Drop webhook secret minimum length constraint
ALTER TABLE webhook_configurations
DROP CONSTRAINT IF EXISTS chk_webhook_configurations_secret_min_length;

-- =============================================================================
-- Phase 7: Teams Table Constraints (Rollback)
-- =============================================================================

-- Drop team subscription tier enum constraint
ALTER TABLE teams
DROP CONSTRAINT IF EXISTS chk_teams_subscription_tier_valid;

-- =============================================================================
-- Phase 8: Team Members Table Constraints (Rollback)
-- =============================================================================

-- Drop team member role enum constraint
ALTER TABLE team_members
DROP CONSTRAINT IF EXISTS chk_team_members_role_valid;

-- =============================================================================
-- Rollback Summary
-- =============================================================================
-- Tables Modified: 7 (users, projects, deployments, blueprints, transactions, webhook_configurations, teams, team_members)
-- Constraints Dropped: 16 total
-- Rollback Safety:
--   - Zero data loss: Constraints are validation rules, not data
--   - Reversible: All changes can be re-applied by running Migration 0007 again
--   - Immediate effect: Changes take effect immediately after rollback
--   - No dependencies: Constraints don't depend on each other, safe to drop individually
-- Business Impact of Rollback:
--   - Removes database-level validation
--   - Relies on application-level validation only
--   - Increased risk of invalid data insertion
--   - Reduced data integrity guarantees
-- Performance Impact:
--   - Slight performance improvement (fewer constraint checks on INSERT/UPDATE)
--   - Negligible impact on query performance
-- Security Impact:
--   - Reduced data integrity enforcement
--   - Increased vulnerability to invalid data
--   - Relies on application code for security validation
-- =============================================================================
