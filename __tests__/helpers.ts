import { jest } from "@jest/globals";

// Define error classes for testing
export class ValidationError extends Error {
  code: number;
  constructor(message: string, code = 400) {
    super(message);
    this.name = "ValidationError";
    this.message = message;
    this.code = code;
  }
}

export class AuthenticationError extends Error {
  code: number;
  constructor(message: string) {
    super(message);
    this.name = "AuthenticationError";
    this.message = message;
    this.code = 401;
  }
}

export class DatabaseError extends Error {
  code: number;
  constructor(message: string) {
    super(message);
    this.name = "DatabaseError";
    this.message = message;
    this.code = 500;
  }
}

// Mock Clerk auth
jest.mock("@clerk/nextjs/server", () => ({
  currentUser: jest.fn(),
}));

// Mock database and Redis
jest.mock("@/lib/db", () => ({
  db: jest.fn(),
}));

jest.mock("@/lib/redis", () => ({
  redis: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    flushall: jest.fn(),
  },
}));

// Mock logger
jest.mock("@/lib/logger", () => ({
  createRequestContext: jest.fn(() => ({ requestId: "test-request-id" })),
  logger: {
    userAction: jest.fn(),
    apiError: jest.fn(),
    warn: jest.fn(),
    security: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

// Mock api-utils for error classes
jest.mock("@/lib/api-utils", () => ({
  validateRequest: jest.fn(),
  formatSuccessResponse: jest.fn((data) => ({ success: true, data })),
  formatErrorResponse: jest.fn((error) => ({
    success: false,
    error: error.message,
    code: error.code || "UNKNOWN_ERROR",
  })),
  ValidationError,
  AuthenticationError,
  DatabaseError,
  RateLimiter: jest.fn(() => jest.fn().mockResolvedValue({ allowed: true })),
}));

// Test helpers
export const mockUser = {
  id: "test-user-id",
  email: "test@example.com",
};

export const mockDbResponse = (data: any) => {
  const result = Array.isArray(data) ? data : [data];

  const mockDb = {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockResolvedValue(result),
    innerJoin: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    rightJoin: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    returning: jest.fn().mockResolvedValue(result),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
  };

  return mockDb;
};

export const createTestRequest = (
  method: string,
  path: string,
  body?: any,
  headers?: Record<string, string>,
) => {
  const url = `http://localhost:3000${path}`;
  const request: any = new Request(url, {
    method,
    headers: {
      "content-type": "application/json",
      ...headers,
    },
  });

  // Mock json() method for body
  if (body) {
    request.json = jest.fn().mockResolvedValue(body);
  } else {
    request.json = jest.fn().mockResolvedValue({});
  }

  // Mock other common request methods
  request.headers = {
    get: jest.fn((key: string) => headers?.[key] || null),
  };

  return request;
};

// Clean up mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

// Dummy test to satisfy Jest requirement for test files
describe("Test Helpers", () => {
  it("should have valid helper functions", () => {
    expect(mockUser).toBeDefined();
    expect(mockDbResponse).toBeDefined();
    expect(createTestRequest).toBeDefined();
  });
});
