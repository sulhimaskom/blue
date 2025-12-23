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

  // Mock Next.js server utilities first
  jest.mock("next/server", () => {
    const MockResponse = class {
      data: any;
      status: number;
      headers: Map<string, string> | any;

      constructor(data: any, init?: { status?: number }) {
        this.data = data;
        this.status = init?.status || 200;
        this.headers = new Map();
      }

      json() {
        return Promise.resolve(this.data);
      }

      text() {
        return Promise.resolve(JSON.stringify(this.data));
      }
    };

    const MockNextResponse = class extends MockResponse {
      static json(data: any, init?: { status?: number }) {
        const response = new MockNextResponse(data, init);
        response.status = init?.status || 200;
        response.headers = {
          set: jest.fn(),
          get: jest.fn(),
          has: jest.fn(),
          delete: jest.fn(),
        };
        return response;
      }

      static redirect() {
        return new MockNextResponse(null, { status: 302 });
      }
    };

    return {
      NextResponse: MockNextResponse,
      Response: MockResponse,
    };
  });

  // Mock environment validation to bypass test requirements
  jest.mock("@/lib/env", () => ({
    env: {
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://test:test@localhost/test",
      IFLOW_API_KEY: "test-iflow-key",
      TAVILY_API_KEY: "test-tavily-key",
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "test-clerk-publishable",
      CLERK_SECRET_KEY: "test-clerk-secret",
      STRIPE_SECRET_KEY: "test-stripe-secret",
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "test-stripe-publishable",
      GITHUB_ACCESS_TOKEN: "test-github-token",
      GITHUB_APP_ID: "test-app-id",
      GITHUB_APP_PRIVATE_KEY: "test-private-key",
      REDIS_URL: "redis://localhost:6379",
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
