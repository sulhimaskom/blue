-- Rollback Migration: Remove Database-Level Constraints
-- Purpose: Safely remove all data integrity constraints
-- Date: January 7, 2026
-- Warning: Removing constraints increases risk of data corruption
-- Business Impact: Removes protection against invalid data

-- =============================================================================
-- USERS TABLE CONSTRAINTS (REMOVAL)
-- =============================================================================

-- Remove Constraint 1: Credits non-negative
ALTER TABLE users
DROP CONSTRAINT IF EXISTS chk_users_credits_non_negative;

-- Remove Constraint 2: Email format validation
ALTER TABLE users
DROP CONSTRAINT IF EXISTS chk_users_email_format;

-- Remove Constraint 3: Subscription tier enum validation
ALTER TABLE users
DROP CONSTRAINT IF EXISTS chk_users_subscription_tier_enum;

-- =============================================================================
-- PROJECTS TABLE CONSTRAINTS (REMOVAL)
-- =============================================================================

-- Remove Constraint 4: Project name length validation
ALTER TABLE projects
DROP CONSTRAINT IF EXISTS chk_projects_name_length;

-- Remove Constraint 5: Project status enum validation
ALTER TABLE projects
DROP CONSTRAINT IF EXISTS chk_projects_status_enum;

-- Remove Constraint 6: Repo URL format validation
ALTER TABLE projects
DROP CONSTRAINT IF EXISTS chk_projects_repo_url_format;

-- =============================================================================
-- BLUEPRINTS TABLE CONSTRAINTS (REMOVAL)
-- =============================================================================

-- Remove Constraint 7: Version positive enforcement
ALTER TABLE blueprints
DROP CONSTRAINT IF EXISTS chk_blueprints_version_positive;

-- Remove Constraint 8: Content not empty validation
ALTER TABLE blueprints
DROP CONSTRAINT IF EXISTS chk_blueprints_content_not_empty;

-- =============================================================================
-- TRANSACTIONS TABLE CONSTRAINTS (REMOVAL)
-- =============================================================================

-- Remove Constraint 9: Amount positive enforcement
ALTER TABLE transactions
DROP CONSTRAINT IF EXISTS chk_transactions_amount_positive;

-- Remove Constraint 10: Transaction type validation
ALTER TABLE transactions
DROP CONSTRAINT IF EXISTS chk_transactions_type_validation;

-- =============================================================================
-- COMMENT REMOVAL
-- =============================================================================

COMMENT ON TABLE users IS NULL;
COMMENT ON TABLE projects IS NULL;
COMMENT ON TABLE blueprints IS NULL;
COMMENT ON TABLE transactions IS NULL;

-- ========================================================================
-- NOTE: This rollback removes all data integrity protections.
-- Rolling back will increase risk of:
--   - Negative credits (billing disputes)
--   - Invalid email formats (delivery failures)
--   - Invalid project statuses (application logic errors)
--   - Malformed URLs (integration failures)
--   - Empty blueprint content (user experience issues)
--   - Negative transaction amounts (billing disputes)
-- ========================================================================
