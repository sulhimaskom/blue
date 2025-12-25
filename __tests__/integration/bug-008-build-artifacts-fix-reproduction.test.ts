/**
 * BUG-008 Reproduction Test
 *
 * Issue: TypeScript build artifacts causing TS6053 errors during typecheck
 * Root Cause: Stale .next/types files referenced in tsconfig.json but missing from filesystem
 * Solution: Clean build artifacts before running typecheck
 */

import { execSync } from "child_process";
import { existsSync, rmSync } from "fs";
import path from "path";

describe("BUG-008: TypeScript Build Artifacts Issue", () => {
  const NEXT_TYPES_DIR = ".next/types";

  beforeEach(() => {
    // Clean state before each test
    if (existsSync(NEXT_TYPES_DIR)) {
      rmSync(NEXT_TYPES_DIR, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    // Clean up after test
    if (existsSync(NEXT_TYPES_DIR)) {
      rmSync(NEXT_TYPES_DIR, { recursive: true, force: true });
    }
  });

  it("should reproduce TS6053 error when .next/types are missing but referenced", () => {
    // First, create a build to generate .next/types
    execSync("npm run build", { stdio: "pipe" });

    // Verify .next/types exist
    expect(existsSync(NEXT_TYPES_DIR)).toBe(true);
    expect(
      existsSync(path.join(NEXT_TYPES_DIR, "app/api/blueprints/route.ts")),
    ).toBe(true);

    // Remove the .next/types directory to simulate the issue
    rmSync(NEXT_TYPES_DIR, { recursive: true, force: true });

    // Now TypeScript should fail with TS6053 errors
    expect(() => {
      execSync("npm run typecheck", { stdio: "pipe" });
    }).toThrow();
  });

  it("should resolve TS6053 errors with clean build", () => {
    // Simulate the broken state: .next/types missing but referenced
    expect(existsSync(NEXT_TYPES_DIR)).toBe(false);

    // Verify that typecheck fails initially
    expect(() => {
      execSync("npm run typecheck", { stdio: "pipe" });
    }).toThrow();

    // Run the fix: clean build (same as verify-build.sh script)
    if (existsSync(".next")) {
      rmSync(".next", { recursive: true, force: true });
    }

    // Build should now succeed
    expect(() => {
      execSync("npm run build", { stdio: "pipe" });
    }).not.toThrow();

    // Typecheck should also succeed
    expect(() => {
      execSync("npm run typecheck", { stdio: "pipe" });
    }).not.toThrow();
  });

  it("should pass verification script with BUG-008 prevention", () => {
    // Run the verification script that includes BUG-008 prevention
    expect(() => {
      execSync("./scripts/verify-build.sh", { stdio: "pipe" });
    }).not.toThrow();
  });

  it("should have proper tsconfig.json configuration for BUG-008 prevention", () => {
    // Read and verify tsconfig.json includes proper patterns
    const tsconfig = require("../tsconfig.json");

    // Should include .next/types for proper TypeScript resolution
    expect(tsconfig.include).toContain(".next/types/**/*.ts");

    // Should exclude test directories to prevent conflicts
    expect(tsconfig.exclude).toContain("__tests__/factories/");
    expect(tsconfig.exclude).toContain("__tests__/builders/");
    expect(tsconfig.exclude).toContain("__tests__/setup/");
    expect(tsconfig.exclude).toContain("__tests__/helpers/");
    expect(tsconfig.exclude).toContain("__tests__/mocks/");
    expect(tsconfig.exclude).toContain("__tests__/api/");
  });
});
