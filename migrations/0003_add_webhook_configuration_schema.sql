-- Webhook configuration schema migration
-- Creates tables for webhook management and event history
-- Date: 2026-01-11
-- Created by: Senior DevOps & Backend Engineer

-- Webhook configurations table
CREATE TABLE IF NOT EXISTS "webhook_configurations" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" INTEGER REFERENCES "users"("id") ON DELETE CASCADE NOT NULL,
  "name" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "secret" TEXT NOT NULL,
  "events" TEXT[] NOT NULL,
  "active" BOOLEAN DEFAULT true NOT NULL,
  "description" TEXT,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "deleted_at" TIMESTAMP
);

-- Webhook event history table
CREATE TABLE IF NOT EXISTS "webhook_events" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "config_id" UUID REFERENCES "webhook_configurations"("id") ON DELETE CASCADE NOT NULL,
  "event_type" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "response_status" INTEGER,
  "response_body" TEXT,
  "attempt_count" INTEGER DEFAULT 1 NOT NULL,
  "status" TEXT NOT NULL,
  "delivered_at" TIMESTAMP,
  "failed_at" TIMESTAMP,
  "last_retry_at" TIMESTAMP,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS "idx_webhook_configurations_user_id" ON "webhook_configurations"("user_id");
CREATE INDEX IF NOT EXISTS "idx_webhook_configurations_active" ON "webhook_configurations"("active") WHERE "deleted_at" IS NULL;
CREATE INDEX IF NOT EXISTS "idx_webhook_events_config_id" ON "webhook_events"("config_id");
CREATE INDEX IF NOT EXISTS "idx_webhook_events_status" ON "webhook_events"("status");
CREATE INDEX IF NOT EXISTS "idx_webhook_events_created_at" ON "webhook_events"("created_at");

-- Update updated_at trigger for webhook_configurations
CREATE OR REPLACE FUNCTION update_webhook_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER webhook_configurations_updated_at
   BEFORE UPDATE ON "webhook_configurations"
   FOR EACH ROW
   EXECUTE FUNCTION update_webhook_config_updated_at();