-- Rollback Migration 0014: Remove CHECK Constraint for Blueprint Share Permissions
-- Purpose: Remove database-level validation constraint for blueprint share permissions
-- Date: January 17, 2026
-- Related Issue: #637
-- Reversible: YES (re-adds constraint)
-- Safety: Safe to rollback - only removes validation without data loss

-- =============================================================================
-- Remove Constraint: Validate blueprint share permission enum
-- =============================================================================
-- Constraint Name: chk_blueprint_shares_permission_valid
-- Safety: Safe to remove - existing valid data remains intact
-- Impact: Removes database-level validation, application must handle validation
ALTER TABLE blueprint_shares
DROP CONSTRAINT IF EXISTS chk_blueprint_shares_permission_valid;

-- =============================================================================
-- Rollback Summary
-- =============================================================================
-- Tables Modified: 1 (blueprint_shares)
-- CHECK Constraints Removed: 1
-- Safety Notes:
--   - No data loss during rollback
--   - Existing valid data remains unchanged
--   - Application must handle permission validation after rollback
--   - Can be re-applied safely if needed
-- =============================================================================
