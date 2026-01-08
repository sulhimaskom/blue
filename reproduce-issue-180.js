#!/usr/bin/env node

/**
 * Reproduction Case: Repository Branch Hygiene Issue #180
 *
 * This script identifies and reports stale branches that impact repository cleanliness.
 * Issue: Multiple fix-* and analyzer-* branches exist that appear abandoned or completed.
 * Impact: Low - Repository hygiene, potential confusion.
 * Root Cause: Branches not cleaned up after PR completion or abandonment.
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// ANSI color codes for output
const colors = {
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  green: "\x1b[32m",
  blue: "\x1b[34m",
  reset: "\x1b[0m",
  bold: "\x1b[1m",
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

function execCommand(cmd) {
  try {
    return execSync(cmd, { encoding: "utf8" }).trim();
  } catch (error) {
    return "";
  }
}

function checkBranchHealth() {
  log(colors.blue, "\n=== REPOSITORY BRANCH HYGIENE ANALYSIS ===\n");

  // Get all remote branches matching problematic patterns
  const staleBranches = execCommand(
    'git branch -r | grep -E "(origin/(fix-|analyzer-))" | sed "s/^[ \\t]*//"',
  );

  if (!staleBranches) {
    log(colors.green, "✅ No stale fix- or analyzer- branches found");
    return { status: "clean", issues: [] };
  }

  const branches = staleBranches.split("\n").filter((b) => b.trim());
  const issues = [];

  log(colors.yellow, `Found ${branches.length} potentially stale branches:`);

  for (const branch of branches) {
    const branchName = branch.replace("origin/", "");

    // Check if branch has associated PR
    const prStatus = execCommand(
      `gh pr list --head "${branchName}" --json state,title 2>/dev/null || echo "NO_PR"`,
    );

    // Check last commit date
    const lastCommit = execCommand(
      `git log "origin/${branchName}" --oneline -1 --format="%cr %h %s" 2>/dev/null || echo "NOT_FOUND"`,
    );

    // Check if it's already merged
    const isMerged = execCommand(
      `git merge-base --is-ancestor origin/${branchName} origin/dev 2>/dev/null && echo "MERGED" || echo "NOT_MERGED"`,
    );

    const issue = {
      branch: branchName,
      prStatus: prStatus.includes("NO_PR") ? "NO_PR" : "HAS_PR",
      lastCommit,
      isMerged: isMerged.includes("MERGED"),
      safeToDelete: isMerged.includes("MERGED") || prStatus.includes("NO_PR"),
    };

    issues.push(issue);

    // Report findings
    log(colors.red, `\n📋 Branch: ${branchName}`);
    log(colors.reset, `   PR Status: ${issue.prStatus}`);
    log(colors.reset, `   Last Commit: ${issue.lastCommit}`);
    log(colors.reset, `   Merged: ${issue.isMerged}`);

    if (issue.safeToDelete) {
      log(colors.green, `   ✅ Safe to delete`);
    } else {
      log(colors.yellow, `   ⚠️  Requires review`);
    }
  }

  return { status: "needs_cleanup", issues };
}

function generateCleanupPlan(issues) {
  log(colors.blue, "\n=== SURGICAL CLEANUP PLAN ===\n");

  const safeToDelete = issues.filter((issue) => issue.safeToDelete);
  const needsReview = issues.filter((issue) => !issue.safeToDelete);

  if (safeToDelete.length > 0) {
    log(colors.green, "\n✅ SAFE TO DELETE (Immediate action):");
    safeToDelete.forEach((issue) => {
      log(colors.reset, `   git push origin --delete ${issue.branch}`);
    });
  }

  if (needsReview.length > 0) {
    log(colors.yellow, "\n⚠️  REQUIRES REVIEW:");
    needsReview.forEach((issue) => {
      log(colors.reset, `   ${issue.branch} - Check PR status before deletion`);
    });
  }

  return { safeToDelete, needsReview };
}

// Main execution
function main() {
  log(
    colors.bold,
    colors.blue,
    "REPRODUCING ISSUE #180: Repository Branch Hygiene",
  );

  const result = checkBranchHealth();

  if (result.status === "clean") {
    log(
      colors.green,
      "\n✅ REPRODUCTION CASE FAILED: No branch hygiene issues found",
    );
    process.exit(0);
  }

  log(
    colors.red,
    "\n🔴 REPRODUCTION CASE CONFIRMED: Repository hygiene issues detected",
  );

  const cleanupPlan = generateCleanupPlan(result.issues);

  log(colors.yellow, `\n📊 SUMMARY:`);
  log(colors.reset, `   Total stale branches: ${result.issues.length}`);
  log(colors.reset, `   Safe to delete: ${cleanupPlan.safeToDelete.length}`);
  log(colors.reset, `   Requires review: ${cleanupPlan.needsReview.length}`);

  if (cleanupPlan.safeToDelete.length > 0) {
    log(colors.green, "\n✅ ISSUE REPRODUCED: Ready for surgical fix");
    process.exit(1); // Exit with error to indicate issue confirmed
  }
}

if (require.main === module) {
  main();
}
