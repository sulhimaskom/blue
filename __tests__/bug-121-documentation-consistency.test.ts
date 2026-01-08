/**
 * Documentation consistency test for GitHub App integration status
 * Prevents regression of Issue #121: Inconsistent GitHub App integration status
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";

describe("Documentation Consistency - GitHub App Integration", () => {
  const taskMdPath = join(__dirname, "../docs/task.md");
  const featureMdPath = join(__dirname, "../docs/feature.md");

  describe("Issue #121 Regression Test", () => {
    test("GitHub App integration status should be consistent across task.md and feature.md", () => {
      // Verify files exist first
      expect(existsSync(taskMdPath)).toBe(true);
      expect(existsSync(featureMdPath)).toBe(true);

      // Read task.md content
      const taskMdContent = readFileSync(taskMdPath, "utf8");

      // Read feature.md content
      const featureMdContent = readFileSync(featureMdPath, "utf8");

      // Check task.md for GitHub App integration references
      const taskMdGitHubRefs = taskMdContent.match(
        /GitHub App.*integration.*repository creation/g,
      );
      expect(taskMdGitHubRefs).toBeDefined();
      expect(taskMdGitHubRefs!.length).toBeGreaterThan(0);

      // All GitHub App references in task.md should show as completed
      const incompleteRefs = taskMdContent.match(
        /- \[ \] Add GitHub App integration for repository creation/g,
      );
      expect(incompleteRefs).toBeNull(); // Should be null - no incomplete references

      const completedRefs = taskMdContent.match(
        /- \[x\].*GitHub App integration.*repository creation/g,
      );
      expect(completedRefs).toBeDefined();
      expect(completedRefs!.length).toBe(2); // Should be exactly 2 completed references (lines 932 and 1405)

      // Check feature.md for PROD-002 status
      const prod002Status = featureMdContent.match(
        /\[PROD-002\][\s\S]*?\*\*Status\*\*: Complete ✅/,
      );
      expect(prod002Status).toBeDefined();
    });

    test("GitHub service implementation should exist and be testable", () => {
      // Verify the GitHub service file exists
      const githubServicePath = join(
        __dirname,
        "../lib/services/github-service.ts",
      );
      const githubServiceExists = existsSync(githubServicePath);
      expect(githubServiceExists).toBe(true);

      // Verify test file exists
      const githubTestPath = join(
        __dirname,
        "../__tests__/github-service.test.ts",
      );
      const githubTestExists = existsSync(githubTestPath);
      expect(githubTestExists).toBe(true);
    });
  });
});
