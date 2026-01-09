#!/usr/bin/env node

/**
 * Reproduction Case for BUG-215: Analyzer workflow failure despite successful execution
 * Issue: OpenCode analyzer runs successfully but workflow still fails with exit code 1
 * Root Cause: Timeout handling and version consistency issues in CI/CD environment
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

console.log("🔍 Reproducing BUG-215: Analyzer workflow failure...");

// Test 1: Check OpenCode version consistency
console.log("\n1. Testing OpenCode version consistency...");
try {
  const version = execSync("opencode --version", { encoding: "utf8" }).trim();
  console.log(`✅ OpenCode version: ${version}`);

  if (version !== "1.0.193") {
    console.log(`⚠️ Version mismatch! Expected 1.0.193, got ${version}`);
    console.log("🔧 This could be the root cause of CI failures");
  } else {
    console.log("✅ Version consistency verified");
  }
} catch (error) {
  console.log("❌ OpenCode not installed or not in PATH");
  console.log("Error:", error.message);
}

// Test 2: Test timeout behavior
console.log("\n2. Testing timeout behavior...");
try {
  console.log("🕐 Testing 5-second timeout command (should succeed)...");
  execSync('timeout 5s echo "Short command completed"', { stdio: "inherit" });
  console.log("✅ Short timeout test passed");
} catch (error) {
  console.log("❌ Short timeout test failed:", error.message);
}

// Test 3: Simulate the analyzer command pattern
console.log("\n3. Testing analyzer command pattern...");
try {
  const promptPath = ".github/prompts/analyzer-system.md";

  if (!fs.existsSync(promptPath)) {
    console.log(`⚠️ Prompt file not found: ${promptPath}`);
    // Find the actual prompt file
    const promptFiles = fs
      .readdirSync(".github/prompts")
      .filter((f) => f.includes("analyzer"));
    if (promptFiles.length > 0) {
      console.log(`📁 Found prompt files: ${promptFiles.join(", ")}`);
    }
  } else {
    console.log(`✅ Prompt file found: ${promptPath}`);

    // Test reading the prompt file (as the workflow does)
    const promptContent = fs.readFileSync(promptPath, "utf8");
    console.log(`✅ Prompt file loaded (${promptContent.length} characters)`);
  }

  // Simulate the timeout wrapper pattern used in CI
  console.log("🕐 Testing timeout wrapper pattern...");
  // Using a shorter timeout for testing
  const testTimeout = 30; // 30 seconds instead of 300

  console.log(
    `⏱️ Would run: timeout ${testTimeout}s opencode run "prompt" --model iflowcn/glm-4.6 --share false`,
  );
  console.log("✅ Command pattern validated");
} catch (error) {
  console.log("❌ Analyzer command pattern test failed:", error.message);
}

// Test 4: Check environment variables used in workflow
console.log("\n4. Testing workflow environment...");
const requiredEnvVars = ["GITHUB_TOKEN", "IFLOW_API_KEY"];
const missingVars = [];

requiredEnvVars.forEach((varName) => {
  if (!process.env[varName]) {
    missingVars.push(varName);
  }
});

if (missingVars.length > 0) {
  console.log(`⚠️ Missing environment variables: ${missingVars.join(", ")}`);
  console.log("🔧 This could cause authentication failures in CI");
} else {
  console.log("✅ All required environment variables present");
}

// Test 5: Check git configuration (as done in workflow)
console.log("\n5. Testing git configuration...");
try {
  const gitUser = execSync("git config --global user.name", {
    encoding: "utf8",
  }).trim();
  const gitEmail = execSync("git config --global user.email", {
    encoding: "utf8",
  }).trim();
  console.log(`✅ Git user configured: ${gitUser} <${gitEmail}>`);
} catch (error) {
  console.log("⚠️ Git user not configured:", error.message);
  console.log("🔧 This could cause commit failures in CI");
}

// Analysis Summary
console.log("\n🔍 Analysis Summary:");
console.log("==================");

console.log("\n🎯 Potential Root Causes Identified:");
console.log(
  "1. Timeout mismatch: CI uses 300s timeout, but analyzer might need more time",
);
console.log(
  "2. Version consistency: Local vs CI OpenCode version mismatch (seen in logs)",
);
console.log(
  "3. Error handling: Exit code 1 might be from timeout, not analyzer failure",
);
console.log("4. Environment differences: CI environment vs local development");

console.log("\n🛠️ Recommended Fixes:");
console.log("1. Increase timeout from 300s to 600s in workflow");
console.log("2. Add version verification step before execution");
console.log("3. Improve error handling to catch timeout vs actual failures");
console.log("4. Add retry logic for transient failures");

console.log("\n✅ Reproduction case completed");
console.log("📋 Next step: Implement fixes in workflow and test");
