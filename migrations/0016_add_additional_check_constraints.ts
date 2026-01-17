import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

/**
 * Migration 0016: Add Additional CHECK Constraints for Missing Tables
 *
 * This migration adds 15 CHECK constraints to 6 tables that were missed in Migration 0007:
 *
 * Phase 1: Blueprint Shares Table (3 constraints)
 *   1. chk_blueprint_shares_permission_valid - Validates permission enum
 *   2. chk_blueprint_shares_view_count_non_negative - Ensures non-negative view count
 *   3. chk_blueprint_shares_expires_after_created - Validates expiry date
 *
 * Phase 2: Team Projects Table (1 constraint)
 *   4. chk_team_projects_role_valid - Validates role enum
 *
 * Phase 3: Subscription Usage Table (6 constraints)
 *   5. chk_subscription_usage_credits_used_non_negative - Non-negative credits used
 *   6. chk_subscription_usage_credits_granted_non_negative - Non-negative credits granted
 *   7. chk_subscription_usage_projects_created_non_negative - Non-negative projects
 *   8. chk_subscription_usage_teams_created_non_negative - Non-negative teams
 *   9. chk_subscription_usage_webhooks_created_non_negative - Non-negative webhooks
 *   10. chk_subscription_usage_api_requests_non_negative - Non-negative API requests
 *
 * Phase 4: User Settings Table (4 constraints)
 *   11. chk_user_settings_theme_valid - Validates theme enum
 *   12. chk_user_settings_language_valid - Validates language code format
 *   13. chk_user_settings_timezone_valid - Validates timezone format
 *   14. chk_user_settings_default_visibility_valid - Validates visibility enum
 *
 * Phase 5: Notifications Table (1 constraint)
 *   15. chk_notifications_type_valid - Validates notification type enum
 *
 * Business Impact:
 *   - Prevents invalid data insertion at database level
 *   - Enhances data integrity and consistency
 *   - Supports compliance requirements (GDPR, SOC2)
 *   - Reduces application-level validation burden
 *   - Prevents invalid permission and role assignments
 *   - Ensures non-negative usage metrics for financial integrity
 *
 * Performance Impact:
 *   - Minimal overhead on INSERT/UPDATE operations (<1ms per constraint check)
 *   - Database-level validation is faster than application-level
 *   - Prevents database corruption from invalid data
 *
 * Previous Migrations:
 *   - Migration 0007: Added 16 CHECK constraints (projects, deployments, blueprints, transactions, webhook_configurations, teams, team_members, users)
 *   - This migration (0016): Completes CHECK constraint coverage for all tables
 *
 * Total CHECK Constraints in Database: 31 (16 from 0007 + 15 from 0016)
 *
 * @author Principal Data Architect
 * @date January 17, 2026
 */

