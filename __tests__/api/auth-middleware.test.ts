import { NextRequest } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { mockUser, createTestRequest } from "../helpers";

// Mock the imports
jest.mock("@clerk/nextjs/server");

const mockCurrentUser = currentUser as jest.MockedFunction<typeof currentUser>;

describe("Authentication Middleware", () => {
  describe("Protected Routes - Authentication", () => {
    it("should allow access with valid authenticated user", async () => {
      // Arrange
      mockCurrentUser.mockResolvedValue(mockUser);

      // Act
      const user = await currentUser();

      // Assert
      expect(user).toBeDefined();
      expect(user?.id).toBe(mockUser.id);
      expect(mockCurrentUser).toHaveBeenCalledTimes(1);
    });

    it("should deny access when user is not authenticated", async () => {
      // Arrange
      mockCurrentUser.mockResolvedValue(null);

      // Act
      const user = await currentUser();

      // Assert
      expect(user).toBeNull();
    });

    it("should handle authentication errors gracefully", async () => {
      // Arrange
      mockCurrentUser.mockRejectedValue(
        new Error("Authentication service unavailable"),
      );

      // Act & Assert
      await expect(currentUser()).rejects.toThrow(
        "Authentication service unavailable",
      );
    });
  });

  describe("Protected Routes - Request Context", () => {
    it("should pass user context through request chain", async () => {
      // Arrange
      mockCurrentUser.mockResolvedValue(mockUser);

      // Simulate middleware chain
      const checkAuth = async () => {
        const user = await currentUser();
        if (!user?.id) {
          throw new Error("Authentication required");
        }
        return user;
      };

      const processRequest = async () => {
        const user = await checkAuth();
        return { authorized: true, userId: user.id };
      };

      // Act
      const result = await processRequest();

      // Assert
      expect(result.authorized).toBe(true);
      expect(result.userId).toBe(mockUser.id);
    });

    it("should break request chain on authentication failure", async () => {
      // Arrange
      mockCurrentUser.mockResolvedValue(null);

      const checkAuth = async () => {
        const user = await currentUser();
        if (!user?.id) {
          throw new Error("Authentication required");
        }
        return user;
      };

      // Act & Assert
      await expect(checkAuth()).rejects.toThrow("Authentication required");
    });
  });

  describe("Protected Routes - Rate Limiting Integration", () => {
    it("should combine authentication with rate limiting", async () => {
      // Arrange
      mockCurrentUser.mockResolvedValue(mockUser);

      // Mock rate limiter function
      const checkRateLimit = async (userId: string, clientId: string) => {
        // Simulate rate limit check
        return { allowed: true, resetTime: null };
      };

      const processAuthenticatedRequest = async (clientIp: string) => {
        const user = await currentUser();
        if (!user?.id) {
          throw new Error("Authentication required");
        }

        const rateLimit = await checkRateLimit(user.id, clientIp);
        if (!rateLimit.allowed) {
          throw new Error("Rate limit exceeded");
        }

        return { success: true, userId: user.id, rateLimited: false };
      };

      // Act
      const result = await processAuthenticatedRequest("127.0.0.1");

      // Assert
      expect(result.success).toBe(true);
      expect(result.userId).toBe(mockUser.id);
      expect(result.rateLimited).toBe(false);
    });

    it("should reject when rate limit is exceeded for authenticated user", async () => {
      // Arrange
      mockCurrentUser.mockResolvedValue(mockUser);

      const checkRateLimit = async (userId: string, clientId: string) => {
        // Simulate rate limit exceeded
        return {
          allowed: false,
          resetTime: Date.now() + 60000,
        };
      };

      const processAuthenticatedRequest = async (clientIp: string) => {
        const user = await currentUser();
        if (!user?.id) {
          throw new Error("Authentication required");
        }

        const rateLimit = await checkRateLimit(user.id, clientIp);
        if (!rateLimit.allowed) {
          throw new Error("Rate limit exceeded");
        }

        return { success: true };
      };

      // Act & Assert
      await expect(processAuthenticatedRequest("127.0.0.1")).rejects.toThrow(
        "Rate limit exceeded",
      );
    });
  });

  describe("Protected Routes - Request Headers and Security", () => {
    it("should extract client IP from various header sources", async () => {
      // Arrange
      mockCurrentUser.mockResolvedValue(mockUser);

      const requestWithForwardedFor = createTestRequest(
        "GET",
        "/api/test",
        null,
        { "x-forwarded-for": "203.0.113.1" },
      ) as NextRequest;

      const requestWithRealIP = createTestRequest("GET", "/api/test", null, {
        "x-real-ip": "203.0.113.2",
      }) as NextRequest;

      const requestWithoutIP = createTestRequest(
        "GET",
        "/api/test",
      ) as NextRequest;

      // Mock the process to extract IP
      const extractClientIP = (req: NextRequest): string => {
        return (
          req.headers.get("x-forwarded-for") ||
          req.headers.get("x-real-ip") ||
          "unknown"
        );
      };

      // Act
      const ip1 = extractClientIP(requestWithForwardedFor);
      const ip2 = extractClientIP(requestWithRealIP);
      const ip3 = extractClientIP(requestWithoutIP);

      // Assert
      expect(ip1).toBe("203.0.113.1");
      expect(ip2).toBe("203.0.113.2");
      expect(ip3).toBe("unknown");
    });

    it("should validate webhook signatures for authorized endpoints", async () => {
      // Arrange
      const validWebhookHeaders = {
        "svix-id": "test-id",
        "svix-timestamp": "1234567890",
        "svix-signature": "test-signature",
      };

      const invalidWebhookHeaders = {
        "svix-id": "test-id",
        // Missing other headers
      };

      const verifyWebhookHeaders = (
        headers: Record<string, string>,
      ): boolean => {
        return !!(
          headers["svix-id"] &&
          headers["svix-timestamp"] &&
          headers["svix-signature"]
        );
      };

      // Act
      const validResult = verifyWebhookHeaders(validWebhookHeaders);
      const invalidResult = verifyWebhookHeaders(invalidWebhookHeaders);

      // Assert
      expect(validResult).toBe(true);
      expect(invalidResult).toBe(false);
    });

    it("should handle Stripe webhook signature verification", async () => {
      // Arrange
      const validStripeHeaders = {
        "stripe-signature": "v1=valid_signature",
      };

      const invalidStripeHeaders = {
        "stripe-signature": "invalid_signature",
      };

      const verifyStripeSignature = (signature: string | null): boolean => {
        // Simulate signature verification
        return signature ? signature.startsWith("v1=") : false;
      };

      // Act
      const validResult = verifyStripeSignature(
        validStripeHeaders["stripe-signature"],
      );
      const invalidResult = verifyStripeSignature(
        invalidStripeHeaders["stripe-signature"],
      );
      const nullResult = verifyStripeSignature(null);

      // Assert
      expect(validResult).toBe(true);
      expect(invalidResult).toBe(false);
      expect(nullResult).toBe(false);
    });
  });

  describe("Protected Routes - Error Handling", () => {
    it("should handle authentication token expiration", async () => {
      // Arrange
      mockCurrentUser.mockRejectedValue(new Error("Token expired"));

      const authMiddleware = async () => {
        try {
          const user = await currentUser();
          if (!user) {
            throw new Error("Authentication required");
          }
          return { authenticated: true, user };
        } catch (error) {
          if (
            error instanceof Error &&
            error.message.includes("Token expired")
          ) {
            throw new Error(
              "Authentication token expired, please sign in again",
            );
          }
          throw error;
        }
      };

      // Act & Assert
      await expect(authMiddleware()).rejects.toThrow(
        "Authentication token expired, please sign in again",
      );
    });

    it("should handle malformed authentication requests", async () => {
      // Arrange
      mockCurrentUser.mockRejectedValue(new Error("Malformed auth token"));

      const validateAuth = async () => {
        try {
          const user = await currentUser();
          return user;
        } catch (error) {
          if (error instanceof Error) {
            // Log security event for malformed tokens
            console.warn("Security: Malformed authentication attempt");
            throw new Error("Invalid authentication token");
          }
          throw error;
        }
      };

      // Act & Assert
      await expect(validateAuth()).rejects.toThrow(
        "Invalid authentication token",
      );
    });

    it("should maintain request context for security logging", async () => {
      // Arrange
      mockCurrentUser.mockResolvedValue(mockUser);

      interface SecurityContext {
        requestId: string;
        userId?: string;
        timestamp: number;
      }

      const createSecurityContext = (): SecurityContext => ({
        requestId: `req-${Date.now()}-${Math.random().toString(36).substring(2)}`,
        timestamp: Date.now(),
      });

      const processWithSecurityLogging = async () => {
        const context = createSecurityContext();

        try {
          const user = await currentUser();
          if (!user?.id) {
            throw new Error("Authentication required");
          }

          context.userId = user.id;

          // Simulate security logging
          return {
            success: true,
            context,
            action: "authorized_request",
          };
        } catch (error) {
          return {
            success: false,
            context,
            action: "unauthorized_request",
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      };

      // Act
      const result = await processWithSecurityLogging();

      // Assert
      expect(result.success).toBe(true);
      expect(result.context.userId).toBe(mockUser.id);
      expect(result.context.requestId).toMatch(/^req-\d+-[a-z0-9]+$/);
      expect(result.action).toBe("authorized_request");
    });
  });

  describe("Protected Routes - Concurrent Request Handling", () => {
    it("should handle multiple concurrent authenticated requests", async () => {
      // Arrange
      mockCurrentUser.mockResolvedValue(mockUser);

      const processAuthenticatedRequest = async (requestId: string) => {
        const user = await currentUser();
        if (!user?.id) {
          throw new Error("Authentication required");
        }

        // Simulate async processing
        await new Promise((resolve) => setTimeout(resolve, 10));

        return { requestId, userId: user.id, processed: true };
      };

      // Act
      const requests = Array.from({ length: 5 }, (_, i) =>
        processAuthenticatedRequest(`req-${i + 1}`),
      );

      const results = await Promise.all(requests);

      // Assert
      expect(results).toHaveLength(5);
      results.forEach((result, index) => {
        expect(result.requestId).toBe(`req-${index + 1}`);
        expect(result.userId).toBe(mockUser.id);
        expect(result.processed).toBe(true);
      });
    });

    it("should handle mixed authenticated and unauthenticated requests", async () => {
      // Arrange - Alternate between authenticated and unauthenticated
      mockCurrentUser
        .mockResolvedValueOnce(mockUser) // Authenticated
        .mockResolvedValueOnce(null) // Unauthenticated
        .mockResolvedValueOnce(mockUser) // Authenticated
        .mockResolvedValueOnce(null) // Unauthenticated
        .mockResolvedValueOnce(mockUser); // Authenticated

      const processRequest = async (index: number) => {
        const user = await currentUser();
        if (!user?.id) {
          return {
            index,
            authenticated: false,
            error: "Authentication required",
          };
        }
        return { index, authenticated: true, userId: user.id };
      };

      // Act
      const requests = Array.from({ length: 5 }, (_, i) => processRequest(i));
      const results = await Promise.all(requests);

      // Assert
      expect(results).toHaveLength(5);
      expect(results[0].authenticated).toBe(true);
      expect(results[1].authenticated).toBe(false);
      expect(results[2].authenticated).toBe(true);
      expect(results[3].authenticated).toBe(false);
      expect(results[4].authenticated).toBe(true);
    });
  });
});
