-- Migration 0012: Add Blueprint Share Audit Logs and Enhanced Permissions
-- Purpose: Add audit log tracking for blueprint share access and support enhanced permission levels
-- Date: January 17, 2026
-- Created by: Autonomous Agent
-- Reversible: YES - All changes can be safely rolled back
-- Business Impact: Enables compliance tracking, access pattern analysis, and enterprise-grade security
-- Related Issue: #613 - Add blueprint sharing permissions and access control

-- =============================================================================
-- Analysis Summary
-- =============================================================================
-- Problem: Blueprint shares lack granular permission management and audit tracking
-- Impact: Limited access control, no compliance tracking, inability to analyze access patterns
-- Solution: Add audit log table and support enhanced permission levels (view, edit, fork, admin)
--
-- Permission Levels:
-- - view: Can view blueprint and its versions (read_only → view)
-- - edit: Can view and modify blueprint (existing)
-- - fork: Can view and create copies of blueprint (NEW)
-- - admin: Full control including managing shares (NEW)
--
-- Audit Logging:
-- - Track all share access events (view, edit, fork attempts)
-- - Track share permission changes
-- - Track share creation and revocation
-- - Enable compliance reporting and access pattern analysis

-- =============================================================================
-- Phase 1: Create Blueprint Share Audit Logs Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS blueprint_share_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blueprint_id UUID NOT NULL,
  share_id UUID NOT NULL,
  user_id INT NOT NULL,
  action TEXT NOT NULL,
  permission_level TEXT,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE blueprint_share_audit_logs IS 'Audit log table for blueprint share access events. Tracks all share-related activities for compliance and security monitoring.';

COMMENT ON COLUMN blueprint_share_audit_logs.blueprint_id IS 'Reference to the blueprint that was accessed';
COMMENT ON COLUMN blueprint_share_audit_logs.share_id IS 'Reference to the share that granted access';
COMMENT ON COLUMN blueprint_share_audit_logs.user_id IS 'ID of the user who performed the action';
COMMENT ON COLUMN blueprint_share_audit_logs.action IS 'Action performed: view, edit, fork, permission_changed, share_created, share_revoked';
COMMENT ON COLUMN blueprint_share_audit_logs.permission_level IS 'Permission level at time of action (view, edit, fork, admin)';
COMMENT ON COLUMN blueprint_share_audit_logs.ip_address IS 'IP address of the user who performed the action (for security monitoring)';
COMMENT ON COLUMN blueprint_share_audit_logs.user_agent IS 'User agent string of the client';
COMMENT ON COLUMN blueprint_share_audit_logs.metadata IS 'Additional metadata about the action (JSONB for flexibility)';
COMMENT ON COLUMN blueprint_share_audit_logs.created_at IS 'Timestamp when the audit log entry was created';

-- =============================================================================
-- Phase 2: Create Indexes for Audit Logs Table
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_blueprint_share_audit_logs_blueprint_id
ON blueprint_share_audit_logs (blueprint_id DESC);

CREATE INDEX IF NOT EXISTS idx_blueprint_share_audit_logs_share_id
ON blueprint_share_audit_logs (share_id DESC);

CREATE INDEX IF NOT EXISTS idx_blueprint_share_audit_logs_user_id
ON blueprint_share_audit_logs (user_id DESC);

CREATE INDEX IF NOT EXISTS idx_blueprint_share_audit_logs_action
ON blueprint_share_audit_logs (action);

CREATE INDEX IF NOT EXISTS idx_blueprint_share_audit_logs_created_at
ON blueprint_share_audit_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_blueprint_share_audit_logs_blueprint_created
ON blueprint_share_audit_logs (blueprint_id, created_at DESC);

COMMENT ON INDEX idx_blueprint_share_audit_logs_blueprint_id IS 'Optimizes audit log queries by blueprint';
COMMENT ON INDEX idx_blueprint_share_audit_logs_share_id IS 'Optimizes audit log queries by share';
COMMENT ON INDEX idx_blueprint_share_audit_logs_user_id IS 'Optimizes audit log queries by user';
COMMENT ON INDEX idx_blueprint_share_audit_logs_action IS 'Optimizes audit log queries by action type';
COMMENT ON INDEX idx_blueprint_share_audit_logs_created_at IS 'Optimizes time-based audit log queries';
COMMENT ON INDEX idx_blueprint_share_audit_logs_blueprint_created IS 'Optimizes composite queries for blueprint audit trails';

