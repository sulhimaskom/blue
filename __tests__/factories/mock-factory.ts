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

    // Mock the module
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
