import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../lib/db/schema";

const migrationSql = neon(process.env.DATABASE_URL);
const migrationDb = drizzle(migrationSql, { schema });

async function main() {
  console.log("📋 Checking migration status...");

  try {
    // Check if migrations table exists
    const result = await migrationSql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'drizzle'
      )
    `;

    if (!result[0]?.exists) {
      console.log("⚠️  No migrations table found. Run migrations first.");
      return;
    }

    // Get last migration
    const lastMigration = await migrationSql`
      SELECT * FROM drizzle
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (lastMigration.length === 0) {
      console.log("ℹ️  No migrations have been applied yet");
      return;
    }

    console.log("✅ Last applied migration:");
    console.log(`   - Hash: ${lastMigration[0].hash}`);
    console.log(`   - Created: ${lastMigration[0].created_at}`);
  } catch (error) {
    console.error("❌ Failed to check migration status:", error);
    process.exit(1);
  }
}

main();
