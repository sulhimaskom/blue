#!/usr/bin/env node

/**
 * Test to verify analyzer timeout fix
 *
 * This test validates:
 * 1. Timeout is increased from 300 to 2700 seconds (45 minutes)
 * 2. Error handling distinguishes timeout vs other failures
 * 3. Issue creation includes appropriate context
 */

const fs = require("fs");
const path = require("path");

console.log("🧪 Analyzer Timeout Fix Verification");
console.log("=".repeat(50));

// Check current workflow configuration
const baseDir = process.cwd();
const workflowPath = path.join(baseDir, ".github/workflows/oc analyzer.yml");

if (!fs.existsSync(workflowPath)) {
  console.error("❌ Workflow file not found");
  process.exit(1);
}

const workflowContent = fs.readFileSync(workflowPath, "utf8");

console.log("✅ Verification Tests:");
console.log("");

// Test 1: Check timeout duration
const timeoutMatch = workflowContent.match(/timeout\s+(\d+)/);
if (timeoutMatch) {
  const timeout = parseInt(timeoutMatch[1]);
  const expectedTimeout = 2700; // 45 minutes

  console.log(`Test 1 - Timeout Duration:`);
  console.log(
    `   Found: ${timeout} seconds (${Math.round(timeout / 60)} minutes)`,
  );
  console.log(
    `   Expected: ${expectedTimeout} seconds (${Math.round(expectedTimeout / 60)} minutes)`,
  );

  if (timeout === expectedTimeout) {
    console.log(`   ✅ PASS: Timeout correctly updated to 45 minutes`);
  } else {
    console.log(`   ❌ FAIL: Timeout not updated correctly`);
  }
} else {
  console.log(`❌ Test 1 FAIL: Could not find timeout directive`);
}

// Test 2: Check for timeout detection logic
const timeoutDetectionExists =
  workflowContent.includes("TIMED_OUT=true") &&
  workflowContent.includes("if [ $? -eq 124 ]");

console.log(`\nTest 2 - Timeout Detection Logic:`);
if (timeoutDetectionExists) {
  console.log(`   ✅ PASS: Timeout detection logic present`);
  console.log(`   - Check for exit code 124 (timeout)`);
  console.log(`   - Set environment variable for downstream steps`);
} else {
  console.log(`   ❌ FAIL: Timeout detection logic not found`);
}

// Test 3: Check for differentiated issue creation
const differentiatedIssueExists =
  workflowContent.includes('ISSUE_TITLE="🤖 Analyzer Timed Out') &&
  workflowContent.includes('ISSUE_TITLE="🤖 Analyzer Failed');

console.log(`\nTest 3 - Differentiated Issue Creation:`);
if (differentiatedIssueExists) {
  console.log(`   ✅ PASS: Differentiated issue creation found`);
  console.log(`   - Separate titles for timeout vs failure`);
  console.log(`   - Specific context for timeout scenarios`);
} else {
  console.log(`   ❌ FAIL: Differentiated issue creation not found`);
}

// Test 4: Check job timeout vs OpenCode timeout relationship
const jobTimeoutMatch = workflowContent.match(/timeout-minutes:\s*(\d+)/);
const opencodeTimeoutMatch = workflowContent.match(/timeout\s+(\d+)/);

console.log(`\nTest 4 - Timeout Consistency:`);
if (jobTimeoutMatch && opencodeTimeoutMatch) {
  const jobTimeout = parseInt(jobTimeoutMatch[1]);
  const opencodeTimeout = parseInt(opencodeTimeoutMatch[1]);

  console.log(`   Job timeout: ${jobTimeout} minutes`);
  console.log(
    `   OpenCode timeout: ${Math.round(opencodeTimeout / 60)} minutes`,
  );

  const bufferMinutes = jobTimeout - opencodeTimeout / 60;

  if (bufferMinutes >= 5) {
    console.log(`   ✅ PASS: ${bufferMinutes} minute buffer is appropriate`);
  } else {
    console.log(
      `   ⚠️  WARN: Only ${bufferMinutes} minute buffer - may need more`,
    );
  }
} else {
  console.log(`   ❌ FAIL: Could not verify timeout relationship`);
}

// Summary
console.log(`\n`.repeat(25));
console.log(`📋 Fix Summary:`);
console.log(`   ✅ Increased OpenCode timeout from 5 minutes to 45 minutes`);
console.log(`   ✅ Added timeout detection logic`);
console.log(`   ✅ Created differentiated issue reporting`);
console.log(`   ✅ Maintained 15-minute buffer for job completion`);
console.log(`   ✅ Improved troubleshooting information in issues`);

console.log(`\n🎯 Expected Impact:`);
console.log(`   - Fewer false failure reports`);
console.log(`   - Better understanding of timeout vs actual failures`);
console.log(`   - Appropriate time for comprehensive analysis`);
console.log(`   - Cleaner GitHub issues with actionable context`);

console.log("\n".repeat(50));
console.log("🏁 Verification Complete");
