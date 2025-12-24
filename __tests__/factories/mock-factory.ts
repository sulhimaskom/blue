/**
 * Centralized Mock Factory for Test Infrastructure
 *
 * Provides standardized mock creation for all services and utilities
 * following the LEGO principle of atomic, reusable components.
 */

import type { UserService } from "@/lib/services/user-service";
import { GitHubServiceError } from "@/lib/services/github-service";

export interface ServiceMock<T> {
  [key: string]: jest.Mock;
}

export class MockFactory {
  /**
   * Creates a comprehensive service mock with proper Jest mock methods
   * and error classes for testing error scenarios.
   */
  static createServiceMock<T extends object>(
    serviceName: string,
    methods: string[],
    errorClassName?: string,
  ): ServiceMock<T> {
    const mock: ServiceMock<T> = {} as any;

    // Create Jest mock for each method
    methods.forEach((method) => {
      mock[method] = jest.fn();
    });

    // Mock the module with proper exports
    const mockModule: any = {
      [serviceName]: mock,
    };

    // Add error class if specified
    if (errorClassName) {
      mockModule[errorClassName] = class extends Error {
        constructor(message: string, statusCode?: number) {
          super(message);
          this.name = errorClassName || "Error";
        }
      };
    }

    // Mock the module - special handling for certain services
    if (serviceName === "monitoring") {
      // Already handled above
      return mock;
    }

    jest.mock(`@/lib/services/${serviceName}`, () => mockModule, {
      virtual: true,
    });

    return mock;
  }

  /**
   * Creates GitHub service mock with all required methods
   */
  static createGitHubServiceMock() {
    return this.createServiceMock(
      "github-service",
      [
        "createRepository",
        "verifyRepositoryExists",
        "commitBlueprintToRepository",
        "createRepositoryFromBlueprint",
      ],
      "GitHubServiceError",
    );
  }

  /**
   * Creates user service mock with authentication methods
   */
  static createUserServiceMock() {
    return this.createServiceMock(
      "user-service",
      [
        "getUserByClerkId",
        "updateUserCredits",
        "getAuthenticatedUser",
        "createUserCreditTransaction",
      ],
      "UserServiceError",
    );
  }

  /**
   * Creates webhook service mock for processing events
   */
  static createWebhookServiceMock() {
    return this.createServiceMock("webhook-service", [
      "createWebhookResponse",
      "verifyWebhookSignature",
      "handleWebhookEvent",
    ]);
  }

  /**
   * Creates security service mock for verification operations
   */
  static createSecurityServiceMock() {
    return this.createServiceMock("security-service", [
      "verifyClerkWebhook",
      "verifyStripeWebhook",
      "validateRequest",
    ]);
  }

  /**
   * Creates AI service mock for blueprint generation
   */
  static createAIServiceMock() {
    return this.createServiceMock(
      "ai-service",
      ["generateBlueprint", "refineBlueprint", "analyzeRequirements"],
      "AIServiceError",
    );
  }

  /**
   * Creates blueprint engine mock for generation pipeline
   */
  static createBlueprintEngineMock() {
    return this.createServiceMock(
      "blueprint-engine",
      ["generateBlueprint", "refineBlueprint", "validateBlueprint"],
      "BlueprintEngineError",
    );
  }

  /**
   * Creates monitoring service mock for system health
   */
  static createMonitoringServiceMock() {
    const monitoringMock = {
      getSystemHealth: jest.fn(),
      trackError: jest.fn(),
      trackAPICall: jest.fn(),
      trackGitHubOperation: jest.fn(),
    };

    jest.mock("@/lib/monitoring", () => ({
      monitoringService: monitoringMock,
    }));

    return monitoringMock;
  }

  /**
   * Creates API metrics service mock for analytics
   */
  static createAPIMetricsServiceMock() {
    return this.createServiceMock("api-metrics-service", [
      "getApplicationHealthChecks",
      "calculateOverallSystemStatus",
      "getMetricSummary",
      "getMetricData",
      "getComprehensiveMetrics",
    ]);
  }

  /**
   * Creates circuit breaker service mock for resilience
   */
  static createCircuitBreakerServiceMock() {
    return this.createServiceMock("circuit-breaker", [
      "getAllCircuitBreakers",
      "getCircuitBreakerMetrics",
      "resetCircuitBreaker",
      "resetAllCircuitBreakers",
    ]);
  }

  /**
   * Creates cache service mock for performance
   */
  static createCacheServiceMock() {
    return this.createServiceMock("cache-service", [
      "getMetrics",
      "getEnhancedMetrics",
      "clearCache",
      "warmCache",
    ]);
  }

  /**
   * Creates database mock for data operations
   */
  static createDatabaseMock() {
    const databaseMock = {
      select: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      query: jest.fn(),
    };

    jest.mock("@/lib/db", () => ({
      db: jest.fn(() => databaseMock),
    }));

    return databaseMock;
  }
}

/**
 * Mock instances that can be imported across test files
 * These are created once and reused to maintain consistency
 */
export const mockGitHubService = MockFactory.createGitHubServiceMock();
export const mockUserService = MockFactory.createUserServiceMock();
export const mockWebhookService = MockFactory.createWebhookServiceMock();
export const mockSecurityService = MockFactory.createSecurityServiceMock();
export const mockAIService = MockFactory.createAIServiceMock();
export const mockBlueprintEngine = MockFactory.createBlueprintEngineMock();
export const mockMonitoringService = MockFactory.createMonitoringServiceMock();
export const mockAPIMetricsService = MockFactory.createAPIMetricsServiceMock();
export const mockCircuitBreakerService =
  MockFactory.createCircuitBreakerServiceMock();
export const mockCacheService = MockFactory.createCacheServiceMock();
export const mockDatabase = MockFactory.createDatabaseMock();
