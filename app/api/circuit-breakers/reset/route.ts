import { aiService } from "@/lib/services/ai-service";
import { circuitBreakerRegistry } from "@/lib/circuit-breaker";
import { formatSuccessResponse, formatErrorResponse } from "@/lib/api-utils";

/**
 * POST /api/circuit-breakers/reset
 *
 * Reset circuit breakers (admin only, manual recovery)
 */
export async function POST() {
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
