import { aiService } from "@/lib/services/ai-service";
import { circuitBreakerRegistry } from "@/lib/circuit-breaker";
import { formatSuccessResponse, formatErrorResponse } from "@/lib/api-utils";
import { RateLimiters } from "@/lib/rate-limit-config";
import { NextRequest } from "next/server";

/**
 * POST /api/circuit-breakers/reset
 *
 * Reset circuit breakers (admin only, manual recovery)
 */
export async function POST(req: NextRequest) {
  const identifier =
    req.headers.get("x-forwarded-for") ||
    req.headers.get("x-real-ip") ||
    "anonymous";
  const rateLimitCheck = await RateLimiters.moderate()(identifier);

  if (!rateLimitCheck.allowed) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Rate limit exceeded. Try again in 60 seconds.",
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "X-RateLimit-Limit": "10",
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": Math.ceil(Date.now() / 1000 + 60).toString(),
        },
      },
    );
  }
  try {
    // Note: In production, authenticate this endpoint for admin access only
    // For now, allow for demonstration and recovery purposes

    // Reset all circuit breakers
    circuitBreakerRegistry.resetAll();

    // Reset AI service circuit breakers specifically
    aiService.resetCircuitBreakers();

    const result = {
      timestamp: new Date().toISOString(),
      action: "reset",
      message: "All circuit breakers have been reset to CLOSED state",
      affectedServices: ["ai-iflow", "research-tavily", "github-api"],
      nextHealthCheck:
        "Circuit breakers will begin accepting requests immediately",
    };

    return formatSuccessResponse(result, "Circuit breakers reset successfully");
  } catch (error) {
    return formatErrorResponse(
      error instanceof Error ? error : new Error(String(error)),
    );
  }
}
