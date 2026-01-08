#!/usr/bin/env node

/**
 * Production-Ready Build Optimizer
 *
 * Focuses on practical performance improvements:
 * - Fast compilation (target: <12s)
 * - Minimal overhead
 * - Reliable caching
 * - Zero complexity
 */

const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

console.log("⚡ Production Build Optimizer v2.0\n");

// Performance-focused configuration
const config = {
  // Optimized for speed over aggressive caching
  workers: 4,
  memory: "6144MB", // Reduced from 8GB for faster GC
  // Simple, reliable caching
  cacheStrategy: "production-ready",
};

console.log(`🎯 Speed-First Configuration:`);
console.log(`   • Build Workers: ${config.workers}`);
console.log(`   • Memory Limit: ${config.memory}`);
console.log(`   • Cache Strategy: ${config.cacheStrategy}`);
console.log(`   • Target: <12s compilation\n`);

// Smart cache management - simple and fast
function setupCache() {
  const nextDir = path.join(process.cwd(), ".next");

  // Simple cache preservation strategy
  if (fs.existsSync(nextDir)) {
    try {
      // Only check for cache existence, not age
      const cacheDir = path.join(nextDir, "cache");
      if (fs.existsSync(cacheDir)) {
        console.log("♻️  Using existing build cache");
        return;
      }
    } catch (error) {
      // Continue with fresh build
    }
  }

  console.log("🧹 Fresh build preparation");
}

// Streamlined environment setup
function setupEnvironment() {
  // Focus on Node.js performance optimizations
  process.env.NODE_OPTIONS = "--max-old-space-size=6144";
  process.env.NODE_ENV = "production";
  process.env.NEXT_TELEMETRY_DISABLED = "1";
  process.env.FORCE_COLOR = "1";

  // Build-specific optimizations
  process.env.NEXT_BUILD_WORKERS = config.workers.toString();
  process.env.NEXT_MINIMIZE = "true";
}

setupCache();
setupEnvironment();

const startTime = Date.now();

try {
  console.log("🏗️  Starting production-optimized build...\n");

  // Simple, direct build command
  const buildCommand = `NEXT_BUILD_WORKERS=${config.workers} NODE_OPTIONS='--max-old-space-size=6144' npx next build`;

  console.log(`⚡ Executing optimized build...`);

  execSync(buildCommand, {
    stdio: "inherit",
    maxBuffer: 1024 * 1024 * 16, // 16MB buffer (reduced for speed)
    cwd: process.cwd(),
    timeout: 180000, // 3min timeout (reduced)
  });

  const buildTime = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`\n✅ Production build completed in ${buildTime}s`);

  // Performance targets
  const targets = {
    excellent: 10, // <10s = Excellent
    good: 12, // <12s = Good
    acceptable: 15, // <15s = Acceptable
  };

  let performanceLevel;
  let emoji = "🎯";

  if (parseFloat(buildTime) <= targets.excellent) {
    performanceLevel = "EXCELLENT 🏆";
    emoji = "🏆";
  } else if (parseFloat(buildTime) <= targets.good) {
    performanceLevel = "GOOD ⚡";
    emoji = "⚡";
  } else if (parseFloat(buildTime) <= targets.acceptable) {
    performanceLevel = "ACCEPTABLE ✅";
    emoji = "✅";
  } else {
    performanceLevel = "NEEDS OPTIMIZATION ⚠️";
    emoji = "⚠️";
  }

  console.log(`${emoji} BUILD PERFORMANCE: ${performanceLevel}`);

  // Simple metrics
  const metrics = {
    timestamp: new Date().toISOString(),
    buildTime: parseFloat(buildTime),
    performanceLevel: performanceLevel,
    targetMet: parseFloat(buildTime) <= targets.good,
    workers: config.workers,
    memory: config.memory,
    success: true,
  };

  console.log("\n📊 Build Summary:");
  console.log(`   • Total Time: ${metrics.buildTime}s`);
  console.log(`   • Performance: ${metrics.performanceLevel}`);
  console.log(`   • Target <12s: ${metrics.targetMet ? "✅ Yes" : "❌ No"}`);
  console.log(`   • Workers: ${metrics.workers}`);

  // Save performance report
  const reportPath = path.join(
    process.cwd(),
    ".next",
    "build-performance.json",
  );
  try {
    fs.writeFileSync(reportPath, JSON.stringify(metrics, null, 2));
    console.log(`   • Report: ${reportPath}`);
  } catch (error) {
    // Report generation is optional
  }
} catch (error) {
  const buildTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.error(`\n❌ Build failed after ${buildTime}s:`, error.message);
  process.exit(1);
}

console.log("\n🚀 Production build optimizer completed!");
