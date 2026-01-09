#!/usr/bin/env node

/**
 * Ultra-Lightning Build Optimizer
 *
 * Maximum speed build with aggressive optimizations
 */

const { execSync } = require("child_process");
const fs = require("fs");

console.log("⚡ Initializing Ultra-Lightning Build...\n");

// Aggressive speed configuration
process.env.NODE_OPTIONS = "--max-old-space-size=3072";
process.env.NODE_ENV = "production";
process.env.NEXT_TELEMETRY_DISABLED = "1";

const config = {
  workers: 1, // Single worker to reduce overhead
  maxMemory: "3072", // 3GB for faster GC
  targetTime: 15000,
};

console.log(`⚡ Ultra-Lightning Configuration:`);
console.log(`   • Workers: ${config.workers}`);
console.log(`   • Memory: ${config.maxMemory}MB`);
console.log(`   • Target: ${(config.targetTime / 1000).toFixed(1)}s\n`);

// Complete cache cleanup
if (fs.existsSync(".next")) {
  console.log("🧹 Complete cache cleanup...");
  try {
    execSync("rm -rf .next", { stdio: "pipe" });
    console.log("✓ Full cache cleared\n");
  } catch (error) {
    console.log("⚠️  Cache cleanup failed\n");
  }
}

// Build with maximum speed optimizations
const buildCommand = "npx next build";

console.log("🔨 Starting ultra-lightning build...");
const startTime = Date.now();

try {
  execSync(buildCommand, {
    stdio: "inherit",
    env: {
      ...process.env,
      NODE_OPTIONS: `--max-old-space-size=${config.maxMemory}`,
      NEXT_BUILD_WORKERS: config.workers.toString(),
      NEXT_BUILD_INCREMENTAL: "false",
      NEXT_OPTIMIZE_CSS: "false",
      ANALYZE: "false",
      NEXT_MINIMIZE: "false", // Disable minimization for speed
      NEXT_DISABLE_SOURCEMAPS: "true",
      NEXT_TELEMETRY_DISABLED: "1",
    },
  });

  const buildTime = Date.now() - startTime;
  const buildTimeSeconds = (buildTime / 1000).toFixed(1);

  console.log(`\n✅ Build completed!`);
  console.log(`⏱️  Time: ${buildTimeSeconds}s`);

  if (buildTime <= config.targetTime) {
    console.log(`🎯 TARGET ACHIEVED!`);
  } else {
    const overTarget = ((buildTime - config.targetTime) / 1000).toFixed(1);
    console.log(`⏱️  Over target by ${overTarget}s`);
  }

} catch (error) {
  console.error("\n❌ Build failed:", error.message);
  process.exit(1);
}

console.log("\n🚀 Ultra-Lightning Build Complete!");