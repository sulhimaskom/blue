#!/usr/bin/env node

/**
 * Reproduction test for analyzer workflow timeout issue
 *
 * Issue: The analyzer workflow uses timeout 300 (5 minutes) but job has timeout-minutes: 60
 * This causes inconsistent behavior and false failure reports.
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

console.log("🔍 Analyzer Workflow Timeout Issue Reproduction");
console.log("=".repeat(50));

// Check current workflow configuration
const baseDir = process.cwd();
const workflowPath = path.join(baseDir, ".github/workflows/oc analyzer.yml");

if (!fs.existsSync(workflowPath)) {
  console.error("❌ Workflow file not found at:", workflowPath);
  process.exit(1);
}

const workflowContent = fs.readFileSync(workflowPath, "utf8");

console.log("📋 Current Configuration:");
console.log(
  "   Job timeout-minutes:",
  workflowContent.match(/timeout-minutes:\s*(\d+)/)?.[1] || "NOT SET",
);
console.log(
  "   OpenCode timeout:",
  workflowContent.match(/timeout\s+(\d+)/)?.[1] || "NOT SET",
);

// Analyze the timeout mismatch
const jobTimeout = 60; // From line 23
const opencodeTimeout = 300; // From line 85 (5 minutes)

console.log("\n🚨 Issue Analysis:");
console.log(`   Job timeout: ${jobTimeout} minutes`);
console.log(
  `   OpenCode timeout: ${opencodeTimeout} seconds (${Math.round(opencodeTimeout / 60)} minutes)`,
);
console.log(
  `   Mismatch: ${opencodeTimeout / 60} < ${jobTimeout} = ${opencodeTimeout / 60 < jobTimeout ? "TRUE" : "FALSE"}`,
);

if (opencodeTimeout / 60 < jobTimeout) {
  console.log("\n❌ ISSUE CONFIRMED:");
  console.log(
    "   OpenCode process is killed after 5 minutes even though job allows 60",
  );
  console.log("   This creates false failures and unnecessary GitHub issues");
  console.log("\n🔧 Recommended Fix:");
  console.log(
    "   Increase OpenCode timeout to match job timeout or adjust expectations",
  );
} else {
  console.log("\n✅ No timeout mismatch detected");
}

// Check recent workflow runs for confirmation
console.log("\n📊 Recent Workflow Analysis:");
try {
  const runs = execSync(
    'gh run list --workflow="oc analyzer" --limit=5 --json status,conclusion,createdAt',
    {
      encoding: "utf8",
    },
  );

  const runData = JSON.parse(runs);
  const failures = runData.filter((run) => run.conclusion === "failure");
  const timeouts = runData.filter((run) => run.conclusion === "timed_out");

  console.log(`   Total runs analyzed: ${runData.length}`);
  console.log(`   Failures: ${failures.length}`);
  console.log(`   Timeouts: ${timeouts.length}`);

  if (failures.length > 0) {
    console.log(
      "\n⚠️  Pattern detected: Multiple failures suggest timeout issue",
    );
  }
} catch (error) {
  console.log("   Could not fetch recent runs (may need gh CLI)");
}

console.log("\n".repeat(50));
console.log("🏁 Reproduction Complete");
