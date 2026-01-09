import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

/**
 * Migration 0005: Add Unique Constraints for Data Integrity
 * 
 * This migration adds critical unique constraints to prevent:
 * 1. Duplicate Stripe payment charges (billing disputes)
 * 2. Duplicate GitHub repository deployments (API conflicts)
 * 
 * Business Impact:
 * - Prevents financial duplicate charges
 * - Prevents GitHub API conflicts
 * - Improves data quality and system reliability
 * 
 * Performance Impact:
 * - Minimal overhead on INSERT operations (<1ms)
 * - Faster lookups by stripe_payment_id and repo_url
 * 
 * @author Principal Data Architect
 * @date January 14, 2026
 */

export async function up() {
  console.log("⬆️  Applying migration: Add Unique Constraints for Data Integrity");

  const database = db();

  try {
    // Add unique constraint on transactions.stripe_payment_id
    console.log("   → Adding unique constraint on transactions.stripe_payment_id...");
    await database.execute(sql`
      ALTER TABLE transactions
      ADD CONSTRAINT IF NOT EXISTS uq_transactions_stripe_payment_id
      UNIQUE (stripe_payment_id)
    `);
    console.log("   ✓ Unique constraint added to transactions.stripe_payment_id");

    // Add partial unique index on projects.repo_url
    console.log("   → Adding partial unique index on projects.repo_url...");
    await database.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_projects_repo_url
      ON projects (repo_url)
      WHERE repo_url IS NOT NULL
    `);
    console.log("   ✓ Partial unique index added to projects.repo_url");

    console.log("✅ Migration 0005 up completed successfully");

    return {
      success: true,
      message: "Unique constraints added successfully",
      details: {
        transactionConstraint: "uq_transactions_stripe_payment_id",
        projectIndex: "uq_projects_repo_url (partial unique)",
      },
    };
  } catch (error) {
    console.error("❌ Migration 0005 up failed:", error);
    throw error;
  }
}

export async function down() {
  console.log("⬇️  Rolling back migration: Add Unique Constraints for Data Integrity");

  const database = db();

  try {
    // Remove unique constraint from transactions
    console.log("   → Removing unique constraint from transactions.stripe_payment_id...");
    await database.execute(sql`
      ALTER TABLE transactions
      DROP CONSTRAINT IF EXISTS uq_transactions_stripe_payment_id
    `);
    console.log("   ✓ Unique constraint removed from transactions.stripe_payment_id");

    // Remove partial unique index from projects
    console.log("   → Removing partial unique index from projects.repo_url...");
    await database.execute(sql`
      DROP INDEX IF EXISTS uq_projects_repo_url
    `);
    console.log("   ✓ Partial unique index removed from projects.repo_url");

    console.log("✅ Migration 0005 down completed successfully");

    return {
      success: true,
      message: "Unique constraints removed successfully",
    };
  } catch (error) {
    console.error("❌ Migration 0005 down failed:", error);
    throw error;
  }
}
