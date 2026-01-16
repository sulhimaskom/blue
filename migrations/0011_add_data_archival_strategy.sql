-- Migration 0011: Implement Data Archival Strategy for Soft-Deleted Records
-- Purpose: Create archival tables and automated archival strategy for soft-deleted records
-- Date: January 16, 2026
-- Created by: Principal Data Architect
-- Reversible: YES - Archive tables can be dropped without data loss
-- Business Impact: Maintains query performance at scale, reduces storage costs, improves database backup performance
-- Analysis: Soft-delete pattern causes record accumulation, impacting query performance as data volume grows

-- =============================================================================
-- Analysis Summary
-- =============================================================================
-- Problem: Soft-deleted records accumulate over time in active tables
-- Impact: Slower queries due to larger table scans, increased storage costs, longer backup times
-- Solution: Implement archival strategy to move old soft-deleted records to archive tables
--
-- Archive Strategy:
-- - Records soft-deleted > 90 days are archived
-- - Archive tables have minimal indexes (id, deleted_at only)
-- - Active queries remain fast with smaller working set
-- - Archived data remains accessible for audit/compliance
--
-- Tables to Archive:
-- 1. users_archived - Old user accounts (privacy/compliance requirements)
-- 2. projects_archived - Old projects (audit trail)
-- 3. blueprints_archived - Old blueprints (version history)
-- 4. team_members_archived - Old team memberships (audit trail)
-- 5. webhook_events_archived - Old webhook events (historical data)
-- 6. activity_logs_archived - Old activity logs (compliance)

-- =============================================================================
-- Phase 1: Create Archive Tables
-- =============================================================================

-- Archive Table 1: Users Archive
-- Rationale: User accounts deleted for privacy reasons must be retained for GDPR compliance
-- Archival Policy: 90 days after soft-delete, retained for 7 years, then purged
CREATE TABLE IF NOT EXISTS users_archived (
  id SERIAL PRIMARY KEY,
  clerk_id TEXT NOT NULL,
  email TEXT NOT NULL,
  credits INT NOT NULL,
  subscription_tier TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  deleted_at TIMESTAMP NOT NULL, -- When record was soft-deleted
  archived_at TIMESTAMP DEFAULT NOW() NOT NULL -- When record was moved to archive
);

COMMENT ON TABLE users_archived IS 'Archive table for soft-deleted user accounts. Records retained for 7 years for GDPR compliance.';
COMMENT ON COLUMN users_archived.archived_at IS 'Timestamp when record was moved from users table to archive';

-- Minimal indexes for archive tables (only for lookups/audits)
CREATE INDEX IF NOT EXISTS idx_users_archived_deleted_at
ON users_archived (deleted_at DESC);

CREATE INDEX IF NOT EXISTS idx_users_archived_clerk_id
ON users_archived (clerk_id);

COMMENT ON INDEX idx_users_archived_deleted_at IS 'Optimizes archive cleanup queries (purge old records)';
COMMENT ON INDEX idx_users_archived_clerk_id IS 'Optimizes audit lookups by Clerk ID';