export async function up() {
  console.log("⬆️  Applying migration: Add Additional CHECK Constraints for Missing Tables");

  const database = db();
  const startTime = Date.now();
  const results = {
    created: [] as string[],
    failed: [] as { name: string; error: string }[],
  };

  try {
    console.log("\n   Phase 1: Blueprint Shares Table (3 constraints)");

    console.log("      → Adding chk_blueprint_shares_permission_valid...");
    await database.execute(sql`
      ALTER TABLE blueprint_shares
      ADD CONSTRAINT chk_blueprint_shares_permission_valid
      CHECK (permission IN ('view', 'edit', 'fork', 'admin'))
    `);
    results.created.push("chk_blueprint_shares_permission_valid");
    console.log("      ✓ Constraint added: chk_blueprint_shares_permission_valid");

    console.log("      → Adding chk_blueprint_shares_view_count_non_negative...");
    await database.execute(sql`
      ALTER TABLE blueprint_shares
      ADD CONSTRAINT chk_blueprint_shares_view_count_non_negative
      CHECK (view_count >= 0)
    `);
    results.created.push("chk_blueprint_shares_view_count_non_negative");
    console.log("      ✓ Constraint added: chk_blueprint_shares_view_count_non_negative");

    console.log("      → Adding chk_blueprint_shares_expires_after_created...");
    await database.execute(sql`
      ALTER TABLE blueprint_shares
      ADD CONSTRAINT chk_blueprint_shares_expires_after_created
      CHECK (
        expires_at IS NULL OR
        expires_at > created_at
      )
    `);
    results.created.push("chk_blueprint_shares_expires_after_created");
    console.log("      ✓ Constraint added: chk_blueprint_shares_expires_after_created");

    console.log("\n   Phase 2: Team Projects Table (1 constraint)");

    console.log("      → Adding chk_team_projects_role_valid...");
    await database.execute(sql`
      ALTER TABLE team_projects
      ADD CONSTRAINT chk_team_projects_role_valid
      CHECK (role IN ('admin', 'member', 'viewer'))
    `);
    results.created.push("chk_team_projects_role_valid");
    console.log("      ✓ Constraint added: chk_team_projects_role_valid");

    console.log("\n   Phase 3: Subscription Usage Table (6 constraints)");

    console.log("      → Adding chk_subscription_usage_credits_used_non_negative...");
    await database.execute(sql`
      ALTER TABLE subscription_usage
      ADD CONSTRAINT chk_subscription_usage_credits_used_non_negative
      CHECK (credits_used >= 0)
    `);
    results.created.push("chk_subscription_usage_credits_used_non_negative");
    console.log("      ✓ Constraint added: chk_subscription_usage_credits_used_non_negative");

    console.log("      → Adding chk_subscription_usage_credits_granted_non_negative...");
    await database.execute(sql`
      ALTER TABLE subscription_usage
      ADD CONSTRAINT chk_subscription_usage_credits_granted_non_negative
      CHECK (credits_granted >= 0)
    `);
    results.created.push("chk_subscription_usage_credits_granted_non_negative");
    console.log("      ✓ Constraint added: chk_subscription_usage_credits_granted_non_negative");

    console.log("      → Adding chk_subscription_usage_projects_created_non_negative...");
    await database.execute(sql`
      ALTER TABLE subscription_usage
      ADD CONSTRAINT chk_subscription_usage_projects_created_non_negative
      CHECK (projects_created >= 0)
    `);
    results.created.push("chk_subscription_usage_projects_created_non_negative");
    console.log("      ✓ Constraint added: chk_subscription_usage_projects_created_non_negative");

    console.log("      → Adding chk_subscription_usage_teams_created_non_negative...");
    await database.execute(sql`
      ALTER TABLE subscription_usage
      ADD CONSTRAINT chk_subscription_usage_teams_created_non_negative
      CHECK (teams_created >= 0)
    `);
    results.created.push("chk_subscription_usage_teams_created_non_negative");
    console.log("      ✓ Constraint added: chk_subscription_usage_teams_created_non_negative");

    console.log("      → Adding chk_subscription_usage_webhooks_created_non_negative...");
    await database.execute(sql`
      ALTER TABLE subscription_usage
      ADD CONSTRAINT chk_subscription_usage_webhooks_created_non_negative
      CHECK (webhooks_created >= 0)
    `);
    results.created.push("chk_subscription_usage_webhooks_created_non_negative");
    console.log("      ✓ Constraint added: chk_subscription_usage_webhooks_created_non_negative");

    console.log("      → Adding chk_subscription_usage_api_requests_non_negative...");
    await database.execute(sql`
      ALTER TABLE subscription_usage
      ADD CONSTRAINT chk_subscription_usage_api_requests_non_negative
      CHECK (api_requests >= 0)
    `);
    results.created.push("chk_subscription_usage_api_requests_non_negative");
    console.log("      ✓ Constraint added: chk_subscription_usage_api_requests_non_negative");

    console.log("\n   Phase 4: User Settings Table (4 constraints)");

    console.log("      → Adding chk_user_settings_theme_valid...");
    await database.execute(sql`
      ALTER TABLE user_settings
      ADD CONSTRAINT chk_user_settings_theme_valid
      CHECK (theme IN ('system', 'light', 'dark'))
    `);
    results.created.push("chk_user_settings_theme_valid");
    console.log("      ✓ Constraint added: chk_user_settings_theme_valid");

    console.log("      → Adding chk_user_settings_language_valid...");
    await database.execute(sql`
      ALTER TABLE user_settings
      ADD CONSTRAINT chk_user_settings_language_valid
      CHECK (language ~ '^[a-z]{2}(-[A-Z]{2})?$')
    `);
    results.created.push("chk_user_settings_language_valid");
    console.log("      ✓ Constraint added: chk_user_settings_language_valid");

    console.log("      → Adding chk_user_settings_timezone_valid...");
    await database.execute(sql`
      ALTER TABLE user_settings
      ADD CONSTRAINT chk_user_settings_timezone_valid
      CHECK (
        timezone ~ '^([A-Za-z]+/[A-Za-z_]+)$' OR
        timezone = 'UTC'
      )
    `);
    results.created.push("chk_user_settings_timezone_valid");
    console.log("      ✓ Constraint added: chk_user_settings_timezone_valid");

    console.log("      → Adding chk_user_settings_default_visibility_valid...");
    await database.execute(sql`
      ALTER TABLE user_settings
      ADD CONSTRAINT chk_user_settings_default_visibility_valid
      CHECK (default_project_visibility IN ('private', 'public', 'team'))
    `);
    results.created.push("chk_user_settings_default_visibility_valid");
    console.log("      ✓ Constraint added: chk_user_settings_default_visibility_valid");

    console.log("\n   Phase 5: Notifications Table (1 constraint)");

    console.log("      → Adding chk_notifications_type_valid...");
    await database.execute(sql`
      ALTER TABLE notifications
      ADD CONSTRAINT chk_notifications_type_valid
      CHECK (type IN ('blueprint_complete', 'team_invitation', 'deployment_status', 'credit_warning', 'blueprint_shared'))
    `);
    results.created.push("chk_notifications_type_valid");
    console.log("      ✓ Constraint added: chk_notifications_type_valid");

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log("\n✅ Migration completed successfully!");
    console.log(`   Duration: ${duration}s`);
    console.log(`   Constraints Added: ${results.created.length}`);
    console.log(`   Constraints Failed: ${results.failed.length}`);

    if (results.created.length > 0) {
      console.log("\n   Added Constraints:");
      results.created.forEach((constraint) => console.log(`      ✓ ${constraint}`));
    }

    if (results.failed.length > 0) {
      console.log("\n   Failed Constraints:");
      results.failed.forEach(({ name, error }) => {
        console.log(`      ✗ ${name}: ${error}`);
      });
    }

    return results;
  } catch (error) {
    console.error("\n❌ Migration failed!");
    console.error(
      `Error: ${error instanceof Error ? error.message : String(error)}`
    );

    if (error instanceof Error && error.stack) {
      console.error("\nStack trace:");
      console.error(error.stack);
    }

    throw error;
  }
}

