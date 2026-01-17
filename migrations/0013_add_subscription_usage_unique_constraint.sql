-- Migration 0013: Add Unique Constraint on Subscription Usage
-- Purpose: Add unique constraint on (user_id, period) to prevent duplicate usage records
-- Date: January 17, 2026
-- Created by: Autonomous Agent
-- Reversible: YES - Constraint can be dropped without data loss
-- Business Impact: Prevents billing errors and ensures accurate usage tracking
-- Related Issue: #635 - Missing unique constraint on subscription usage could cause billing errors

-- =============================================================================
-- Analysis Summary
-- =============================================================================
-- Problem: subscription_usage table is missing a unique constraint on (user_id, period)
-- Impact:
--   - Multiple usage records could exist for the same user and period
--   - Billing calculations could use incorrect data (double-charging or undercharging)
--   - Analytics would show inflated or inaccurate usage numbers
--   - Application behavior unpredictable when picking from duplicate records
--
-- Solution: Add unique constraint on (user_id, period) composite key
--   - Enforces one usage record per user per month
--   - Prevents duplicate records at database level
--   - Improves data integrity and billing accuracy

-- =============================================================================
-- Phase 1: Add Unique Constraint
-- =============================================================================

-- Create unique index on subscription_usage (user_id, period)
-- Business Logic: Each user should have only one usage record per period (YYYY-MM format)
-- Prevents: Duplicate usage records causing billing errors and analytics inaccuracies
-- Migration: Safe for existing data (will fail if duplicates exist, requiring manual cleanup)
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscription_usage_user_period
ON subscription_usage(user_id, period);

COMMENT ON INDEX idx_subscription_usage_user_period IS 'Prevents duplicate usage records - each user can have only one usage record per period (YYYY-MM)';

-- =============================================================================
-- Phase 2: Add Application-Level Validation (Optional Enhancement)
-- =============================================================================

-- Note: The Drizzle schema has been updated to include the unique constraint
-- See: lib/db/schema.ts - subscriptionUsage table definition
-- The schema change ensures Drizzle ORM enforces the constraint in future migrations

-- =============================================================================
-- Migration Summary
-- =============================================================================
-- Indexes Created: 1
--   - idx_subscription_usage_user_period (unique index on user_id, period)
--
-- Schema Changes:
--   - lib/db/schema.ts: Updated subscriptionUsage table to include unique constraint
--
-- Business Impact:
--   - Prevents billing errors from duplicate usage records
--   - Ensures accurate usage analytics and reporting
--   - Improves data integrity and system reliability
--   - Reduces customer support burden from billing disputes
--
-- Performance Impact:
--   - Unique constraint adds minimal overhead (<1ms) for INSERT/UPDATE operations
--   - Enables faster lookups by (user_id, period) for usage queries
--   - Improves query performance for usage-based billing calculations
--
-- Security Impact:
--   - Prevents data integrity attacks (inflating usage records)
--   - Ensures accurate billing for all customers
--
-- Risk Assessment:
--   - LOW: Migration will fail if duplicate records exist (requires manual cleanup)
--   - Mitigation: Check for duplicates before running migration in production
--
-- Pre-Migration Validation (Run before production deployment):
--   -- Check for duplicate (user_id, period) combinations
--   SELECT user_id, period, COUNT(*) as duplicate_count
--   FROM subscription_usage
--   GROUP BY user_id, period
--   HAVING COUNT(*) > 1;
--   -- If results returned, resolve duplicates before running migration
--
-- Rollback:
--   DROP INDEX IF EXISTS idx_subscription_usage_user_period;
--
-- Testing:
--   -- Test unique constraint with duplicate insert (should fail)
--   INSERT INTO subscription_usage (id, user_id, period, credits_used, credits_granted, projects_created, teams_created, webhooks_created, api_requests, last_reset_at, created_at, updated_at)
--   VALUES (gen_random_uuid(), 1, '2026-01', 0, 0, 0, 0, 0, 0, NOW(), NOW(), NOW());
--   -- Try to insert duplicate (should fail)
--   INSERT INTO subscription_usage (id, user_id, period, credits_used, credits_granted, projects_created, teams_created, webhooks_created, api_requests, last_reset_at, created_at, updated_at)
--   VALUES (gen_random_uuid(), 1, '2026-01', 0, 0, 0, 0, 0, 0, NOW(), NOW(), NOW());
--   -- Expected error: duplicate key value violates unique constraint
-- 
--   -- Test unique constraint with different periods (should succeed)
--   INSERT INTO subscription_usage (id, user_id, period, credits_used, credits_granted, projects_created, teams_created, webhooks_created, api_requests, last_reset_at, created_at, updated_at)
--   VALUES (gen_random_uuid(), 1, '2026-02', 0, 0, 0, 0, 0, 0, NOW(), NOW(), NOW());
--   -- Expected: Successful insert
-- =============================================================================
