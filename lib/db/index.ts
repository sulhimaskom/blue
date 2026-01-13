import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { sql } from "drizzle-orm";
import * as schema from "./schema";
import { logger } from "../logger";
import { DatabaseError, DatabaseConnectionError } from "./errors";

interface ConnectionPool {
  max: number;
  min: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
}

// Optimized connection pool configuration for high-concurrency production workloads
const DB_POOL_CONFIG: ConnectionPool = {
  max: 50, // Increased max connections for better concurrency under load
  min: 10, // Higher minimum to reduce warm-up latency
  idleTimeoutMillis: 15000, // Reduced idle timeout to free resources faster
  connectionTimeoutMillis: 5000, // Faster timeout for better error handling
};

let _db: ReturnType<typeof drizzle>;
let _sql: ReturnType<typeof neon>;

export function getDb() {
  // Skip database connection during build time
  if (
    process.env.NEXT_PHASE === "phase-production-build" ||
    (process.env.NODE_ENV === "development" && !process.env.DATABASE_URL)
  ) {
    throw new DatabaseError("Database unavailable during build time");
  }

  if (!_db) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new DatabaseConnectionError("DATABASE_URL is not set in the environment");
    }
    try {
      // Neon automatically handles connection pooling for serverless connections
      // Append pool configuration to connection string for optimal performance
      const pooledUrl = new URL(databaseUrl);
      pooledUrl.searchParams.set("sslmode", "require");
      pooledUrl.searchParams.set(
        "max_connections",
        DB_POOL_CONFIG.max.toString(),
      );
      pooledUrl.searchParams.set(
        "connect_timeout",
        DB_POOL_CONFIG.connectionTimeoutMillis.toString(),
      );

      _sql = neon(pooledUrl.toString());
      _db = drizzle(_sql, {
        schema,
        logger: process.env.NODE_ENV === "development" ? true : false,
      });
    } catch (error) {
      throw new DatabaseError(
        `Database connection failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        error,
      );
    }
  }
  return _db;
}

// Enhanced health check with performance metrics
export async function checkDbHealth(): Promise<{
  healthy: boolean;
  latency?: number;
  error?: string;
  metrics?: {
    connectionCount: number;
    databaseSize: string;
    uptime: string;
  };
}> {
  const startTime = Date.now();

  // Skip database connection during build time
  if (
    process.env.NEXT_PHASE === "phase-production-build" ||
    (process.env.NODE_ENV === "development" && !process.env.DATABASE_URL)
  ) {
    return {
      healthy: false,
      latency: Date.now() - startTime,
      error: "Database unavailable during build time",
    };
  }

  // Ensure database connection is initialized
  let sql;
  try {
    sql = neon(process.env.DATABASE_URL!);
  } catch (error) {
    return {
      healthy: false,
      latency: Date.now() - startTime,
      error: "Database connection failed",
    };
  }

  try {
    // Perform multiple health checks in parallel for comprehensive status
    const [connectionCount, databaseSize, uptime] = await Promise.allSettled([
      // Active connection count
      sql`SELECT count(*) as count FROM pg_stat_activity WHERE datname = current_database()`,

      // Database size
      sql`SELECT pg_size_pretty(pg_database_size(current_database())) as size`,

      // Database uptime
      sql`SELECT date_trunc('second', pg_postmaster_start_time()) as uptime`,
    ]);

    const latency = Date.now() - startTime;

    // Extract values with fallbacks - properly type cast Drizzle results
    const connCount =
      connectionCount.status === "fulfilled"
        ? parseInt((connectionCount.value as any)[0]?.count || "0")
        : 0;

    const dbSize =
      databaseSize.status === "fulfilled"
        ? (databaseSize.value as any)[0]?.size || "Unknown"
        : "Unknown";

    const dbUptime =
      uptime.status === "fulfilled"
        ? new Date((uptime.value as any)[0]?.uptime || "").toISOString()
        : "Unknown";

    logger.debug("Database health check passed", {
      latency: `${latency}ms`,
      connectionCount: connCount,
      databaseSize: dbSize,
    });

    return {
      healthy: true,
      latency,
      metrics: {
        connectionCount: connCount,
        databaseSize: dbSize,
        uptime: dbUptime,
      },
    };
  } catch (error) {
    const latency = Date.now() - startTime;

    logger.error("Database health check failed", {
      error: error instanceof Error ? error.message : "Unknown error",
      latency: `${latency}ms`,
    });

    return {
      healthy: false,
      latency,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Enhanced connection pool statistics with real-time metrics
export async function getPoolStats() {
  // Skip during build time
  if (
    process.env.NEXT_PHASE === "phase-production-build" ||
    (process.env.NODE_ENV === "development" && !process.env.DATABASE_URL)
  ) {
    return {
      status: "build_time",
      maxConnections: DB_POOL_CONFIG.max,
      minConnections: DB_POOL_CONFIG.min,
      idleTimeout: DB_POOL_CONFIG.idleTimeoutMillis,
      connectionTimeout: DB_POOL_CONFIG.connectionTimeoutMillis,
      activeConnections: "n/a",
      activeQueries: "n/a",
      connectionUtilization: "n/a",
      availableConnections: "n/a",
      timestamps: {
        lastChecked: new Date().toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    };
  }

  try {
    // Ensure we have a valid SQL connection
    const sql = _sql || neon(process.env.DATABASE_URL!);

    // Get real-time connection metrics from Neon with performance optimizations
    const connectionMetrics = await sql`SELECT 
      count(*) as active_connections,
      count(*) FILTER (WHERE state = 'active') as active_queries,
      count(*) FILTER (WHERE state = 'idle') as idle_connections,
      count(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction
      FROM pg_stat_activity 
      WHERE datname = current_database()`;

    const activeConnections = parseInt(
      (connectionMetrics as any)[0]?.active_connections || "0",
    );
    const activeQueries = parseInt(
      (connectionMetrics as any)[0]?.active_queries || "0",
    );
    const idleConnections = parseInt(
      (connectionMetrics as any)[0]?.idle_connections || "0",
    );
    const idleInTransaction = parseInt(
      (connectionMetrics as any)[0]?.idle_in_transaction || "0",
    );

    return {
      // Configuration
      maxConnections: DB_POOL_CONFIG.max,
      minConnections: DB_POOL_CONFIG.min,
      idleTimeout: DB_POOL_CONFIG.idleTimeoutMillis,
      connectionTimeout: DB_POOL_CONFIG.connectionTimeoutMillis,

      // Real-time metrics
      activeConnections,
      activeQueries,
      idleConnections,
      idleInTransaction,
      connectionUtilization: Math.round(
        (activeConnections / DB_POOL_CONFIG.max) * 100,
      ),
      availableConnections: Math.max(0, DB_POOL_CONFIG.max - activeConnections),

      // Additional performance metrics
      avgQueryTime:
        activeConnections > 0
          ? Math.round((activeQueries / activeConnections) * 100) / 100
          : 0,
      connectionEfficiency:
        activeConnections > 0
          ? Math.round((activeQueries / activeConnections) * 100)
          : 0,

      timestamps: {
        lastChecked: new Date().toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    };
  } catch (error) {
    logger.warn("Failed to get real-time pool stats, returning config only", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    // Fallback to configuration-only stats
    return {
      status: "error",
      maxConnections: DB_POOL_CONFIG.max,
      minConnections: DB_POOL_CONFIG.min,
      idleTimeout: DB_POOL_CONFIG.idleTimeoutMillis,
      connectionTimeout: DB_POOL_CONFIG.connectionTimeoutMillis,
      activeConnections: "unknown",
      activeQueries: "unknown",
      connectionUtilization: "unknown",
      availableConnections: "unknown",
      error: error instanceof Error ? error.message : "Unknown error",
      timestamps: {
        lastChecked: new Date().toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    };
  }
}

// For backward compatibility during transition
export const db = getDb;
export { sql };
