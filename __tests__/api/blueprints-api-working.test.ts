/**
 * Fixed API Test Configuration
 *
 * Place all mock declarations at the top BEFORE any imports
 * to ensure proper module mocking in Jest.
 */

// Mock environment variables before any imports
// @ts-ignore - NODE_ENV is read-only in TypeScript but we need to set it for tests
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "postgresql://test:test@localhost/test";
process.env.IFLOW_API_KEY = "test-iflow-key";
process.env.TAVILY_API_KEY = "test-tavily-key";
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "test-clerk-publishable";
process.env.CLERK_SECRET_KEY = "test-clerk-secret";
process.env.STRIPE_SECRET_KEY = "test-stripe-secret";
process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = "test-stripe-publishable";
process.env.GITHUB_ACCESS_TOKEN = "test-github-token";

// Mock Next.js server utilities
jest.mock("next/server", () => {
  const MockNextResponse = {
    json: jest.fn((data, init) => ({
      status: init?.status || 200,
      json: () => Promise.resolve(data),
      headers: {
        set: jest.fn(),
        get: jest.fn(),
        has: jest.fn(),
        delete: jest.fn(),
      },
    })),
    redirect: jest.fn(() => ({ status: 302 })),
  };

  return {
    NextResponse: MockNextResponse,
  };
});

// Mock environment validation module
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
  },
}));

// Mock constants
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

// Mock services with proper class mocking
jest.mock("@/lib/services/user-service", () => ({
  UserService: {
    getAuthenticatedUser: jest.fn(),
    deductCredits: jest.fn(),
    createTransaction: jest.fn(),
  },
}));

// Mock blueprintEngine singleton instance
jest.mock("@/lib/services/blueprint-engine", () => ({
  blueprintEngine: {
    generateBlueprint: jest.fn(),
    getBlueprint: jest.fn(),
    updateBlueprint: jest.fn(),
  },
}));

jest.mock("@/lib/db/index");
jest.mock("@/lib/redis");

// Now import the API routes after all mocks are set up
// Import Clerk auth mock
jest.mock("@clerk/nextjs/server", () => ({
  currentUser: jest.fn(),
}));

import { POST, GET } from "@/app/api/blueprints/route";
import { UserService } from "@/lib/services/user-service";
import { blueprintEngine } from "@/lib/services/blueprint-engine";

describe("Blueprint API - Working Integration Tests", () => {
  beforeEach(() => {
    // Setup successful service responses for static methods
    (UserService.getAuthenticatedUser as jest.Mock).mockResolvedValue({
      id: 1,
      clerkId: "user-clerk-123",
      email: "test@example.com",
      credits: 5,
      subscriptionTier: "free",
      createdAt: new Date(),
    });

    (blueprintEngine.generateBlueprint as jest.Mock).mockResolvedValue({
      id: 1,
      clerkId: "user-clerk-123",
      email: "test@example.com",
      credits: 5,
      subscriptionTier: "free",
      createdAt: new Date(),
    } as any);

    (blueprintEngine.generateBlueprint as jest.Mock).mockResolvedValue({
      projectId: "test-project-123",
      blueprintId: "test-blueprint-456",
      status: "completed",
      estimatedDuration: 5000,
      blueprint: {
        title: "SneakerMarket Blueprint",
        description: "A marketplace for rare sneakers",
        sections: [
          {
            title: "Authentication",
            description: "User authentication system",
          },
        ],
      },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/blueprints", () => {
    const validPayload = {
      input: "I want to build a marketplace for rare sneakers",
      projectName: "SneakerMarket",
    };

    it("should generate blueprint successfully", async () => {
      const mockRequest = {
        json: async () => validPayload,
        headers: new Headers({ authorization: "Bearer test-token" }),
        method: "POST",
        url: "https://localhost:3000/api/blueprints",
      } as any;

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual({
        projectId: "test-project-123",
        blueprintId: "test-blueprint-456",
        status: "completed",
        estimatedDuration: 5000,
      });
    });

    it("should reject insufficient credits", async () => {
      (UserService.getAuthenticatedUser as jest.Mock).mockResolvedValue({
        id: 1,
        clerkId: "user-clerk-123",
        email: "test@example.com",
        credits: 0,
        subscriptionTier: "free",
        createdAt: new Date(),
      } as any);

      const mockRequest = {
        json: async () => validPayload,
        headers: new Headers({ authorization: "Bearer test-token" }),
        method: "POST",
        url: "https://localhost:3000/api/blueprints",
      } as any;

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain("credits");
    });
  });

  describe("GET /api/blueprints", () => {
    it("should retrieve blueprints", async () => {
      const mockRequest = {
        headers: new Headers({ authorization: "Bearer test-token" }),
        method: "GET",
        url: "https://localhost:3000/api/blueprints",
      } as any;

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });
  });
});
