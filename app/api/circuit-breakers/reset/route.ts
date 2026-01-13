import { aiService } from "@/lib/services/ai-service";
import { circuitBreakerRegistry } from "@/lib/circuit-breaker";
import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { RateLimiters } from "@/lib/rate-limit-config";
import { logger } from "@/lib/logger";
import { AuthorizationError } from "@/lib/api-utils";

/**
 * POST /api/circuit-breakers/reset
 *
 * Reset circuit breakers (admin only, manual recovery)
 *
 * SECURITY: Requires authenticated admin user
 */
export const POST = APIRouteHandler.createPOSTHandler({
  requireAuth: true,
  rateLimiter: (identifier: string) => RateLimiters.moderate()(identifier),
  handler: async ({ user, context }) => {
    if (!user?.isAdmin) {
      logger.security("Unauthorized circuit breaker reset attempt", {
        requestId: context.requestId,
        userId: user?.clerkId,
        isAdmin: user?.isAdmin,
      });
      throw new AuthorizationError(
        "Admin access required to reset circuit breakers",
      );
    }

    logger.userAction("Circuit breakers reset", user.clerkId, {
      requestId: context.requestId,
      isAdmin: true,
    });

    circuitBreakerRegistry.resetAll();

    aiService.resetCircuitBreakers();

    const result = {
      timestamp: new Date().toISOString(),
      action: "reset",
      message: "All circuit breakers have been reset to CLOSED state",
      affectedServices: ["ai-iflow", "research-tavily", "github-api"],
      nextHealthCheck:
        "Circuit breakers will begin accepting requests immediately",
    };

    return result;
  },
});
