#!/usr/bin/env node

/**
 * Reproduction case for TypeScript build failure (TS6053 errors)
 * Issue: Missing .next/types files causing TypeScript compilation to fail
 * This reproduces the bug that was previously fixed as BUG-008 but has recurred
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

console.log("🔍 Reproducing TypeScript build failure issue...");
console.log("=".repeat(60));

try {
  // Check if .next/types directory exists
  const nextTypesDir = path.join(process.cwd(), ".next/types");
  console.log(`📁 Checking .next/types directory: ${nextTypesDir}`);

  if (!fs.existsSync(nextTypesDir)) {
    console.log("❌ .next/types directory does not exist");
  } else {
    console.log("✅ .next/types directory exists");

    // List files in .next/types
    const files = fs.readdirSync(nextTypesDir, { recursive: true });
    console.log(`📄 Found ${files.length} files in .next/types`);

    // Check for specific missing files mentioned in error
    const missingFiles = [
      "app/api/blueprints/[id]/route.ts",
      "app/api/blueprints/route.ts",
      "app/api/cache/enhanced-metrics/route.ts",
      "app/cache-life.d.ts",
    ];

    console.log("\n🔍 Checking for missing files:");
    missingFiles.forEach((file) => {
      const filePath = path.join(nextTypesDir, file);
      if (fs.existsSync(filePath)) {
        console.log(`✅ ${file}`);
      } else {
        console.log(`❌ ${file} - MISSING`);
      }
    });
  }

  console.log("\n🧪 Running TypeScript check to reproduce error...");
  try {
    const output = execSync("npm run typecheck", {
      encoding: "utf8",
      stdio: "pipe",
    });
    console.log("✅ TypeScript check passed - no errors reproduced");
  } catch (error) {
    console.log("❌ TypeScript check failed - bug reproduced!");
    console.log("\n📋 Error output:");
    console.log(error.stdout || error.message);

    // Count TS6053 errors
    const ts6053Errors =
      (error.stdout || error.message).match(/error TS6053/g) || [];
    console.log(`\n📊 Found ${ts6053Errors.length} TS6053 errors`);

    if (ts6053Errors.length > 0) {
      console.log(
        "\n🔧 Analysis: This is the TypeScript build artifacts issue",
      );
      console.log("   The .next/types files are missing or corrupted");
      console.log(
        "   Build succeeded but TypeScript cannot find generated type definitions",
      );
      process.exit(1);
    }
  }
} catch (error) {
  console.error("❌ Error running reproduction case:", error.message);
  process.exit(1);
}

console.log("\n✅ Reproduction case completed");
