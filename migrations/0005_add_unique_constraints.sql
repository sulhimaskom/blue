-- Migration 0005: Add Unique Constraints for Data Integrity
-- Purpose: Add unique constraints to prevent duplicate data and business conflicts
-- Date: January 14, 2026
-- Created by: Principal Data Architect
-- Reversible: YES - All constraints can be dropped without data loss
-- Business Impact: Prevents billing disputes and deployment conflicts

-- =============================================================================
-- Phase 1: Add unique constraint on transactions.stripe_payment_id
-- =============================================================================

-- Constraint: Prevent duplicate Stripe payment charges
-- Business Logic: Each Stripe payment ID should only be recorded once
-- Prevents: Billing disputes from duplicate charges
-- Migration: Safe for existing data (validates uniqueness)
ALTER TABLE transactions
ADD CONSTRAINT uq_transactions_stripe_payment_id
UNIQUE (stripe_payment_id);

COMMENT ON CONSTRAINT uq_transactions_stripe_payment_id ON transactions IS 'Prevents duplicate Stripe payment charges - each payment ID can only be recorded once';

-- =============================================================================
-- Phase 2: Add unique constraint on projects.repo_url (conditional)
-- =============================================================================

-- Constraint: Prevent duplicate repository deployments
-- Business Logic: Each GitHub repository URL should only be used once
-- Prevents: GitHub API conflicts from duplicate deployments
-- Migration: Safe for existing data (validates uniqueness, allows NULL values)
-- Note: Uses partial unique index to allow NULL values (projects without deployments)
CREATE UNIQUE INDEX IF NOT EXISTS uq_projects_repo_url
ON projects (repo_url)
WHERE repo_url IS NOT NULL;

COMMENT ON INDEX uq_projects_repo_url IS 'Prevents duplicate GitHub repository deployments - each repo URL can only be used once (NULL values allowed)';

-- =============================================================================
-- Migration Summary
-- =============================================================================
-- Constraints Added: 1 (transactions.stripe_payment_id)
-- Indexes Created: 1 (projects.repo_url - partial unique index)
-- Business Impact:
--   - Prevents billing disputes from duplicate Stripe charges
--   - Prevents GitHub API conflicts from duplicate repository deployments
--   - Improves data quality and system reliability
--   - Reduces customer support burden
-- Performance Impact:
--   - Unique constraint adds minimal overhead (<1ms) for INSERT operations
--   - Enables faster lookups by stripe_payment_id for payment verification
--   - Enables faster lookups by repo_url for deployment status checking
-- Security Impact:
--   - Prevents financial duplicate charges (billing security)
--   - Prevents GitHub deployment conflicts (integration security)
-- =============================================================================
