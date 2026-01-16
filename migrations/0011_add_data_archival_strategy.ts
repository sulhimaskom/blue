import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

/**
 * Migration 0011: Implement Data Archival Strategy for Soft-Deleted Records
 *
 * Purpose: Create archival tables and automated archival strategy for soft-deleted records
 * Business Impact: Maintains query performance at scale, reduces storage costs, improves database backup performance
 *
 * Archive Strategy:
 * - Records soft-deleted > 90 days are archived to *_archived tables
 * - Webhook events archived > 30 days (higher volume)
 * - Archive tables have minimal indexes (id, lookup columns only)
 * - Active queries remain fast with smaller working set
 * - Archived data retained for compliance: users (7y), projects/blueprints/team (5y), webhooks (1y), logs (2y)
 *
 * Created: January 16, 2026
 * Created by: Principal Data Architect
 */

export async function up(): Promise<void> {
  const database = db();
  const migrationSQL = `
-- =============================================================================
-- Phase 1: Create Archive Tables
-- =============================================================================

-- Archive Table 1: Users Archive (90 days to archive, 7 years retention)
CREATE TABLE IF NOT EXISTS users_archived (
  id SERIAL PRIMARY KEY,
  clerk_id TEXT NOT NULL,
  email TEXT NOT NULL,
  credits INT NOT NULL,
  subscription_tier TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  deleted_at TIMESTAMP NOT NULL,
  archived_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_archived_deleted_at
ON users_archived (deleted_at DESC);

CREATE INDEX IF NOT EXISTS idx_users_archived_clerk_id
ON users_archived (clerk_id);

-- Archive Table 2: Projects Archive (90 days to archive, 5 years retention)
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

CREATE INDEX IF NOT EXISTS idx_projects_archived_deleted_at
ON projects_archived (deleted_at DESC);

CREATE INDEX IF NOT EXISTS idx_projects_archived_owner_id
ON projects_archived (owner_id);

-- Archive Table 3: Blueprints Archive (90 days to archive, 5 years retention)
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

CREATE INDEX IF NOT EXISTS idx_blueprints_archived_deleted_at
ON blueprints_archived (deleted_at DESC);

CREATE INDEX IF NOT EXISTS idx_blueprints_archived_project_id
ON blueprints_archived (project_id);

-- Archive Table 4: Team Members Archive (90 days to archive, 5 years retention)
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

CREATE INDEX IF NOT EXISTS idx_team_members_archived_deleted_at
ON team_members_archived (deleted_at DESC);

CREATE INDEX IF NOT EXISTS idx_team_members_archived_team_id
ON team_members_archived (team_id);

CREATE INDEX IF NOT EXISTS idx_team_members_archived_user_id
ON team_members_archived (user_id);

-- Archive Table 5: Webhook Events Archive (30 days to archive, 1 year retention)
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

CREATE INDEX IF NOT EXISTS idx_webhook_events_archived_created_at
ON webhook_events_archived (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_webhook_events_archived_webhook_configuration_id
ON webhook_events_archived (webhook_configuration_id);

CREATE INDEX IF NOT EXISTS idx_webhook_events_archived_status
ON webhook_events_archived (status);

-- Archive Table 6: Activity Logs Archive (90 days to archive, 2 years retention)
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

CREATE INDEX IF NOT EXISTS idx_activity_logs_archived_timestamp
ON activity_logs_archived (timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_activity_logs_archived_user_id
ON activity_logs_archived (user_id);

CREATE INDEX IF NOT EXISTS idx_activity_logs_archived_clerk_id
ON activity_logs_archived (clerk_id);

-- =============================================================================
-- Phase 2: Create Database Functions for Archival
-- =============================================================================

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
  `;

  await database.execute(sql.raw(migrationSQL));
}

/**
 * Rollback Migration 0011: Remove Data Archival Strategy
 *
 * Warning: Archival data in *_archived tables will be lost
 * Recommend exporting archived data before rollback
 */
export async function down(): Promise<void> {
  const database = db();
  const rollbackSQL = `
-- Drop master functions first
DROP FUNCTION IF EXISTS run_archival_job() CASCADE;
DROP FUNCTION IF EXISTS purge_archived_records() CASCADE;

-- Drop individual archival functions
DROP FUNCTION IF EXISTS archive_users_older_than(days INT) CASCADE;
DROP FUNCTION IF EXISTS archive_projects_older_than(days INT) CASCADE;
DROP FUNCTION IF EXISTS archive_blueprints_older_than(days INT) CASCADE;
DROP FUNCTION IF EXISTS archive_team_members_older_than(days INT) CASCADE;
DROP FUNCTION IF EXISTS archive_webhook_events_older_than(days INT) CASCADE;
DROP FUNCTION IF EXISTS archive_activity_logs_older_than(days INT) CASCADE;

-- Drop indexes
DROP INDEX IF EXISTS idx_users_archived_deleted_at;
DROP INDEX IF EXISTS idx_users_archived_clerk_id;
DROP INDEX IF EXISTS idx_projects_archived_deleted_at;
DROP INDEX IF EXISTS idx_projects_archived_owner_id;
DROP INDEX IF EXISTS idx_blueprints_archived_deleted_at;
DROP INDEX IF EXISTS idx_blueprints_archived_project_id;
DROP INDEX IF EXISTS idx_team_members_archived_deleted_at;
DROP INDEX IF EXISTS idx_team_members_archived_team_id;
DROP INDEX IF EXISTS idx_team_members_archived_user_id;
DROP INDEX IF EXISTS idx_webhook_events_archived_created_at;
DROP INDEX IF EXISTS idx_webhook_events_archived_webhook_configuration_id;
DROP INDEX IF EXISTS idx_webhook_events_archived_status;
DROP INDEX IF EXISTS idx_activity_logs_archived_timestamp;
DROP INDEX IF EXISTS idx_activity_logs_archived_user_id;
DROP INDEX IF EXISTS idx_activity_logs_archived_clerk_id;

-- Drop archive tables
DROP TABLE IF EXISTS activity_logs_archived CASCADE;
DROP TABLE IF EXISTS webhook_events_archived CASCADE;
DROP TABLE IF EXISTS team_members_archived CASCADE;
DROP TABLE IF EXISTS blueprints_archived CASCADE;
DROP TABLE IF EXISTS projects_archived CASCADE;
DROP TABLE IF EXISTS users_archived CASCADE;
  `;

  await database.execute(sql.raw(rollbackSQL));
}
