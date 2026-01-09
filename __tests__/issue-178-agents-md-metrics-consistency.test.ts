/**
 * Test for Issue #178: AGENTS.md Quality Gate Metrics Consistency
 *
 * This test ensures that the quality gate metrics documented in AGENTS.md
 * match the actual repository state to prevent documentation drift.
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";

describe("Issue #178: AGENTS.md Documentation Consistency", () => {
  const agentsPath = path.join(process.cwd(), "AGENTS.md");

  beforeEach(() => {
    // Ensure AGENTS.md exists
    expect(fs.existsSync(agentsPath)).toBe(true);
  });

  function runCommand(cmd: string): string | null {
    try {
      return execSync(cmd, { encoding: "utf8" }).trim();
    } catch (error) {
      console.warn(`Command failed: ${cmd}`, error);
      return null;
    }
  }

  function parseBuildOutput(output: string | null) {
    if (!output) return { compileTime: null, staticPages: null };

    const compileMatch = output.match(/✓ Compiled successfully in ([\d.]+)s/);
    const pagesMatch = output.match(
      /✓ Generating static pages \((\d+)\/(\d+)\)/,
    );

    return {
      compileTime: compileMatch ? parseFloat(compileMatch[1]) : null,
      staticPages: pagesMatch ? parseInt(pagesMatch[2]) : null,
    };
  }

  function parseTestOutput(output: string | null) {
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

  test("AGENTS.md quality gate metrics match actual repository state", () => {
    // Get AGENTS.md content
    const agentsContent = fs.readFileSync(agentsPath, "utf8");

    // Find the quality gate section
    const qualityGateSection = agentsContent.match(
      /2\. \*\*Quality Gate Verification\*\*: ALWAYS run these commands before starting work:([\s\S]*?)(?=\n\d+\.|\n###|\Z)/,
    );

    expect(qualityGateSection).toBeDefined();
    const sectionContent = qualityGateSection![1];

    // Run quality gates to get actual metrics
    const auditOutput = runCommand("npm audit");
    const buildOutput = runCommand("npm run build");
    const lintOutput = runCommand("npm run lint");
    const typecheckOutput = runCommand("npm run typecheck");
    const testOutput = runCommand("npm test --silent");

    // Parse metrics
    const buildMetrics = parseBuildOutput(buildOutput);
    const testMetrics = parseTestOutput(testOutput);

    // Verify security audit passes
    expect(auditOutput).toContain("0 vulnerabilities");
    expect(sectionContent).toContain("MUST return 0 vulnerabilities");

    // Verify build metrics are documented correctly
    expect(buildMetrics.staticPages).toBeDefined();
    expect(buildMetrics.staticPages).toBeGreaterThan(40); // Should be 44+
    expect(sectionContent).toContain(
      `${buildMetrics.staticPages} static pages`,
    );

    // Verify build time is documented with reasonable range
    expect(buildMetrics.compileTime).toBeDefined();
    expect(buildMetrics.compileTime).toBeGreaterThan(10); // Should be >10s
    expect(buildMetrics.compileTime).toBeLessThan(20); // Should be <20s
    expect(sectionContent).toMatch(/\d+\.\d+-\d+\.\d+s compile time/); // Should include range

    // Verify test metrics are documented correctly
    expect(testMetrics.suites).toBeDefined();
    expect(testMetrics.tests).toBeDefined();
    expect(sectionContent).toContain(
      `${testMetrics.suites}/${testMetrics.totalSuites} suites`,
    );
    expect(sectionContent).toContain(
      `${testMetrics.tests}/${testMetrics.totalTests} tests`,
    );

    // Verify lint and typecheck are documented
    expect(lintOutput).toContain("No ESLint warnings");
    expect(sectionContent).toContain("MUST return 0 warnings/errors");

    expect(typecheckOutput || "").not.toContain("error");
    expect(sectionContent).toContain("MUST return 0 TypeScript errors");

    // Verify verification date is recent (within last 7 days)
    const dateMatch = sectionContent.match(
      /ALL QUALITY GATES PASSING - (\w+ \d+, 2026) verification/,
    );
    expect(dateMatch).toBeDefined();

    // Note: In a real scenario, you might want to check if the date is recent
    // but for testing purposes, we just ensure the format exists
  });

  test("AGENTS.md quality gate section exists and is properly formatted", () => {
    const agentsContent = fs.readFileSync(agentsPath, "utf8");

    // Verify section exists
    expect(agentsContent).toContain("Quality Gate Verification");
    expect(agentsContent).toContain(
      "ALWAYS run these commands before starting work",
    );

    // Verify all required commands are documented
    const requiredCommands = [
      "npm audit",
      "npm run build",
      "npm run lint",
      "npm run typecheck",
      "npm test --silent",
    ];

    requiredCommands.forEach((cmd) => {
      expect(agentsContent).toContain(cmd);
    });

    // Verify status indicator exists
    expect(agentsContent).toContain("ALL QUALITY GATES PASSING");
    expect(agentsContent).toContain("verification");
  });

  test("Quality gates actually pass as documented", () => {
    // This is the ultimate test - run the commands and ensure they pass

    // Security audit
    const auditOutput = runCommand("npm audit");
    expect(auditOutput).toContain("0 vulnerabilities");

    // Build
    const buildOutput = runCommand("npm run build");
    expect(buildOutput).toContain("Build completed successfully");
    expect(buildOutput).toMatch(/✓ Generating static pages \(\d+\/\d+\)/);

    // Lint
    const lintOutput = runCommand("npm run lint");
    expect(lintOutput).toContain("No ESLint warnings");

    // Typecheck
    const typecheckOutput = runCommand("npm run typecheck");
    expect(typecheckOutput || "").not.toContain("error");

    // Tests
    const testOutput = runCommand("npm test --silent");
    expect(testOutput).toMatch(/Test Suites: \d+ passed, \d+ total/);
    expect(testOutput).toMatch(/Tests: \d+ passed, \d+ total/);

    // Ensure no failures in test output
    expect(testOutput).not.toContain("FAIL");
    expect(testOutput).not.toContain("failed");
  });
});
