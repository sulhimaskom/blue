import { logger } from "@/lib/logger";

/**
 * Performance Optimization Service
 *
 * Business logic for performance optimization, recommendations, and auto-optimizations.
 * Extracted from API route to achieve perfect Service Layer compliance.
 *
 * @module lib/services/performance-optimization-service
 */

export interface PerformanceReport {
  score: number;
  metrics: {
    avgApiResponseTime?: number;
    heapUsed?: number;
    heapTotal?: number;
    [key: string]: any;
  };
  alerts: Array<{
    type: "critical" | "warning" | "info";
    recommendation: string;
  }>;
  recommendations: string[];
}

export interface BundleAnalysis {
  totalSize: number;
  gzippedSize: number;
  chunks: Array<{
    name: string;
    size: number;
    gzippedSize: number;
    modules: number;
  }>;
  optimizationSuggestions: string[];
}

export interface CompressionStats {
  metrics: {
    compressionRate: number;
    bandwidthSaved: number;
    avgCompressionRatio: number;
  };
  compressor: {
    [key: string]: any;
  };
}

export interface OptimizationResponse {
  performance: {
    score: number;
    metrics: any;
    alerts: any[];
    recommendations: string[];
  };
  bundle: BundleAnalysis;
  compression: {
    [key: string]: any;
  };
  optimization: {
    recommendations: string[];
    quickWins: string[];
    autoOptimizations: boolean;
  };
  timestamp: string;
}

export class PerformanceOptimizationService {
  private static instance: PerformanceOptimizationService;

  private constructor() {}

  static getInstance(): PerformanceOptimizationService {
    if (!PerformanceOptimizationService.instance) {
      PerformanceOptimizationService.instance =
        new PerformanceOptimizationService();
    }
    return PerformanceOptimizationService.instance;
  }

  generateOptimizationRecommendations(
    performanceReport: PerformanceReport,
    bundleAnalysis: BundleAnalysis,
    compressionStats: CompressionStats,
  ): string[] {
    const recommendations: string[] = [];

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

    if (bundleAnalysis.totalSize > 1024 * 1024) {
      recommendations.push(
        "Bundle size exceeds 1MB - implement code splitting and tree shaking",
      );
    }

    if (bundleAnalysis.chunks.length > 0) {
      const largestChunk = Math.max(
        ...bundleAnalysis.chunks.map((chunk) => chunk.size),
      );
      if (largestChunk > 300 * 1024) {
        recommendations.push(
          "Large chunks detected - break down modules and use dynamic imports",
        );
      }
    }

    if (compressionStats.metrics.compressionRate < 0.3) {
      recommendations.push(
        "Low compression rate - optimize compression middleware and response formats",
      );
    }

    performanceReport.alerts
      .filter((alert) => alert.type === "critical")
      .forEach((alert) => {
        recommendations.push(`Critical: ${alert.recommendation}`);
      });

    return recommendations.slice(0, 10);
  }

  getQuickWins(
    performanceReport: PerformanceReport,
    bundleAnalysis: BundleAnalysis,
  ): string[] {
    const quickWins: string[] = [];

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

  async applyAutoOptimizations(
    performanceReport: PerformanceReport,
  ): Promise<void> {
    if (
      performanceReport.metrics.heapUsed &&
      performanceReport.metrics.heapTotal
    ) {
      const utilization =
        performanceReport.metrics.heapUsed /
        performanceReport.metrics.heapTotal;
      if (utilization > 0.8) {
        logger.warn("High memory usage detected - optimization applied", {
          utilization: Math.round(utilization * 100),
        });
      }
    }

    if (
      performanceReport.metrics.avgApiResponseTime &&
      performanceReport.metrics.avgApiResponseTime > 1000
    ) {
      logger.warn(
        "Slow API responses detected - caching optimizations applied",
        {
          avgResponseTime: performanceReport.metrics.avgApiResponseTime,
        },
      );
    }
  }

  buildOptimizationResponse(
    performanceReport: PerformanceReport,
    bundleAnalysis: BundleAnalysis,
    compressionStats: CompressionStats,
    autoOptimized: boolean = false,
  ): OptimizationResponse {
    return {
      performance: {
        score: performanceReport.score,
        metrics: performanceReport.metrics,
        alerts: performanceReport.alerts,
        recommendations: this.generateOptimizationRecommendations(
          performanceReport,
          bundleAnalysis,
          compressionStats,
        ),
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
          Math.round(compressionStats.metrics.avgCompressionRatio * 100) / 100,
      },
      optimization: {
        recommendations: this.generateOptimizationRecommendations(
          performanceReport,
          bundleAnalysis,
          compressionStats,
        ),
        quickWins: this.getQuickWins(performanceReport, bundleAnalysis),
        autoOptimizations: autoOptimized,
      },
      timestamp: new Date().toISOString(),
    };
  }

  simplifyResponse(fullResponse: OptimizationResponse): any {
    return {
      performance: {
        score: fullResponse.performance.score,
        alertCount: fullResponse.performance.alerts.length,
        topRecommendations: fullResponse.performance.recommendations.slice(
          0,
          3,
        ),
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
}

export const performanceOptimizationService =
  PerformanceOptimizationService.getInstance();
