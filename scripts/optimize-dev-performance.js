#!/usr/bin/env node

/**
 * Development Performance Optimization Script
 *
 * Optimizes the development environment for faster builds and better performance:
 * - Clears Next.js cache selectively
 * - Optimizes node_modules for faster imports
 * - Sets up development environment variables
 * - Provides performance profiling options
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const COLORS = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

function log(message, color = "reset") {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function clearNextCache() {
  log("🧹 Clearing Next.js cache...", "yellow");

  const nextDir = path.join(process.cwd(), ".next");
  if (fs.existsSync(nextDir)) {
    // Keep only essential cache files for faster startup
    const keepPatterns = ["cache", "trace"];

    const files = fs.readdirSync(nextDir);
    files.forEach((file) => {
      const shouldKeep = keepPatterns.some((pattern) => file.includes(pattern));
      if (!shouldKeep && fs.statSync(path.join(nextDir, file)).isDirectory()) {
        fs.rmSync(path.join(nextDir, file), { recursive: true, force: true });
        log(`  ✓ Removed: ${file}`, "green");
      }
    });
  }

  log("✅ Next.js cache optimized", "green");
}

function optimizeNodeModules() {
  log("📦 Optimizing node_modules...", "yellow");

  try {
    // Run npm dedupe to optimize dependencies
    execSync("npm dedupe", { stdio: "pipe" });
    log("  ✓ Dependencies optimized", "green");
  } catch (error) {
    log("  ⚠ npm dedupe failed (non-critical)", "yellow");
  }
}

function setupDevEnv() {
  log("🔧 Setting up development environment...", "yellow");

  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) {
    const devEnv = `# Development Performance Optimizations
NEXT_TELEMETRY_DISABLED=1
NODE_OPTIONS=--max-old-space-size=4096
`;
    fs.writeFileSync(envPath, devEnv);
    log("  ✓ Created .env.local with performance settings", "green");
  } else {
    log("  ✓ .env.local already exists", "blue");
  }
}

function checkSystemResources() {
  log("🖥️  Checking system resources...", "yellow");

  const memInfo = execSync("free -m", { encoding: "utf8" });
  const memLines = memInfo.split("\n");
  const memLine = memLines[1].split(/\s+/);
  const totalMem = parseInt(memLine[1]);
  const availableMem = parseInt(memLine[6]);

  log(`  Memory: ${availableMem}MB available / ${totalMem}MB total`, "blue");

  if (availableMem < 2048) {
    log(
      "  ⚠️ Low memory detected - consider closing other applications",
      "yellow",
    );
  } else {
    log("  ✓ Sufficient memory available", "green");
  }
}

function provideDevTips() {
  log("\n💡 Development Performance Tips:", "cyan");
  log('  • Use "npm run dev:perf" for Turbopack (faster updates)', "blue");
  log('  • Use "npm run build:clean" for fresh builds when needed', "blue");
  log("  • Restart dev server if memory usage exceeds 2GB", "blue");
  log(
    '  • Consider using "NODE_OPTIONS=--max-old-space-size=4096 npm run dev"',
    "blue",
  );
  log("\n📊 Performance Commands:", "cyan");
  log("  • npm run build:analyze - Analyze bundle size", "blue");
  log("  • npm run dev:perf - Turbopack development mode", "blue");
  log("  • npm run optimize-db - Database performance optimization", "blue");
}

function main() {
  log("🚀 Development Performance Optimization", "bright");
  log("=".repeat(50), "cyan");

  try {
    clearNextCache();
    optimizeNodeModules();
    setupDevEnv();
    checkSystemResources();
    provideDevTips();

    log("\n✨ Development environment optimized!", "green");
    log(
      '   Run "npm run dev:perf" for the fastest development experience',
      "cyan",
    );
  } catch (error) {
    log(`❌ Error: ${error.message}`, "red");
    process.exit(1);
  }
}

// Run the optimization
main();
