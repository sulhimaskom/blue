import { jest } from "@jest/globals";

// Define error classes for testing - match api-utils
export class ValidationError extends Error {
  public code: number;
  constructor(message: string, code = 400) {
    super(message);
    this.name = "ValidationError";
    this.message = message;
    this.code = code;
  }
}

export class AuthenticationError extends Error {
  public code: number;
  constructor(message: string = "Authentication required") {
    super(message);
    this.name = "AuthenticationError";
    this.message = message;
    this.code = 401;
  }
}

export class DatabaseError extends Error {
  public code: number;
  constructor(message: string) {
    super(message);
    this.name = "DatabaseError";
    this.message = message;
    this.code = 500;
  }
}

// Mock NextResponse.json for tests
(global as any).Response = {
  json: jest.fn((data: any, init?: any) => ({
    ...data,
    status: init?.status || 200,
    headers: new Map(),
  })),
};

(global as any).NextResponse = {
  json: jest.fn((data: any, init?: any) => ({
    ...data,
    status: init?.status || 200,
    headers: {
      get: jest.fn(),
      set: jest.fn(),
    },
  })),
};

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
  formatSuccessResponse: jest.fn((data: any) => ({ success: true, data })),
  formatErrorResponse: jest.fn((error: any) => ({
    success: false,
    error: error instanceof Error ? error.message : "Unknown error",
    code:
      error instanceof Error && "code" in error ? error.code : "UNKNOWN_ERROR",
  })),
  ValidationError,
  AuthenticationError,
  DatabaseError,
  RateLimiter: jest.fn(
    () => jest.fn().mockResolvedValue({ allowed: true } as any) as any,
  ),
}));

// Test helpers - legacy simple mock
export const mockUser = {
  id: "test-user-id",
  email: "test@example.com",
};

// Complete Clerk User mock with all required properties for API tests
export const mockCompleteUser = {
  // Basic properties
  id: "user_test_complete_id_123456",
  email: "complete@test.example.com",

  // Security properties
  passwordEnabled: true,
  totpEnabled: false,
  backupCodeEnabled: false,
  twoFactorEnabled: false,

  // Profile properties
  firstName: "Test",
  lastName: "User",
  username: "testuser",
  profileImageUrl: "https://example.com/avatar.jpg",

  // Verification properties
  emailVerified: true,
  phoneVerified: false,

  // Timestamps
  createdAt: new Date("2023-01-01T00:00:00Z"),
  updatedAt: new Date("2023-12-01T00:00:00Z"),
  lastSignInAt: new Date("2023-12-15T10:30:00Z"),

  // External accounts
  externalAccounts: [],
  emailAddresses: [
    {
      emailAddress: "complete@test.example.com",
      id: "email_test_id",
      verification: {
        status: "verified" as const,
        strategy: "admin" as const,
        attempts: 1,
        expireAt: new Date(),
      },
      linkedAt: new Date(),
    },
  ],

  // Phone (optional)
  phoneNumbers: [],

  // Organization/Session properties
  primaryEmailAddressId: "email_test_id",
  primaryPhoneNumberId: null,
  primaryWebhookSecretId: null,

  // Flags
  unsafeMetadata: {},
  publicMetadata: {},
  privateMetadata: {},

  // External OAuth/SAML properties
  externalId: null,
  samlAccounts: [],

  // Organization invitations
  organizationMemberships: [],

  // Password and security
  hasImage: true,
  imageUrl: "https://example.com/avatar.jpg",

  // Additional Clerk-specific properties
  totpSecret: null,
  backupCodes: null,

  // Legal acceptance
  locked: false,
  lockReason: null,
  deleteSelfEnabled: true,
  createOrganizationEnabled: true,

  // Admin flags
  banned: false,
  bannedReason: null,

  // Legacy properties
  password: null,
};

export const mockDbResponse = (data: any) => {
  const result = Array.isArray(data) ? data : [data];

  const mockDb = {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockResolvedValue(result as any),
    innerJoin: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    rightJoin: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    returning: jest.fn().mockResolvedValue(result as any),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
  } as any;

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
    request.json = jest.fn().mockResolvedValue(body as any);
  } else {
    request.json = jest.fn().mockResolvedValue({} as any);
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
    expect(mockCompleteUser).toBeDefined();
    expect(mockDbResponse).toBeDefined();
    expect(createTestRequest).toBeDefined();
  });
});
