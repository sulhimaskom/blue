import { aiService } from "@/lib/services/ai-service";
import { circuitBreakerRegistry } from "@/lib/circuit-breaker";
import { formatSuccessResponse, formatErrorResponse } from "@/lib/api-utils";

/**
 * GET /api/circuit-breakers/metrics
 *
 * Returns circuit breaker metrics for monitoring
 */
export async function GET() {
  try {
    // Get all circuit breaker metrics
    const allMetrics = circuitBreakerRegistry.getAllMetrics();

    // Get AI service specific metrics
    const aiMetrics = aiService.getCircuitBreakerMetrics();

    // Get open circuits for quick health check
    const openCircuits = circuitBreakerRegistry.getOpenCircuits();

    // Calculate overall health score
    const totalCircuits = Object.keys(allMetrics).length;
    const healthyCircuits = totalCircuits - openCircuits.length;
    const healthScore =
      totalCircuits > 0
        ? Math.round((healthyCircuits / totalCircuits) * 100)
        : 100;

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
      status:
        healthScore >= 80
          ? "healthy"
          : healthScore >= 60
            ? "degraded"
            : "unhealthy",
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
}
