/**
 * Performance Monitoring Utility
 * Tracks and reports development/build performance metrics
 */

import { logger } from "@/lib/logger";

interface BuildMetrics {
  startTime: number;
  endTime?: number;
  duration?: number;
  buildSize: number;
  chunksCount: number;
  optimizationGain: number;
}

class PerformanceMonitor {
  private metrics: BuildMetrics[] = [];
  private currentBuild?: BuildMetrics;

  startBuildMonitoring(): void {
    this.currentBuild = {
      startTime: Date.now(),
      buildSize: 0,
      chunksCount: 0,
      optimizationGain: 0,
    };
  }

  endBuildMonitoring(buildData: {
    chunkSize: number;
    chunksCount: number;
    optimizationGain?: number;
  }): BuildMetrics | undefined {
    if (!this.currentBuild) {
      logger.warn("Build monitoring not started", {
        service: "PerformanceMonitor"
      });
      return undefined;
    }

    this.currentBuild.endTime = Date.now();
    this.currentBuild.duration =
      this.currentBuild.endTime - this.currentBuild.startTime;
    this.currentBuild.buildSize = buildData.chunkSize;
    this.currentBuild.chunksCount = buildData.chunksCount;
    this.currentBuild.optimizationGain = buildData.optimizationGain || 0;

    const metrics = { ...this.currentBuild };
    this.metrics.push(metrics);

    this.reportMetrics(metrics);
    return metrics;
  }

  private reportMetrics(metrics: BuildMetrics): void {
    logger.info("Build Performance Report", {
      service: "PerformanceMonitor",
      buildTime: metrics.duration,
      bundleSize: `${(metrics.buildSize / 1024).toFixed(1)} kB`,
      chunksCount: metrics.chunksCount,
      optimizationGain: metrics.optimizationGain,
      buildTimeRating: metrics.duration && metrics.duration < 15000 ? "excellent (<15s)" : metrics.duration && metrics.duration < 20000 ? "good (<20s)" : "needs optimization",
      bundleSizeRating: metrics.buildSize < 350000 ? "excellent (<350kB)" : metrics.buildSize < 400000 ? "good (<400kB)" : "needs optimization"
    });
  }

  getPerformanceTrends(): {
    averageBuildTime: number;
    averageBundleSize: number;
    buildsCount: number;
    trend: "improving" | "stable" | "degrading";
  } {
    if (this.metrics.length < 2) {
      return {
        averageBuildTime: this.metrics[0]?.duration || 0,
        averageBundleSize: this.metrics[0]?.buildSize || 0,
        buildsCount: this.metrics.length,
        trend: "stable",
      };
    }

    const totalBuildTime = this.metrics.reduce(
      (sum, m) => sum + (m.duration || 0),
      0,
    );
    const totalBundleSize = this.metrics.reduce(
      (sum, m) => sum + m.buildSize,
      0,
    );

    const averageBuildTime = totalBuildTime / this.metrics.length;
    const averageBundleSize = totalBundleSize / this.metrics.length;

    // Calculate trend based on last 3 builds vs average
    const recentBuilds = this.metrics.slice(-3);
    const recentAvgTime =
      recentBuilds.reduce((sum, m) => sum + (m.duration || 0), 0) /
      recentBuilds.length;

    let trend: "improving" | "stable" | "degrading" = "stable";
    const improvementThreshold = 0.1; // 10% threshold

    if (recentAvgTime < averageBuildTime * (1 - improvementThreshold)) {
      trend = "improving";
    } else if (recentAvgTime > averageBuildTime * (1 + improvementThreshold)) {
      trend = "degrading";
    }

    return {
      averageBuildTime,
      averageBundleSize,
      buildsCount: this.metrics.length,
      trend,
    };
  }

  exportMetrics(): string {
    return JSON.stringify(
      {
        metrics: this.metrics,
        trends: this.getPerformanceTrends(),
        exportedAt: new Date().toISOString(),
      },
      null,
      2,
    );
  }
}

// Singleton instance for global access
export const performanceMonitor = new PerformanceMonitor();

// Integration hooks for Next.js build process
export const startPerformanceMonitoring = () => {
  if (
    process.env.NODE_ENV === "development" ||
    process.env.NODE_ENV === "production"
  ) {
    performanceMonitor.startBuildMonitoring();
  }
};

export const endPerformanceMonitoring = (buildData: any) => {
  if (
    process.env.NODE_ENV === "development" ||
    process.env.NODE_ENV === "production"
  ) {
    return performanceMonitor.endBuildMonitoring(buildData);
  }
};

export default performanceMonitor;
