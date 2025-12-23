import { jest } from "@jest/globals";

// Complete Next.js environment mock for testing
class MockHeaders {
  private headers: Map<string, string> = new Map();

  get(name: string): string | null {
    return this.headers.get(name.toLowerCase()) || null;
  }

  set(name: string, value: string): void {
    this.headers.set(name.toLowerCase(), value);
  }

  has(name: string): boolean {
    return this.headers.has(name.toLowerCase());
  }

  delete(name: string): boolean {
    return this.headers.delete(name.toLowerCase());
  }

  entries(): Array<[string, string]> {
    return Array.from(this.headers.entries());
  }

  keys(): string[] {
    return Array.from(this.headers.keys());
  }

  values(): string[] {
    return Array.from(this.headers.values());
  }

  forEach(
    callback: (value: string, name: string, headers: Headers) => void,
  ): void {
    this.headers.forEach((value, name) => callback(value, name, this as any));
  }
}

class MockResponse {
  status: number;
  headers: MockHeaders;
  private body: any;
  success?: boolean;
  error?: string | null;
  code?: string | null;

  constructor(body: any, init?: { status?: number }) {
    this.body = body;
    this.status = init?.status || 200;
    this.headers = new MockHeaders();
  }

  json(): any {
    return this.body;
  }

  text(): string {
    return JSON.stringify(this.body);
  }
}

// Mock Next.js Response and NextResponse properly
const originalResponse = global.Response;
const originalNextResponse = (global as any).NextResponse;

class MockNextResponse extends MockResponse {
  static json(data: unknown, init?: { status?: number }) {
    const response = new MockNextResponse(data, init);
    response.status = init?.status || 200;
    response.headers.set = jest.fn();
    response.success = true;
    response.error = null;
    response.code = null;
    return response;
  }

  static redirect() {
    return new MockNextResponse(null, { status: 302 });
  }
}

(global as any).Response = MockResponse;
(global as any).NextResponse = MockNextResponse;

// Mock Clerk auth - must be loaded before any Clerk imports
jest.mock("@clerk/backend", () => ({}));
jest.mock("@clerk/nextjs/server", () => ({
  currentUser: jest.fn(),
  auth: jest.fn(),
}));

// Mock database and Redis
jest.mock("@/lib/db", () => ({
  db: jest.fn(),
}));

// Mock Zod validation
jest.mock("zod", () => ({
  z: {
    string: () => ({
      min: () => ({
        max: () => ({
          _input: "mock-input",
        }),
      }),
    }),
    object: (schema: any) => ({
      parse: jest.fn((data: any) => data),
      safeParse: jest.fn((data: any) => ({ success: true, data })),
      _input: schema,
    }),
  },
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

// Enhanced error classes with code property
export class ValidationError extends Error {
  code: string;
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
    this.code = "VALIDATION_ERROR";
  }
}

export class AuthenticationError extends Error {
  code: string;
  constructor(message: string) {
    super(message);
    this.name = "AuthenticationError";
    this.code = "AUTHENTICATION_ERROR";
  }
}

export class DatabaseError extends Error {
  code: string;
  constructor(message: string) {
    super(message);
    this.name = "DatabaseError";
    this.code = "DATABASE_ERROR";
  }
}

// Test helpers
export const mockUser = {
  id: "test-user-id",
  email: "test@example.com",
};

export const mockCompleteUser = {
  id: "user_test_complete_id_123456",
  email: "complete@test.example.com",
  passwordEnabled: true,
  totpEnabled: false,
  backupCodeEnabled: false,
  twoFactorEnabled: false,
  firstName: "Test",
  lastName: "User",
  username: "testuser",
  profileImageUrl: "https://example.com/avatar.jpg",
  emailVerified: true,
  phoneVerified: false,
  createdAt: 1672531200000, // 2023-01-01T00:00:00Z in ms
  updatedAt: 1701388800000, // 2023-12-01T00:00:00Z in ms
  lastSignInAt: 1702626600000, // 2023-12-15T10:30:00Z in ms
  lastActiveAt: 1702626600000, // 2023-12-15T10:30:00Z in ms
  externalAccounts: [],
  emailAddresses: [],
  phoneNumbers: [],
  primaryEmailAddressId: null,
  primaryPhoneNumberId: null,
  primaryWebhookSecretId: null,
  primaryWeb3WalletId: null,
  unsafeMetadata: {},
  publicMetadata: {},
  privateMetadata: {},
  externalId: null,
  samlAccounts: [],
  organizationMemberships: [],
  web3Wallets: [],
  hasImage: false,
  imageUrl: null,
  totpSecret: null,
  backupCodes: null,
  locked: false,
  lockReason: null,
  deleteSelfEnabled: true,
  createOrganizationEnabled: true,
  createOrganizationsLimit: 5,
  banned: false,
  bannedReason: null,
  password: null,
  // Additional Clerk User interface properties
  primaryEmailAddress: null,
  primaryPhoneNumber: null,
  primaryWeb3Wallet: null,
  fullName: "Test User",
} as any; // Type assertion to bypass strict Clerk interface requirements

export const mockDbResponse = (data: unknown): any => {
  const result = Array.isArray(data) ? data : [data];

  const mockDb: any = {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnValue(result),
    insert: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    returning: jest.fn().mockReturnValue(result),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    rightJoin: jest.fn().mockReturnThis(),
    fullJoin: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    having: jest.fn().mockReturnThis(),
  };

  return mockDb;
};

export const createTestRequest = (
  method: string,
  path: string,
  body?: unknown,
  headers?: Record<string, string>,
): any => {
  const url = `http://localhost:3000${path}`;
  const request = {
    url,
    method,
    headers: {
      get: jest.fn((key: string) => headers?.[key] || null),
      set: jest.fn(),
      has: jest.fn(),
      delete: jest.fn(),
      entries: jest.fn(),
      keys: jest.fn(),
      values: jest.fn(),
      forEach: jest.fn(),
    },
    json: jest.fn().mockReturnValue(body || {}),
    cookies: new Map(),
    nextUrl: new URL(url),
    page: {
      params: {},
      searchParams: new URLSearchParams(),
    },
    ua: "test-ua",
    ip: "127.0.0.1",
    geo: {},
  };

  return request;
};

// Clean up mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

// Restore original Response after tests
afterAll(() => {
  global.Response = originalResponse;
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
