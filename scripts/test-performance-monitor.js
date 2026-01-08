/**
 * Test Performance Monitoring Script
 * Measures test execution performance and provides optimization recommendations
 *
 * Usage: node scripts/test-performance-monitor.js
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// Performance thresholds
const THRESHOLDS = {
  maxExecutionTime: 8000, // 8 seconds
  maxMemoryUsage: 500, // 500MB
  minTestCoverage: 95, // 95% coverage requirement
};

/**
 * Runs tests and measures performance
 */
async function runPerformanceAudit() {
  console.log("🔍 Running Test Performance Audit...\n");

  // Measure test execution time
  const startTime = Date.now();

  try {
    // Run tests with verbose output to get timing and memory data
    const testOutput = execSync(
      "npm test --silent -- --detectOpenHandles --logHeapUsage --verbose",
      {
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
        timeout: 60000, // 60 second timeout
      },
    );

    const executionTime = Date.now() - startTime;

    // Analyze test output
    const analysis = analyzeTestOutput(testOutput, executionTime);

    // Generate performance report
    generatePerformanceReport(analysis);

    // Update performance metrics file
    updatePerformanceMetrics(analysis);

    return analysis;
  } catch (error) {
    console.error("❌ Test performance audit failed:", error.message);
    process.exit(1);
  }
}

/**
 * Analyzes test output for performance metrics
 */
function analyzeTestOutput(output, executionTime) {
  const lines = output.split("\n");
  const testSuites = [];
  let currentTest = null;
  let maxHeapSize = 0;
  let totalTests = 0;
  let totalPassed = 0;
  let totalFailed = 0;

  // Parse test output
  for (const line of lines) {
    // Extract test suite completion with memory usage
    const testMatch = line.match(/^PASS\s+(.+?)\s+\((\d+)\s+MB heap size\)$/);
    const failMatch = line.match(/^FAIL\s+(.+?)\s+\((\d+)\s+MB heap size\)$/);

    if (testMatch || failMatch) {
      const [_, testName, heapSize] = testMatch || failMatch;
      const heapSizeMB = parseInt(heapSize);
      const passed = !!testMatch;

      maxHeapSize = Math.max(maxHeapSize, heapSizeMB);

      testSuites.push({
        name: testName,
        heapSize: heapSizeMB,
        passed,
        executionTime: 0, // Individual timing not available, will calculate later
      });

      if (passed) totalPassed++;
      else totalFailed++;
    }

    // Extract summary information
    const summaryMatch = line.match(
      /Test Suites:\s+(\d+)\s+failed?,\s+(\d+)\s+total/,
    );
    if (summaryMatch) {
      totalFailed = parseInt(summaryMatch[1]);
    }

    const testsMatch = line.match(/Tests:\s+(\d+)\s+passed?,\s+(\d+)\s+total/);
    if (testsMatch) {
      totalPassed = parseInt(testsMatch[1]);
      totalTests = parseInt(testsMatch[2]);
    }

    // Extract total execution time
    const timeMatch = line.match(/Time:\s+([\d.]+)\s*s/i);
    if (timeMatch) {
      totalTests = executionTime;
    }
  }

  const passed = totalFailed === 0;
  const passRate = totalTests > 0 ? (totalPassed / totalTests) * 100 : 0;

  return {
    executionTime,
    maxHeapSize,
    testSuites,
    passed,
    passRate,
    totalTests,
    totalPassed,
    totalFailed,
    testCount: testSuites.length,
    performanceScore: calculatePerformanceScore(
      executionTime,
      maxHeapSize,
      passRate,
    ),
    recommendations: generateRecommendations(
      executionTime,
      maxHeapSize,
      passRate,
      testSuites,
    ),
  };
}

/**
 * Calculates performance score (0-100)
 */
function calculatePerformanceScore(executionTime, maxHeapSize, passRate) {
  const timeScore = Math.max(
    0,
    100 - (executionTime / THRESHOLDS.maxExecutionTime) * 50,
  );
  const memoryScore = Math.max(
    0,
    100 - (maxHeapSize / THRESHOLDS.maxMemoryUsage) * 30,
  );
  const qualityScore = passRate;

  return Math.round((timeScore + memoryScore + qualityScore) / 3);
}

/**
 * Generates performance recommendations
 */
