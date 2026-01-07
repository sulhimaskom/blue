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

    it("should suppress all logs when SUPPRESS_TEST_ERRORS=true", () => {
      process.env.SUPPRESS_TEST_ERRORS = "true";

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

  describe("API-specific Methods", () => {
    it("should have apiError and serviceError methods available", () => {
      expect(logger.apiError).toBeDefined();
      expect(logger.serviceError).toBeDefined();
    });
  });
});
