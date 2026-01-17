import { logger } from "@/lib/logger";

/**
  * Circular Buffer for memory-efficient metrics collection
  * Prevents unlimited memory growth while maintaining performance data
  */
class CircularBuffer<T> {
  private buffer: T[];
  private size: number;
  private index: number;
  private count: number;

  constructor(size: number) {
    this.buffer = new Array(size);
    this.size = size;
    this.index = 0;
    this.count = 0;
  }

  push(item: T): void {
    this.buffer[this.index] = item;
    this.index = (this.index + 1) % this.size;
    this.count = Math.min(this.count + 1, this.size);
  }

  getAll(): T[] {
    if (this.count < this.size) {
      return this.buffer.slice(0, this.count);
    }
    return [
      ...this.buffer.slice(this.index),
      ...this.buffer.slice(0, this.index),
    ];
  }

  getLatest(n: number, sortByTimestamp?: boolean): T[] {
    const all = this.getAll();
    const sliced = all.slice(-Math.min(n, all.length));

    if (sortByTimestamp && sliced.length > 0 && sliced.every(this.hasTimestampProperty)) {
      return (sliced as Array<T & { timestamp: Date }>).sort((a, b) => {
        return b.timestamp.getTime() - a.timestamp.getTime();
      });
    }

    return sliced;
  }

  private hasTimestampProperty(item: unknown): item is { timestamp: Date } {
    return typeof item === 'object' && item !== null && 'timestamp' in item && item.timestamp instanceof Date;
  }

  clear(): void {
    this.index = 0;
    this.count = 0;
  }

  get length(): number {
    return this.count;
  }
}

/**
 * Simplified performance monitoring service for real-time optimization
 * Identifies performance bottlenecks and provides optimization recommendations
 */

interface PerformanceMetrics {
  avgApiResponseTime?: number;
  slowestApiEndpoint?: string;
  apiCallCount?: number;
  componentRenderTime?: Map<string, number>;
  reRenderCount?: Map<string, number>;
  cpuUsage?: number;
  eventLoopLag?: number;
  heapUsed?: number;
  heapTotal?: number;
  memoryUsage?: NodeJS.MemoryUsage;
}

interface PerformanceAlert {
  type: "critical" | "warning" | "info";
  metric: string;
  value: number;
  threshold: number;
  recommendation: string;
  timestamp: Date;
}

interface BundleAnalysis {
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

interface DeploymentMetric {
  deploymentId: string;
  projectId: string;
  environment: "production" | "staging" | "preview";
  status: "deployed" | "promoted" | "rolled_back" | "failed";
  timestamp: Date;
  deploymentTime?: number;
  metadata: {
    blueprintVersion?: number;
    repoUrl?: string;
    githubOrg?: string;
    githubRepoName?: string;
    fromEnvironment?: string;
    toEnvironment?: string;
    reason?: string;
    targetDeploymentId?: string;
  };
}

interface DeploymentMetricsSummary {
  totalDeployments: number;
  successfulDeployments: number;
  failedDeployments: number;
  avgDeploymentTime: number;
  deploymentsByEnvironment: {
    production: number;
    staging: number;
    preview: number;
  };
  recentDeployments: DeploymentMetric[];
}

interface BundleChunk {
  name?: string;
  size: number;
  gzipSize?: number;
  modules?: unknown[];
}

interface BundleStats {
  chunks?: BundleChunk[];
  [key: string]: unknown;
}

export class PerformanceMonitorService {
  private static instance: PerformanceMonitorService;
  private metrics: Partial<PerformanceMetrics> = {};
  private alerts: PerformanceAlert[] = [];
  private isMonitoring = false;
  private apiResponseTimes = new CircularBuffer<{
    endpoint: string;
    time: number;
    timestamp: Date;
  }>(100); // Keep only last 100 API calls
  private componentMetrics = new Map<
    string,
    { renderTime: number; reRenderCount: number }
  >();
  private deploymentMetrics = new CircularBuffer<DeploymentMetric>(200); // Keep last 200 deployment metrics
  private memoryCheckInterval?: NodeJS.Timeout;
  private eventLoopCheckTimeout?: NodeJS.Timeout;
  private cpuCheckInterval?: NodeJS.Timeout;

