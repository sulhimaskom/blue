import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

jest.mock("next/server", () => ({
  NextRequest: jest.fn().mockImplementation((url, init) => {
    const headersMap = new Map();
    headersMap.set("x-forwarded-for", "192.168.1.1");
    headersMap.set("x-real-ip", "192.168.1.1");
    return {
      url,
      method: init?.method || "GET",
      headers: {
        get: (name: string) => headersMap.get(name),
        set: (name: string, value: string) => headersMap.set(name, value),
        has: (name: string) => headersMap.has(name),
      },
      json: jest.fn().mockResolvedValue({}),
      text: jest.fn().mockResolvedValue(""),
    };
  }),
  NextResponse: Object.assign(jest.fn(), {
    json: jest.fn().mockImplementation((data, init) => {
      const response = Object.create(NextResponse.prototype);
      Object.assign(response, {
        ...data,
        status: init?.status || 200,
        headers: new Map(Object.entries(init?.headers || {})),
        json: jest.fn().mockResolvedValue(data),
      });
      return response;
    }),
  }),
}));
import { APIRouteHandler } from "@/lib/services/api-route-handler";
import {
  validateRequest,
  formatSuccessResponse,
  formatErrorResponse,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  DatabaseError,
  RateLimitError,
} from "@/lib/api-utils";
import { logger } from "@/lib/logger";
import { UserService } from "@/lib/services/user-service";
import { monitoringService } from "@/lib/monitoring";
import { UnifiedCacheManager } from "@/lib/services/cache-orchestrator";
import { RuntimeServiceInitializer } from "@/lib/services/runtime-service-initializer";
import { IntelligentPrefetchService } from "@/lib/services/intelligent-prefetch-service";
import { RealTimePerformanceMonitor } from "@/lib/services/real-time-performance-monitor";
import { withCompression } from "@/lib/middleware/compression-wrapper";
import { Timing } from "@/lib/utils/time-measurement";

jest.mock("@/lib/api-utils", () => ({
  validateRequest: jest.fn().mockImplementation(() => {
    return jest.fn().mockResolvedValue({
      success: true,
      data: {},
    });
  }),
  formatSuccessResponse: jest.fn(),
  formatErrorResponse: jest.fn(),
  ValidationError: class ValidationError extends Error {
    statusCode = 400;
    constructor(message: any) {
      super(message);
    }
  },
  AuthenticationError: class AuthenticationError extends Error {
    statusCode = 401;
    constructor(message: any) {
      super(message);
    }
  },
  AuthorizationError: class AuthorizationError extends Error {
    statusCode = 403;
    constructor(message: any) {
      super(message);
    }
  },
  NotFoundError: class NotFoundError extends Error {
    statusCode = 404;
    constructor(message: any) {
      super(message);
    }
  },
  DatabaseError: class DatabaseError extends Error {
    statusCode = 500;
    constructor(message: any) {
      super(message);
    }
  },
  RateLimitError: class RateLimitError extends Error {
    statusCode = 429;
    resetTime?: number;
    constructor(message: any, resetTime?: number) {
      super(message);
      this.resetTime = resetTime;
    }
  },
}));

jest.mock("@/lib/logger", () => ({
  logger: {
    apiRequest: jest.fn(),
    apiError: jest.fn(),
    security: jest.fn(),
    warn: jest.fn(),
  },
  createRequestContext: jest.fn(() => ({ requestId: "test-request-id" })),
}));

jest.mock("@/lib/services/user-service", () => ({
  UserService: {
    getAuthenticatedUser: jest.fn(),
    hasSufficientCredits: jest.fn(),
  },
}));

jest.mock("@/lib/monitoring", () => ({
  monitoringService: {
    trackApiRequest: jest.fn(),
  },
}));

jest.mock("@/lib/services/cache-orchestrator", () => ({
  UnifiedCacheManager: {
    withCache: jest.fn(),
  },
}));

jest.mock("@/lib/services/runtime-service-initializer", () => ({
  RuntimeServiceInitializer: {
    initializeServices: jest.fn(),
  },
}));

jest.mock("@/lib/services/intelligent-prefetch-service", () => ({
  IntelligentPrefetchService: {
    initialize: jest.fn(),
  },
}));

