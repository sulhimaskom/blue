-- Rollback Migration 0005: Remove Unique Constraints for Data Integrity
-- Purpose: Safely remove unique constraints added in migration 0005
-- Date: January 14, 2026
-- Created by: Principal Data Architect
-- Reversible: YES - Zero data loss, only removes constraints

-- =============================================================================
-- Phase 1: Remove unique constraint from transactions.stripe_payment_id
-- =============================================================================

-- Remove unique constraint (safe operation - no data affected)
ALTER TABLE transactions
DROP CONSTRAINT IF EXISTS uq_transactions_stripe_payment_id;

-- =============================================================================
-- Phase 2: Remove unique index from projects.repo_url
-- =============================================================================

-- Remove partial unique index (safe operation - no data affected)
DROP INDEX IF EXISTS uq_projects_repo_url;

-- =============================================================================
-- Rollback Summary
-- =============================================================================
-- Constraints Removed: 1 (transactions.stripe_payment_id)
-- Indexes Removed: 1 (projects.repo_url - partial unique index)
-- Business Impact:
--   - Removes duplicate charge prevention (billing disputes may occur)
--   - Removes duplicate deployment prevention (GitHub conflicts may occur)
-- Performance Impact:
--   - Removes constraint overhead on INSERT operations
--   - Removes fast lookup optimization for payment and repo verification
-- Recommendation:
--   - Only rollback if constraints cause production issues
--   - Consider alternative data integrity strategies if rollback necessary
-- =============================================================================
