-- Rollback migration for webhook configuration schema
-- Drops webhook configuration and event history tables
-- Date: 2026-01-11

-- Drop indexes
DROP INDEX IF EXISTS "idx_webhook_events_created_at";
DROP INDEX IF EXISTS "idx_webhook_events_status";
DROP INDEX IF EXISTS "idx_webhook_events_config_id";
DROP INDEX IF EXISTS "idx_webhook_configurations_active";
DROP INDEX IF EXISTS "idx_webhook_configurations_user_id";

-- Drop trigger
DROP TRIGGER IF EXISTS webhook_configurations_updated_at ON "webhook_configurations";

-- Drop function
DROP FUNCTION IF EXISTS update_webhook_config_updated_at();

-- Drop tables
DROP TABLE IF EXISTS "webhook_events";
DROP TABLE IF EXISTS "webhook_configurations";