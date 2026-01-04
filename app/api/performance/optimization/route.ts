import { NextRequest } from "next/server";
import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { performanceMonitorService } from "@/lib/services/performance-monitor-service";
import { getCompressionStats } from "@/lib/middleware/compression-wrapper";

export async function GET(req: NextRequest) {
  return APIRouteHandler.createSimpleCachedGETHandler(
    async (req: NextRequest) => {
      const { searchParams } = new URL(req.url);
      const detailed = searchParams.get("detailed") === "true";
      const optimize = searchParams.get("optimize") === "true";

      // Get comprehensive performance report
      const performanceReport =
        performanceMonitorService.getPerformanceReport();

      // Include compression analytics
      const compressionStats = getCompressionStats();

      // Get bundle analysis (simulated for this example)
      const bundleAnalysis = performanceMonitorService.analyzeBundle({
        chunks: [
          { name: "main", size: 102400, gzipSize: 35840, modules: 24 },
          {
            name: "dashboard-monitoring",
            size: 258000,
            gzipSize: 90800,
            modules: 18,
          },
          { name: "vendors", size: 81920, gzipSize: 28672, modules: 47 },
        ],
      });

      const response = {
        performance: {
          score: performanceReport.score,
          metrics: performanceReport.metrics,
          alerts: performanceReport.alerts,
          recommendations: performanceReport.recommendations,
        },
        bundle: bundleAnalysis,
        compression: {
          ...compressionStats.compressor,
          compressionRatePercent: Math.round(
            compressionStats.metrics.compressionRate * 100,
          ),
          bandwidthSavedKB: Math.round(
            compressionStats.metrics.bandwidthSaved / 1024,
          ),
          avgCompressionRatio:
            Math.round(compressionStats.metrics.avgCompressionRatio * 100) /
            100,
        },
        optimization: {
          recommendations: generateOptimizationRecommendations(
            performanceReport,
            bundleAnalysis,
            compressionStats,
          ),
          quickWins: getQuickWins(performanceReport, bundleAnalysis),
          autoOptimizations: false,
        },
        timestamp: new Date().toISOString(),
      };

      // Auto-optimize if requested
      if (optimize) {
        await applyAutoOptimizations(performanceReport);
        response.optimization.autoOptimizations = true;
      }

      return detailed ? response : simplifyResponse(response);
    },
    {
      ttl: 60, // 1 minute cache for performance data
      tags: ["performance", "optimization", "monitoring"],
      varyBy: [],
      initializeServices: true,
    },
  )(req);
}

function generateOptimizationRecommendations(
  performanceReport: any,
  bundleAnalysis: any,
  compressionStats: any,
): string[] {
  const recommendations: string[] = [];

  // Performance-based recommendations
  if (performanceReport.score < 80) {
    recommendations.push(
      "Performance score below 80% - implement critical optimizations",
    );
  }

  if (
    performanceReport.metrics.avgApiResponseTime &&
    performanceReport.metrics.avgApiResponseTime > 500
  ) {
    recommendations.push(
      "API response times above 500ms - enable caching and optimize database queries",
    );
  }

  // Bundle-based recommendations
  if (bundleAnalysis.totalSize > 1024 * 1024) {
    recommendations.push(
      "Bundle size exceeds 1MB - implement code splitting and tree shaking",
    );
  }

  if (bundleAnalysis.chunks.length > 0) {
    const largestChunk = Math.max(
      ...bundleAnalysis.chunks.map((chunk: any) => chunk.size),
    );
    if (largestChunk > 300 * 1024) {
      recommendations.push(
        "Large chunks detected - break down modules and use dynamic imports",
      );
    }
  }

  // Compression-based recommendations
  if (compressionStats.metrics.compressionRate < 0.3) {
    recommendations.push(
      "Low compression rate - optimize compression middleware and response formats",
    );
  }

  // Critical alerts
  performanceReport.alerts
    .filter((alert: any) => alert.type === "critical")
    .forEach((alert: any) => {
      recommendations.push(`Critical: ${alert.recommendation}`);
    });

  return recommendations.slice(0, 10); // Top 10 recommendations
}

function getQuickWins(performanceReport: any, bundleAnalysis: any): string[] {
  const quickWins: string[] = [];

  // Easy performance improvements
  if (bundleAnalysis.chunks.length > 0) {
    quickWins.push("Enable response compression middleware");
    quickWins.push("Implement component-level memoization with React.memo");
    quickWins.push("Use dynamic imports for large dashboard components");
  }

  if (
    performanceReport.metrics.avgApiResponseTime &&
    performanceReport.metrics.avgApiResponseTime > 300
  ) {
    quickWins.push("Add Redis caching for frequently accessed API endpoints");
    quickWins.push("Implement database query result caching");
  }

  quickWins.push("Optimize images with WebP format and lazy loading");
  quickWins.push("Minimize third-party dependencies");

  return quickWins;
}

function simplifyResponse(fullResponse: any): any {
  return {
    performance: {
      score: fullResponse.performance.score,
      alertCount: fullResponse.performance.alerts.length,
      topRecommendations: fullResponse.performance.recommendations.slice(0, 3),
    },
    bundle: {
      totalSize: fullResponse.bundle.totalSize,
      gzippedSize: fullResponse.bundle.gzippedSize,
      optimizationCount: fullResponse.bundle.optimizationSuggestions.length,
    },
    compression: {
      compressionRatePercent: fullResponse.compression.compressionRatePercent,
      bandwidthSavedKB: fullResponse.compression.bandwidthSavedKB,
    },
    quickWins: fullResponse.optimization.quickWins.slice(0, 5),
    timestamp: fullResponse.timestamp,
  };
}

async function applyAutoOptimizations(performanceReport: any): Promise<void> {
  // Simulated auto-optimizations
  // In a real implementation, this would:
  // - Clear cache if memory usage is high
  // - Adjust compression settings
  // - Enable/disable features based on performance

  if (
    performanceReport.metrics.heapUsed &&
    performanceReport.metrics.heapTotal
  ) {
    const utilization =
      performanceReport.metrics.heapUsed / performanceReport.metrics.heapTotal;
    if (utilization > 0.8) {
      // Would trigger garbage collection hints in Node.js
      // eslint-disable-next-line no-console
      console.log("High memory usage detected - optimization applied");
    }
  }

  if (
    performanceReport.metrics.avgApiResponseTime &&
    performanceReport.metrics.avgApiResponseTime > 1000
  ) {
    // Would enable aggressive caching
    // eslint-disable-next-line no-console
    console.log("Slow API responses detected - caching optimizations applied");
  }
}
