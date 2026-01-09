#!/usr/bin/env node

/**
 * Reproduction case for Issue #178: AGENTS.md quality gate metrics update
 *
 * This script verifies the current quality gate metrics to ensure
 * AGENTS.md documentation matches the actual repository state.
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

console.log("🔍 Issue #178 Reproduction: AGENTS.md Quality Gate Metrics");
console.log("=".repeat(60));

function runCommand(cmd, description) {
  console.log(`\n📋 ${description}`);
  console.log(`⚡ Command: ${cmd}`);

  try {
    const output = execSync(cmd, { encoding: "utf8", cwd: process.cwd() });
    console.log(`✅ Success`);
    return output.trim();
  } catch (error) {
    console.log(`❌ Failed: ${error.message}`);
    return null;
  }
}

function parseBuildOutput(output) {
  if (!output) return { compileTime: null, staticPages: null };

  const compileMatch = output.match(/✓ Compiled successfully in ([\d.]+)s/);
  const pagesMatch = output.match(/Generating static pages \((\d+)\/(\d+)\)/);
  const finalPageMatch = output.match(
    /✓ Generating static pages \((\d+)\/(\d+)\)/,
  );

  return {
    compileTime: compileMatch ? parseFloat(compileMatch[1]) : null,
    staticPages: pagesMatch
      ? parseInt(pagesMatch[2])
      : finalPageMatch
        ? parseInt(finalPageMatch[2])
        : null,
  };
}

function parseTestOutput(output) {
  if (!output)
    return { suites: null, totalSuites: null, tests: null, totalTests: null };

  const suiteMatch = output.match(/Test Suites: (\d+) passed, (\d+) total/);
  const testMatch = output.match(/Tests: (\d+) passed, (\d+) total/);

  return {
    suites: suiteMatch ? parseInt(suiteMatch[1]) : null,
    totalSuites: suiteMatch ? parseInt(suiteMatch[2]) : null,
    tests: testMatch ? parseInt(testMatch[1]) : null,
    totalTests: testMatch ? parseInt(testMatch[2]) : null,
  };
}

// Run quality gate checks
console.log("\n🚀 Running Quality Gates...");

const auditOutput = runCommand("npm audit", "Security audit");
const buildOutput = runCommand("npm run build", "Build system");
const lintOutput = runCommand("npm run lint", "Lint compliance");
const typecheckOutput = runCommand("npm run typecheck", "Type safety");
const testOutput = runCommand("npm test --silent", "Test suite");

// Parse build and test results
const buildMetrics = parseBuildOutput(buildOutput);
const testMetrics = parseTestOutput(testOutput);

// Check if AGENTS.md has outdated metrics
console.log("\n🔍 Documentation Verification...");
console.log("=".repeat(60));

const agentsPath = path.join(process.cwd(), "AGENTS.md");
if (fs.existsSync(agentsPath)) {
  const agentsContent = fs.readFileSync(agentsPath, "utf8");

  // Look for the quality gate section
  const qualityGateSection = agentsContent.match(
    /2\. \*\*Quality Gate Verification\*\*: ALWAYS run these commands before starting work:([\s\S]*?)(?=\n\d+\.|\n###|\Z)/,
  );

  if (qualityGateSection) {
    const sectionContent = qualityGateSection[1];
    console.log("📖 Current AGENTS.md Quality Gate Section:");
    console.log("─".repeat(40));
    console.log(sectionContent.trim());
    console.log("─".repeat(40));

    // Check for outdated metrics
    const issues = [];

    if (
      sectionContent.includes("40 static pages") &&
      buildMetrics.staticPages !== 40
    ) {
      issues.push({
        type: "static_pages",
        documented: 40,
        actual: buildMetrics.staticPages,
        severity: "low",
      });
    }

    if (sectionContent.includes("44/44 suites") && testMetrics.suites !== 44) {
      issues.push({
        type: "test_suites",
        documented: "44/44",
        actual: `${testMetrics.suites}/${testMetrics.totalSuites}`,
        severity: "low",
      });
    }

    if (sectionContent.includes("645/645 tests") && testMetrics.tests !== 645) {
      issues.push({
        type: "test_count",
        documented: "645/645",
        actual: `${testMetrics.tests}/${testMetrics.totalTests}`,
        severity: "low",
      });
    }

    console.log("\n🎯 Analysis Results:");
    if (issues.length > 0) {
      console.log("🔴 Issues Found:");
      issues.forEach((issue) => {
        console.log(
          `   • ${issue.type.replace("_", " ").toUpperCase()}: Documented "${issue.documented}" vs Actual "${issue.actual}"`,
        );
      });
      console.log(
        "\n✅ Issue #178 Confirmed: AGENTS.md has outdated quality gate metrics",
      );
    } else {
      console.log("✅ No issues found - AGENTS.md metrics are up to date");
    }
  } else {
    console.log("❌ Could not find quality gate section in AGENTS.md");
  }
} else {
  console.log("❌ AGENTS.md file not found");
}

// Summary
console.log("\n📊 Current Repository Metrics:");
console.log("=".repeat(60));
console.log(
  `🔒 Security Vulnerabilities: ${auditOutput?.includes("0 vulnerabilities") ? "✅ 0" : "❌ Unknown"}`,
);
console.log(
  `🏗️  Build Time: ${buildMetrics.compileTime ? `${buildMetrics.compileTime}s` : "❌ Unknown"}`,
);
console.log(
  `📄 Static Pages: ${buildMetrics.staticPages ? `${buildMetrics.staticPages}` : "❌ Unknown"}`,
);
console.log(
  `🧪 Test Suites: ${testMetrics.suites ? `${testMetrics.suites}/${testMetrics.totalSuites}` : "❌ Unknown"}`,
);
console.log(
  `✅ Tests: ${testMetrics.tests ? `${testMetrics.tests}/${testMetrics.totalTests}` : "❌ Unknown"}`,
);
console.log(
  `🔍 TypeScript: ${typecheckOutput?.includes("error") ? "❌ Error" : "✅ Clean"}`,
);
console.log(
  `📋 Lint: ${lintOutput?.includes("No ESLint warnings") ? "✅ Clean" : "❌ Issues"}`,
);

console.log("\n🎯 Issue #178 Status:");
console.log("✅ Reproduction case created successfully");
console.log("📍 Location: scripts/reproduce-issue-178.js");
console.log("📋 Next Step: Update AGENTS.md with current metrics");
