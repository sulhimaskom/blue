import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../lib/db/schema";
import fs from "fs";
import path from "path";

const migrationSql = neon(process.env.DATABASE_URL);
const migrationDb = drizzle(migrationSql, { schema });

async function main() {
  console.log("⏪ Rolling back last Drizzle migration...");

  try {
    const migrationsDir = path.join(__dirname, "drizzle");
    const files = fs.readdirSync(migrationsDir).sort().reverse();

    const lastMigration = files.find((f) => f.endsWith("_down.sql"));

    if (!lastMigration) {
      console.log("⚠️  No rollback migration file found");
      return;
    }

    const rollbackSql = fs.readFileSync(
      path.join(migrationsDir, lastMigration),
      "utf-8",
    );

    console.log(`📝 Executing rollback: ${lastMigration}`);
    const statements = rollbackSql.split(";").filter((s) => s.trim());
    for (const statement of statements) {
      await migrationSql(statement.trim());
    }

    console.log("✅ Rollback completed successfully");
  } catch (error) {
    console.error("❌ Rollback failed:", error);
    process.exit(1);
  }
}

main();
