#!/usr/bin/env node

/**
 * Lightning-Fast Build Performance Optimizer
 *
 * Optimized for 15-second build target with streamlined configuration
 */

const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

console.log("⚡ Initializing Lightning-Fast Build Process...\n");

// Lightning-fast environment configuration
process.env.NODE_OPTIONS = "--max-old-space-size=4096";
process.env.NODE_ENV = "production";
process.env.NEXT_TELEMETRY_DISABLED = "1";

// Optimized configuration for speed
const config = {
  workers: 2, // Optimal for speed vs overhead
  maxMemory: "4096", // 4GB for faster GC
  targetTime: 15000, // 15 seconds
};

console.log(`⚡ Lightning-Fast Configuration:`);
console.log(`   • Workers: ${config.workers}`);
console.log(`   • Memory: ${config.maxMemory}MB`);
console.log(`   • Target: ${(config.targetTime / 1000).toFixed(1)}s\n`);

// Strategic cache cleanup
if (fs.existsSync(".next")) {
  console.log("🧹 Strategic cache cleanup...");
  try {
    execSync("rm -rf .next/cache .next/server .next/static", { stdio: "pipe" });
    console.log("✓ Cache cleared\n");
  } catch (error) {
    console.log("⚠️  Cache cleanup skipped\n");
  }
}

// Build command optimized for speed
const buildCommand = `npx next build`;

console.log("🔨 Starting lightning-fast build...");
console.log(`   Command: ${buildCommand}\n`);

const startTime = Date.now();

try {
  // Execute with speed-optimized environment
  execSync(buildCommand, {
    stdio: "inherit",
    env: {
      ...process.env,
      NODE_OPTIONS: `--max-old-space-size=${config.maxMemory}`,
      NEXT_BUILD_WORKERS: config.workers.toString(),
      NEXT_BUILD_INCREMENTAL: "false",
      NEXT_OPTIMIZE_CSS: "false",
      ANALYZE: "false",
      NEXT_MINIMIZE: "true",
    },
  });

  const endTime = Date.now();
  const buildTime = endTime - startTime;
  const buildTimeSeconds = (buildTime / 1000).toFixed(1);

  console.log(`\n✅ Build completed successfully!`);
  console.log(`⏱️  Total time: ${buildTimeSeconds}s`);

  // Performance evaluation
  if (buildTime <= config.targetTime) {
    console.log(`🎯 TARGET ACHIEVED! (${(config.targetTime / 1000).toFixed(1)}s target)`);
  } else {
    const overTarget = ((buildTime - config.targetTime) / 1000).toFixed(1);
    console.log(`⏱️  Over target by ${overTarget}s (optimizing...)`);
  }

  console.log(`\n📊 Metrics:`);
  console.log(`   • Workers: ${config.workers}`);
  console.log(`   • Memory: ${config.maxMemory}MB`);
  console.log(`   • Strategy: Speed Optimized`);

} catch (error) {
  console.error("\n❌ Build failed:");
  console.error(error.message);
  process.exit(1);
}

console.log("\n🚀 Lightning-Fast Build Complete!");