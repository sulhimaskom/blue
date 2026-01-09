import { up, down, validate } from "./0004_add_webhook_configuration_schema";

/**
 * Migration Runner Script for Webhook Configuration Schema
 *
 * Usage:
 *   npm run migrate:webhook:up    # Apply webhook tables migration
 *   npm run migrate:webhook:down  # Rollback webhook tables migration
 */

const command = process.argv[2];

async function main() {
  try {
    switch (command) {
      case "down":
        console.log(
          "🔄 Rolling back migration: Remove Webhook Configuration and Event History",
        );
        await down();
        console.log("✅ Rollback completed successfully");
        break;

      case undefined:
      case "up":
        console.log(
          "⬆️  Applying migration: Add Webhook Configuration and Event History",
        );
        await up();
        console.log("✅ Migration applied successfully");

        console.log("\n🔍 Validating webhook schema...");
        const isValid = await validate();
        if (isValid) {
          console.log(
            "✅ All webhook schema components validated successfully",
          );
        } else {
          console.error(
            "❌ Webhook schema validation failed - some components may not be active",
          );
          process.exit(1);
        }
        break;

      default:
        console.error("❌ Unknown command:", command);
        console.error("\nUsage:");
        console.error("  npm run migrate:webhook:up   - Apply webhook tables migration");
        console.error("  npm run migrate:webhook:down - Rollback webhook tables migration");
        process.exit(1);
    }
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

main();
