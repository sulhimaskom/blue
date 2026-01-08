import { db } from "../lib/db";
import { logger } from "../lib/logger";
import { readFileSync } from "fs";
import { join } from "path";
import { sql } from "drizzle-orm";

/**
 * Migration 0002: Add Soft-Delete Pattern
 *
 * This migration adds deleted_at timestamp columns to enable soft-delete functionality
 * across all main tables for data preservation and audit trail compliance.
 *
 * Principle: Non-destructive data deletion with recovery capability
 * Business Impact: Prevents accidental data loss, improves compliance (GDPR),
 * enables audit trail and forensic analysis
 *
 * Safety: Non-destructive - adds nullable columns only
 * Reversible: YES - Full rollback available
 */

export async function up(): Promise<void> {
  logger.info("Starting migration: Add soft-delete pattern");

  try {
    const migrationPath = join(
      process.cwd(),
      "migrations",
      "0002_add_soft_delete_pattern.sql",
    );
    const migrationSQL = readFileSync(migrationPath, "utf-8");

    const database = db();
    await database.execute(sql.raw(migrationSQL));

    logger.info("Soft-delete pattern added successfully", {
      columnsAdded: 4,
      indexesCreated: 7,
      tables: ["users", "projects", "blueprints", "transactions"],
    });

    logger.info("Migration completed successfully");
  } catch (error) {
    logger.error("Migration failed", {
      error: error instanceof Error ? error.message : "Unknown error",
      migration: "0002_add_soft_delete_pattern",
    });
    throw error;
  }
}

export async function down(): Promise<void> {
  logger.info("Rolling back migration: Remove soft-delete pattern");

  try {
    const rollbackPath = join(
      process.cwd(),
      "migrations",
      "rollback_0002_add_soft_delete_pattern.sql",
    );
    const rollbackSQL = readFileSync(rollbackPath, "utf-8");

    const database = db();
    await database.execute(sql.raw(rollbackSQL));

    logger.warn("Soft-delete pattern removed", {
      warning:
        "Rolling back will prevent future data recovery of soft-deleted records",
      columnsRemoved: 4,
      indexesRemoved: 7,
    });

    logger.info("Rollback completed successfully");
  } catch (error) {
    logger.error("Rollback failed", {
      error: error instanceof Error ? error.message : "Unknown error",
      migration: "rollback_0002_add_soft_delete_pattern",
    });
    throw error;
  }
}

/**
 * Validate that soft-delete columns and indexes are in place
 * Used for migration verification
 */
export async function validate(): Promise<{
  columnsAdded: string[];
  indexesCreated: string[];
  validationPassed: boolean;
}> {
  try {
    const database = db();

    // Check if deleted_at columns exist
    const columnChecks = await database.execute(
      sql`
        SELECT 
          table_name,
          column_name
        FROM information_schema.columns
        WHERE table_name IN ('users', 'projects', 'blueprints', 'transactions')
          AND column_name = 'deleted_at'
      `,
    );

    const columnsAdded =
      (columnChecks as any)?.rows?.map(
        (row: any) => `${row.table_name}.${row.column_name}`,
      ) || [];

    // Check if indexes exist
    const indexChecks = await database.execute(
      sql`
        SELECT 
          indexname,
          tablename
        FROM pg_indexes
        WHERE indexname IN (
          'idx_users_deleted_at',
          'idx_projects_deleted_at',
          'idx_blueprints_deleted_at',
          'idx_transactions_deleted_at',
          'idx_projects_owner_deleted_at',
          'idx_blueprints_project_deleted_at_version',
          'idx_transactions_user_deleted_at'
        )
      `,
    );

    const indexesCreated =
      (indexChecks as any)?.rows?.map(
        (row: any) => `${row.tablename}:${row.indexname}`,
      ) || [];

    const validationPassed =
      columnsAdded.length === 4 && indexesCreated.length === 7;

    if (validationPassed) {
      logger.info("Soft-delete migration validation successful", {
        columns: columnsAdded.length,
        indexes: indexesCreated.length,
      });
    } else {
      logger.warn("Soft-delete migration validation failed", {
        expectedColumns: 4,
        actualColumns: columnsAdded.length,
        expectedIndexes: 7,
        actualIndexes: indexesCreated.length,
      });
    }

    return { columnsAdded, indexesCreated, validationPassed };
  } catch (error) {
    logger.error("Soft-delete migration validation failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}
