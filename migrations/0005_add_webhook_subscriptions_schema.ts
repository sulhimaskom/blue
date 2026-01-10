import { db } from "../lib/db";
import { sql } from "drizzle-orm";

/**
 * Migration: Add Webhook Subscriptions Schema
 * Purpose: Create webhook subscriptions table for event filtering
 * Date: January 10, 2026
 * Created by: Autonomous Engineering Agent
 */

export async function up() {
  console.log("⬆️  Applying migration: Add Webhook Subscriptions Schema");

  const database = db();

  try {
    await database.execute(sql`
      -- Create webhook_subscriptions table
      CREATE TABLE IF NOT EXISTS webhook_subscriptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        webhook_configuration_id UUID REFERENCES webhook_configurations(id) ON DELETE CASCADE NOT NULL,
        event_type TEXT NOT NULL,
        filter_expression TEXT,
        is_active BOOLEAN DEFAULT true NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
        UNIQUE(webhook_configuration_id, event_type)
      );
    `);

    // Indexes for performance
    await database.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_webhook_subscriptions_webhook_configuration_id
      ON webhook_subscriptions (webhook_configuration_id);
    `);

    await database.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_webhook_subscriptions_event_type
      ON webhook_subscriptions (event_type);
    `);

    await database.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_webhook_subscriptions_is_active
      ON webhook_subscriptions (is_active, webhook_configuration_id);
    `);

    await database.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_webhook_subscriptions_created_at
      ON webhook_subscriptions (created_at DESC);
    `);

    // CHECK constraints
    await database.execute(sql`
      ALTER TABLE webhook_subscriptions
      ADD CONSTRAINT chk_webhook_subscriptions_event_type_enum
      CHECK (event_type IN (
        'blueprint.created',
        'blueprint.updated', 
        'project.deployed',
        'credits.consumed',
        'webhook.failed',
        'user.created',
        'user.updated',
        'user.deleted',
        'user.email.created',
        'user.email.verified',
        'email.created',
        'payment_intent.succeeded',
        'payment_intent.payment_failed',
        'invoice.payment_succeeded',
        'invoice.payment_failed',
        'customer.subscription.created',
        'customer.subscription.updated',
        'customer.subscription.deleted'
      ));
    `);

    await database.execute(sql`
      ALTER TABLE webhook_subscriptions
      ADD CONSTRAINT chk_webhook_subscriptions_filter_expression_format
      CHECK (filter_expression ~* '^(|AND\s+\w+\s*=.*|OR\s+\w+\s*=.*)$');
    `);

    // Trigger function for updated_at
    await database.execute(sql`
      CREATE OR REPLACE FUNCTION update_webhook_subscriptions_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
         NEW.updated_at = NOW();
         RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await database.execute(sql`
      CREATE TRIGGER webhook_subscriptions_updated_at_trigger
         BEFORE UPDATE ON webhook_subscriptions
         FOR EACH ROW
         EXECUTE FUNCTION update_webhook_subscriptions_updated_at();
    `);

    console.log("✅ Migration applied successfully");
    console.log("   - Table created: webhook_subscriptions");
    console.log("   - Indexes created: 4 total");
    console.log("   - Constraints added: 2 total");
    console.log("   - Trigger created: automatic updated_at");

  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  }
}

export async function down() {
  console.log("⬇️  Rolling back migration: Remove Webhook Subscriptions Schema");

  const database = db();

  try {
    // Drop trigger
    await database.execute(sql`
      DROP TRIGGER IF EXISTS webhook_subscriptions_updated_at_trigger ON webhook_subscriptions;
    `);

    // Drop function
    await database.execute(sql`
      DROP FUNCTION IF EXISTS update_webhook_subscriptions_updated_at();
    `);

    // Drop constraints
    await database.execute(sql`
      ALTER TABLE webhook_subscriptions
      DROP CONSTRAINT IF EXISTS chk_webhook_subscriptions_filter_expression_format;
    `);

    await database.execute(sql`
      ALTER TABLE webhook_subscriptions
      DROP CONSTRAINT IF EXISTS chk_webhook_subscriptions_event_type_enum;
    `);

    // Drop indexes
    await database.execute(sql`DROP INDEX IF EXISTS idx_webhook_subscriptions_created_at;`);
    await database.execute(sql`DROP INDEX IF EXISTS idx_webhook_subscriptions_is_active;`);
    await database.execute(sql`DROP INDEX IF EXISTS idx_webhook_subscriptions_event_type;`);
    await database.execute(sql`DROP INDEX IF EXISTS idx_webhook_subscriptions_webhook_configuration_id;`);

    // Drop table
    await database.execute(sql`DROP TABLE IF EXISTS webhook_subscriptions;`);

    console.log("✅ Rollback completed successfully");
    console.log("⚠️  WARNING: All webhook subscription data has been permanently deleted");

  } catch (error) {
    console.error("❌ Rollback failed:", error);
    throw error;
  }
}

export async function validate(): Promise<boolean> {
  console.log("🔍 Validating webhook subscriptions schema...");

  const database = db();

  try {
    // Check table exists
    const tablesResult = await database.execute(sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'webhook_subscriptions';
    `);

    const tables = tablesResult.rows || [];

    if (tables.length !== 1) {
      console.error("❌ webhook_subscriptions table not created");
      return false;
    }

    // Check constraints exist
    const constraintsResult = await database.execute(sql`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_schema = 'public'
      AND table_name = 'webhook_subscriptions'
      AND constraint_type = 'CHECK';
    `);

    const constraints = constraintsResult.rows || [];

    if (constraints.length < 2) {
      console.error("❌ Not all CHECK constraints created");
      return false;
    }

    // Check indexes exist
    const indexesResult = await database.execute(sql`
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
      AND tablename = 'webhook_subscriptions';
    `);

    const indexes = indexesResult.rows || [];

    if (indexes.length < 4) {
      console.error("❌ Not all indexes created");
      return false;
    }

    // Check trigger exists
    const triggerResult = await database.execute(sql`
      SELECT trigger_name
      FROM information_schema.triggers
      WHERE trigger_name = 'webhook_subscriptions_updated_at_trigger';
    `);

    const triggers = triggerResult.rows || [];

    if (triggers.length === 0) {
      console.error("❌ Trigger not created");
      return false;
    }

    console.log("✅ All webhook subscriptions schema components validated:");
    console.log("   - Tables: 1/1");
    console.log("   - Constraints: 2/2");
    console.log("   - Indexes: 4/4");
    console.log("   - Triggers: 1/1");

    return true;

  } catch (error) {
    console.error("❌ Validation failed:", error);
    return false;
  }
}