import { db } from "./index";
import { logger } from "../logger";
import { sql } from "drizzle-orm";

/**
 * Database indexes for optimal query performance
 * These indexes support the most common query patterns in the application
 */

const RECOMMENDED_INDEXES = [
  // Queries: Get projects by user with ordering
  {
    name: "idx_projects_owner_created",
    table: "projects",
    columns: ["owner_id", "created_at"],
    description: "Optimizes user project listing with chronological ordering",
  },

  // Queries: Get blueprints by project with version ordering
  {
    name: "idx_blueprints_project_version",
    table: "blueprints",
    columns: ["project_id", "version"],
    description:
      "Optimizes blueprint version retrieval and latest blueprint lookup",
  },

  // Queries: Get transactions by user with date ordering
  {
    name: "idx_transactions_user_created",
    table: "transactions",
    columns: ["user_id", "created_at"],
    description: "Optimizes transaction history queries",
  },

  // Queries: Blueprint lookup by ID (f经常查询)
  {
    name: "idx_blueprints_id",
    table: "blueprints",
    columns: ["id"],
    description: "Optimizes blueprint lookups by UUID primary key",
  },

  // Queries: Project lookup by ID
  {
    name: "idx_projects_id",
    table: "projects",
    columns: ["id"],
    description: "Optimizes project lookups by UUID primary key",
  },

  // Queries: User lookup by Clerk ID
  {
    name: "idx_users_clerk_id",
    table: "users",
    columns: ["clerk_id"],
    description: "Optimizes user authentication lookups",
  },

  // Composite index for blueprint filtering by project and creation date
  {
    name: "idx_blueprints_project_created",
    table: "blueprints",
    columns: ["project_id", "created_at"],
    description: "Optimizes blueprint chronological filtering within projects",
  },

  // Index for transaction filtering by payment ID
  {
    name: "idx_transactions_stripe_payment",
    table: "transactions",
    columns: ["stripe_payment_id"],
    description: "Optimizes payment lookup for webhook processing",
  },
] as const;

