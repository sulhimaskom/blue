import { db } from "../lib/db";
import { logger } from "../lib/logger";
import { readFileSync } from "fs";
import { join } from "path";
import { sql } from "drizzle-orm";

/**
 * Migration: Add Database-Level Constraints for Data Integrity
 *
 * Purpose: Add CHECK constraints to prevent data corruption and ensure data quality
 * Impact: Eliminates data corruption risk, prevents billing disputes
 * Safety: Non-destructive - validates existing data before adding constraints
 * Reversible: YES - Full rollback available
 *
 * Business Value:
 * - Prevents negative credits (billing dispute prevention)
 * - Validates email formats (delivery reliability)
 * - Enforces subscription tiers (business logic consistency)
 * - Validates project workflow (application stability)
 * - Ensures transaction integrity (financial accuracy)
 */

export async function up(): Promise<void> {
  logger.info("Starting migration: Add data integrity constraints");

  try {
    const migrationPath = join(
      process.cwd(),
      "migrations",
      "0001_add_data_integrity_constraints.sql",
    );
    const migrationSQL = readFileSync(migrationPath, "utf-8");

    // Neon serverless doesn't support transactions
    // Execute migration directly (safe due to non-destructive constraints)
    const database = db();
    await database.execute(sql.raw(migrationSQL));

    logger.info("Data integrity constraints added successfully", {
      constraintCount: 10,
      tables: ["users", "projects", "blueprints", "transactions"],
    });

    logger.info("Migration completed successfully");
  } catch (error) {
    logger.error("Migration failed", {
      error: error instanceof Error ? error.message : "Unknown error",
      migration: "0001_add_data_integrity_constraints",
    });
    throw error;
  }
}

export async function down(): Promise<void> {
  logger.info("Rolling back migration: Remove data integrity constraints");

  try {
    const rollbackPath = join(
      process.cwd(),
      "migrations",
      "rollback_0001_add_data_integrity_constraints.sql",
    );
    const rollbackSQL = readFileSync(rollbackPath, "utf-8");

    // Neon serverless doesn't support transactions
    // Execute rollback directly (safe operation - only drops constraints)
    const database = db();
    await database.execute(sql.raw(rollbackSQL));

    logger.warn("Data integrity constraints removed", {
      warning:
        "Rolling back increases risk of data corruption and billing disputes",
      constraintCount: 10,
    });

    logger.info("Rollback completed successfully");
  } catch (error) {
    logger.error("Rollback failed", {
      error: error instanceof Error ? error.message : "Unknown error",
      migration: "rollback_0001_add_data_integrity_constraints",
    });
    throw error;
  }
}

/**
 * Validate that all constraints are in place
 * Used for migration verification
 */
export async function validate(): Promise<boolean> {
  try {
    const database = db();

    // Check for constraint existence across all tables
    const constraintCheck = await database.execute(
      sql`
        SELECT
          tc.table_name,
          tc.constraint_name,
          cc.check_clause
        FROM information_schema.table_constraints tc
        JOIN information_schema.check_constraints cc
          ON tc.constraint_name = cc.constraint_name
        WHERE tc.table_name IN ('users', 'projects', 'blueprints', 'transactions')
          AND tc.constraint_name LIKE 'chk_%'
        ORDER BY tc.table_name, tc.constraint_name
      `,
    );

    const constraints = (constraintCheck as any)?.rows || [];

    logger.info("Data integrity constraints validation", {
      expected: 10,
      actual: constraints.length,
      constraints: constraints.map((c: any) => c.constraint_name),
    });

    // All 10 constraints should be present
    return constraints.length === 10;
  } catch (error) {
    logger.error("Constraint validation failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return false;
  }
}