function generateRecommendations(
  executionTime,
  maxHeapSize,
  passRate,
  testSuites,
) {
  const recommendations = [];

  if (executionTime > THRESHOLDS.maxExecutionTime) {
    recommendations.push({
      priority: "HIGH",
      category: "Performance",
      issue: `Test execution time (${executionTime}ms) exceeds threshold (${THRESHOLDS.maxExecutionTime}ms)`,
      suggestions: [
        "Consider running tests in parallel with increased maxWorkers",
        "Optimize slow test suites by using more efficient mocking",
        "Consider test splitting or implementation optimization",
      ],
    });
  }

  if (maxHeapSize > THRESHOLDS.maxMemoryUsage) {
    recommendations.push({
      priority: "MEDIUM",
      category: "Memory",
      issue: `Memory usage (${maxHeapSize}MB) exceeds threshold (${THRESHOLDS.maxMemoryUsage}MB)`,
      suggestions: [
        "Optimize memory-intensive tests with better cleanup",
        "Use jest.clearAllMocks() in test teardown",
        "Consider lazy loading large dependencies in tests",
      ],
    });
  }

  // Find the most memory-intensive tests
  const memoryIntensiveTests = testSuites
    .sort((a, b) => b.heapSize - a.heapSize)
    .slice(0, 3);

  if (
    memoryIntensiveTests.length > 0 &&
    memoryIntensiveTests[0].heapSize > 200
  ) {
    recommendations.push({
      priority: "LOW",
      category: "Optimization",
      issue: "High memory usage in specific test suites",
      suggestions: [
        `Focus optimization on: ${memoryIntensiveTests.map((t) => t.name).join(", ")}`,
        "Consider these tests for memory optimization first",
      ],
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      priority: "INFO",
      category: "Performance",
      issue: "Excellent performance metrics",
      suggestions: [
        "Consider enabling additional test coverage",
        "Monitor performance trends over time",
        "Current configuration is optimal for CI/CD",
      ],
    });
  }

  return recommendations;
}

/**
 * Generates and displays performance report
 */
function generatePerformanceReport(analysis) {
  console.log("\n📊 TEST PERFORMANCE REPORT");
  console.log("=".repeat(50));

  // Overall metrics
  console.log(
    `\n🎯 Overall Performance Score: ${analysis.performanceScore}/100`,
  );
  console.log(
    `⏱️  Execution Time: ${analysis.executionTime}ms ${analysis.executionTime > THRESHOLDS.maxExecutionTime ? "⚠️" : "✅"}`,
  );
  console.log(
    `💾 Peak Memory Usage: ${analysis.maxHeapSize}MB ${analysis.maxHeapSize > THRESHOLDS.maxMemoryUsage ? "⚠️" : "✅"}`,
  );
  console.log(`✅ Test Success Rate: ${analysis.passRate.toFixed(1)}%`);
  console.log(
    `📋 Test Suites: ${analysis.testCount} (${analysis.totalPassed} passed, ${analysis.totalFailed} failed)`,
  );

  // Recommendations
  console.log("\n💡 RECOMMENDATIONS");
  console.log("-".repeat(30));

  analysis.recommendations.forEach((rec, index) => {
    const icon =
      rec.priority === "HIGH" ? "🔴" : rec.priority === "MEDIUM" ? "🟡" : "🟢";
    console.log(`\n${icon} [${rec.priority}] ${rec.category}: ${rec.issue}`);
    rec.suggestions.forEach((suggestion) => {
      console.log(`   → ${suggestion}`);
    });
  });

  console.log("\n" + "=".repeat(50));
}

/**
 * Updates performance metrics history
 */
function updatePerformanceMetrics(analysis) {
  const metricsFile = path.join(
    __dirname,
    "../docs/test-performance-metrics.json",
  );
  let history = [];

  // Load existing history
  if (fs.existsSync(metricsFile)) {
    try {
      history = JSON.parse(fs.readFileSync(metricsFile, "utf8"));
    } catch (error) {
      console.warn(
        "Warning: Could not load existing metrics file, starting fresh",
      );
    }
  }

  // Add current snapshot
  const snapshot = {
    timestamp: new Date().toISOString(),
    executionTime: analysis.executionTime,
    maxHeapSize: analysis.maxHeapSize,
    performanceScore: analysis.performanceScore,
    passRate: analysis.passRate,
    testCount: analysis.testCount,
    recommendations: analysis.recommendations.filter(
      (r) => r.priority !== "INFO",
    ).length,
  };

  history.push(snapshot);

  // Keep only last 30 entries
  if (history.length > 30) {
    history = history.slice(-30);
  }

  // Save updated history
  fs.writeFileSync(metricsFile, JSON.stringify(history, null, 2));

  // Calculate trends
  if (history.length > 1) {
    const previous = history[history.length - 2];
    const timeDiff = analysis.executionTime - previous.executionTime;
    const memoryDiff = analysis.maxHeapSize - previous.maxHeapSize;
    const scoreDiff = analysis.performanceScore - previous.performanceScore;

    console.log("\n📈 PERFORMANCE TRENDS (since last run)");
    console.log(`⏱️  Execution Time: ${timeDiff > 0 ? "+" : ""}${timeDiff}ms`);
    console.log(`💾 Memory Usage: ${memoryDiff > 0 ? "+" : ""}${memoryDiff}MB`);
    console.log(
      `🎯 Performance Score: ${scoreDiff > 0 ? "+" : ""}${scoreDiff} points`,
    );
  }
}

// Run the performance audit
if (require.main === module) {
  runPerformanceAudit()
    .then(() => {
      console.log("\n✅ Test performance audit completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Test performance audit failed:", error.message);
      process.exit(1);
    });
}

module.exports = { runPerformanceAudit, THRESHOLDS };