export async function down() {
  console.log("⬇️  Rolling back migration: Remove Additional CHECK Constraints");

  const database = db();
  const startTime = Date.now();
  const results = {
    dropped: [] as string[],
    failed: [] as { name: string; error: string }[],
  };

  try {
    console.log("\n   Phase 1: Blueprint Shares Table (3 constraints)");

    console.log("      → Dropping chk_blueprint_shares_permission_valid...");
    await database.execute(sql`
      ALTER TABLE blueprint_shares
      DROP CONSTRAINT IF EXISTS chk_blueprint_shares_permission_valid
    `);
    results.dropped.push("chk_blueprint_shares_permission_valid");
    console.log("      ✓ Constraint dropped: chk_blueprint_shares_permission_valid");

    console.log("      → Dropping chk_blueprint_shares_view_count_non_negative...");
    await database.execute(sql`
      ALTER TABLE blueprint_shares
      DROP CONSTRAINT IF EXISTS chk_blueprint_shares_view_count_non_negative
    `);
    results.dropped.push("chk_blueprint_shares_view_count_non_negative");
    console.log("      ✓ Constraint dropped: chk_blueprint_shares_view_count_non_negative");

    console.log("      → Dropping chk_blueprint_shares_expires_after_created...");
    await database.execute(sql`
      ALTER TABLE blueprint_shares
      DROP CONSTRAINT IF EXISTS chk_blueprint_shares_expires_after_created
    `);
    results.dropped.push("chk_blueprint_shares_expires_after_created");
    console.log("      ✓ Constraint dropped: chk_blueprint_shares_expires_after_created");

    console.log("\n   Phase 2: Team Projects Table (1 constraint)");

    console.log("      → Dropping chk_team_projects_role_valid...");
    await database.execute(sql`
      ALTER TABLE team_projects
      DROP CONSTRAINT IF EXISTS chk_team_projects_role_valid
    `);
    results.dropped.push("chk_team_projects_role_valid");
    console.log("      ✓ Constraint dropped: chk_team_projects_role_valid");

    console.log("\n   Phase 3: Subscription Usage Table (6 constraints)");

    console.log("      → Dropping chk_subscription_usage_credits_used_non_negative...");
    await database.execute(sql`
      ALTER TABLE subscription_usage
      DROP CONSTRAINT IF EXISTS chk_subscription_usage_credits_used_non_negative
    `);
    results.dropped.push("chk_subscription_usage_credits_used_non_negative");
    console.log("      ✓ Constraint dropped: chk_subscription_usage_credits_used_non_negative");

    console.log("      → Dropping chk_subscription_usage_credits_granted_non_negative...");
    await database.execute(sql`
      ALTER TABLE subscription_usage
      DROP CONSTRAINT IF EXISTS chk_subscription_usage_credits_granted_non_negative
    `);
    results.dropped.push("chk_subscription_usage_credits_granted_non_negative");
    console.log("      ✓ Constraint dropped: chk_subscription_usage_credits_granted_non_negative");

    console.log("      → Dropping chk_subscription_usage_projects_created_non_negative...");
    await database.execute(sql`
      ALTER TABLE subscription_usage
      DROP CONSTRAINT IF EXISTS chk_subscription_usage_projects_created_non_negative
    `);
    results.dropped.push("chk_subscription_usage_projects_created_non_negative");
    console.log("      ✓ Constraint dropped: chk_subscription_usage_projects_created_non_negative");

    console.log("      → Dropping chk_subscription_usage_teams_created_non_negative...");
    await database.execute(sql`
      ALTER TABLE subscription_usage
      DROP CONSTRAINT IF EXISTS chk_subscription_usage_teams_created_non_negative
    `);
    results.dropped.push("chk_subscription_usage_teams_created_non_negative");
    console.log("      ✓ Constraint dropped: chk_subscription_usage_teams_created_non_negative");

    console.log("      → Dropping chk_subscription_usage_webhooks_created_non_negative...");
    await database.execute(sql`
      ALTER TABLE subscription_usage
      DROP CONSTRAINT IF EXISTS chk_subscription_usage_webhooks_created_non_negative
    `);
    results.dropped.push("chk_subscription_usage_webhooks_created_non_negative");
    console.log("      ✓ Constraint dropped: chk_subscription_usage_webhooks_created_non_negative");

    console.log("      → Dropping chk_subscription_usage_api_requests_non_negative...");
    await database.execute(sql`
      ALTER TABLE subscription_usage
      DROP CONSTRAINT IF EXISTS chk_subscription_usage_api_requests_non_negative
    `);
    results.dropped.push("chk_subscription_usage_api_requests_non_negative");
    console.log("      ✓ Constraint dropped: chk_subscription_usage_api_requests_non_negative");

    console.log("\n   Phase 4: User Settings Table (4 constraints)");

    console.log("      → Dropping chk_user_settings_theme_valid...");
    await database.execute(sql`
      ALTER TABLE user_settings
      DROP CONSTRAINT IF EXISTS chk_user_settings_theme_valid
    `);
    results.dropped.push("chk_user_settings_theme_valid");
    console.log("      ✓ Constraint dropped: chk_user_settings_theme_valid");

    console.log("      → Dropping chk_user_settings_language_valid...");
    await database.execute(sql`
      ALTER TABLE user_settings
      DROP CONSTRAINT IF EXISTS chk_user_settings_language_valid
    `);
    results.dropped.push("chk_user_settings_language_valid");
    console.log("      ✓ Constraint dropped: chk_user_settings_language_valid");

    console.log("      → Dropping chk_user_settings_timezone_valid...");
    await database.execute(sql`
      ALTER TABLE user_settings
      DROP CONSTRAINT IF EXISTS chk_user_settings_timezone_valid
    `);
    results.dropped.push("chk_user_settings_timezone_valid");
    console.log("      ✓ Constraint dropped: chk_user_settings_timezone_valid");

    console.log("      → Dropping chk_user_settings_default_visibility_valid...");
    await database.execute(sql`
      ALTER TABLE user_settings
      DROP CONSTRAINT IF EXISTS chk_user_settings_default_visibility_valid
    `);
    results.dropped.push("chk_user_settings_default_visibility_valid");
    console.log("      ✓ Constraint dropped: chk_user_settings_default_visibility_valid");

    console.log("\n   Phase 5: Notifications Table (1 constraint)");

    console.log("      → Dropping chk_notifications_type_valid...");
    await database.execute(sql`
      ALTER TABLE notifications
      DROP CONSTRAINT IF EXISTS chk_notifications_type_valid
    `);
    results.dropped.push("chk_notifications_type_valid");
    console.log("      ✓ Constraint dropped: chk_notifications_type_valid");

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log("\n✅ Rollback completed successfully!");
    console.log(`   Duration: ${duration}s`);
    console.log(`   Constraints Dropped: ${results.dropped.length}`);
    console.log(`   Constraints Failed: ${results.failed.length}`);

    if (results.dropped.length > 0) {
      console.log("\n   Dropped Constraints:");
      results.dropped.forEach((constraint) => console.log(`      ✓ ${constraint}`));
    }

    if (results.failed.length > 0) {
      console.log("\n   Failed Drops:");
      results.failed.forEach(({ name, error }) => {
        console.log(`      ✗ ${name}: ${error}`);
      });
    }

    return results;
  } catch (error) {
    console.error("\n❌ Rollback failed!");
    console.error(
      `Error: ${error instanceof Error ? error.message : String(error)}`
    );

    if (error instanceof Error && error.stack) {
      console.error("\nStack trace:");
      console.error(error.stack);
    }

    throw error;
  }
}