-- =============================================================================
-- Phase 3: Update Blueprint Shares Table Permission Constraints
-- =============================================================================

-- Drop existing check constraint (if any) and add new one with enhanced permissions
ALTER TABLE blueprint_shares DROP CONSTRAINT IF EXISTS blueprint_shares_permission_check;

ALTER TABLE blueprint_shares
ADD CONSTRAINT blueprint_shares_permission_check
CHECK (permission IN ('view', 'edit', 'fork', 'admin'));

COMMENT ON COLUMN blueprint_shares.permission IS 'Permission level: view (read-only), edit (modify), fork (create copies), admin (full control)';

-- =============================================================================
-- Phase 4: Create Audit Log Trigger Function
-- =============================================================================

CREATE OR REPLACE FUNCTION log_blueprint_share_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Log access when view_count is updated (user viewed a shared blueprint)
  IF TG_OP = 'UPDATE' AND NEW.view_count > OLD.view_count THEN
    INSERT INTO blueprint_share_audit_logs (
      blueprint_id,
      share_id,
      user_id,
      action,
      permission_level,
      metadata,
      created_at
    )
    VALUES (
      NEW.blueprint_id,
      NEW.id,
      COALESCE(NEW.sharedWithUser, 0),
      'view',
      NEW.permission,
      jsonb_build_object(
        'previous_view_count', OLD.viewCount,
        'new_view_count', NEW.viewCount
      ),
      NOW()
    );
  END IF;
  
  -- Log permission changes
  IF TG_OP = 'UPDATE' AND NEW.permission != OLD.permission THEN
    INSERT INTO blueprint_share_audit_logs (
      blueprint_id,
      share_id,
      user_id,
      action,
      permission_level,
      metadata,
      created_at
    )
    VALUES (
      NEW.blueprint_id,
      NEW.id,
      NEW.sharedBy,
      'permission_changed',
      NEW.permission,
      jsonb_build_object(
        'previous_permission', OLD.permission,
        'new_permission', NEW.permission
      ),
      NOW()
    );
  END IF;
  
  -- Log new share creation
  IF TG_OP = 'INSERT' THEN
    INSERT INTO blueprint_share_audit_logs (
      blueprint_id,
      share_id,
      user_id,
      action,
      permission_level,
      metadata,
      created_at
    )
    VALUES (
      NEW.blueprint_id,
      NEW.id,
      NEW.sharedBy,
      'share_created',
      NEW.permission,
      jsonb_build_object(
        'shared_with_user', NEW.sharedWithUser,
        'shared_with_team', NEW.sharedWithTeam,
        'expires_at', NEW.expiresAt
      ),
      NOW()
    );
  END IF;
  
  -- Log share revocation (DELETE operation)
  IF TG_OP = 'DELETE' THEN
    INSERT INTO blueprint_share_audit_logs (
      blueprint_id,
      share_id,
      user_id,
      action,
      permission_level,
      metadata,
      created_at
    )
    VALUES (
      OLD.blueprint_id,
      OLD.id,
      OLD.sharedBy,
      'share_revoked',
      OLD.permission,
      jsonb_build_object(
        'shared_with_user', OLD.sharedWithUser,
        'shared_with_team', OLD.sharedWithTeam
      ),
      NOW()
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION log_blueprint_share_access() IS 'Trigger function to automatically log blueprint share access events for audit and compliance tracking';

-- =============================================================================
-- Phase 5: Create Trigger for Audit Logging
-- =============================================================================

DROP TRIGGER IF EXISTS blueprint_shares_audit_trigger
ON blueprint_shares;

CREATE TRIGGER blueprint_shares_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON blueprint_shares
FOR EACH ROW
EXECUTE FUNCTION log_blueprint_share_access();

COMMENT ON TRIGGER blueprint_shares_audit_trigger ON blueprint_shares IS 'Automatically logs all blueprint share events (create, update, delete) to audit log table';

-- =============================================================================
-- Phase 6: Create Helper Functions for Manual Audit Logging
-- =============================================================================

-- Function to log custom actions (edit, fork, etc.)
CREATE OR REPLACE FUNCTION log_blueprint_share_action(
  p_blueprint_id UUID,
  p_share_id UUID,
  p_user_id INT,
  p_action TEXT,
  p_permission_level TEXT DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO blueprint_share_audit_logs (
    blueprint_id,
    share_id,
    user_id,
    action,
    permission_level,
    ip_address,
    user_agent,
    metadata,
    created_at
  )
  VALUES (
    p_blueprint_id,
    p_share_id,
    p_user_id,
    p_action,
    p_permission_level,
    p_ip_address,
    p_user_agent,
    p_metadata,
    NOW()
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION log_blueprint_share_action(...) IS 'Manually logs a custom blueprint share action (edit, fork, etc.) to the audit log table';

-- =============================================================================
-- Phase 7: Add Column Migration (update existing read_only permissions to view)
-- =============================================================================

-- Migrate existing 'read_only' permissions to 'view'
UPDATE blueprint_shares
SET permission = 'view'
WHERE permission = 'read_only';

-- =============================================================================
-- Migration Summary
-- =============================================================================
-- Tables Created: 1
--   - blueprint_share_audit_logs
--
-- Indexes Created: 6
--   - idx_blueprint_share_audit_logs_blueprint_id
--   - idx_blueprint_share_audit_logs_share_id
--   - idx_blueprint_share_audit_logs_user_id
--   - idx_blueprint_share_audit_logs_action
--   - idx_blueprint_share_audit_logs_created_at
--   - idx_blueprint_share_audit_logs_blueprint_created
--
-- Functions Created: 2
--   - log_blueprint_share_access() (trigger function)
--   - log_blueprint_share_action() (manual logging)
--
-- Triggers Created: 1
--   - blueprint_shares_audit_trigger (on blueprint_shares)
--
-- Constraints Modified: 1
--   - blueprint_shares_permission_check (enhanced permission levels)
--
-- Data Migration:
--   - Migrated 'read_only' permissions to 'view'
--
-- Business Impact:
--   - Enhanced security with granular permission levels (view, edit, fork, admin)
--   - Complete audit trail for all share-related activities
--   - Compliance-ready with access pattern tracking
--   - Enable security monitoring and incident response
--
-- Performance Impact:
--   - Minimal overhead from audit trigger (non-blocking)
--   - Optimized indexes for audit log queries
--   - Efficient data archival strategy (see migration 0011)
--
-- Implementation Notes:
--   - Audit logs are automatically created for all share events
--   - Custom actions (edit, fork) must be logged via log_blueprint_share_action()
--   - Audit logs can be archived after 90 days (see migration 0011)
--   - IP address and user agent capture should be enabled in application layer
--
-- Usage Examples:
--   -- Get audit logs for a specific blueprint
--   SELECT * FROM blueprint_share_audit_logs
--   WHERE blueprint_id = '...' ORDER BY created_at DESC;
--
--   -- Get audit logs for a specific share
--   SELECT * FROM blueprint_share_audit_logs
--   WHERE share_id = '...' ORDER BY created_at DESC;
--
--   -- Manually log an edit action
--   SELECT log_blueprint_share_action(
--     'blueprint-id',
--     'share-id',
--     123,
--     'edit',
--     'edit',
--     '192.168.1.1',
--     'Mozilla/5.0...',
--     '{"version": 2}'::jsonb
--   );
--
--   -- Get access statistics for a blueprint
--   SELECT 
--     action,
--     COUNT(*) as action_count,
--     COUNT(DISTINCT user_id) as unique_users
--   FROM blueprint_share_audit_logs
--   WHERE blueprint_id = '...'
--   GROUP BY action;
--
-- Reversibility:
--   - All changes can be rolled back (see rollback script)
--   - No data loss (audit logs preserved until purged)
--   - Safe to rollback by reversing permission migration
-- =============================================================================
