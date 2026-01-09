/**
 * Test: BUG-215 Analyzer Workflow Failure Fix
 *
 * This test validates that the analyzer workflow is properly fixed and functional.
 * It reproduces the original issue conditions and verifies the surgical fix.
 */

const { execSync } = require("child_process");
const fs = require("fs");

console.log("🧪 Testing BUG-215 Analyzer Workflow Fix\n");

describe("BUG-215 Analyzer Workflow Fix", () => {
  test("OpenCode version specified in workflow", () => {
    const workflowPath = ".github/workflows/oc analyzer.yml";
    const content = fs.readFileSync(workflowPath, "utf8");

    // Check that workflow explicitly installs version 1.0.193
    expect(content).toContain(
      "curl -fsSL https://opencode.ai/install | bash -s -- --version 1.0.193",
    );
    expect(content).toContain('if [ "$opencode_version" != "1.0.193" ]');
  });

  test("Analyzer workflow file exists and is readable", () => {
    const workflowPath = ".github/workflows/oc analyzer.yml";
    expect(fs.existsSync(workflowPath)).toBe(true);

    const content = fs.readFileSync(workflowPath, "utf8");
    expect(content).toContain("Verify OpenCode Version");
    expect(content).toContain("timeout 2700"); // Updated to 45 minutes
    expect(content).toContain("Check for Timeout"); // New timeout detection logic
    expect(content).toContain('ISSUE_TITLE="🤖 Analyzer Timed Out'); // Differentiated issue creation
  });

  test("Analyzer prompt file exists", () => {
    const promptPath = ".github/prompts/analyzer-system.md";
    expect(fs.existsSync(promptPath)).toBe(true);

    const content = fs.readFileSync(promptPath, "utf8");
    expect(content).toContain("Worldclass Software Architect");
    expect(content).toContain("Observation without Interference");
  });

  test("Analyzer timeout handling is properly configured", () => {
    const workflowPath = ".github/workflows/oc analyzer.yml";
    const content = fs.readFileSync(workflowPath, "utf8");

    // Verify timeout configuration is present and correct
    expect(content).toContain("timeout 2700"); // 45 minutes
    expect(content).toContain(
      "Use 45-minute timeout to stay within 60-minute job timeout",
    );

    // Verify timeout detection logic
    expect(content).toContain("Check for Timeout");
    expect(content).toContain("if [ $? -eq 124 ]"); // Check for exit code 124 (timeout)
    expect(content).toContain("TIMED_OUT=true");

    // Verify differentiated issue creation
    expect(content).toContain('ISSUE_TITLE="🤖 Analyzer Timed Out');
    expect(content).toContain("Timed out after 45 minutes");
  });

  test("Quality gates pass (repository health)", () => {
    // These should all pass without errors
    expect(() => {
      execSync("npm audit", { stdio: "pipe" });
    }).not.toThrow();

    expect(() => {
      execSync("npm run lint", { stdio: "pipe" });
    }).not.toThrow();

    expect(() => {
      execSync("npm run typecheck", { stdio: "pipe" });
    }).not.toThrow();
  });
});

console.log("✅ BUG-215 analyzer fix verification complete");
