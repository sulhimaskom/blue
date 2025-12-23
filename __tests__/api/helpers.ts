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

(global as any).Response = MockResponse;
(global as any).NextResponse = {
  json: jest.fn((data: unknown, init?: { status?: number }) => {
    const response = new MockResponse(data, init);
    response.status = init?.status || 200;
    return response;
  }),
  redirect: jest.fn(),
};

// Mock Clerk auth
jest.mock("@clerk/nextjs/server", () => ({
  currentUser: jest.fn(),
}));

// Mock environment variables
jest.mock("@/lib/env", () => ({
  env: {
    NODE_ENV: "test",
    DATABASE_URL: "postgresql://test:test@localhost:5432/test",
    IFLOW_API_KEY: "test-iflow-key",
    IFLOW_BASE_URL: "https://api.models.dev/v1",
    TAVILY_API_KEY: "test-tavily-key",
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "test-clerk-key",
    CLERK_SECRET_KEY: "test-clerk-secret",
    STRIPE_SECRET_KEY: "test-stripe-secret",
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "test-stripe-publishable",
    GITHUB_ACCESS_TOKEN: "test-github-token",
  },
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

// Test helpers
export const mockUser = {
  id: "test-user-id",
  email: "test@example.com",
};

export const mockDbResponse = (data: unknown): any => {
  const result = Array.isArray(data) ? data : [data];

  const mockDb: any = {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnValue(result),
    innerJoin: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    rightJoin: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    returning: jest.fn().mockReturnValue(result),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
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

// Dummy test to satisfy Jest requirement for test files
describe("Test Helpers", () => {
  it("should have valid helper functions", () => {
    expect(mockUser).toBeDefined();
    expect(mockDbResponse).toBeDefined();
    expect(createTestRequest).toBeDefined();
  });
});
