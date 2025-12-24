/**
 * Comprehensive API Test Helper
 *
 * Centralizes all test setup and configuration to provide
 * a consistent testing experience across the entire test suite.
 */

import {
  mockGitHubService,
  mockUserService,
  mockWebhookService,
  mockSecurityService,
  mockMonitoringService,
  mockAPIMetricsService,
  mockCircuitBreakerService,
  mockCacheService,
  mockDatabase,
} from "../factories/mock-factory";
import { createDatabaseMock } from "../builders/database-builder";
import { setupEnvironmentMocks } from "../setup/environment-mocks";
import { setupAuthMocks, MockUser } from "../setup/auth-setup";

export interface TestUser extends MockUser {
  clerkId: string;
  credits?: number;
}

export interface ApiTestConfig {
  user?: TestUser | null;
  databaseData?: any[];
  authenticated?: boolean;
}

export class ApiTestHelper {
  private dbMock: any;
  private currentUser: TestUser | null = null;

  constructor(config?: ApiTestConfig) {
    try {
      this.setupCommonMocks();

      if (config) {
        if (config.user !== undefined) {
          this.withAuth(config.user || undefined);
        } else if (config.authenticated) {
          this.withAuth();
        }

        if (config.databaseData) {
          this.withDbQuery(config.databaseData);
        }
      }
    } catch (error) {
      console.error("Error in ApiTestHelper constructor:", error);
      throw error;
    }
  }

  private setupCommonMocks() {
    setupEnvironmentMocks();
    this.setupServiceMocks();
    this.setupDatabaseMocks();
  }

  private setupServiceMocks() {
    // Services are already mocked by the factory
    // Just ensure they're available
    this.getMock("githubService");
    this.getMock("userService");
    this.getMock("webhookService");
    this.getMock("securityService");
    this.getMock("monitoringService");
    this.getMock("apiMetricsService");
    this.getMock("circuitBreakerService");
    this.getMock("cacheService");
  }

  private setupDatabaseMocks() {
    this.dbMock = createDatabaseMock();
    jest.mock("@/lib/db", () => ({
      db: this.dbMock,
    }));
  }

  /**
   * Get a specific service mock by name
   */
  getMock(serviceName: string) {
    const mocks: Record<string, any> = {
      githubService: mockGitHubService,
      userService: mockUserService,
      webhookService: mockWebhookService,
      securityService: mockSecurityService,
      monitoringService: mockMonitoringService,
      apiMetricsService: mockAPIMetricsService,
      circuitBreakerService: mockCircuitBreakerService,
      cacheService: mockCacheService,
      database: mockDatabase,
    };

    return mocks[serviceName];
  }

  /**
   * Set database query results
   */
  withDbQuery(data: any[]) {
    this.dbMock = createDatabaseMock(data);
    return this;
  }

  /**
   * Set authenticated user context
   */
  withAuth(user?: TestUser) {
    const defaultUser: TestUser = {
      id: "user_test_123",
      clerkId: "user_test_123",
      email: "test@example.com",
      firstName: "Test",
      lastName: "User",
    };

    this.currentUser = user || defaultUser;
    setupAuthMocks(this.currentUser);
    return this;
  }

  /**
   * Set unauthenticated context
   */
  withoutAuth() {
    this.currentUser = null;
    setupAuthMocks(null);
    return this;
  }

  /**
   * Get current authenticated user
   */
  getCurrentUser(): TestUser | null {
    return this.currentUser;
  }

  /**
   * Reset all mocks between tests
   */
  resetAll() {
    jest.clearAllMocks();

    // Reset service mocks
    Object.values({
      githubService: mockGitHubService,
      userService: mockUserService,
      webhookService: mockWebhookService,
      securityService: mockSecurityService,
      monitoringService: mockMonitoringService,
      apiMetricsService: mockAPIMetricsService,
      circuitBreakerService: mockCircuitBreakerService,
      cacheService: mockCacheService,
    }).forEach((mock) => {
      Object.values(mock).forEach((method: any) => {
        if (typeof method === "function" && method.mockClear) {
          method.mockClear();
        }
      });
    });
  }

  /**
   * Setup successful user service responses
   */
  withSuccessfulUserResponses() {
    mockUserService.getUserByClerkId.mockResolvedValue(this.currentUser);
    mockUserService.updateUserCredits.mockResolvedValue(this.currentUser);
    mockUserService.getAuthenticatedUser.mockResolvedValue(this.currentUser);
    return this;
  }

  /**
   * Setup successful GitHub service responses
   */
  withSuccessfulGitHubResponses() {
    mockGitHubService.createRepository.mockResolvedValue({
      id: 12345,
      name: "test-repo",
      full_name: "test-org/test-repo",
      html_url: "https://github.com/test-org/test-repo",
      clone_url: "https://github.com/test-org/test-repo.git",
      private: false,
      created_at: new Date().toISOString(),
    });
    return this;
  }

  /**
   * Create a simple request object with proper URL
   */
  createRequest(overrides: any = {}) {
    const method = overrides.method || "GET";
    const path = overrides.path || overrides.url || "/api/test";
    const url = `http://localhost:3000${path}`;

    return {
      url,
      method,
      headers: {
        get: jest.fn((key: string) => overrides?.headers?.[key] || null),
        set: jest.fn(),
        has: jest.fn(),
        delete: jest.fn(),
        entries: jest.fn(),
        keys: jest.fn(),
        values: jest.fn(),
        forEach: jest.fn(),
        ...overrides?.headers,
      },
      json: async () => overrides.body || {},
      cookies: new Map(),
      nextUrl: new URL(url),
      page: {
        params: overrides.params || {},
        searchParams: new URLSearchParams(),
      },
      ua: "test-ua",
      ip: "127.0.0.1",
      geo: {},
      ...overrides,
    };
  }

  /**
   * Create test user with specific properties
   */
  createTestUser(overrides: Partial<TestUser> = {}): TestUser {
    return {
      id: "user_test_123",
      clerkId: "user_test_123",
      email: "test@example.com",
      firstName: "Test",
      lastName: "User",
      ...overrides,
    };
  }
}

/**
 * Factory function for creating test helpers
 */
export function createApiTestHelper(config?: ApiTestConfig) {
  return new ApiTestHelper(config);
}
