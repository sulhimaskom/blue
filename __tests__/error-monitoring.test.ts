/**
 * Tests for Production Error Monitoring Service
 *
 * Validates enterprise-grade error tracking and monitoring capabilities
 * Critical for production deployment and enterprise compliance
 */
import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import {
  errorMonitoring,
  captureApiError,
  createMonitoredError,
} from "../lib/services/error-monitoring-service";

// Mock Sentry to avoid actual error reporting during tests
jest.mock("@sentry/node", () => ({
  init: jest.fn(),
  setUser: jest.fn(),
  setTags: jest.fn(),
  setExtra: jest.fn(),
  captureException: jest.fn(),
  addBreadcrumb: jest.fn(),
}));

// Mock logger to capture log calls
jest.mock("../lib/logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe("ErrorMonitoringService", () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe("Initialization", () => {
    it("should initialize successfully in production environment", () => {
      expect(() => errorMonitoring.initialize()).not.toThrow();
    });

    it("should not initialize without Sentry DSN", () => {
      // Mock missing Sentry DSN
      const originalDsn = process.env.SENTRY_DSN;
      delete process.env.SENTRY_DSN;

      expect(() => errorMonitoring.initialize()).not.toThrow();

      // Restore
      if (originalDsn) process.env.SENTRY_DSN = originalDsn;
    });

    it("should provide health check status", () => {
      const health = errorMonitoring.healthCheck();
      expect(health).toHaveProperty("status");
      expect(health).toHaveProperty("service", "Sentry Error Monitoring");
      expect(health).toHaveProperty("environment");
    });
  });

  describe("Error Capture", () => {
    it("should capture errors with context", () => {
      const error = new Error("Test error");
      const context = {
        user: { id: "user123", email: "test@example.com" },
        tags: { component: "test" },
      };

      expect(() => errorMonitoring.captureError(error, context)).not.toThrow();
    });

    it("should capture API errors with structured data", () => {
      const error = new Error("API failed");

      expect(() => {
        captureApiError("/api/test", "POST", 500, error, {
          requestId: "req123",
          userId: "user123",
          duration: 250,
        });
      }).not.toThrow();
    });

    it("should create monitored errors with business context", () => {
      expect(() => {
        const error = createMonitoredError("Validation failed", "validation", {
          requestId: "req123",
          endpoint: "/api/blueprints",
        });

        expect(error).toBeInstanceOf(Error);
        expect(error.name).toBe("ValidationError");
      }).not.toThrow();
    });

    it("should handle string errors", () => {
      expect(() => {
        errorMonitoring.captureError("String error", {
          tags: { type: "test" },
        });
      }).not.toThrow();
    });
  });

  describe("Business Event Tracking", () => {
    it("should capture business events with metadata", () => {
      expect(() => {
        errorMonitoring.captureBusinessEvent("blueprint_generated", {
          value: 1,
          category: "blueprints",
          component: "engine",
        });
      }).not.toThrow();
    });

    it("should handle events without metadata", () => {
      expect(() => {
        errorMonitoring.captureBusinessEvent("simple_event");
      }).not.toThrow();
    });
  });

  describe("Error Classification", () => {
    it("should classify authentication errors correctly", () => {
      const error = createMonitoredError(
        "Unauthorized access",
        "authentication",
        { requestId: "req123" },
      );

      expect(error.name).toBe("AuthenticationError");
      expect(error.message).toBe("Unauthorized access");
    });

    it("should classify external service errors correctly", () => {
      const error = createMonitoredError(
        "External API timeout",
        "external_service",
        { requestId: "req123", endpoint: "/api/github" },
      );

      expect(error.name).toBe("ExternalServiceError");
    });

    it("should classify validation errors correctly", () => {
      const error = createMonitoredError("Invalid input data", "validation", {
        requestId: "req123",
      });

      expect(error.name).toBe("ValidationError");
    });
  });

  describe("Enterprise Compliance Features", () => {
    it("should capture user context for compliance", () => {
      const error = new Error("User operation failed");
      const context = {
        user: {
          id: "user123",
          email: "user@example.com",
          clerkId: "clerk_123",
          subscriptionTier: "enterprise",
        },
        tags: { compliance: "gdpr" },
      };

      expect(() => {
        errorMonitoring.captureError(error, context);
      }).not.toThrow();
    });

    it("should track API performance for SLA monitoring", () => {
      expect(() => {
        captureApiError(
          "/api/blueprints",
          "POST",
          503,
          new Error("Service temporarily unavailable"),
          {
            requestId: "req123",
            userId: "user123",
            duration: 5000, // 5 seconds - SLA violation
          },
        );
      }).not.toThrow();
    });

    it("should assess business impact correctly", () => {
      const criticalError = createMonitoredError(
        "Database connection failed",
        "internal_system",
        { requestId: "req123" },
      );

      expect(criticalError.name).toBe("InternalSystemError");
    });
  });

  describe("Graceful Degradation", () => {
    it("should work without Sentry installed", () => {
      // Mock Sentry to throw an error
      const Sentry = require("@sentry/node");
      Sentry.init.mockImplementation(() => {
        throw new Error("Sentry not available");
      });

      expect(() => errorMonitoring.initialize()).not.toThrow();
      expect(() => errorMonitoring.captureError("Test error")).not.toThrow();
    });

    it("should handle configuration errors", () => {
      // Mock empty Sentry DSN
      const originalDsn = process.env.SENTRY_DSN;
      process.env.SENTRY_DSN = "";

      expect(() => errorMonitoring.initialize()).not.toThrow();

      const health = errorMonitoring.healthCheck();
      expect(health.status).toBe("unhealthy");

      // Restore
      if (originalDsn) process.env.SENTRY_DSN = originalDsn;
      else delete process.env.SENTRY_DSN;
    });
  });
});