  private constructor() {
    this.initializeMonitoring();
  }

  static getInstance(): PerformanceMonitorService {
    if (!PerformanceMonitorService.instance) {
      PerformanceMonitorService.instance = new PerformanceMonitorService();
    }
    return PerformanceMonitorService.instance;
  }

  private initializeMonitoring(): void {
    if (typeof window !== "undefined" || this.isMonitoring) return;

    try {
      // Monitor memory usage (server-side only)
      this.startMemoryMonitoring();

      // Monitor event loop lag (server-side only)
      this.startEventLoopMonitoring();

      // Monitor CPU usage (server-side only)
      this.startCpuMonitoring();

      this.isMonitoring = true;
      logger.info("Performance monitoring initialized", {
        service: "PerformanceMonitorService",
        monitoringActive: true,
      });
    } catch (error) {
      logger.error("Failed to initialize performance monitoring", {
        service: "PerformanceMonitorService",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  private startMemoryMonitoring(): void {
    if (typeof process === "undefined") return;

    // Register with optimized interval manager
    this.memoryCheckInterval = setInterval(() => {
      try {
        const memUsage = process.memoryUsage();
        this.metrics.memoryUsage = memUsage;
        this.metrics.heapUsed = memUsage.heapUsed;
        this.metrics.heapTotal = memUsage.heapTotal;

        // Alert on high memory usage
        const heapUsageMB = memUsage.heapUsed / 1024 / 1024;
        this.checkThreshold(
          "memoryUsage",
          heapUsageMB,
          512,
          "Investigate memory leaks, optimize data structures, and implement memory pooling",
        );

        // Alert on heap size growth
        const heapUtilization = memUsage.heapUsed / memUsage.heapTotal;
        this.checkThreshold(
          "heapUtilization",
          heapUtilization,
          0.85,
          "Optimize garbage collection, reduce object creation, and implement object pooling",
        );
      } catch (error) {
        logger.warn("Memory monitoring error", {
          service: "PerformanceMonitorService",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }, 30000); // Check every 30 seconds
  }

  private startEventLoopMonitoring(): void {
    if (typeof process === "undefined") return;

    const checkEventLoopLag = () => {
      const start = process.hrtime.bigint();
      setImmediate(() => {
        const lag = Number(process.hrtime.bigint() - start) / 1000000; // Convert to milliseconds
        this.metrics.eventLoopLag = lag;

        this.checkThreshold(
          "eventLoopLag",
          lag,
          10,
          "Optimize synchronous operations, reduce CPU-intensive tasks, and implement worker threads",
        );

        if (this.isMonitoring) {
          this.eventLoopCheckTimeout = setTimeout(checkEventLoopLag, 5000); // Check every 5 seconds
        }
      });
    };

    checkEventLoopLag();
  }

  private startCpuMonitoring(): void {
    if (typeof process === "undefined") return;

    const startCpuUsage = process.cpuUsage();

    this.cpuCheckInterval = setInterval(() => {
      try {
        const cpuUsage = process.cpuUsage(startCpuUsage);
        const totalUsage = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds
        this.metrics.cpuUsage = totalUsage;

        this.checkThreshold(
          "cpuUsage",
          totalUsage,
          0.8,
          "Optimize algorithms, reduce computational complexity, and implement caching",
        );
      } catch (error) {
        logger.warn("CPU monitoring error", {
          service: "PerformanceMonitorService",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }, 10000); // Check every 10 seconds
  }

  private checkThreshold(
    metric: string,
    value: number,
    threshold: number,
    recommendation: string,
  ): void {
    const severity =
      value > threshold * 1.5 ? "critical" : value > threshold ? "warning" : "";

    if (severity) {
      const alert: PerformanceAlert = {
        type: severity,
        metric,
        value,
        threshold,
        recommendation,
        timestamp: new Date(),
      };

      this.alerts.push(alert);
      logger.warn(`Performance ${severity} alert`, {
        service: "PerformanceMonitorService",
        metric,
        value,
        threshold,
        recommendation,
      });

      // Keep only last 50 alerts
      if (this.alerts.length > 50) {
        this.alerts = this.alerts.slice(-50);
      }
    }
  }

  trackApiResponse(endpoint: string, responseTime: number): void {
    this.apiResponseTimes.push({
      endpoint,
      time: responseTime,
      timestamp: new Date(),
    });

    // Update aggregation metrics (circular buffer handles size automatically)
    const allCalls = this.apiResponseTimes.getAll();
    const totalResponseTime = allCalls.reduce(
      (sum: number, call) => sum + call.time,
      0,
    );
    this.metrics.avgApiResponseTime =
      totalResponseTime / this.apiResponseTimes.length;
    this.metrics.apiCallCount = this.apiResponseTimes.length;

    // Find slowest endpoint
    if (this.apiResponseTimes.length > 0) {
      const slowestCall = allCalls.reduce((slowest, current) =>
        current.time > slowest.time ? current : slowest,
      );
      this.metrics.slowestApiEndpoint = slowestCall.endpoint;
    }

    // Alert on slow API responses
    this.checkThreshold(
      "apiResponseTime",
      responseTime,
      1000,
      "Optimize database queries, implement caching, and reduce API complexity",
    );
  }

  trackComponentRender(componentName: string, renderTime: number): void {
    const existing = this.componentMetrics.get(componentName) || {
      renderTime: 0,
      reRenderCount: 0,
    };

    existing.renderTime += renderTime;
    existing.reRenderCount += 1;

    this.componentMetrics.set(componentName, existing);

    // Alert on slow component renders
    this.checkThreshold(
      `componentRender_${componentName}`,
      renderTime,
      16, // 16ms = 60fps
      `Optimize ${componentName} component: useMemo expensive calculations, reduce prop complexity`,
    );
  }

  analyzeBundle(bundleStats: BundleStats): BundleAnalysis {
    const chunks = bundleStats.chunks || [];
    const totalSize = chunks.reduce(
      (sum: number, chunk: BundleChunk) => sum + chunk.size,
      0,
    );
    const gzippedSize = chunks.reduce(
      (sum: number, chunk: BundleChunk) => sum + (chunk.gzipSize || chunk.size),
      0,
    );

    const suggestions: string[] = [];

    // Analyze bundle size
    if (totalSize > 1024 * 1024) {
      // 1MB
      suggestions.push(
        "Bundle size exceeds 1MB - implement code splitting and dynamic imports",
      );
    }

    const largestChunk =
      chunks.length > 0
        ? Math.max(...chunks.map((chunk: BundleChunk) => chunk.size || 0))
        : 0;
    if (largestChunk > 300 * 1024) {
      // 300KB
      suggestions.push(
        "Largest chunk exceeds 300KB - break down into smaller modules",
      );
    }

    return {
      totalSize,
      gzippedSize,
      chunks: chunks.map((chunk: BundleChunk) => ({
        name: chunk.name || "unknown",
        size: chunk.size || 0,
        gzippedSize: chunk.gzipSize || chunk.size || 0,
        modules: chunk.modules?.length || 0,
      })),
      optimizationSuggestions: suggestions,
    };
  }

  recordDeploymentMetric(metric: DeploymentMetric): void {
    this.deploymentMetrics.push(metric);

    logger.userAction("Deployment metric recorded", "system", {
      deploymentId: metric.deploymentId,
      projectId: metric.projectId,
      environment: metric.environment,
      status: metric.status,
      timestamp: metric.timestamp,
    });
  }

  getDeploymentMetric(deploymentId: string): DeploymentMetric | undefined {
    const allMetrics = this.deploymentMetrics.getAll();
    return allMetrics.find((m) => m.deploymentId === deploymentId);
  }

  getDeploymentMetricsSummary(): DeploymentMetricsSummary {
    const allMetrics = this.deploymentMetrics.getAll();

    const totalDeployments = allMetrics.length;
    const successfulDeployments = allMetrics.filter(
      (m) => m.status === "deployed" || m.status === "promoted" || m.status === "rolled_back",
    ).length;
    const failedDeployments = allMetrics.filter((m) => m.status === "failed").length;

    const deploymentsWithTime = allMetrics.filter((m) => m.deploymentTime !== undefined);
    const avgDeploymentTime =
      deploymentsWithTime.length > 0
        ? deploymentsWithTime.reduce((sum, m) => sum + (m.deploymentTime || 0), 0) /
          deploymentsWithTime.length
        : 0;

    const deploymentsByEnvironment = {
      production: allMetrics.filter((m) => m.environment === "production").length,
      staging: allMetrics.filter((m) => m.environment === "staging").length,
      preview: allMetrics.filter((m) => m.environment === "preview").length,
    };

    const recentDeployments = this.deploymentMetrics.getLatest(10, true) as DeploymentMetric[];

    return {
      totalDeployments,
      successfulDeployments,
      failedDeployments,
      avgDeploymentTime,
      deploymentsByEnvironment,
      recentDeployments,
    };
  }

  getDeploymentMetricsByProject(projectId: string): DeploymentMetric[] {
    return this.deploymentMetrics.getAll().filter((m) => m.projectId === projectId);
  }

  getPerformanceReport(): {
    metrics: Partial<PerformanceMetrics>;
    alerts: PerformanceAlert[];
    recommendations: string[];
    score: number;
  } {
    const componentRenderTime = new Map<string, number>();
    const reRenderCount = new Map<string, number>();

    for (const [name, data] of this.componentMetrics.entries()) {
      componentRenderTime.set(name, data.renderTime);
      reRenderCount.set(name, data.reRenderCount);
    }

    const enhancedMetrics = {
      ...this.metrics,
      componentRenderTime,
      reRenderCount,
    };

    // Calculate performance score (0-100)
    let score = 100;

    // Deduct points for alerts (10 points for critical, 5 for warning)
    for (const alert of this.alerts) {
      score -= alert.type === "critical" ? 10 : 5;
    }

    // Deduct points for slow APIs
    if (
      this.metrics.avgApiResponseTime &&
      this.metrics.avgApiResponseTime > 500
    ) {
      score -= 10;
    }

    score = Math.max(0, Math.min(100, score));

    // Generate recommendations
    const recommendations = this.alerts
      .filter((alert) => alert.type === "critical")
      .map((alert) => alert.recommendation)
      .slice(0, 5); // Top 5 critical recommendations

    return {
      metrics: enhancedMetrics,
      alerts: this.alerts.slice(-10), // Last 10 alerts
      recommendations,
      score,
    };
  }

  reset(): void {
    this.metrics = {};
    this.alerts = [];
    this.apiResponseTimes.clear();
    this.componentMetrics.clear();
    this.deploymentMetrics.clear();
  }

  stopMonitoring(): void {
    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
    }
    if (this.eventLoopCheckTimeout) {
      clearTimeout(this.eventLoopCheckTimeout);
    }
    if (this.cpuCheckInterval) {
      clearInterval(this.cpuCheckInterval);
    }

    this.isMonitoring = false;
    logger.info("Performance monitoring stopped", {
      service: "PerformanceMonitorService",
    });
  }
}

export const performanceMonitorService =
  PerformanceMonitorService.getInstance();
