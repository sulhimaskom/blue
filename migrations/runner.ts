import { up, down, validate } from "./0001_add_data_integrity_constraints";

/**
 * Migration Runner Script
 *
 * Usage:
 *   npm run migrate:up      # Apply migration
 *   npm run migrate:down    # Rollback migration
 */

const command = process.argv[2];

async function main() {
  try {
    switch (command) {
      case "down":
        console.log(
          "🔄 Rolling back migration: Remove data integrity constraints",
        );
        await down();
        console.log("✅ Rollback completed successfully");
        break;

      case undefined:
      case "up":
        console.log("⬆️  Applying migration: Add data integrity constraints");
        await up();
        console.log("✅ Migration applied successfully");

        console.log("\n🔍 Validating constraints...");
        const isValid = await validate();
        if (isValid) {
          console.log(
            "✅ All 10 data integrity constraints validated successfully",
          );
        } else {
          console.error(
            "❌ Constraint validation failed - some constraints may not be active",
          );
          process.exit(1);
        }
        break;

      default:
        console.error("❌ Unknown command:", command);
        console.error("\nUsage:");
        console.error("  npm run migrate:up   - Apply migration");
        console.error("  npm run migrate:down - Rollback migration");
        process.exit(1);
    }
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

main();
