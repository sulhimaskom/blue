#!/usr/bin/env node

/**
 * Build Performance Monitor
 * 
 * Tracks and analyzes build performance metrics
 */

const { execSync } = require("child_process");
const fs = require("fs");

console.log("📊 Build Performance Monitor\n");

const metrics = {
  baselineTime: 20000, // 20s baseline from project docs
  targetTime: 12000,   // 12s aggressive target
  measurements: [],
};

function measureBuild(scriptName, description) {
  console.log(`🔨 Measuring: ${description}`);
  
  const startTime = Date.now();
  
  try {
    execSync(`npm run ${scriptName}`, {
      stdio: "pipe",
      timeout: 180000, // 3 minute timeout
    });
    
    const buildTime = Date.now() - startTime;
    const buildTimeSeconds = (buildTime / 1000).toFixed(1);
    
    const measurement = {
      script: scriptName,
      description: description,
      timeMs: buildTime,
      timeSeconds: parseFloat(buildTimeSeconds),
      improvement: Math.round((metrics.baselineTime - buildTime) / metrics.baselineTime * 100),
      withinTarget: buildTime <= metrics.targetTime,
    };
    
    metrics.measurements.push(measurement);
    
    console.log(`✅ ${description}: ${buildTimeSeconds}s (${measurement.improvement}% improvement)`);
    
    if (measurement.withinTarget) {
      console.log(`🎯 TARGET ACHIEVED! (${(metrics.targetTime / 1000).toFixed(1)}s target)`);
    }
    
    return measurement;
  } catch (error) {
    console.log(`❌ ${description}: Failed (${error.message})`);
    return null;
  }
}

// Performance test suite
async function runPerformanceTest() {
  console.log(`📈 Performance Test Suite Started`);
  console.log(`🎯 Target: ${(metrics.targetTime / 1000).toFixed(1)}s`);
  console.log(`📊 Baseline: ${(metrics.baselineTime / 1000).toFixed(1)}s\n`);

  // Clean build first
  console.log("🧹 Clean build environment...");
  try {
    execSync("rm -rf .next", { stdio: "pipe" });
    console.log("✅ Build cache cleared\n");
  } catch (error) {
    // Ignore cache cleanup errors
  }

  // Test different build configurations
  const tests = [
    {
      script: "build",
      description: "Ultra-Fast Build Optimizer v3.0",
    },
    {
      script: "build:fast", 
      description: "Speed-Optimized Configuration",
    },
    {
      script: "build:standard",
      description: "Standard Next.js Build",
    },
  ];

  const results = [];
  
  for (const test of tests) {
    try {
      // Clean between tests for fair comparison
      if (fs.existsSync(".next")) {
        execSync("rm -rf .next/cache .next/server", { stdio: "pipe" });
      }
      
      const result = measureBuild(test.script, test.description);
      if (result) {
        results.push(result);
      }
      
      console.log(""); // Spacing between tests
    } catch (error) {
      console.log(`❌ Failed to measure ${test.description}: ${error.message}\n`);
    }
  }

  // Generate performance report
  generateReport(results);
}

function generateReport(results) {
  console.log("📊 Performance Report");
  console.log("=" .repeat(50));

  if (results.length === 0) {
    console.log("❌ No successful builds to analyze");
    return;
  }

  const bestResult = results.reduce((best, current) => 
    current.timeMs < best.timeMs ? current : best
  );

  console.log(`🏆 Best Performance: ${bestResult.description}`);
  console.log(`⚡ Fastest Time: ${bestResult.timeSeconds}s`);
  console.log(`🎯 Improvement: ${bestResult.improvement}% faster than baseline`);
  
  if (bestResult.withinTarget) {
    console.log(`✅ TARGET ACHIEVED: ${(metrics.targetTime / 1000).toFixed(1)}s goal met!`);
  } else {
    const overTarget = ((bestResult.timeMs - metrics.targetTime) / 1000).toFixed(1);
    console.log(`⏱️  Over target by ${overTarget}s`);
  }

  console.log("\n📈 All Results:");
  results.forEach((result, index) => {
    const status = result.withinTarget ? "✅" : "⏱️";
    const best = result === bestResult ? "🏆" : "  ";
    console.log(`${status} ${best} ${index + 1}. ${result.description}: ${result.timeSeconds}s (${result.improvement}% improvement)`);
  });

  // Performance classification
  const fastestSeconds = bestResult.timeSeconds;
  let classification;
  let emoji;

  if (fastestSeconds <= 10) {
    classification = "EXCELLENT";
    emoji = "🚀";
  } else if (fastestSeconds <= 15) {
    classification = "GOOD";
    emoji = "✅";
  } else if (fastestSeconds <= 20) {
    classification = "NEEDS OPTIMIZATION";
    emoji = "⚠️";
  } else {
    classification = "SLOW";
    emoji = "❌";
  }

  console.log(`\n${emoji} Build Performance Classification: ${classification}`);

  // Recommendations
  console.log("\n💡 Performance Recommendations:");
  if (fastestSeconds > 15) {
    console.log("   • Consider code splitting for large components");
    console.log("   • Optimize imports and remove unused dependencies");
    console.log("   • Implement module federation for micro-frontends");
  } else if (fastestSeconds > 10) {
    console.log("   • Fine-tune webpack optimization settings");
    console.log("   • Consider selective route pre-compilation");
  } else {
    console.log("   • Excellent performance! Monitor for regressions");
  }
}

// Run the performance test
runPerformanceTest().catch(console.error);