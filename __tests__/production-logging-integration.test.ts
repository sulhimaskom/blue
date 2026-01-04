/**
 * Production Logging Integration Tests
 *
 * Focuses on testing the core functionality of the production logging integration
 */
import { logger } from "../lib/logger";

describe("Production Logging Integration", () => {
  test("should provide health check for logging system", async () => {
    const health = await logger.healthCheck();

    expect(health).toHaveProperty("status");
    expect(health).toHaveProperty("loggingService", "local");
    expect(health).toHaveProperty("productionService");
    expect(health).toHaveProperty("environment");
  });

  test("should include proper metadata in log entries", () => {
    // Clear environment flags that might suppress logs
    const originalEnv = process.env;
    const originalArgv = process.argv;

    process.env = { ...originalEnv, NODE_ENV: "development", CI: "false" };
    process.argv = originalArgv.filter((arg) => arg !== "--silent");

    // Capture console.error to verify metadata formatting
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();

    const testMetadata = {
      requestId: "req_metadata_test",
      userId: "user_metadata_test",
      method: "POST",
      path: "/api/metadata-test",
      statusCode: 500,
      duration: 150,
      metadata: { custom: "value" },
    };

    logger.error("Metadata test error", testMetadata);

    // Verify the log contains the expected metadata
    const loggedOutput = consoleSpy.mock.calls[0][0];
    const logEntry = JSON.parse(loggedOutput);

    expect(logEntry).toMatchObject({
      level: "error",
      message: "Metadata test error",
      requestId: "req_metadata_test",
      userId: "user_metadata_test",
      method: "POST",
      path: "/api/metadata-test",
      statusCode: 500,
      duration: 150,
      metadata: { custom: "value" },
    });
    expect(logEntry.timestamp).toBeDefined();

    // Restore environment
    process.env = originalEnv;
    process.argv = originalArgv;
    consoleSpy.mockRestore();
  });

  test("should handle API-specific logging methods", () => {
    // Clear environment flags that might suppress logs
    const originalEnv = process.env;
    const originalArgv = process.argv;

    process.env = { ...originalEnv, NODE_ENV: "development", CI: "false" };
    process.argv = originalArgv.filter((arg) => arg !== "--silent");

    // Capture console.error to verify API logging methods
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();

    const mockError = new Error("API test error");
    const requestId = "req_api_test";

    logger.apiError("API error message", requestId, mockError, {
      method: "GET",
      path: "/api/test",
    });

    // Verify the API error is properly formatted
    const loggedOutput = consoleSpy.mock.calls[0][0];
    const logEntry = JSON.parse(loggedOutput);

    expect(logEntry).toMatchObject({
      level: "error",
      message: "API error message",
      requestId: "req_api_test",
      error: {
        name: "Error",
        message: "API test error",
      },
      method: "GET",
      path: "/api/test",
    });

    // Restore environment
    process.env = originalEnv;
    process.argv = originalArgv;
    consoleSpy.mockRestore();
  });

  test("should handle business action logging", () => {
    // Clear environment flags that might suppress logs
    const originalEnv = process.env;
    const originalArgv = process.argv;

    process.env = { ...originalEnv, NODE_ENV: "development", CI: "false" };
    process.argv = originalArgv.filter((arg) => arg !== "--silent");

    // Capture console.info to verify business logging methods
    const consoleSpy = jest.spyOn(console, "info").mockImplementation();

    logger.userAction("blueprint_created", "user_123", {
      blueprintId: "bp_456",
      template: "enterprise",
    });

    // Verify the business action is properly formatted
    const loggedOutput = consoleSpy.mock.calls[0][0];
    const logEntry = JSON.parse(loggedOutput);

    expect(logEntry).toMatchObject({
      level: "info",
      message: "User action: blueprint_created",
      userId: "user_123",
      action: "blueprint_created",
      blueprintId: "bp_456",
      template: "enterprise",
    });
    expect(logEntry.timestamp).toBeDefined();

    // Restore environment
    process.env = originalEnv;
    process.argv = originalArgv;
    consoleSpy.mockRestore();
  });

  test("should handle system event logging", () => {
    // Clear environment flags that might suppress logs
    const originalEnv = process.env;
    const originalArgv = process.argv;

    process.env = { ...originalEnv, NODE_ENV: "development", CI: "false" };
    process.argv = originalArgv.filter((arg) => arg !== "--silent");

    // Capture console.info to verify system event logging methods
    const consoleSpy = jest.spyOn(console, "info").mockImplementation();

    logger.systemEvent("cache_cleared", {
      cacheType: "redis",
      keysCleared: 150,
    });

    // Verify the system event is properly formatted
    const loggedOutput = consoleSpy.mock.calls[0][0];
    const logEntry = JSON.parse(loggedOutput);

    expect(logEntry).toMatchObject({
      level: "info",
      message: "System event: cache_cleared",
      event: "cache_cleared",
      cacheType: "redis",
      keysCleared: 150,
    });
    expect(logEntry.timestamp).toBeDefined();

    // Restore environment
    process.env = originalEnv;
    process.argv = originalArgv;
    consoleSpy.mockRestore();
  });

  test("should handle security event logging", () => {
    // Clear environment flags that might suppress logs
    const originalEnv = process.env;
    const originalArgv = process.argv;

    process.env = { ...originalEnv, NODE_ENV: "development", CI: "false" };
    process.argv = originalArgv.filter((arg) => arg !== "--silent");

    // Capture console.warn to verify security logging methods
    const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

    logger.security("failed_login_attempt", {
      userId: "user_789",
      ip: "192.168.1.100",
      userAgent: "Mozilla/5.0...",
    });

    // Verify the security event is properly formatted
    const loggedOutput = consoleSpy.mock.calls[0][0];
    const logEntry = JSON.parse(loggedOutput);

    expect(logEntry).toMatchObject({
      level: "warn",
      message: "Security event: failed_login_attempt",
      event: "failed_login_attempt",
      userId: "user_789",
      ip: "192.168.1.100",
      userAgent: "Mozilla/5.0...",
    });
    expect(logEntry.timestamp).toBeDefined();

    // Restore environment
    process.env = originalEnv;
    process.argv = originalArgv;
    consoleSpy.mockRestore();
  });
});