jest.mock("@/lib/services/real-time-performance-monitor", () => ({
  RealTimePerformanceMonitor: {
    initialize: jest.fn(),
  },
}));

jest.mock("@/lib/middleware/compression-wrapper", () => ({
  withCompression: jest.fn(),
}));

jest.mock("@/lib/utils/time-measurement", () => ({
  Timing: {
    now: jest.fn(() => 1000),
    perf: jest.fn((start: number) => 1000 - start),
  },
}));

describe("APIRouteHandler", () => {
  let mockRequest: NextRequest;
  const mockUser = {
    id: 1,
    clerkId: "clerk-123",
    email: "test@example.com",
    credits: 100,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = new NextRequest("http://localhost:3000/api/test", {
      method: "POST",
    });

    mockRequest.headers.set("x-forwarded-for", "192.168.1.1");
    mockRequest.headers.set("x-real-ip", "192.168.1.1");

    (validateRequest as jest.Mock).mockImplementation(() => {
      return jest.fn().mockResolvedValue({
        success: true,
        data: {},
      });
    });

    (formatSuccessResponse as jest.Mock).mockReturnValue({
      success: true,
      data: { result: "test" },
    });

    (formatErrorResponse as jest.Mock).mockReturnValue({
      success: false,
      error: "Test error",
    });

    (RuntimeServiceInitializer.initializeServices as jest.Mock).mockResolvedValue(
      undefined,
    );
    (IntelligentPrefetchService.initialize as jest.Mock).mockResolvedValue(
      undefined,
    );
    (RealTimePerformanceMonitor.initialize as jest.Mock).mockResolvedValue(
      undefined,
    );
  });

  describe("createPOSTHandler", () => {
    it("should execute successful POST request with authentication", async () => {
      const testSchema = z.object({ name: z.string() });
      const mockHandler = jest.fn().mockResolvedValue({ result: "success" });
      const rateLimiter = jest.fn().mockResolvedValue({ allowed: true });

      const handler = APIRouteHandler.createPOSTHandler({
        schema: testSchema,
        requireAuth: true,
        rateLimiter,
        handler: mockHandler,
      });

      (UserService.getAuthenticatedUser as jest.Mock).mockResolvedValue(
        mockUser,
      );
      const validationFunctionMock = jest.fn().mockResolvedValue({
        success: true,
        data: { name: "test" },
      });
      (validateRequest as jest.Mock).mockReturnValue(validationFunctionMock);

      const response = await handler(mockRequest);

      expect(UserService.getAuthenticatedUser).toHaveBeenCalled();
      expect(rateLimiter).toHaveBeenCalledWith(`user:clerk-123:192.168.1.1`);
      expect(validationFunctionMock).toHaveBeenCalledWith(mockRequest);
      expect(mockHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          user: mockUser,
          data: { name: "test" },
        }),
      );
      expect(formatSuccessResponse).toHaveBeenCalledWith({ result: "success" });
      expect(logger.apiRequest).toHaveBeenCalled();
      expect(monitoringService.trackApiRequest).toHaveBeenCalled();
    });

    it("should execute POST request without authentication when requireAuth is false", async () => {
      const mockHandler = jest.fn().mockResolvedValue({ result: "success" });

      const handler = APIRouteHandler.createPOSTHandler({
        requireAuth: false,
        handler: mockHandler,
      });

      const response = await handler(mockRequest);

      expect(UserService.getAuthenticatedUser).not.toHaveBeenCalled();
      expect(mockHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          user: undefined,
        }),
      );
    });

    it("should enforce rate limiting", async () => {
      const mockHandler = jest.fn();
      const rateLimiter = jest.fn().mockResolvedValue({
        allowed: false,
        resetTime: 2000,
      });

      const handler = APIRouteHandler.createPOSTHandler({
        requireAuth: true,
        rateLimiter,
        handler: mockHandler,
      });

      (UserService.getAuthenticatedUser as jest.Mock).mockResolvedValue(
        mockUser,
      );

      const response = await handler(mockRequest);

      expect(logger.security).toHaveBeenCalledWith(
        "API rate limit exceeded",
        expect.any(Object),
      );
      expect(formatErrorResponse).toHaveBeenCalled();
      expect(mockHandler).not.toHaveBeenCalled();
    });

    it("should validate input with Zod schema", async () => {
      const testSchema = z.object({ name: z.string() });
      const mockHandler = jest.fn();

      const handler = APIRouteHandler.createPOSTHandler({
        schema: testSchema,
        requireAuth: true,
        handler: mockHandler,
      });

      (UserService.getAuthenticatedUser as jest.Mock).mockResolvedValue(
        mockUser,
      );
      (validateRequest as jest.Mock).mockImplementation(() => {
        return jest.fn().mockResolvedValue({
          success: false,
          error: "Validation failed: name is required",
        });
      });

      const response = await handler(mockRequest);

      expect(validateRequest).toHaveBeenCalledWith(testSchema, "body");
      expect(formatErrorResponse).toHaveBeenCalled();
      expect(mockHandler).not.toHaveBeenCalled();
    });

    it("should check sufficient credits when required", async () => {
      const testSchema = z.object({ name: z.string() });
      const mockHandler = jest.fn();

      const handler = APIRouteHandler.createPOSTHandler({
        schema: testSchema,
        requireAuth: true,
        requireCredits: 50,
        handler: mockHandler,
      });

      (UserService.getAuthenticatedUser as jest.Mock).mockResolvedValue(
        mockUser,
      );
      (UserService.hasSufficientCredits as jest.Mock).mockReturnValue(false);

      const response = await handler(mockRequest);

      expect(UserService.hasSufficientCredits).toHaveBeenCalledWith(
        mockUser,
        50,
      );
      expect(logger.warn).toHaveBeenCalled();
      expect(formatErrorResponse).toHaveBeenCalled();
      expect(mockHandler).not.toHaveBeenCalled();
    });

    it("should handle ValidationError", async () => {
      const mockHandler = jest.fn().mockRejectedValue(new ValidationError("Invalid input"));

      const handler = APIRouteHandler.createPOSTHandler({
        requireAuth: true,
        handler: mockHandler,
      });

      (UserService.getAuthenticatedUser as jest.Mock).mockResolvedValue(
        mockUser,
      );

      const response = await handler(mockRequest);

      expect(logger.apiError).toHaveBeenCalled();
      expect(formatErrorResponse).toHaveBeenCalled();
    });

    it("should handle AuthenticationError", async () => {
      const mockHandler = jest.fn().mockRejectedValue(new AuthenticationError("Not authenticated"));

      const handler = APIRouteHandler.createPOSTHandler({
        requireAuth: true,
        handler: mockHandler,
      });

      (UserService.getAuthenticatedUser as jest.Mock).mockResolvedValue(
        mockUser,
      );

      const response = await handler(mockRequest);

      expect(logger.apiError).toHaveBeenCalled();
      expect(formatErrorResponse).toHaveBeenCalled();
    });

    it("should handle RateLimitError", async () => {
      const mockHandler = jest.fn().mockRejectedValue(new RateLimitError("Rate exceeded", 2000));

      const handler = APIRouteHandler.createPOSTHandler({
        requireAuth: true,
        handler: mockHandler,
      });

      (UserService.getAuthenticatedUser as jest.Mock).mockResolvedValue(
        mockUser,
      );

      const response = await handler(mockRequest);

      expect(logger.apiError).toHaveBeenCalled();
      expect(formatErrorResponse).toHaveBeenCalled();
    });

    it("should handle unknown errors as DatabaseError", async () => {
      const mockHandler = jest.fn().mockRejectedValue(new Error("Unknown error"));

      const handler = APIRouteHandler.createPOSTHandler({
        requireAuth: true,
        handler: mockHandler,
      });

      (UserService.getAuthenticatedUser as jest.Mock).mockResolvedValue(
        mockUser,
      );

      const response = await handler(mockRequest);

      expect(logger.apiError).toHaveBeenCalled();
      expect(formatErrorResponse).toHaveBeenCalledWith(
        expect.objectContaining({ message: "API request failed" }),
      );
    });
  });

  describe("createPUTHandler", () => {
    it("should execute successful PUT request with authentication", async () => {
      const testSchema = z.object({ name: z.string() });
      const mockHandler = jest.fn().mockResolvedValue({ result: "success" });

      const handler = APIRouteHandler.createPUTHandler({
        schema: testSchema,
        requireAuth: true,
        rateLimiter: jest.fn().mockResolvedValue({ allowed: true }),
        handler: mockHandler,
      });

      (UserService.getAuthenticatedUser as jest.Mock).mockResolvedValue(
        mockUser,
      );
      (validateRequest as jest.Mock).mockImplementation(() => {
        return jest.fn().mockResolvedValue({
          success: true,
          data: { name: "test" },
        });
      });

      const response = await handler(mockRequest);

      expect(UserService.getAuthenticatedUser).toHaveBeenCalled();
      expect(mockHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          user: mockUser,
          data: { name: "test" },
        }),
      );
      expect(formatSuccessResponse).toHaveBeenCalledWith({ result: "success" });
      expect(logger.apiRequest).toHaveBeenCalledWith(
        "PUT",
        expect.any(String),
        "test-request-id",
        "clerk-123",
      );
    });

    it("should enforce rate limiting on PUT requests", async () => {
      const mockHandler = jest.fn();
      const rateLimiter = jest.fn().mockResolvedValue({
        allowed: false,
        resetTime: 3000,
      });

      const handler = APIRouteHandler.createPUTHandler({
        requireAuth: true,
        rateLimiter,
        handler: mockHandler,
      });

      (UserService.getAuthenticatedUser as jest.Mock).mockResolvedValue(
        mockUser,
      );

      const response = await handler(mockRequest);

      expect(logger.security).toHaveBeenCalledWith(
        "API rate limit exceeded",
        expect.any(Object),
      );
      expect(formatErrorResponse).toHaveBeenCalled();
      expect(mockHandler).not.toHaveBeenCalled();
    });

    it("should handle ValidationError on PUT requests", async () => {
      const mockHandler = jest.fn().mockRejectedValue(new ValidationError("Invalid update"));

      const handler = APIRouteHandler.createPUTHandler({
        requireAuth: true,
        handler: mockHandler,
      });

      (UserService.getAuthenticatedUser as jest.Mock).mockResolvedValue(
        mockUser,
      );

      const response = await handler(mockRequest);

      expect(logger.apiError).toHaveBeenCalledWith(
        "API PUT request failed",
        "test-request-id",
        expect.any(Error),
        expect.any(Object),
      );
      expect(formatErrorResponse).toHaveBeenCalled();
    });
  });

  describe("createGETHandler", () => {
    it("should execute successful GET request with authentication", async () => {
      const mockHandler = jest.fn().mockResolvedValue({ result: "success" });

      const handler = APIRouteHandler.createGETHandler({
        requireAuth: true,
        handler: mockHandler,
      });

      (UserService.getAuthenticatedUser as jest.Mock).mockResolvedValue(
        mockUser,
      );

      const response = await handler(mockRequest);

      expect(UserService.getAuthenticatedUser).toHaveBeenCalled();
      expect(mockHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          user: mockUser,
        }),
      );
      expect(formatSuccessResponse).toHaveBeenCalledWith({ result: "success" });
      expect(logger.apiRequest).toHaveBeenCalledWith(
        "GET",
        expect.any(String),
        "test-request-id",
        "clerk-123",
      );
      expect(monitoringService.trackApiRequest).toHaveBeenCalledWith(
        "GET",
        "/api/test",
        200,
        expect.any(Number),
        "clerk-123",
      );
    });

    it("should execute GET request without authentication", async () => {
      const mockHandler = jest.fn().mockResolvedValue({ result: "success" });

      const handler = APIRouteHandler.createGETHandler({
        requireAuth: false,
        handler: mockHandler,
      });

      const response = await handler(mockRequest);

      expect(UserService.getAuthenticatedUser).not.toHaveBeenCalled();
      expect(mockHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          user: undefined,
        }),
      );
    });

    it("should handle AuthenticationError on GET requests", async () => {
      const mockHandler = jest.fn().mockRejectedValue(new AuthenticationError("Not authenticated"));

      const handler = APIRouteHandler.createGETHandler({
        requireAuth: true,
        handler: mockHandler,
      });

      (UserService.getAuthenticatedUser as jest.Mock).mockResolvedValue(
        mockUser,
      );

      const response = await handler(mockRequest);

      expect(logger.apiError).toHaveBeenCalledWith(
        "API GET request failed",
        "test-request-id",
        expect.any(Error),
        expect.any(Object),
      );
      expect(formatErrorResponse).toHaveBeenCalled();
    });

    it("should handle NotFoundError on GET requests", async () => {
      const mockHandler = jest.fn().mockRejectedValue(new NotFoundError("Resource not found"));

      const handler = APIRouteHandler.createGETHandler({
        requireAuth: true,
        handler: mockHandler,
      });

      (UserService.getAuthenticatedUser as jest.Mock).mockResolvedValue(
        mockUser,
      );

      const response = await handler(mockRequest);

      expect(logger.apiError).toHaveBeenCalled();
      expect(formatErrorResponse).toHaveBeenCalled();
    });
  });

  describe("createCachedGETHandler", () => {
    it("should initialize runtime services when not disabled", async () => {
      const mockHandler = jest.fn().mockResolvedValue({ result: "cached" });
      const cacheConfig = {
        ttl: 3600,
        tags: ["test"],
        varyBy: [],
      };

      const handler = APIRouteHandler.createCachedGETHandler(
        {
          requireAuth: false,
          handler: mockHandler,
        },
        cacheConfig,
      );

      let capturedHandler: Function | undefined;
      (withCompression as jest.Mock).mockImplementation((fn, req) => fn(req));
      (UnifiedCacheManager.withCache as jest.Mock).mockImplementation(
        async (req, cacheFn) => {
          capturedHandler = cacheFn;
          return NextResponse.json({ result: "cached" });
        },
      );

      await handler(mockRequest);

      expect(RuntimeServiceInitializer.initializeServices).toHaveBeenCalled();
      expect(IntelligentPrefetchService.initialize).toHaveBeenCalled();
      expect(RealTimePerformanceMonitor.initialize).toHaveBeenCalled();
    });

    it("should skip service initialization when disabled", async () => {
      const mockHandler = jest.fn().mockResolvedValue({ result: "cached" });
      const cacheConfig = {
        ttl: 3600,
        tags: ["test"],
        varyBy: [],
        initializeServices: false,
      };

      const handler = APIRouteHandler.createCachedGETHandler(
        {
          requireAuth: false,
          handler: mockHandler,
        },
        cacheConfig,
      );

      (withCompression as jest.Mock).mockImplementation((fn, req) => fn(req));
      (UnifiedCacheManager.withCache as jest.Mock).mockImplementation(
        async (req, cacheFn) => {
          return NextResponse.json({ result: "cached" });
        },
      );

      const response = await handler(mockRequest);

      expect(RuntimeServiceInitializer.initializeServices).not.toHaveBeenCalled();
      expect(IntelligentPrefetchService.initialize).not.toHaveBeenCalled();
      expect(RealTimePerformanceMonitor.initialize).not.toHaveBeenCalled();
    });

    it("should cache responses with proper configuration", async () => {
      const mockHandler = jest.fn().mockResolvedValue({ result: "cached" });
      const cacheConfig = {
        ttl: 3600,
        tags: ["test"],
        varyBy: ["userId"],
      };

      const handler = APIRouteHandler.createCachedGETHandler(
        {
          requireAuth: false,
          handler: mockHandler,
        },
        cacheConfig,
      );

      (withCompression as jest.Mock).mockImplementation((fn, req) => fn(req));
      (UnifiedCacheManager.withCache as jest.Mock).mockImplementation(
        async (req, cacheFn) => {
          return NextResponse.json({ result: "cached" });
        },
      );

      const response = await handler(mockRequest);

      expect(UnifiedCacheManager.withCache).toHaveBeenCalledWith(
        mockRequest,
        expect.any(Function),
        { ttl: 3600, tags: ["test"], varyBy: ["userId"] },
      );
    });

    it("should enforce rate limiting on cached GET requests", async () => {
      const mockHandler = jest.fn();
      const rateLimiter = jest.fn().mockResolvedValue({
        allowed: false,
        resetTime: 2000,
      });
      const cacheConfig = {
        ttl: 3600,
        tags: ["test"],
        varyBy: [],
      };

      const handler = APIRouteHandler.createCachedGETHandler(
        {
          requireAuth: true,
          rateLimiter,
          handler: mockHandler,
        },
        cacheConfig,
      );

      (withCompression as jest.Mock).mockImplementation((fn, req) => fn(req));
      (UnifiedCacheManager.withCache as jest.Mock).mockImplementation(
        async (req, cacheFn) => {
          (UserService.getAuthenticatedUser as jest.Mock).mockResolvedValue(
            mockUser,
          );
          return cacheFn();
        },
      );

      await expect(handler(mockRequest)).rejects.toThrow(RateLimitError);
      expect(logger.security).toHaveBeenCalledWith(
        "API rate limit exceeded",
        expect.any(Object),
      );
    });

    it("should use custom status from getStatus function", async () => {
      const mockHandler = jest.fn().mockResolvedValue({ result: "custom" });
      const cacheConfig = {
        ttl: 3600,
        tags: ["test"],
        varyBy: [],
        getStatus: (data: any) => data.result === "custom" ? 201 : 200,
      };

      const handler = APIRouteHandler.createCachedGETHandler(
        {
          requireAuth: false,
          handler: mockHandler,
        },
        cacheConfig,
      );

      let capturedResponse: NextResponse | undefined;
      (withCompression as jest.Mock).mockImplementation((fn, req) => fn(req));
      (UnifiedCacheManager.withCache as jest.Mock).mockImplementation(
        async (req, cacheFn) => {
          const result = await cacheFn();
          capturedResponse = result;
          return result;
        },
      );

      await handler(mockRequest);

      expect(capturedResponse?.status).toBe(201);
    });
  });

  describe("createSimpleCachedGETHandler", () => {
    it("should create cached handler without authentication", async () => {
      const mockHandler = jest.fn().mockResolvedValue({ result: "simple" });
      const cacheConfig = {
        ttl: 1800,
        tags: ["simple"],
        varyBy: [],
      };

      const handler = APIRouteHandler.createSimpleCachedGETHandler(
        mockHandler,
        cacheConfig,
      );

      (withCompression as jest.Mock).mockImplementation((fn, req) => fn(req));
      (UnifiedCacheManager.withCache as jest.Mock).mockImplementation(
        async (req, cacheFn) => cacheFn(),
      );

      const response = await handler(mockRequest);

      expect(mockHandler).toHaveBeenCalledWith(mockRequest);
      expect(UnifiedCacheManager.withCache).toHaveBeenCalledWith(
        mockRequest,
        expect.any(Function),
        { ttl: 1800, tags: ["simple"], varyBy: [] },
      );
    });
  });

  describe("createDELETEHandler", () => {
    it("should execute successful DELETE request with authentication", async () => {
      const mockHandler = jest.fn().mockResolvedValue({ result: "deleted" });

      const handler = APIRouteHandler.createDELETEHandler({
        requireAuth: true,
        rateLimiter: jest.fn().mockResolvedValue({ allowed: true }),
        handler: mockHandler,
      });

      (UserService.getAuthenticatedUser as jest.Mock).mockResolvedValue(
        mockUser,
      );

      const response = await handler(mockRequest);

      expect(UserService.getAuthenticatedUser).toHaveBeenCalled();
      expect(mockHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          user: mockUser,
        }),
      );
      expect(response).toBeInstanceOf(NextResponse);
      expect(logger.apiRequest).toHaveBeenCalledWith(
        "DELETE",
        "/api/test",
        "test-request-id",
        "clerk-123",
      );
    });

    it("should enforce rate limiting on DELETE requests", async () => {
      const mockHandler = jest.fn();
      const rateLimiter = jest.fn().mockResolvedValue({
        allowed: false,
        resetTime: 2000,
      });

      const handler = APIRouteHandler.createDELETEHandler({
        requireAuth: true,
        rateLimiter,
        handler: mockHandler,
      });

      (UserService.getAuthenticatedUser as jest.Mock).mockResolvedValue(
        mockUser,
      );

      const response = await handler(mockRequest);

      expect(response.status).toBe(429);
      expect(response.headers.get("X-RateLimit-Reset")).toBe("2000");
      expect(logger.security).toHaveBeenCalled();
      expect(mockHandler).not.toHaveBeenCalled();
    });

    it("should handle ValidationError with 400 status", async () => {
      const mockHandler = jest.fn().mockRejectedValue(new ValidationError("Invalid request"));

      const handler = APIRouteHandler.createDELETEHandler({
        requireAuth: true,
        handler: mockHandler,
      });

      (UserService.getAuthenticatedUser as jest.Mock).mockResolvedValue(
        mockUser,
      );

      const response = await handler(mockRequest);

      expect(response.status).toBe(400);
      expect(logger.apiError).toHaveBeenCalled();
    });

    it("should handle AuthenticationError with 401 status", async () => {
      const mockHandler = jest.fn().mockRejectedValue(new AuthenticationError("Not authenticated"));

      const handler = APIRouteHandler.createDELETEHandler({
        requireAuth: true,
        handler: mockHandler,
      });

      (UserService.getAuthenticatedUser as jest.Mock).mockResolvedValue(
        mockUser,
      );

      const response = await handler(mockRequest);

      expect(response.status).toBe(401);
      expect(logger.apiError).toHaveBeenCalled();
    });

    it("should handle AuthorizationError with 403 status", async () => {
      const mockHandler = jest.fn().mockRejectedValue(new AuthorizationError("Not authorized"));

      const handler = APIRouteHandler.createDELETEHandler({
        requireAuth: true,
        handler: mockHandler,
      });

      (UserService.getAuthenticatedUser as jest.Mock).mockResolvedValue(
        mockUser,
      );

      const response = await handler(mockRequest);

      expect(response.status).toBe(403);
      expect(logger.apiError).toHaveBeenCalled();
    });

    it("should handle NotFoundError with 404 status", async () => {
      const mockHandler = jest.fn().mockRejectedValue(new NotFoundError("Resource not found"));

      const handler = APIRouteHandler.createDELETEHandler({
        requireAuth: true,
        handler: mockHandler,
      });

      (UserService.getAuthenticatedUser as jest.Mock).mockResolvedValue(
        mockUser,
      );

      const response = await handler(mockRequest);

      expect(response.status).toBe(404);
      expect(logger.apiError).toHaveBeenCalled();
    });

    it("should handle DatabaseError with 500 status", async () => {
      const mockHandler = jest.fn().mockRejectedValue(new DatabaseError("Database error"));

      const handler = APIRouteHandler.createDELETEHandler({
        requireAuth: true,
        handler: mockHandler,
      });

      (UserService.getAuthenticatedUser as jest.Mock).mockResolvedValue(
        mockUser,
      );

      const response = await handler(mockRequest);

      expect(response.status).toBe(500);
      expect(logger.apiError).toHaveBeenCalled();
    });

    it("should handle unknown errors with 500 status", async () => {
      const mockHandler = jest.fn().mockRejectedValue(new Error("Unknown error"));

      const handler = APIRouteHandler.createDELETEHandler({
        requireAuth: true,
        handler: mockHandler,
      });

      (UserService.getAuthenticatedUser as jest.Mock).mockResolvedValue(
        mockUser,
      );

      const response = await handler(mockRequest);

      expect(response.status).toBe(500);
      expect(logger.apiError).toHaveBeenCalledWith(
        "Unhandled error in DELETE",
        "test-request-id",
        expect.any(Error),
        expect.any(Object),
      );
    });
  });

  describe("Integration Scenarios", () => {
    it("should handle complete POST request flow with all features", async () => {
      const testSchema = z.object({ name: z.string(), email: z.string().email() });
      const mockHandler = jest.fn().mockResolvedValue({ success: true, id: 123 });
      const rateLimiter = jest.fn().mockResolvedValue({ allowed: true });

      const handler = APIRouteHandler.createPOSTHandler({
        schema: testSchema,
        requireAuth: true,
        requireCredits: 10,
        rateLimiter,
        handler: mockHandler,
      });

      (UserService.getAuthenticatedUser as jest.Mock).mockResolvedValue(
        mockUser,
      );
      (UserService.hasSufficientCredits as jest.Mock).mockReturnValue(true);
      (validateRequest as jest.Mock).mockImplementation(() => {
        return jest.fn().mockResolvedValue({
          success: true,
          data: { name: "Test User", email: "test@example.com" },
        });
      });

      const response = await handler(mockRequest);

      expect(UserService.getAuthenticatedUser).toHaveBeenCalled();
      expect(rateLimiter).toHaveBeenCalledWith(`user:clerk-123:192.168.1.1`);
      expect(UserService.hasSufficientCredits).toHaveBeenCalledWith(mockUser, 10);
      expect(validateRequest).toHaveBeenCalledWith(testSchema, "body");
      expect(mockHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          user: mockUser,
          data: { name: "Test User", email: "test@example.com" },
        }),
      );
      expect(logger.apiRequest).toHaveBeenCalledWith(
        "POST",
        expect.any(String),
        "test-request-id",
        "clerk-123",
      );
      expect(monitoringService.trackApiRequest).toHaveBeenCalledWith(
        "POST",
        "/api/test",
        200,
        expect.any(Number),
        "clerk-123",
      );
      expect(formatSuccessResponse).toHaveBeenCalledWith({
        success: true,
        id: 123,
      });
    });

    it("should handle complete cached GET request flow with service initialization", async () => {
      const mockHandler = jest.fn().mockResolvedValue({ data: "cached data" });
      const rateLimiter = jest.fn().mockResolvedValue({ allowed: true });
      const cacheConfig = {
        ttl: 3600,
        tags: ["test-data"],
        varyBy: ["userId"],
      };

      const handler = APIRouteHandler.createCachedGETHandler(
        {
          requireAuth: true,
          rateLimiter,
          handler: mockHandler,
        },
        cacheConfig,
      );

      (withCompression as jest.Mock).mockImplementation((fn, req) => fn(req));
      (UnifiedCacheManager.withCache as jest.Mock).mockImplementation(
        async (req, cacheFn) => {
          (UserService.getAuthenticatedUser as jest.Mock).mockResolvedValue(
            mockUser,
          );
          return cacheFn();
        },
      );

      const response = await handler(mockRequest);

      expect(RuntimeServiceInitializer.initializeServices).toHaveBeenCalled();
      expect(IntelligentPrefetchService.initialize).toHaveBeenCalled();
      expect(RealTimePerformanceMonitor.initialize).toHaveBeenCalled();
      expect(withCompression).toHaveBeenCalled();
      expect(UnifiedCacheManager.withCache).toHaveBeenCalled();
    });

    it("should properly log error context for all error types", async () => {
      const mockHandler = jest.fn().mockRejectedValue(new AuthenticationError("Auth failed"));

      const handler = APIRouteHandler.createPOSTHandler({
        requireAuth: true,
        handler: mockHandler,
      });

      (UserService.getAuthenticatedUser as jest.Mock).mockResolvedValue(
        mockUser,
      );

      await handler(mockRequest);

      expect(logger.apiError).toHaveBeenCalledWith(
        expect.any(String),
        "test-request-id",
        expect.any(Error),
        expect.objectContaining({
          userId: "clerk-123",
          endpoint: "http://localhost:3000/api/test",
        }),
      );
    });

    it("should properly initialize services with compression", async () => {
      const mockHandler = jest.fn().mockResolvedValue({ result: "test" });
      const cacheConfig = {
        ttl: 3600,
        tags: ["test"],
        varyBy: [],
        initializeServices: true,
      };

      const handler = APIRouteHandler.createCachedGETHandler(
        {
          requireAuth: true,
          rateLimiter: jest.fn().mockResolvedValue({ allowed: true }),
          handler: mockHandler,
        },
        cacheConfig,
      );

      (UserService.getAuthenticatedUser as jest.Mock).mockResolvedValue(
        mockUser,
      );

      (withCompression as jest.Mock).mockImplementation((fn, req) => fn(req));
      (UnifiedCacheManager.withCache as jest.Mock).mockImplementation(
        async (req, cacheFn) => {
          (UserService.getAuthenticatedUser as jest.Mock).mockResolvedValue(
            mockUser,
          );
          return cacheFn();
        },
      );

      const response = await handler(mockRequest);

      expect(RuntimeServiceInitializer.initializeServices).toHaveBeenCalled();
      expect(IntelligentPrefetchService.initialize).toHaveBeenCalled();
      expect(RealTimePerformanceMonitor.initialize).toHaveBeenCalled();
      expect(withCompression).toHaveBeenCalled();
      expect(UnifiedCacheManager.withCache).toHaveBeenCalled();
    });
  });
});
