-- Rollback Migration 0012: Remove Blueprint Share Audit Logs and Revert Permissions
-- Purpose: Safely rollback blueprint share audit logging and permission changes
-- Reversible: YES - All changes can be dropped
-- Warning: Audit log data will be lost, consider export before rollback

-- =============================================================================
-- Phase 1: Drop Trigger
-- =============================================================================

DROP TRIGGER IF EXISTS blueprint_shares_audit_trigger ON blueprint_shares;

-- =============================================================================
-- Phase 2: Drop Functions
-- =============================================================================

DROP FUNCTION IF EXISTS log_blueprint_share_access() CASCADE;
DROP FUNCTION IF EXISTS log_blueprint_share_action(
  p_blueprint_id UUID,
  p_share_id UUID,
  p_user_id INT,
  p_action TEXT,
  p_permission_level TEXT,
  p_ip_address TEXT,
  p_user_agent TEXT,
  p_metadata JSONB
) CASCADE;

-- =============================================================================
-- Phase 3: Revert Permission Constraints
-- =============================================================================

-- Drop enhanced permission constraint and restore original
ALTER TABLE blueprint_shares DROP CONSTRAINT IF EXISTS blueprint_shares_permission_check;

-- Restore original constraint (read_only, edit)
ALTER TABLE blueprint_shares
ADD CONSTRAINT blueprint_shares_permission_check
CHECK (permission IN ('read_only', 'edit'));

-- Revert 'view' permissions back to 'read_only'
UPDATE blueprint_shares
SET permission = 'read_only'
WHERE permission = 'view';

-- =============================================================================
-- Phase 4: Drop Audit Log Indexes
-- =============================================================================

DROP INDEX IF EXISTS idx_blueprint_share_audit_logs_blueprint_id;
DROP INDEX IF EXISTS idx_blueprint_share_audit_logs_share_id;
DROP INDEX IF EXISTS idx_blueprint_share_audit_logs_user_id;
DROP INDEX IF EXISTS idx_blueprint_share_audit_logs_action;
DROP INDEX IF EXISTS idx_blueprint_share_audit_logs_created_at;
DROP INDEX IF EXISTS idx_blueprint_share_audit_logs_blueprint_created;

-- =============================================================================
-- Phase 5: Drop Audit Log Table
-- =============================================================================

-- WARNING: This will permanently delete all audit log data
-- Consider exporting audit logs before running this rollback:
--   \copy blueprint_share_audit_logs TO 'blueprint_share_audit_logs_backup.csv' CSV HEADER

DROP TABLE IF EXISTS blueprint_share_audit_logs CASCADE;

-- =============================================================================
-- Rollback Summary
-- =============================================================================
-- Functions Dropped: 2
-- Triggers Dropped: 1
-- Indexes Dropped: 6
-- Tables Dropped: 1
-- Constraints Modified: 1
--
-- Warning:
--   - All audit log data in blueprint_share_audit_logs table will be permanently deleted
--   - Consider exporting audit logs before rollback:
--
--   Example Export Command:
--   \copy blueprint_share_audit_logs TO 'blueprint_share_audit_logs_backup.csv' CSV HEADER
--
--   Example Restore (if needed after rollback):
--   \copy blueprint_share_audit_logs FROM 'blueprint_share_audit_logs_backup.csv' CSV HEADER
-- =============================================================================
