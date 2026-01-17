-- Rollback Migration 0016: Remove Additional CHECK Constraints for Missing Tables
-- Purpose: Safely remove all CHECK constraints added in Migration 0016
-- Date: January 17, 2026
-- Created by: Principal Data Architect
-- Reversible: YES - Restores state to before Migration 0016
-- Safety: No data loss, only removes validation constraints
-- Note: This rollback removes all 15 CHECK constraints added in Migration 0016

-- =============================================================================
-- Phase 1: Blueprint Shares Table - Remove Constraints
-- =============================================================================

-- Remove permission enum validation constraint
ALTER TABLE blueprint_shares
DROP CONSTRAINT IF EXISTS chk_blueprint_shares_permission_valid;

-- Remove view count non-negative constraint
ALTER TABLE blueprint_shares
DROP CONSTRAINT IF EXISTS chk_blueprint_shares_view_count_non_negative;

-- Remove expires_at after created_at constraint
ALTER TABLE blueprint_shares
DROP CONSTRAINT IF EXISTS chk_blueprint_shares_expires_after_created;

-- =============================================================================
-- Phase 2: Team Projects Table - Remove Constraints
-- =============================================================================

-- Remove role enum validation constraint
ALTER TABLE team_projects
DROP CONSTRAINT IF EXISTS chk_team_projects_role_valid;

-- =============================================================================
-- Phase 3: Subscription Usage Table - Remove Constraints
-- =============================================================================

-- Remove credits used non-negative constraint
ALTER TABLE subscription_usage
DROP CONSTRAINT IF EXISTS chk_subscription_usage_credits_used_non_negative;

-- Remove credits granted non-negative constraint
ALTER TABLE subscription_usage
DROP CONSTRAINT IF EXISTS chk_subscription_usage_credits_granted_non_negative;

-- Remove projects created non-negative constraint
ALTER TABLE subscription_usage
DROP CONSTRAINT IF EXISTS chk_subscription_usage_projects_created_non_negative;

-- Remove teams created non-negative constraint
ALTER TABLE subscription_usage
DROP CONSTRAINT IF EXISTS chk_subscription_usage_teams_created_non_negative;

-- Remove webhooks created non-negative constraint
ALTER TABLE subscription_usage
DROP CONSTRAINT IF EXISTS chk_subscription_usage_webhooks_created_non_negative;

-- Remove API requests non-negative constraint
ALTER TABLE subscription_usage
DROP CONSTRAINT IF EXISTS chk_subscription_usage_api_requests_non_negative;

-- =============================================================================
-- Phase 4: User Settings Table - Remove Constraints
-- =============================================================================

-- Remove theme enum validation constraint
ALTER TABLE user_settings
DROP CONSTRAINT IF EXISTS chk_user_settings_theme_valid;

-- Remove language code format validation constraint
ALTER TABLE user_settings
DROP CONSTRAINT IF EXISTS chk_user_settings_language_valid;

-- Remove timezone format validation constraint
ALTER TABLE user_settings
DROP CONSTRAINT IF EXISTS chk_user_settings_timezone_valid;

-- Remove default project visibility enum validation constraint
ALTER TABLE user_settings
DROP CONSTRAINT IF EXISTS chk_user_settings_default_visibility_valid;

-- =============================================================================
-- Phase 5: Notifications Table - Remove Constraints
-- =============================================================================

-- Remove notification type enum validation constraint
ALTER TABLE notifications
DROP CONSTRAINT IF EXISTS chk_notifications_type_valid;

-- =============================================================================
-- Rollback Summary
-- =============================================================================
-- Constraints Removed: 15 total
-- Tables Affected: 6 (blueprint_shares, team_projects, subscription_usage, user_settings, notifications)
-- Safety: No data loss, only removes validation constraints
-- After Rollback:
--   - Database returns to state before Migration 0016
--   - Application-level validation becomes responsible for data integrity
--   - No performance impact (removing constraint checks)
--
-- Note: Consider implications before rolling back:
--   - Application must handle validation logic for these fields
--   - Invalid data may be inserted without database protection
--   - Compliance requirements may be affected (GDPR, SOC2)
-- =============================================================================
