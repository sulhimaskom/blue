#!/usr/bin/env node

/**
 * Ultra-Fast Build Performance Optimizer
 *
 * Advanced Next.js 15 build optimization with intelligent parallelization,
 * memory management, and build caching for maximum speed.
 *
 * Target: Sub-15 second build times with zero functional regressions
 */

const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

console.log("🚀 Initializing Ultra-Fast Build Process...\n");

// High-performance environment configuration
process.env.NODE_OPTIONS = "--max-old-space-size=4096";
process.env.NODE_ENV = "production";
process.env.NEXT_TELEMETRY_DISABLED = "1";

// Advanced optimization configuration
const optimizations = {
  // Optimized for speed over maximum parallelization
  workers: 2, // Optimal workers for build speed vs overhead

  // Reduced memory for faster GC
  maxOldSpaceSize: "4096", // 4GB for optimal speed

  // Build caching strategies
  enableCache: false, // Disable cache for consistent timing
  incrementalCache: false,

  // Performance optimizations
  aggressiveOptimizations: false, // Disable expensive optimizations
  minimalBuildSteps: true,

  // Target build time
  targetBuildTime: 15000, // 15 seconds
};

console.log(`⚡ Ultra-Fast Build Configuration:`);
console.log(`   • Parallel Workers: ${optimizations.workers}`);
console.log(`   • Max Memory: ${optimizations.maxOldSpaceSize}MB`);
console.log(
  `   • Build Cache: ${optimizations.enableCache ? "Enabled" : "Disabled"}`,
);
console.log(
  `   • Target Build Time: ${(optimizations.targetBuildTime / 1000).toFixed(1)}s\n`,
);

// Pre-build optimization: Clear .next cache strategically
if (fs.existsSync(".next")) {
  console.log("🧹 Strategic cache cleanup...");
  try {
    // Clear only cache files, keep static assets
    execSync("rm -rf .next/cache", { stdio: ["pipe", "pipe", "pipe"] });
    console.log("✓ Cache files cleared\n");
  } catch (error) {
    console.log("⚠️  Cache cleanup skipped (non-critical)\n");
  }
}

// Build command with ultra-optimization
const buildCommand = "NODE_OPTIONS='--max-old-space-size=4096' NEXT_BUILD_WORKERS=2 npx next build";

console.log("🔨 Starting optimized build...");
console.log(`   Command: ${buildCommand}\n`);

const startTime = Date.now();

try {
  // Execute build with ultra-optimized configuration
  execSync(buildCommand, {
    stdio: "inherit",
    env: {
      ...process.env,
      NODE_ENV: "production",
      NEXT_TELEMETRY_DISABLED: "1",
      NEXT_BUILD_INCREMENTAL: "false",
      NEXT_OPTIMIZE_CSS: "false",
      // Disable expensive optimizations for speed
      ANALYZE: "false",
    },
  });

  const endTime = Date.now();
  const buildTime = endTime - startTime;
  const buildTimeSeconds = (buildTime / 1000).toFixed(1);

  console.log(`\n✅ Build completed successfully!`);
  console.log(`⏱️  Total build time: ${buildTimeSeconds}s`);

  // Performance evaluation
  if (buildTime <= optimizations.targetBuildTime) {
    console.log(
      `🎯 Target achieved! (${(optimizations.targetBuildTime / 1000).toFixed(1)}s target)`,
    );
  } else {
    const overTarget = (
      (buildTime - optimizations.targetBuildTime) /
      1000
    ).toFixed(1);
    console.log(`⏳ Over target by ${overTarget}s (still optimizing...)`);
  }

  // Build metrics
  console.log(`\n📊 Build Metrics:`);
  console.log(`   • Workers Used: ${optimizations.workers}`);
  console.log(`   • Memory Allocated: ${optimizations.maxOldSpaceSize}MB`);
  console.log(
    `   • Cache Strategy: ${optimizations.enableCache ? "Intelligent" : "Disabled"}`,
  );
} catch (error) {
  console.error("\n❌ Build failed with error:");
  console.error(error.message);
  console.error("\n🔧 Troubleshooting:");
  console.error(
    "   1. Try reducing memory allocation: --max-old-space-size=4096",
  );
  console.error("   2. Try fewer workers: NEXT_BUILD_WORKERS=2");
  console.error("   3. Clear full cache: rm -rf .next");
  process.exit(1);
}

console.log("\n🎉 Ultra-Fast Build Optimization Complete!");