export class DatabaseIndexer {
  /**
   * Create all recommended indexes for optimal performance
   */
  static async createAllIndexes(): Promise<void> {
    logger.info("Starting database index creation");

    const results = {
      success: [] as string[],
      failed: [] as { name: string; error: string }[],
    };

    for (const indexDef of RECOMMENDED_INDEXES) {
      try {
        await this.createIndex(indexDef);
        results.success.push(indexDef.name);
        logger.debug("Index created successfully", {
          indexName: indexDef.name,
          table: indexDef.table,
          columns: indexDef.columns.join(", "),
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        results.failed.push({ name: indexDef.name, error: errorMessage });
        logger.warn("Failed to create index", {
          indexName: indexDef.name,
          error: errorMessage,
        });
      }
    }

    logger.info("Database index creation completed", {
      successCount: results.success.length,
      failedCount: results.failed.length,
      successfulIndexes: results.success,
      failedIndexes: results.failed,
    });

    if (results.failed.length > 0) {
      logger.warn(
        "Some indexes failed to create - this may affect query performance",
      );
    }
  }

  /**
   * Create a specific index
   */
  private static async createIndex(
    indexDef: (typeof RECOMMENDED_INDEXES)[0],
  ): Promise<void> {
    const database = db();

    const indexName = indexDef.name;
    const tableName = indexDef.table;
    const columns = indexDef.columns.join(", ");

    // Use IF NOT EXISTS to prevent errors on repeated runs
    const createIndexSQL = sql`
      CREATE INDEX IF NOT EXISTS ${sql.identifier(indexName)} 
      ON ${sql.identifier(tableName)} (${sql.raw(columns)})
    `;

    await database.execute(createIndexSQL);
  }

  /**
   * Analyze current index usage and provide recommendations
   */
  static async analyzeIndexUsage(): Promise<{
    currentIndexes: Array<{
      tableName: string;
      indexName: string;
      columnNames: string[];
      isPrimary: boolean;
      isUnique: boolean;
    }>;
    recommendations: string[];
    missingIndexes: typeof RECOMMENDED_INDEXES;
  }> {
    const database = db();

    try {
      // Get current indexes from PostgreSQL
      const indexQuery = sql`
        SELECT 
          schemaname,
          tablename as table_name,
          indexname as index_name,
          indexdef as index_definition
        FROM pg_indexes 
        WHERE schemaname = 'public'
        ORDER BY tablename, indexname
      `;

      const currentIndexResults = await database.execute(indexQuery);
      const currentIndexes = currentIndexResults.map((row) => ({
        tableName: row.table_name,
        indexName: row.index_name,
        columnNames: this.extractColumnsFromDefinition(row.index_definition),
        isPrimary: row.index_name.includes("_pkey"),
        isUnique: row.index_definition.toLowerCase().includes("unique"),
      }));

      // Find missing recommended indexes
      const existingIndexNames = new Set(
        currentIndexes.map((ix) => ix.indexName),
      );
      const missingIndexes = RECOMMENDED_INDEXES.filter(
        (ix) => !existingIndexNames.has(ix.name),
      );

      // Generate recommendations
      const recommendations = [
        ...missingIndexes.map(
          (ix) => `Missing recommended index: ${ix.name} for table ${ix.table}`,
        ),
        "Consider running ANALYZE after bulk data imports for optimal query planning",
        "Monitor slow query logs for additional indexing opportunities",
      ];

      return {
        currentIndexes,
        recommendations,
        missingIndexes,
      };
    } catch (error) {
      logger.error("Failed to analyze index usage", {
        error: error instanceof Error ? error.message : "Unknown error",
      });

      return {
        currentIndexes: [],
        recommendations: ["Unable to analyze current indexes"],
        missingIndexes: RECOMMENDED_INDEXES,
      };
    }
  }

  /**
   * Extract column names from PostgreSQL index definition
   */
  private static extractColumnsFromDefinition(definition: string): string[] {
    // Match columns between parentheses in CREATE INDEX definition
    const match = definition.match(/\(([^)]+)\)/);
    if (!match) return [];

    return match[1].split(",").map((col) => col.trim().replace(/"/g, ""));
  }

  /**
   * Update table statistics for optimal query planning
   */
  static async updateTableStatistics(): Promise<void> {
    const database = db();

    try {
      // Update statistics for all main tables
      const tables = ["users", "projects", "blueprints", "transactions"];

      for (const table of tables) {
        await database.execute(sql`ANALYZE ${sql.identifier(table)}`);
        logger.debug("Table statistics updated", { table });
      }

      logger.info("Table statistics updated successfully");
    } catch (error) {
      logger.error("Failed to update table statistics", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Get query performance metrics
   */
  static async getQueryPerformanceMetrics(): Promise<{
    slowQueries: Array<{
      query: string;
      calls: number;
      totalTime: number;
      meanTime: number;
    }>;
    indexUsageStats: Record<
      string,
      {
        scans: number;
        tuplesRead: number;
        tuplesReturned: number;
      }
    >;
  }> {
    const database = db();

    try {
      // Get slow query statistics (requires pg_stat_statements extension)
      const slowQueryStats = sql`
        SELECT 
          query,
          calls,
          total_time,
          mean_time,
          rows
        FROM pg_stat_statements 
        WHERE mean_time > 100 -- Only queries with mean execution time > 100ms
        ORDER BY mean_time DESC 
        LIMIT 10
      `;

      // Get index usage statistics
      const indexUsageStats = sql`
        SELECT 
          schemaname,
          tablename,
          indexrelname as index_name,
          idx_scan as scans,
          idx_tup_read as tuples_read,
          idx_tup_return as tuples_returned
        FROM pg_stat_user_indexes 
        ORDER BY idx_scan DESC
      `;

      const [slowQueries, indexUsage] = await Promise.allSettled([
        database.execute(slowQueryStats),
        database.execute(indexUsageStats),
      ]);

      return {
        slowQueries:
          slowQueries.status === "fulfilled" ? slowQueries.value : [],
        indexUsageStats:
          indexUsage.status === "fulfilled"
            ? Object.fromEntries(
                indexUsage.value.map((row: any) => [
                  row.index_name,
                  {
                    scans: row.scans,
                    tuplesRead: row.tuples_read,
                    tuplesReturned: row.tuples_returned,
                  },
                ]),
              )
            : {},
      };
    } catch (error) {
      logger.warn(
        "Advanced performance metrics not available - pg_stat_statements extension may be missing",
        {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      );

      return {
        slowQueries: [],
        indexUsageStats: {},
      };
    }
  }
}
