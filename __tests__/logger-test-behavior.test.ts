/**
 * Tests for Logger Test Environment Behavior
 *
 * Verifies that console output is properly suppressed during tests
 * to maintain clean test output while preserving functionality
 */
import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { logger } from "../lib/logger";

// Mock console methods to capture log calls
const mockConsoleError = jest
  .spyOn(console, "error")
  .mockImplementation(() => {});
const mockConsoleWarn = jest
  .spyOn(console, "warn")
  .mockImplementation(() => {});
const mockConsoleInfo = jest
  .spyOn(console, "info")
  .mockImplementation(() => {});
const mockConsoleDebug = jest
  .spyOn(console, "debug")
  .mockImplementation(() => {});

describe("Logger Test Environment Behavior", () => {
  beforeEach(() => {
    // Clear all mocks before each test
    mockConsoleError.mockClear();
    mockConsoleWarn.mockClear();
    mockConsoleInfo.mockClear();
    mockConsoleDebug.mockClear();

    // Reset environment variables
    delete process.env.SUPPRESS_TEST_LOGS;
    delete process.env.ALLOW_TEST_ERRORS;
  });

  afterAll(() => {
    // Restore console methods
    mockConsoleError.mockRestore();
    mockConsoleWarn.mockRestore();
    mockConsoleInfo.mockRestore();
    mockConsoleDebug.mockRestore();
  });

  describe("Default Test Behavior", () => {
    it("should suppress all logs by default in CI environment", () => {
      // In CI environment, all logs should be suppressed by default
      logger.debug("Debug message");
      logger.info("Info message");
      logger.warn("Warning message");
      logger.error("Error message");

      expect(mockConsoleDebug).not.toHaveBeenCalled();
      expect(mockConsoleInfo).not.toHaveBeenCalled();
      expect(mockConsoleWarn).not.toHaveBeenCalled();
      expect(mockConsoleError).not.toHaveBeenCalled();
    });
  });

  describe("Enhanced Test Suppression", () => {
    it("should suppress all logs when SUPPRESS_TEST_LOGS=true", () => {
      process.env.SUPPRESS_TEST_LOGS = "true";

      logger.debug("Debug message");
      logger.info("Info message");
      logger.warn("Warning message");
      logger.error("Error message");

      expect(mockConsoleDebug).not.toHaveBeenCalled();
      expect(mockConsoleInfo).not.toHaveBeenCalled();
      expect(mockConsoleWarn).not.toHaveBeenCalled();
      expect(mockConsoleError).not.toHaveBeenCalled();
    });

    it("should allow error logs when not in CI environment", () => {
      const originalCI = process.env.CI;
      delete process.env.CI; // Temporarily disable CI
      delete process.env.SUPPRESS_TEST_ERRORS;

      const originalArgv = process.argv;
      process.argv = process.argv.filter((arg) => arg !== "--silent");

      logger.error("Error message");
      expect(mockConsoleError).toHaveBeenCalled();

      // Restore CI and argv
      if (originalCI) process.env.CI = originalCI;
      process.argv = originalArgv;
    });

    it("should suppress error logs when SUPPRESS_TEST_ERRORS=true", () => {
      process.env.SUPPRESS_TEST_ERRORS = "true";

      logger.error("Error message");
      expect(mockConsoleError).not.toHaveBeenCalled();
    });
  });

  describe("API-specific Methods", () => {
    let originalCI: string | undefined;
    let originalArgv: string[];

    beforeEach(() => {
      originalCI = process.env.CI;
      delete process.env.CI; // Disable CI for these tests
      delete process.env.SUPPRESS_TEST_ERRORS;
      originalArgv = process.argv;
      process.argv = process.argv.filter((arg) => arg !== "--silent");
    });

    afterEach(() => {
      if (originalCI) process.env.CI = originalCI;
      process.argv = originalArgv;
    });

    it("should handle apiError method correctly", () => {
      const error = new Error("Test API error");
      logger.apiError("API failed", "req-123", error);

      expect(mockConsoleError).toHaveBeenCalled();
    });

    it("should handle serviceError method correctly", () => {
      logger.serviceError("GitHub", "Service timeout");

      expect(mockConsoleError).toHaveBeenCalled();
    });
  });
});
