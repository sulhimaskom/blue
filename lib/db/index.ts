import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";
import { logger } from "../logger";

interface ConnectionPool {
  max: number;
  min: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
}

const DB_POOL_CONFIG: ConnectionPool = {
  max: 20, // Maximum number of connections in the pool
  min: 5, // Minimum number of connections to maintain
  idleTimeoutMillis: 30000, // Close connections after 30s of inactivity
  connectionTimeoutMillis: 10000, // Timeout for acquiring a connection
};

let _db: ReturnType<typeof drizzle>;
let _sql: ReturnType<typeof neon>;

export function getDb() {
  // Skip database connection during build time
  if (
    process.env.NEXT_PHASE === "phase-production-build" ||
    (process.env.NODE_ENV === "development" && !process.env.DATABASE_URL)
  ) {
    throw new Error("Database unavailable during build time");
  }

  if (!_db) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error("DATABASE_URL is not set in the environment");
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
      throw new Error(
        `Database connection failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
  return _db;
}

// Health check function to verify database connectivity
export async function checkDbHealth(): Promise<boolean> {
  try {
    const db = getDb();
    // Simple health check query
    await db.select().from(schema.users).limit(1);
    return true;
  } catch (error) {
    logger.error("Database health check failed:", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return false;
  }
}

// Connection pool statistics (for monitoring)
export function getPoolStats() {
  return {
    maxConnections: DB_POOL_CONFIG.max,
    minConnections: DB_POOL_CONFIG.min,
    idleTimeout: DB_POOL_CONFIG.idleTimeoutMillis,
    connectionTimeout: DB_POOL_CONFIG.connectionTimeoutMillis,
  };
}

// For backward compatibility during transition
export const db = getDb;
