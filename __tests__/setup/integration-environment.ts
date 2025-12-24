/**
 * Enhanced Environment Setup for API Integration Tests
 *
 * Provides comprehensive environment mocking to resolve validation issues
 * and enable API integration testing without disrupting existing test suite
 */

import { config } from "dotenv";

// Load test environment variables
config({ path: ".env.test" });

// Set comprehensive test environment mocks
export function setupIntegrationTestEnvironment() {
  // Mock all required environment variables
  const testEnvVars = {
    NODE_ENV: "test",
    DATABASE_URL: "postgresql://test:test@localhost:5432/testdb",
    REDIS_URL: "redis://localhost:6379",
    IFLOW_API_KEY: "test-iflow-key",
    IFLOW_BASE_URL: "https://api.models.dev/v1",
    TAVILY_API_KEY: "test-tavily-key",
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_clerk_key",
    CLERK_SECRET_KEY: "sk_test_clerk_secret",
    STRIPE_SECRET_KEY: "sk_test_stripe_key",
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_stripe_key",
    GITHUB_ACCESS_TOKEN: "ghp_test_github_token",
    INTEGRATION_TEST: "true",
  };

  // Apply to process.env
  Object.entries(testEnvVars).forEach(([key, value]) => {
    if (!process.env[key]) {
      process.env[key] = value;
    }
  });

  return testEnvVars;
}

// Mock validation functions to prevent startup errors
export function mockValidations() {
  // Mock environment validation
  const originalRequire = require;

  require = function (id: string) {
    if (id.includes("/lib/env")) {
      return {
        validateEnv: () => ({ valid: true }),
        ENV: {
          NODE_ENV: "test",
          DATABASE_URL: "postgresql://test:test@localhost:5432/testdb",
          REDIS_URL: "redis://localhost:6379",
        },
      };
    }
    return originalRequire(id);
  };
}

// Reset environment after tests
export function teardownIntegrationTestEnvironment() {
  // Only remove integration test environment variables
  const integrationVars = ["NODE_ENV", "INTEGRATION_TEST"];

  integrationVars.forEach((key) => {
    delete process.env[key];
  });
}
