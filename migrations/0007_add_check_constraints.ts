/**
 * Migration 0007: Add CHECK Constraints for Data Validation
 *
 * Purpose: Add database-level validation constraints to ensure data integrity
 *
 * CHECK Constraints Created:
 * - Users: credits >= 0 (non-negative balance)
 * - Projects: status enum, repo_url format
 * - Deployments: environment/status enums, positive version, expiry validation
 * - Blueprints: positive version
 * - Transactions: positive amount, non-negative credits
 * - Webhook Configurations: retry/timeout ranges, URL format, secret length
 * - Teams: subscription tier enum
 * - Team Members: role enum
 *
 * Business Impact:
 * - Prevents invalid data insertion at database level
 * - Reduces application-level validation burden
 * - Enhances data integrity and consistency
 * - Supports compliance requirements (GDPR, financial regulations)
 * - Improves developer experience with automatic validation feedback
 */

import { db } from "../lib/db";
import { sql } from "drizzle-orm";
import { logger } from "../lib/logger";

/**
 * Execute migration 0007: Add CHECK constraints for data validation
 */
async function migrateUp() {
  const startTime = Date.now();
  logger.info("Starting Migration 0007: Add CHECK Constraints", {
    migration: "0007",
    timestamp: new Date().toISOString(),
  });

  try {
    const database = db();

    // Phase 1: Users Table CHECK Constraints
    await database.execute(sql`
      ALTER TABLE users
      ADD CONSTRAINT chk_users_credits_non_negative
      CHECK (credits >= 0);
    `);
    logger.info("Added chk_users_credits_non_negative constraint");

    // Phase 2: Projects Table CHECK Constraints
    await database.execute(sql`
      ALTER TABLE projects
      ADD CONSTRAINT chk_projects_status_valid
      CHECK (status IN ('draft', 'generating', 'completed', 'deployed'));
    `);
    logger.info("Added chk_projects_status_valid constraint");

    await database.execute(sql`
      ALTER TABLE projects
      ADD CONSTRAINT chk_projects_repo_url_format
      CHECK (
        repo_url IS NULL OR
        repo_url ~* '^https://github\.com/[a-zA-Z0-9_.-]+/[a-zA-Z0-9_.-]+/?$'
      );
    `);
    logger.info("Added chk_projects_repo_url_format constraint");

    // Phase 3: Deployments Table CHECK Constraints
    await database.execute(sql`
      ALTER TABLE deployments
      ADD CONSTRAINT chk_deployments_environment_valid
      CHECK (environment IN ('production', 'staging', 'preview'));
    `);
    logger.info("Added chk_deployments_environment_valid constraint");

    await database.execute(sql`
      ALTER TABLE deployments
      ADD CONSTRAINT chk_deployments_status_valid
      CHECK (status IN ('pending', 'deploying', 'deployed', 'failed', 'deleted'));
    `);
    logger.info("Added chk_deployments_status_valid constraint");

    await database.execute(sql`
      ALTER TABLE deployments
      ADD CONSTRAINT chk_deployments_blueprint_version_positive
      CHECK (blueprint_version > 0);
    `);
    logger.info("Added chk_deployments_blueprint_version_positive constraint");

    await database.execute(sql`
      ALTER TABLE deployments
      ADD CONSTRAINT chk_deployments_expires_after_created
      CHECK (
        expires_at IS NULL OR
        expires_at > created_at
      );
    `);
    logger.info("Added chk_deployments_expires_after_created constraint");

    // Phase 4: Blueprints Table CHECK Constraints
    await database.execute(sql`
      ALTER TABLE blueprints
      ADD CONSTRAINT chk_blueprints_version_positive
      CHECK (version > 0);
    `);
    logger.info("Added chk_blueprints_version_positive constraint");

    // Phase 5: Transactions Table CHECK Constraints
    await database.execute(sql`
      ALTER TABLE transactions
      ADD CONSTRAINT chk_transactions_amount_positive
      CHECK (amount > 0);
    `);
    logger.info("Added chk_transactions_amount_positive constraint");

    await database.execute(sql`
      ALTER TABLE transactions
      ADD CONSTRAINT chk_transactions_credits_added_non_negative
      CHECK (credits_added IS NULL OR credits_added >= 0);
    `);
    logger.info("Added chk_transactions_credits_added_non_negative constraint");

    // Phase 6: Webhook Configurations Table CHECK Constraints
    await database.execute(sql`
      ALTER TABLE webhook_configurations
      ADD CONSTRAINT chk_webhook_configurations_retry_range
      CHECK (retry_count >= 1 AND retry_count <= 10);
    `);
    logger.info("Added chk_webhook_configurations_retry_range constraint");

    await database.execute(sql`
      ALTER TABLE webhook_configurations
      ADD CONSTRAINT chk_webhook_configurations_timeout_range
      CHECK (timeout_seconds >= 5 AND timeout_seconds <= 300);
    `);
    logger.info("Added chk_webhook_configurations_timeout_range constraint");

    await database.execute(sql`
      ALTER TABLE webhook_configurations
      ADD CONSTRAINT chk_webhook_configurations_url_format
      CHECK (url ~* '^https?://[a-zA-Z0-9.-]+(:[0-9]+)?(/.*)?$');
    `);
    logger.info("Added chk_webhook_configurations_url_format constraint");

    await database.execute(sql`
      ALTER TABLE webhook_configurations
      ADD CONSTRAINT chk_webhook_configurations_secret_min_length
      CHECK (length(secret) >= 16);
    `);
    logger.info("Added chk_webhook_configurations_secret_min_length constraint");

    // Phase 7: Teams Table CHECK Constraints
    await database.execute(sql`
      ALTER TABLE teams
      ADD CONSTRAINT chk_teams_subscription_tier_valid
      CHECK (subscription_tier IN ('free', 'pro', 'enterprise'));
    `);
    logger.info("Added chk_teams_subscription_tier_valid constraint");

    // Phase 8: Team Members Table CHECK Constraints
    await database.execute(sql`
      ALTER TABLE team_members
      ADD CONSTRAINT chk_team_members_role_valid
      CHECK (role IN ('admin', 'member', 'viewer'));
    `);
    logger.info("Added chk_team_members_role_valid constraint");

    const duration = Date.now() - startTime;
    logger.info("Migration 0007 completed successfully", {
      migration: "0007",
      constraintsAdded: 16,
      tablesModified: 7,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    });

    console.log("✅ Migration 0007: CHECK constraints added successfully");
    console.log(`   - Constraints added: 16`);
    console.log(`   - Tables modified: 7`);
    console.log(`   - Duration: ${duration}ms`);

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error("Migration 0007 failed", {
      migration: "0007",
      duration: `${duration}ms`,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    console.error("❌ Migration 0007 failed:", error);
    throw error;
  }
}

/**
 * Rollback migration 0007: Drop CHECK constraints
 */
async function migrateDown() {
  const startTime = Date.now();
  logger.info("Rolling back Migration 0007: Drop CHECK Constraints", {
    migration: "0007",
    timestamp: new Date().toISOString(),
  });

  try {
    const database = db();

    // Phase 1: Users Table Constraints (Rollback)
    await database.execute(sql`
      ALTER TABLE users
      DROP CONSTRAINT IF EXISTS chk_users_credits_non_negative;
    `);
    logger.info("Dropped chk_users_credits_non_negative constraint");

    // Phase 2: Projects Table Constraints (Rollback)
    await database.execute(sql`
      ALTER TABLE projects
      DROP CONSTRAINT IF EXISTS chk_projects_status_valid;
    `);
    logger.info("Dropped chk_projects_status_valid constraint");

    await database.execute(sql`
      ALTER TABLE projects
      DROP CONSTRAINT IF EXISTS chk_projects_repo_url_format;
    `);
    logger.info("Dropped chk_projects_repo_url_format constraint");

    // Phase 3: Deployments Table Constraints (Rollback)
    await database.execute(sql`
      ALTER TABLE deployments
      DROP CONSTRAINT IF EXISTS chk_deployments_environment_valid;
    `);
    logger.info("Dropped chk_deployments_environment_valid constraint");

    await database.execute(sql`
      ALTER TABLE deployments
      DROP CONSTRAINT IF EXISTS chk_deployments_status_valid;
    `);
    logger.info("Dropped chk_deployments_status_valid constraint");

    await database.execute(sql`
      ALTER TABLE deployments
      DROP CONSTRAINT IF EXISTS chk_deployments_blueprint_version_positive;
    `);
    logger.info("Dropped chk_deployments_blueprint_version_positive constraint");

    await database.execute(sql`
      ALTER TABLE deployments
      DROP CONSTRAINT IF EXISTS chk_deployments_expires_after_created;
    `);
    logger.info("Dropped chk_deployments_expires_after_created constraint");

    // Phase 4: Blueprints Table Constraints (Rollback)
    await database.execute(sql`
      ALTER TABLE blueprints
      DROP CONSTRAINT IF EXISTS chk_blueprints_version_positive;
    `);
    logger.info("Dropped chk_blueprints_version_positive constraint");

    // Phase 5: Transactions Table Constraints (Rollback)
    await database.execute(sql`
      ALTER TABLE transactions
      DROP CONSTRAINT IF EXISTS chk_transactions_amount_positive;
    `);
    logger.info("Dropped chk_transactions_amount_positive constraint");

    await database.execute(sql`
      ALTER TABLE transactions
      DROP CONSTRAINT IF EXISTS chk_transactions_credits_added_non_negative;
    `);
    logger.info("Dropped chk_transactions_credits_added_non_negative constraint");

    // Phase 6: Webhook Configurations Table Constraints (Rollback)
    await database.execute(sql`
      ALTER TABLE webhook_configurations
      DROP CONSTRAINT IF EXISTS chk_webhook_configurations_retry_range;
    `);
    logger.info("Dropped chk_webhook_configurations_retry_range constraint");

    await database.execute(sql`
      ALTER TABLE webhook_configurations
      DROP CONSTRAINT IF EXISTS chk_webhook_configurations_timeout_range;
    `);
    logger.info("Dropped chk_webhook_configurations_timeout_range constraint");

    await database.execute(sql`
      ALTER TABLE webhook_configurations
      DROP CONSTRAINT IF EXISTS chk_webhook_configurations_url_format;
    `);
    logger.info("Dropped chk_webhook_configurations_url_format constraint");

    await database.execute(sql`
      ALTER TABLE webhook_configurations
      DROP CONSTRAINT IF EXISTS chk_webhook_configurations_secret_min_length;
    `);
    logger.info("Dropped chk_webhook_configurations_secret_min_length constraint");

    // Phase 7: Teams Table Constraints (Rollback)
    await database.execute(sql`
      ALTER TABLE teams
      DROP CONSTRAINT IF EXISTS chk_teams_subscription_tier_valid;
    `);
    logger.info("Dropped chk_teams_subscription_tier_valid constraint");

    // Phase 8: Team Members Table Constraints (Rollback)
    await database.execute(sql`
      ALTER TABLE team_members
      DROP CONSTRAINT IF EXISTS chk_team_members_role_valid;
    `);
    logger.info("Dropped chk_team_members_role_valid constraint");

    const duration = Date.now() - startTime;
    logger.info("Migration 0007 rollback completed successfully", {
      migration: "0007",
      constraintsDropped: 16,
      tablesModified: 7,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    });

    console.log("✅ Migration 0007: CHECK constraints dropped successfully");
    console.log(`   - Constraints dropped: 16`);
    console.log(`   - Tables modified: 7`);
    console.log(`   - Duration: ${duration}ms`);

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error("Migration 0007 rollback failed", {
      migration: "0007",
      duration: `${duration}ms`,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    console.error("❌ Migration 0007 rollback failed:", error);
    throw error;
  }
}

// Execute migration based on command line argument
const command = process.argv[2];

if (command === "up") {
  migrateUp()
    .then(() => {
      logger.info("Migration 0007 UP completed");
      process.exit(0);
    })
    .catch((error) => {
      logger.error("Migration 0007 UP failed", { error });
      process.exit(1);
    });
} else if (command === "down") {
  migrateDown()
    .then(() => {
      logger.info("Migration 0007 DOWN completed");
      process.exit(0);
    })
    .catch((error) => {
      logger.error("Migration 0007 DOWN failed", { error });
      process.exit(1);
    });
} else {
  console.error("Usage: tsx migrations/0007_add_check_constraints.ts [up|down]");
  console.error("  up   - Apply CHECK constraints migration");
  console.error("  down - Rollback CHECK constraints migration");
  process.exit(1);
}
