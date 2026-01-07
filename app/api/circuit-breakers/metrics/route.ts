import { NextRequest } from "next/server";
import { aiService } from "@/lib/services/ai-service";
import { circuitBreakerRegistry } from "@/lib/circuit-breaker";
import { formatSuccessResponse, formatErrorResponse } from "@/lib/api-utils";
import { metricsCalculator } from "@/lib/services/metrics-calculator-service";
import { UnifiedCacheManager } from "@/lib/services/unified-cache-manager";
import { RateLimiters } from "@/lib/rate-limit-config";

/**
 * GET /api/circuit-breakers/metrics
 *
 * Returns circuit breaker metrics for monitoring with response caching
 */
export async function GET(req: NextRequest) {
  const identifier =
    req.headers.get("x-forwarded-for") ||
    req.headers.get("x-real-ip") ||
    "anonymous";
  const rateLimitCheck = await RateLimiters.standard()(identifier);

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
          "X-RateLimit-Limit": "30",
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": Math.ceil(Date.now() / 1000 + 60).toString(),
        },
      },
    );
  }

  return UnifiedCacheManager.withCache(
    req,
    async () => {
      try {
        // Get all circuit breaker metrics
        const allMetrics = circuitBreakerRegistry.getAllMetrics();

        // Get AI service specific metrics
        const aiMetrics = aiService.getCircuitBreakerMetrics();

        // Get open circuits for quick health check
        const openCircuits = circuitBreakerRegistry.getOpenCircuits();

        // Calculate overall health score using unified service
        const { healthScore, status } =
          metricsCalculator.calculateCircuitBreakerHealth(
            allMetrics,
            openCircuits,
          );

        const totalCircuits = Object.keys(allMetrics).length;
        const healthyCircuits = totalCircuits - openCircuits.length;

        const metrics = {
          timestamp: new Date().toISOString(),
          healthScore,
          totalCircuits,
          openCircuits,
          healthyCircuits,
          circuitBreakers: {
            ...allMetrics,
            // Include AI service specific metrics with enhanced detail
            "ai-iflow": {
              ...aiMetrics.iflow,
              successRate: `${Math.round((aiMetrics.iflow.totalSuccesses / (aiMetrics.iflow.totalCalls || 1)) * 100)}%`,
              availability:
                aiMetrics.iflow.state === "CLOSED" ||
                aiMetrics.iflow.state === "HALF_OPEN",
            },
            "research-tavily": {
              ...aiMetrics.tavily,
              successRate: `${Math.round((aiMetrics.tavily.totalSuccesses / (aiMetrics.tavily.totalCalls || 1)) * 100)}%`,
              availability:
                aiMetrics.tavily.state === "CLOSED" ||
                aiMetrics.tavily.state === "HALF_OPEN",
            },
          },
          status,
        };

        return formatSuccessResponse(
          metrics,
          "Circuit breaker metrics retrieved successfully",
        );
      } catch (error) {
        return formatErrorResponse(
          error instanceof Error ? error : new Error(String(error)),
        );
      }
    },
    {
      ttl: 15, // 15 seconds response caching for circuit breaker metrics
      tags: ["circuit-breakers", "monitoring"],
      varyBy: [], // Same for all users - no user-specific data
    },
  );
}
