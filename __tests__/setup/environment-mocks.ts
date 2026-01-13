/**
 * Environment Mocking Setup for Test Infrastructure
 *
 * Centralizes all environment variable mocking to prevent
 * validation failures during test execution.
 */

export function setupEnvironmentMocks() {
  // Set up process.env first, before importing env module
  const originalEnv = process.env;
  process.env = {
    ...originalEnv,
    NODE_ENV: "test",
    DATABASE_URL: "postgresql://test:test@localhost/test",
    IFLOW_API_KEY: "test-iflow-key",
    TAVILY_API_KEY: "test-tavily-key",
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "test-clerk-publishable",
    CLERK_SECRET_KEY: "test-clerk-secret",
    STRIPE_SECRET_KEY: "test-stripe-secret",
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "test-stripe-publishable",
    GITHUB_ACCESS_TOKEN: "test-github-token",
  };

  // Clear any cached modules to reset imports with env variables
  jest.resetModules();

  // Mock Next.js server utilities first - use global mocks from jest.polyfills.js
  jest.mock("next/server", () => ({
    NextResponse: (global as any).NextResponse,
    Response: (global as any).Response,
  }));

  // Mock environment validation to bypass test requirements
  // Dynamic mock that reads from process.env to support test-time environment variable changes
  jest.mock("@/lib/env", () => ({
    env: {
      get NODE_ENV() { return process.env.NODE_ENV || "test"; },
      get DATABASE_URL() { return process.env.DATABASE_URL || "postgresql://test:test@localhost/test"; },
      get IFLOW_API_KEY() { return process.env.IFLOW_API_KEY || "test-iflow-key"; },
      get TAVILY_API_KEY() { return process.env.TAVILY_API_KEY || "test-tavily-key"; },
      get NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY() { return process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "test-clerk-publishable"; },
      get CLERK_SECRET_KEY() { return process.env.CLERK_SECRET_KEY || "test-clerk-secret"; },
      get CLERK_WEBHOOK_SECRET() { return process.env.CLERK_WEBHOOK_SECRET; },
      get STRIPE_SECRET_KEY() { return process.env.STRIPE_SECRET_KEY || "test-stripe-secret"; },
      get NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY() { return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "test-stripe-publishable"; },
      get STRIPE_WEBHOOK_SECRET() { return process.env.STRIPE_WEBHOOK_SECRET; },
      get STRIPE_WEBHOOK_SECRETS_ADDITIONAL() { return process.env.STRIPE_WEBHOOK_SECRETS_ADDITIONAL; },
      get GITHUB_ACCESS_TOKEN() { return process.env.GITHUB_ACCESS_TOKEN || "test-github-token"; },
      get GITHUB_APP_ID() { return process.env.GITHUB_APP_ID || "test-app-id"; },
      get GITHUB_APP_PRIVATE_KEY() { return process.env.GITHUB_APP_PRIVATE_KEY || "test-private-key"; },
      get REDIS_URL() { return process.env.REDIS_URL || "redis://localhost:6379"; },
      get REDIS_PASSWORD() { return process.env.REDIS_PASSWORD; },
      get NPM_PACKAGE_VERSION() { return process.env.NPM_PACKAGE_VERSION || "1.0.0"; },
      get SENTRY_DSN() { return process.env.SENTRY_DSN; },
      get SENTRY_RELEASE() { return process.env.SENTRY_RELEASE; },
      get NEXT_PUBLIC_APP_URL() { return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"; },
    },
  }));

  // Mock constants with actual test-safe values
  jest.mock("@/lib/constants", () => ({
    WEBHOOK_EVENTS: {
      USER_CREATED: "user.created",
      USER_UPDATED: "user.updated",
      USER_DELETED: "user.deleted",
      PAYMENT_SUCCEEDED: "payment.succeeded",
      PAYMENT_FAILED: "payment.failed",
    },
    ERROR_MESSAGES: {
      UNAUTHORIZED: "Unauthorized access",
      INVALID_REQUEST: "Invalid request format",
      NOT_FOUND: "Resource not found",
      INTERNAL_ERROR: "Internal server error",
    },
    PROJECT_STATUSES: {
      DRAFT: "draft",
      GENERATING: "generating",
      READY: "ready",
      DEPLOYING: "deploying",
      DEPLOYED: "deployed",
      ERROR: "error",
    },
    CREDIT_RULES: {
      SIGNUP_BONUS: 5,
      CONVERSION_RATE: 10,
      BLUEPRINT_COST: 1,
      PRO_THRESHOLD: 500,
      MINIMUM_PURCHASE: 100,
      MAXIMUM_PURCHASE: 100000,
    },
    PRICING_PACKAGES: [
      { credits: 10, price: "$1.00" },
      { credits: 50, price: "$5.00" },
      { credits: 100, price: "$10.00" },
      { credits: 500, price: "$50.00 (Pro tier)" },
    ],
  }));
}
