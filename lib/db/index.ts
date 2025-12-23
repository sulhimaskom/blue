import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

let _db: ReturnType<typeof drizzle>;

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
      const sql = neon(databaseUrl);
      _db = drizzle(sql, { schema });
    } catch (error) {
      throw new Error(
        `Database connection failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
  return _db;
}

// For backward compatibility during transition
export const db = getDb;
