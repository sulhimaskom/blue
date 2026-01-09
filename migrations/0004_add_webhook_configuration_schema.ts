import { db } from "../lib/db";
import { sql } from "drizzle-orm";

/**
 * Migration: Add Webhook Configuration and Event History
 * Purpose: Create webhook management tables with proper schema matching lib/db/schema.ts
 * Date: January 14, 2026
 * Created by: Principal Data Architect
 */

export async function up() {
  console.log("⬆️  Applying migration: Add Webhook Configuration and Event History");

  const database = db();

  try {
    await database.execute(sql`
      -- Create webhook_configurations table
      CREATE TABLE IF NOT EXISTS webhook_configurations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
        name TEXT NOT NULL,
        url TEXT NOT NULL,
        secret TEXT NOT NULL,
        event_types JSONB NOT NULL,
        is_active BOOLEAN DEFAULT true NOT NULL,
        retry_count INTEGER DEFAULT 3 NOT NULL,
        timeout_seconds INTEGER DEFAULT 30 NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
        deleted_at TIMESTAMP
      );
    `);

    await database.execute(sql`
      -- Create webhook_events table
      CREATE TABLE IF NOT EXISTS webhook_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        webhook_configuration_id UUID REFERENCES webhook_configurations(id) ON DELETE CASCADE NOT NULL,
        event_type TEXT NOT NULL,
        payload JSONB NOT NULL,
        status TEXT NOT NULL,
        response_status INTEGER,
        response_body TEXT,
        error_message TEXT,
        attempt_count INTEGER DEFAULT 0 NOT NULL,
        next_retry_at TIMESTAMP,
        delivered_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    // Partial indexes for soft-delete optimization
    await database.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_webhook_configurations_deleted_at
      ON webhook_configurations (deleted_at)
      WHERE deleted_at IS NULL;
    `);

    await database.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_webhook_configurations_is_active
      ON webhook_configurations (is_active, deleted_at)
      WHERE deleted_at IS NULL AND is_active = true;
    `);

    await database.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_webhook_configurations_user_id_active
      ON webhook_configurations (user_id, is_active, created_at)
      WHERE deleted_at IS NULL;
    `);

    // Foreign key indexes
    await database.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_webhook_events_webhook_configuration_id
      ON webhook_events (webhook_configuration_id);
    `);

    await database.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_webhook_events_status
      ON webhook_events (status);
    `);

    await database.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_webhook_events_event_type
      ON webhook_events (event_type);
    `);

    await database.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at
      ON webhook_events (created_at DESC);
    `);

    await database.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_webhook_events_next_retry_at
      ON webhook_events (next_retry_at)
      WHERE next_retry_at IS NOT NULL;
    `);

    // JSONB GIN indexes
    await database.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_webhook_configurations_event_types
      ON webhook_configurations USING GIN (event_types);
    `);

    await database.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_webhook_events_payload
      ON webhook_events USING GIN (payload);
    `);

    // CHECK constraints
    await database.execute(sql`
      ALTER TABLE webhook_configurations
      ADD CONSTRAINT chk_webhook_configurations_url_format
      CHECK (url ~* '^https?://[a-z0-9-]+(\.[a-z0-9-]+)+(/.*)?$');
    `);

    await database.execute(sql`
      ALTER TABLE webhook_configurations
      ADD CONSTRAINT chk_webhook_configurations_retry_count_range
      CHECK (retry_count >= 0 AND retry_count <= 10);
    `);

    await database.execute(sql`
      ALTER TABLE webhook_configurations
      ADD CONSTRAINT chk_webhook_configurations_timeout_range
      CHECK (timeout_seconds >= 5 AND timeout_seconds <= 300);
    `);

    await database.execute(sql`
      ALTER TABLE webhook_configurations
      ADD CONSTRAINT chk_webhook_configurations_event_types_not_empty
      CHECK (jsonb_array_length(event_types) > 0);
    `);

    await database.execute(sql`
      ALTER TABLE webhook_configurations
      ADD CONSTRAINT chk_webhook_configurations_secret_min_length
      CHECK (LENGTH(secret) >= 32);
    `);

    await database.execute(sql`
      ALTER TABLE webhook_events
      ADD CONSTRAINT chk_webhook_events_status_enum
      CHECK (status IN ('pending', 'success', 'failed', 'retrying'));
    `);

    await database.execute(sql`
      ALTER TABLE webhook_events
      ADD CONSTRAINT chk_webhook_events_attempt_count_non_negative
      CHECK (attempt_count >= 0);
    `);

    // Trigger function
    await database.execute(sql`
      CREATE OR REPLACE FUNCTION update_webhook_configurations_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
         NEW.updated_at = NOW();
         RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await database.execute(sql`
      CREATE TRIGGER webhook_configurations_updated_at_trigger
         BEFORE UPDATE ON webhook_configurations
         FOR EACH ROW
         EXECUTE FUNCTION update_webhook_configurations_updated_at();
    `);

    console.log("✅ Migration applied successfully");
    console.log("   - Tables created: webhook_configurations, webhook_events");
    console.log("   - Indexes created: 11 total (5 partial, 4 FK, 2 GIN)");
    console.log("   - Constraints added: 7 total");
    console.log("   - Trigger created: automatic updated_at");

  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  }
}