-- Archive Table 2: Projects Archive
-- Rationale: Projects deleted by users must be retained for audit trail and analytics
-- Archival Policy: 90 days after soft-delete, retained for 5 years, then purged
CREATE TABLE IF NOT EXISTS projects_archived (
  id UUID PRIMARY KEY,
  owner_id INT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL,
  repo_url TEXT,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  deleted_at TIMESTAMP NOT NULL,
  archived_at TIMESTAMP DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE projects_archived IS 'Archive table for soft-deleted projects. Records retained for 5 years for audit trail.';

CREATE INDEX IF NOT EXISTS idx_projects_archived_deleted_at
ON projects_archived (deleted_at DESC);

CREATE INDEX IF NOT EXISTS idx_projects_archived_owner_id
ON projects_archived (owner_id);

COMMENT ON INDEX idx_projects_archived_deleted_at IS 'Optimizes archive cleanup queries';
COMMENT ON INDEX idx_projects_archived_owner_id IS 'Optimizes audit lookups by owner';

-- Archive Table 3: Blueprints Archive
-- Rationale: Blueprint versions must be retained for audit trail and version history
-- Archival Policy: 90 days after soft-delete, retained for 5 years, then purged
CREATE TABLE IF NOT EXISTS blueprints_archived (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL,
  version INT NOT NULL,
  content_markdown TEXT NOT NULL,
  structured_data JSONB NOT NULL,
  market_research JSONB,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  deleted_at TIMESTAMP NOT NULL,
  archived_at TIMESTAMP DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE blueprints_archived IS 'Archive table for soft-deleted blueprints. Records retained for 5 years for version history.';

CREATE INDEX IF NOT EXISTS idx_blueprints_archived_deleted_at
ON blueprints_archived (deleted_at DESC);

CREATE INDEX IF NOT EXISTS idx_blueprints_archived_project_id
ON blueprints_archived (project_id);

COMMENT ON INDEX idx_blueprints_archived_deleted_at IS 'Optimizes archive cleanup queries';
COMMENT ON INDEX idx_blueprints_archived_project_id IS 'Optimizes audit lookups by project';

-- Archive Table 4: Team Members Archive
-- Rationale: Team membership changes must be retained for audit trail
-- Archival Policy: 90 days after soft-delete, retained for 5 years, then purged
CREATE TABLE IF NOT EXISTS team_members_archived (
  id UUID PRIMARY KEY,
  team_id UUID NOT NULL,
  user_id INT NOT NULL,
  role TEXT NOT NULL,
  invited_by INT,
  joined_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  deleted_at TIMESTAMP NOT NULL,
  archived_at TIMESTAMP DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE team_members_archived IS 'Archive table for soft-deleted team members. Records retained for 5 years for audit trail.';

CREATE INDEX IF NOT EXISTS idx_team_members_archived_deleted_at
ON team_members_archived (deleted_at DESC);

CREATE INDEX IF NOT EXISTS idx_team_members_archived_team_id
ON team_members_archived (team_id);

CREATE INDEX IF NOT EXISTS idx_team_members_archived_user_id
ON team_members_archived (user_id);

COMMENT ON INDEX idx_team_members_archived_deleted_at IS 'Optimizes archive cleanup queries';
COMMENT ON INDEX idx_team_members_archived_team_id IS 'Optimizes audit lookups by team';
COMMENT ON INDEX idx_team_members_archived_user_id IS 'Optimizes audit lookups by user';

-- Archive Table 5: Webhook Events Archive
-- Rationale: Historical webhook event data for debugging and analytics
-- Archival Policy: 30 days after creation, retained for 1 year, then purged
-- Note: More aggressive archival (30 days) due to high volume of webhook events
CREATE TABLE IF NOT EXISTS webhook_events_archived (
  id UUID PRIMARY KEY,
  webhook_configuration_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL,
  response_status INT,
  response_body TEXT,
  error_message TEXT,
  attempt_count INT NOT NULL,
  next_retry_at TIMESTAMP,
  delivered_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL,
  archived_at TIMESTAMP DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE webhook_events_archived IS 'Archive table for historical webhook events. Records retained for 1 year for debugging and analytics.';

CREATE INDEX IF NOT EXISTS idx_webhook_events_archived_created_at
ON webhook_events_archived (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_webhook_events_archived_webhook_configuration_id
ON webhook_events_archived (webhook_configuration_id);

CREATE INDEX IF NOT EXISTS idx_webhook_events_archived_status
ON webhook_events_archived (status);

COMMENT ON INDEX idx_webhook_events_archived_created_at IS 'Optimizes archive cleanup queries by creation time';
COMMENT ON INDEX idx_webhook_events_archived_webhook_configuration_id IS 'Optimizes audit lookups by webhook configuration';
COMMENT ON INDEX idx_webhook_events_archived_status IS 'Optimizes analytics queries by status';

-- Archive Table 6: Activity Logs Archive
-- Rationale: Historical activity data for compliance and analytics
-- Archival Policy: 90 days after creation, retained for 2 years, then purged
CREATE TABLE IF NOT EXISTS activity_logs_archived (
  id UUID PRIMARY KEY,
  user_id INT NOT NULL,
  clerk_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  archived_at TIMESTAMP DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE activity_logs_archived IS 'Archive table for historical activity logs. Records retained for 2 years for compliance and analytics.';

CREATE INDEX IF NOT EXISTS idx_activity_logs_archived_timestamp
ON activity_logs_archived (timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_activity_logs_archived_user_id
ON activity_logs_archived (user_id);

CREATE INDEX IF NOT EXISTS idx_activity_logs_archived_clerk_id
ON activity_logs_archived (clerk_id);

COMMENT ON INDEX idx_activity_logs_archived_timestamp IS 'Optimizes archive cleanup queries by timestamp';
COMMENT ON INDEX idx_activity_logs_archived_user_id IS 'Optimizes audit lookups by user ID';
COMMENT ON INDEX idx_activity_logs_archived_clerk_id IS 'Optimizes audit lookups by Clerk ID';

-- =============================================================================
-- Phase 2: Create Database Functions for Archival
-- =============================================================================

-- Function 1: Archive users soft-deleted > 90 days
CREATE OR REPLACE FUNCTION archive_users_older_than(days INT)
RETURNS INT AS $$
DECLARE
  archived_count INT;
BEGIN
  INSERT INTO users_archived (
    id, clerk_id, email, credits, subscription_tier,
    created_at, updated_at, deleted_at, archived_at
  )
  SELECT
    id, clerk_id, email, credits, subscription_tier,
    created_at, updated_at, deleted_at, NOW()
  FROM users
  WHERE deleted_at IS NOT NULL
    AND deleted_at < NOW() - INTERVAL '1 day' * days
  RETURNING id INTO archived_count;

  DELETE FROM users
  WHERE deleted_at IS NOT NULL
    AND deleted_at < NOW() - INTERVAL '1 day' * days;

  RETURN COALESCE(archived_count, 0);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION archive_users_older_than(days INT) IS 'Archives users soft-deleted older than specified days, returns count of archived records';

-- Function 2: Archive projects soft-deleted > 90 days
CREATE OR REPLACE FUNCTION archive_projects_older_than(days INT)
RETURNS INT AS $$
DECLARE
  archived_count INT;
BEGIN
  INSERT INTO projects_archived (
    id, owner_id, name, description, status, repo_url,
    created_at, updated_at, deleted_at, archived_at
  )
  SELECT
    id, owner_id, name, description, status, repo_url,
    created_at, updated_at, deleted_at, NOW()
  FROM projects
  WHERE deleted_at IS NOT NULL
    AND deleted_at < NOW() - INTERVAL '1 day' * days
  RETURNING id INTO archived_count;

  DELETE FROM projects
  WHERE deleted_at IS NOT NULL
    AND deleted_at < NOW() - INTERVAL '1 day' * days;

  RETURN COALESCE(archived_count, 0);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION archive_projects_older_than(days INT) IS 'Archives projects soft-deleted older than specified days, returns count of archived records';

-- Function 3: Archive blueprints soft-deleted > 90 days
CREATE OR REPLACE FUNCTION archive_blueprints_older_than(days INT)
RETURNS INT AS $$
DECLARE
  archived_count INT;
BEGIN
  INSERT INTO blueprints_archived (
    id, project_id, version, content_markdown, structured_data, market_research,
    created_at, updated_at, deleted_at, archived_at
  )
  SELECT
    id, project_id, version, content_markdown, structured_data, market_research,
    created_at, updated_at, deleted_at, NOW()
  FROM blueprints
  WHERE deleted_at IS NOT NULL
    AND deleted_at < NOW() - INTERVAL '1 day' * days
  RETURNING id INTO archived_count;

  DELETE FROM blueprints
  WHERE deleted_at IS NOT NULL
    AND deleted_at < NOW() - INTERVAL '1 day' * days;

  RETURN COALESCE(archived_count, 0);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION archive_blueprints_older_than(days INT) IS 'Archives blueprints soft-deleted older than specified days, returns count of archived records';

-- Function 4: Archive team members soft-deleted > 90 days
CREATE OR REPLACE FUNCTION archive_team_members_older_than(days INT)
RETURNS INT AS $$
DECLARE
  archived_count INT;
BEGIN
  INSERT INTO team_members_archived (
    id, team_id, user_id, role, invited_by, joined_at,
    created_at, updated_at, deleted_at, archived_at
  )
  SELECT
    id, team_id, user_id, role, invited_by, joined_at,
    created_at, updated_at, deleted_at, NOW()
  FROM team_members
  WHERE deleted_at IS NOT NULL
    AND deleted_at < NOW() - INTERVAL '1 day' * days
  RETURNING id INTO archived_count;

  DELETE FROM team_members
  WHERE deleted_at IS NOT NULL
    AND deleted_at < NOW() - INTERVAL '1 day' * days;

  RETURN COALESCE(archived_count, 0);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION archive_team_members_older_than(days INT) IS 'Archives team members soft-deleted older than specified days, returns count of archived records';

-- Function 5: Archive webhook events older than 30 days
CREATE OR REPLACE FUNCTION archive_webhook_events_older_than(days INT)
RETURNS INT AS $$
DECLARE
  archived_count INT;
BEGIN
  INSERT INTO webhook_events_archived (
    id, webhook_configuration_id, event_type, payload, status,
    response_status, response_body, error_message, attempt_count,
    next_retry_at, delivered_at, created_at, archived_at
  )
  SELECT
    id, webhook_configuration_id, event_type, payload, status,
    response_status, response_body, error_message, attempt_count,
    next_retry_at, delivered_at, created_at, NOW()
  FROM webhook_events
  WHERE created_at < NOW() - INTERVAL '1 day' * days
  RETURNING id INTO archived_count;

  DELETE FROM webhook_events
  WHERE created_at < NOW() - INTERVAL '1 day' * days;

  RETURN COALESCE(archived_count, 0);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION archive_webhook_events_older_than(days INT) IS 'Archives webhook events older than specified days, returns count of archived records';

-- Function 6: Archive activity logs older than 90 days
CREATE OR REPLACE FUNCTION archive_activity_logs_older_than(days INT)
RETURNS INT AS $$
DECLARE
  archived_count INT;
BEGIN
  INSERT INTO activity_logs_archived (
    id, user_id, clerk_id, entity_type, entity_id, event_type, event_data,
    timestamp, archived_at
  )
  SELECT
    id, user_id, clerk_id, entity_type, entity_id, event_type, event_data,
    timestamp, NOW()
  FROM activity_logs
  WHERE timestamp < NOW() - INTERVAL '1 day' * days
  RETURNING id INTO archived_count;

  DELETE FROM activity_logs
  WHERE timestamp < NOW() - INTERVAL '1 day' * days;

  RETURN COALESCE(archived_count, 0);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION archive_activity_logs_older_than(days INT) IS 'Archives activity logs older than specified days, returns count of archived records';

-- Function 7: Master archival function (runs all archival operations)
CREATE OR REPLACE FUNCTION run_archival_job()
RETURNS TABLE(
  users_archived INT,
  projects_archived INT,
  blueprints_archived INT,
  team_members_archived INT,
  webhook_events_archived INT,
  activity_logs_archived INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    archive_users_older_than(90) as users_archived,
    archive_projects_older_than(90) as projects_archived,
    archive_blueprints_older_than(90) as blueprints_archived,
    archive_team_members_older_than(90) as team_members_archived,
    archive_webhook_events_older_than(30) as webhook_events_archived,
    archive_activity_logs_older_than(90) as activity_logs_archived;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION run_archival_job() IS 'Master archival function that runs all archival operations. Returns counts of archived records for each table.';

-- Function 8: Purge archived records older than retention period
CREATE OR REPLACE FUNCTION purge_archived_records()
RETURNS TABLE(
  users_purged INT,
  projects_purged INT,
  blueprints_purged INT,
  team_members_purged INT,
  webhook_events_purged INT,
  activity_logs_purged INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (DELETE FROM users_archived WHERE archived_at < NOW() - INTERVAL '7 years' RETURNING id)::INT as users_purged,
    (DELETE FROM projects_archived WHERE archived_at < NOW() - INTERVAL '5 years' RETURNING id)::INT as projects_purged,
    (DELETE FROM blueprints_archived WHERE archived_at < NOW() - INTERVAL '5 years' RETURNING id)::INT as blueprints_purged,
    (DELETE FROM team_members_archived WHERE archived_at < NOW() - INTERVAL '5 years' RETURNING id)::INT as team_members_purged,
    (DELETE FROM webhook_events_archived WHERE archived_at < NOW() - INTERVAL '1 year' RETURNING id)::INT as webhook_events_purged,
    (DELETE FROM activity_logs_archived WHERE archived_at < NOW() - INTERVAL '2 years' RETURNING id)::INT as activity_logs_purged;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION purge_archived_records() IS 'Purges archived records older than their retention periods. Returns counts of purged records for each table.';

-- =============================================================================
-- Migration Summary
-- =============================================================================
-- Archive Tables Created: 6 total
-- Archival Functions Created: 8 total
--
-- Archive Tables:
--   1. users_archived (90 days to archive, 7 years retention)
--   2. projects_archived (90 days to archive, 5 years retention)
--   3. blueprints_archived (90 days to archive, 5 years retention)
--   4. team_members_archived (90 days to archive, 5 years retention)
--   5. webhook_events_archived (30 days to archive, 1 year retention)
--   6. activity_logs_archived (90 days to archive, 2 years retention)
--
-- Functions:
--   - archive_users_older_than(days)
--   - archive_projects_older_than(days)
--   - archive_blueprints_older_than(days)
--   - archive_team_members_older_than(days)
--   - archive_webhook_events_older_than(days)
--   - archive_activity_logs_older_than(days)
--   - run_archival_job() - Master function to run all archival
--   - purge_archived_records() - Purge records past retention
--
-- Business Impact:
--   - Maintains query performance at scale by keeping active tables small
--   - Reduces storage costs by moving old data to minimal-index archive tables
--   - Improves database backup performance (smaller active tables)
--   - Preserves audit trail and compliance requirements
--   - Enables automated archival via scheduled jobs
--
-- Performance Impact:
--   - Active tables remain small and fast (query performance maintained)
--   - Archive tables have minimal indexes (reduced storage overhead)
--   - Archival operations are batched and non-blocking
--   - Scheduled jobs run during low-traffic periods
--
-- Implementation Notes:
--   - Archival job should be scheduled to run daily (cron job or pg_cron extension)
--   - Purge job should be scheduled to run monthly (after backups verified)
--   - Monitor archival job execution and record counts in application logs
--   - Consider implementing archive table partitioning for very large datasets
--
-- Usage Example:
--   -- Run archival job
--   SELECT * FROM run_archival_job();
--
--   -- Run purge job
--   SELECT * FROM purge_archived_records();
--
-- Reversibility:
--   - All archive tables can be dropped: DROP TABLE IF EXISTS <table_name>;
--   - All functions can be dropped: DROP FUNCTION IF EXISTS <function_name>;
--   - No data loss (archived data preserved in tables until purged)
--   - Safe to rollback by simply not running archival job
-- =============================================================================
