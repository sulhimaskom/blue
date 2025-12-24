import { aiService } from "@/lib/services/ai-service";
import { circuitBreakerRegistry } from "@/lib/circuit-breaker";
import { formatSuccessResponse, formatErrorResponse } from "@/lib/api-utils";
import { metricsCalculator } from "@/lib/services/metrics-calculator-service";

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

    // Calculate overall health score using unified service
    const { healthScore, status } =
      metricsCalculator.calculateCircuitBreakerHealth(allMetrics, openCircuits);

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
}