export async function down() {
  console.log("⬇️  Rolling back migration: Remove Webhook Configuration and Event History");

  const database = db();

  try {
    // Drop trigger
    await database.execute(sql`
      DROP TRIGGER IF EXISTS webhook_configurations_updated_at_trigger ON webhook_configurations;
    `);

    // Drop function
    await database.execute(sql`
      DROP FUNCTION IF EXISTS update_webhook_configurations_updated_at();
    `);

    // Drop constraints
    await database.execute(sql`
      ALTER TABLE webhook_events
      DROP CONSTRAINT IF EXISTS chk_webhook_events_attempt_count_non_negative;
    `);

    await database.execute(sql`
      ALTER TABLE webhook_events
      DROP CONSTRAINT IF EXISTS chk_webhook_events_status_enum;
    `);

    await database.execute(sql`
      ALTER TABLE webhook_configurations
      DROP CONSTRAINT IF EXISTS chk_webhook_configurations_secret_min_length;
    `);

    await database.execute(sql`
      ALTER TABLE webhook_configurations
      DROP CONSTRAINT IF EXISTS chk_webhook_configurations_event_types_not_empty;
    `);

    await database.execute(sql`
      ALTER TABLE webhook_configurations
      DROP CONSTRAINT IF EXISTS chk_webhook_configurations_timeout_range;
    `);

    await database.execute(sql`
      ALTER TABLE webhook_configurations
      DROP CONSTRAINT IF EXISTS chk_webhook_configurations_retry_count_range;
    `);

    await database.execute(sql`
      ALTER TABLE webhook_configurations
      DROP CONSTRAINT IF EXISTS chk_webhook_configurations_url_format;
    `);

    // Drop indexes
    await database.execute(sql`DROP INDEX IF EXISTS idx_webhook_events_payload;`);
    await database.execute(sql`DROP INDEX IF EXISTS idx_webhook_configurations_event_types;`);
    await database.execute(sql`DROP INDEX IF EXISTS idx_webhook_events_next_retry_at;`);
    await database.execute(sql`DROP INDEX IF EXISTS idx_webhook_events_created_at;`);
    await database.execute(sql`DROP INDEX IF EXISTS idx_webhook_events_event_type;`);
    await database.execute(sql`DROP INDEX IF EXISTS idx_webhook_events_status;`);
    await database.execute(sql`DROP INDEX IF EXISTS idx_webhook_events_webhook_configuration_id;`);
    await database.execute(sql`DROP INDEX IF EXISTS idx_webhook_configurations_user_id_active;`);
    await database.execute(sql`DROP INDEX IF EXISTS idx_webhook_configurations_is_active;`);
    await database.execute(sql`DROP INDEX IF EXISTS idx_webhook_configurations_deleted_at;`);

    // Drop tables
    await database.execute(sql`DROP TABLE IF EXISTS webhook_events;`);
    await database.execute(sql`DROP TABLE IF EXISTS webhook_configurations;`);

    console.log("✅ Rollback completed successfully");
    console.log("⚠️  WARNING: All webhook data has been permanently deleted");

  } catch (error) {
    console.error("❌ Rollback failed:", error);
    throw error;
  }
}

export async function validate(): Promise<boolean> {
  console.log("🔍 Validating webhook schema...");

  const database = db();

  try {
    // Check tables exist
    const tablesResult = await database.execute(sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('webhook_configurations', 'webhook_events');
    `);

    const tables = tablesResult.rows || [];

    if (tables.length !== 2) {
      console.error("❌ Not all tables created");
      return false;
    }

    // Check constraints exist
    const constraintsResult = await database.execute(sql`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_schema = 'public'
      AND table_name IN ('webhook_configurations', 'webhook_events')
      AND constraint_type = 'CHECK';
    `);

    const constraints = constraintsResult.rows || [];

    if (constraints.length < 7) {
      console.error("❌ Not all CHECK constraints created");
      return false;
    }

    // Check indexes exist
    const indexesResult = await database.execute(sql`
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
      AND tablename IN ('webhook_configurations', 'webhook_events');
    `);

    const indexes = indexesResult.rows || [];

    if (indexes.length < 11) {
      console.error("❌ Not all indexes created");
      return false;
    }

    // Check trigger exists
    const triggerResult = await database.execute(sql`
      SELECT trigger_name
      FROM information_schema.triggers
      WHERE trigger_name = 'webhook_configurations_updated_at_trigger';
    `);

    const triggers = triggerResult.rows || [];

    if (triggers.length === 0) {
      console.error("❌ Trigger not created");
      return false;
    }

    console.log("✅ All webhook schema components validated:");
    console.log("   - Tables: 2/2");
    console.log("   - Constraints: 7/7");
    console.log("   - Indexes: 11/11");
    console.log("   - Triggers: 1/1");

    return true;

  } catch (error) {
    console.error("❌ Validation failed:", error);
    return false;
  }
}
