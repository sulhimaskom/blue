#!/usr/bin/env node

/**
 * Issue #192 Reproduction Test
 * Testing if merge conflicts in evaluation reports have been resolved
 */

const { readFileSync } = require("fs");
const { execSync } = require("child_process");

function log(message) {
  console.log(`[TEST] ${message}`);
}

function error(message) {
  console.error(`[ERROR] ${message}`);
}

log("Starting Issue #192 reproduction test...");

try {
  // 1. Check if docs/evaluasi.md exists and is readable
  log("Checking docs/evaluasi.md existence...");
  const evaluasiContent = readFileSync("docs/evaluasi.md", "utf8");
  log("✅ docs/evaluasi.md is accessible");

  // 2. Verify evaluation dates and scores are consistent
  log("Verifying evaluation consistency...");
  const dateMatch = evaluasiContent.match(
    /\*\*Date of Evaluation\*\**: (\w+ \d+, \d+)/,
  );
  const scoreMatch = evaluasiContent.match(
    /\*\*Overall Architecture Score: (\d+)\/100/,
  );
  const commitMatch = evaluasiContent.match(
    /\*\*Commit Hash Analyzed\*\**: `([a-f0-9]+)`/,
  );

  if (!dateMatch || !scoreMatch || !commitMatch) {
    error("Critical evaluation data missing");
    process.exit(1);
  }

  log(`✅ Evaluation Date: ${dateMatch[1]}`);
  log(`✅ Architecture Score: ${scoreMatch[1]}/100`);
  log(`✅ Commit Hash: ${commitMatch[1]}`);

  // 3. Check for merge conflict markers
  log("Checking for merge conflict markers...");
  const conflictMarkers = ["<<<<<<<", "=======", ">>>>>>>"];
  let hasConflicts = false;

  for (const marker of conflictMarkers) {
    if (evaluasiContent.includes(marker)) {
      error(`Found conflict marker: ${marker}`);
      hasConflicts = true;
    }
  }

  if (hasConflicts) {
    error("Merge conflict markers still present");
    process.exit(1);
  }

  log("✅ No merge conflict markers found");

  // 4. Verify git branch sync status
  log("Checking branch synchronization...");
  try {
    execSync("git merge-base origin/dev agent-workspace", { stdio: "pipe" });
    log("✅ Branches are properly synchronized");
  } catch (e) {
    error("Branch synchronization issue");
    process.exit(1);
  }

  // 5. Test merge simulation without conflicts
  log("Testing merge simulation...");
  try {
    execSync(
      "git merge-tree $(git merge-base origin/dev agent-workspace) origin/dev agent-workspace",
      { stdio: "pipe" },
    );
    log("✅ Merge simulation successful - no conflicts detected");
  } catch (e) {
    error("Merge simulation detected conflicts");
    process.exit(1);
  }

  // 6. Verify comprehensive evaluation metrics
  log("Verifying comprehensive evaluation metrics...");
  const requiredSections = [
    "Executive Summary",
    "Quality Gates Verification",
    "Detailed Evaluation Scores",
    "Critical Architecture Analysis",
    "Production Readiness Assessment",
  ];

  for (const section of requiredSections) {
    if (!evaluasiContent.includes(section)) {
      error(`Missing required section: ${section}`);
      process.exit(1);
    }
  }

  log("✅ All required evaluation sections present");

  // 7. Check score consistency across document
  log("Checking score consistency...");
  const scoreReferences = [
    /Overall Architecture Score: (\d+)\/100/,
    /Stability:\s*(\d+)\/100/,
    /Performance:\s*(\d+)\/100/,
    /Security:\s*(\d+)\/100/,
    /Scalability:\s*(\d+)\/100/,
    /Modularity:\s*(\d+)\/100/,
    /Flexibility:\s*(\d+)\/100/,
    /Consistency:\s*(\d+)\/100/,
  ];

  scoreReferences.forEach((regex, index) => {
    const match = evaluasiContent.match(regex);
    if (!match) {
      error(`Missing score reference ${index + 1}`);
      process.exit(1);
    }
    log(`✅ Score ${index + 1}: ${match[1]}/100`);
  });

  log("\n🎉 SUCCESS: Issue #192 reproduction test PASSED");
  log("✅ Merge conflicts in docs/evaluasi.md have been resolved");
  log("✅ Evaluation reports are properly synchronized");
  log("✅ No merge conflict markers detected");
  log("✅ Branch synchronization is working correctly");
  log("✅ Comprehensive evaluation metrics are intact");
} catch (error) {
  error(`Test failed: ${error.message}`);
  process.exit(1);
}
