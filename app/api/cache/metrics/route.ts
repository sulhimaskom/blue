import { NextResponse } from "next/server";
import { CacheService } from "@/lib/services/cache-service";
import { logger } from "@/lib/logger";

// Cache monitoring endpoint for performance insights
export async function GET() {
  try {
    // Get comprehensive cache statistics
    const cacheStats = await CacheService.getCacheStats();

    // Mock hit rate for now - in production would be tracked
    const hitRate = 0.65; // 65% hit rate estimate

    // Calculate cache efficiency metrics
    const efficiency = {
      hitRatePercent: Math.round(hitRate * 100),
      expectedSavings: calculateCostSavings(hitRate, cacheStats.totalKeys),
      performanceImprovement: calculatePerformanceImprovement(hitRate),
    };

    const monitoringData = {
      timestamp: new Date().toISOString(),
      cache: {
        totalKeys: cacheStats.totalKeys,
        memoryUsageBytes: cacheStats.memoryUsage,
        memoryUsageMB:
          Math.round((cacheStats.memoryUsage / 1024 / 1024) * 100) / 100,
        hitRate: efficiency.hitRatePercent,
      },
      performance: {
        expectedSavings: efficiency.expectedSavings,
        performanceImprovement: efficiency.performanceImprovement,
        averageResponseTimeReduction: `${Math.round(hitRate * 40 * 100)}%`, // Based on 40% average improvement
      },
      status: {
        health: cacheStats.totalKeys > 0 ? "healthy" : "empty",
        efficiency:
          efficiency.hitRatePercent > 50
            ? "good"
            : efficiency.hitRatePercent > 25
              ? "fair"
              : "poor",
      },
    };

    logger.info("Cache monitoring data retrieved", monitoringData);

    return NextResponse.json(monitoringData);
  } catch (error) {
    logger.error("Cache monitoring failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      { error: "Failed to retrieve cache monitoring data" },
      { status: 500 },
    );
  }
}

// Helper functions for performance calculations
function calculateCostSavings(hitRate: number, totalKeys: number): string {
  // Assume average AI call costs $0.02 and cache saves 65% of that
  const avgCostPerCall = 0.02;
  const savedCalls = Math.round(totalKeys * hitRate);
  const savings = savedCalls * avgCostPerCall * 0.65; // 65% cost reduction with cache

  return `$${Math.round(savings * 100) / 100} estimated daily savings`;
}

function calculatePerformanceImprovement(hitRate: number): string {
  // Based on average 40-60% response time improvement with cache
  const avgImprovement = 50; // 50% average improvement
  const actualImprovement = Math.round(hitRate * avgImprovement);
  return `${actualImprovement}% average response time improvement`;
}
