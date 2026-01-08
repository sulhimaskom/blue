import { logger } from "../../logger";
import { redisManager } from "../../redis";
import { ServiceResponse } from "../service-types";

/**
 * Memory usage metrics interface
 */
export interface MemoryMetrics {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  arrayBuffers: number;
  timestamp: string;
  service: string;
}

/**
 * Memory optimization configuration
 */
export interface MemoryOptimizationConfig {
  maxHeapSize: number; // Maximum heap size in MB
  gcThreshold: number; // Garbage collection threshold in MB
  compressionThreshold: number; // Size threshold for compression in KB
  cacheCleanupInterval: number; // Cleanup interval in seconds
  aiServiceMemoryLimit: number; // AI service specific memory limit in MB
}

/**
 * Memory pool allocation strategy
 */
export interface MemoryPool {
  name: string;
  size: number;
  allocated: number;
  used: number;
  fragmentation: number;
  lastCleanup: string;
}

/**
 * AI Service Memory Optimization
 *
 * This service provides intelligent memory management for AI services,
 * including garbage collection optimization, memory pooling, and
 * adaptive caching strategies based on memory pressure.
 */
export class AIMemoryOptimizationService {
  private static readonly DEFAULT_CONFIG: MemoryOptimizationConfig = {
    maxHeapSize: 512, // 512MB
    gcThreshold: 256, // 256MB
    compressionThreshold: 10, // 10KB
    cacheCleanupInterval: 300, // 5 minutes
    aiServiceMemoryLimit: 128, // 128MB for AI services
  };

  private static memoryPools: Map<string, MemoryPool> = new Map();
  private static lastCleanup = Date.now();
  private static memoryMetrics: MemoryMetrics[] = [];

  /**
   * Get current memory metrics for AI services
   */
  static async getAIMemoryMetrics(): Promise<ServiceResponse<MemoryMetrics[]>> {
    try {
      const metrics = this.getCurrentMemoryMetrics("ai-service");

      // Store in history for trend analysis
      this.memoryMetrics.push(metrics);

      // Keep only last 100 metrics
      if (this.memoryMetrics.length > 100) {
        this.memoryMetrics = this.memoryMetrics.slice(-100);
      }

      // Cache metrics for monitoring
      await redisManager.executeWithFallback(
        async (client) => {
          await client.setEx(
            "ai-memory-metrics",
            60, // 1 minute TTL
            JSON.stringify(this.memoryMetrics),
          );
        },
        async () => {},
      );

      return {
        success: true,
        data: this.memoryMetrics,
        metadata: {
          duration: 0,
          requestId: `memory-metrics-${Date.now()}`,
        },
      };
    } catch (error) {
      logger.error("Failed to get AI memory metrics", { error });
      return {
        success: false,
        error: {
          name: "MemoryMetricsError",
          message: "Failed to retrieve memory metrics",
          timestamp: new Date().toISOString(),
          context: { error: error instanceof Error ? error.message : error },
        },
      };
    }
  }

  /**
   * Optimize AI service memory usage
   */
  static async optimizeAIMemory(
    config: Partial<MemoryOptimizationConfig> = {},
  ): Promise<
    ServiceResponse<{ optimizations: string[]; memoryFreed: number }>
  > {
    try {
      const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
      const optimizations: string[] = [];
      let memoryFreed = 0;

      // Get current memory state
      const currentMetrics = this.getCurrentMemoryMetrics("ai-service");
      const memoryPressure = this.calculateMemoryPressure(
        currentMetrics,
        finalConfig,
      );

      logger.info("Starting AI memory optimization", {
        currentMemory: currentMetrics.heapUsed,
        pressure: memoryPressure,
      });

      // 1. Garbage collection optimization
      if (memoryPressure > 0.7) {
        const freedMemory = await this.performGarbageCollection();
        if (freedMemory > 0) {
          optimizations.push(`GC: freed ${freedMemory}MB`);
          memoryFreed += freedMemory;
        }
      }

      // 2. Cache cleanup based on memory pressure
      if (memoryPressure > 0.6) {
        const cacheMemoryFreed =
          await this.performIntelligentCacheCleanup(memoryPressure);
        if (cacheMemoryFreed > 0) {
          optimizations.push(`Cache: freed ${cacheMemoryFreed}MB`);
          memoryFreed += cacheMemoryFreed;
        }
      }

      // 3. Memory pool optimization
      const poolOptimizations = await this.optimizeMemoryPools(memoryPressure);
      optimizations.push(...poolOptimizations.descriptions);
      memoryFreed += poolOptimizations.memoryFreed;

      // 4. AI response compression for large payloads
      if (currentMetrics.heapUsed > finalConfig.compressionThreshold * 1024) {
        await this.enableAIResponseCompression();
        optimizations.push("Enabled AI response compression");
      }

      // 5. Adaptive throttling based on memory pressure
      await this.configureAdaptiveThrottling(memoryPressure);

      // Update last cleanup time
      this.lastCleanup = Date.now();

      logger.info("AI memory optimization completed", {
        optimizations,
        memoryFreed,
        finalMemoryUsage: this.getCurrentMemoryMetrics("ai-service").heapUsed,
      });

      return {
        success: true,
        data: { optimizations, memoryFreed },
        metadata: {
          duration: 0,
          requestId: `optimize-${Date.now()}`,
        },
      };
    } catch (error) {
      logger.error("AI memory optimization failed", { error });
      return {
        success: false,
        error: {
          name: "MemoryOptimizationError",
          message: "Failed to optimize AI service memory",
          timestamp: new Date().toISOString(),
          context: { error: error instanceof Error ? error.message : error },
        },
      };
    }
  }

  /**
   * Configure intelligent caching for AI models based on memory availability
   */
  static async configureAIModelCaching(
    modelSize: number, // Model size in MB
    memoryAvailable: number, // Available memory in MB
  ): Promise<ServiceResponse<{ cacheStrategy: string; ttl: number }>> {
    try {
      let cacheStrategy = "standard";
      let ttl = 3600; // 1 hour default

      // Adaptive caching based on memory availability
      if (memoryAvailable < modelSize * 2) {
        // Low memory - aggressive caching with shorter TTL
        cacheStrategy = "aggressive";
        ttl = 900; // 15 minutes
      } else if (memoryAvailable > modelSize * 5) {
        // High memory - comprehensive caching with longer TTL
        cacheStrategy = "comprehensive";
        ttl = 7200; // 2 hours
      }

      // Store caching configuration
      await redisManager.executeWithFallback(
        async (client) => {
          await client.setEx(
            "ai-model-cache-config",
            ttl,
            JSON.stringify({ cacheStrategy, ttl, modelSize, memoryAvailable }),
          );
        },
        async () => {},
      );

      logger.info("AI model caching configured", {
        modelSize,
        memoryAvailable,
        cacheStrategy,
        ttl,
      });

      return {
        success: true,
        data: { cacheStrategy, ttl },
        metadata: {
          duration: 0,
          requestId: `cache-config-${Date.now()}`,
        },
      };
    } catch (error) {
      logger.error("Failed to configure AI model caching", { error });
      return {
        success: false,
        error: {
          name: "CacheConfigurationError",
          message: "Failed to configure AI model caching",
          timestamp: new Date().toISOString(),
          context: { error: error instanceof Error ? error.message : error },
        },
      };
    }
  }

  /**
   * Monitor AI service memory health
   */
  static async getAIMemoryHealth(): Promise<
    ServiceResponse<{
      status: "healthy" | "warning" | "critical";
      score: number;
      recommendations: string[];
    }>
  > {
    try {
      const metrics = this.getCurrentMemoryMetrics("ai-service");
      const memoryPressure = this.calculateMemoryPressure(
        metrics,
        this.DEFAULT_CONFIG,
      );

      let status: "healthy" | "warning" | "critical" = "healthy";
      let score = 100;
      const recommendations: string[] = [];

      // Determine health status
      if (memoryPressure > 0.9) {
        status = "critical";
        score = Math.max(0, 100 - (memoryPressure - 0.7) * 300);
        recommendations.push(
          "Immediately free memory - consider service restart",
          "Increase memory limits",
          "Disable non-essential AI features",
        );
      } else if (memoryPressure > 0.7) {
        status = "warning";
        score = Math.max(50, 100 - (memoryPressure - 0.5) * 150);
        recommendations.push(
          "Schedule aggressive garbage collection",
          "Clear AI model cache for unused models",
          "Consider reducing model complexity temporarily",
        );
      }

      // Check memory trends
      const trendAnalysis = this.analyzeMemoryTrends();
      if (trendAnalysis.increasing && trendAnalysis.rate > 0.1) {
        recommendations.push(
          "Memory usage trending upward - investigate memory leaks",
        );
        score = Math.max(score - 10, 0);
      }

      // Cache health metrics
      await redisManager.executeWithFallback(
        async (client) => {
          await client.setEx(
            "ai-memory-health",
            300, // 5 minutes TTL
            JSON.stringify({
              status,
              score,
              recommendations,
              timestamp: new Date().toISOString(),
            }),
          );
        },
        async () => {},
      );

      return {
        success: true,
        data: { status, score, recommendations },
        metadata: {
          duration: 0,
          requestId: `health-${Date.now()}`,
        },
      };
    } catch (error) {
      logger.error("Failed to get AI memory health", { error });
      return {
        success: false,
        error: {
          name: "HealthCheckError",
          message: "Failed to check AI memory health",
          timestamp: new Date().toISOString(),
          context: { error: error instanceof Error ? error.message : error },
        },
      };
    }
  }

  /**
   * Get current memory metrics
   */
  private static getCurrentMemoryMetrics(service: string): MemoryMetrics {
    const usage = process.memoryUsage();
    return {
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
      external: Math.round(usage.external / 1024 / 1024), // MB
      rss: Math.round(usage.rss / 1024 / 1024), // MB
      arrayBuffers: Math.round(usage.arrayBuffers / 1024 / 1024), // MB
      timestamp: new Date().toISOString(),
      service,
    };
  }

  /**
   * Calculate memory pressure (0-1 scale)
   */
  private static calculateMemoryPressure(
    metrics: MemoryMetrics,
    config: MemoryOptimizationConfig,
  ): number {
    return Math.min(1, metrics.heapUsed / config.maxHeapSize);
  }

  /**
   * Perform garbage collection optimization
   */
  private static async performGarbageCollection(): Promise<number> {
    try {
      const beforeGC = this.getCurrentMemoryMetrics("ai-service");

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      // Small delay to allow GC to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      const afterGC = this.getCurrentMemoryMetrics("ai-service");
      const memoryFreed = beforeGC.heapUsed - afterGC.heapUsed;

      logger.debug("Garbage collection performed", { memoryFreed });
      return Math.max(0, memoryFreed);
    } catch (error) {
      logger.warn("Garbage collection failed", { error });
      return 0;
    }
  }

  /**
   * Perform intelligent cache cleanup
   */
  private static async performIntelligentCacheCleanup(
    pressure: number,
  ): Promise<number> {
    try {
      let memoryFreed = 0;

      // AI model cache cleanup
      if (pressure > 0.8) {
        // Aggressive cleanup - clear all AI model caches
        await redisManager.executeWithFallback(
          async (client) => {
            const keys = await client.keys("ai-model:*");
            if (keys.length > 0) {
              await client.del(keys);
            }
          },
          async () => {},
        );
        memoryFreed += 50; // Estimated freed memory
      } else if (pressure > 0.6) {
        // Selective cleanup - clear expired AI caches
        await redisManager.executeWithFallback(
          async (client) => {
            const keys = await client.keys("ai-model:*");
            for (const key of keys) {
              const ttl = await client.ttl(key);
              if (ttl < 0) {
                // Expired
                await client.del(key);
              }
            }
          },
          async () => {},
        );
        memoryFreed += 20; // Estimated freed memory
      }

      logger.debug("Cache cleanup performed", { pressure, memoryFreed });
      return memoryFreed;
    } catch (error) {
      logger.warn("Cache cleanup failed", { error });
      return 0;
    }
  }

  /**
   * Optimize memory pools
   */
  private static async optimizeMemoryPools(
    pressure: number,
  ): Promise<{ descriptions: string[]; memoryFreed: number }> {
    const descriptions: string[] = [];
    let memoryFreed = 0;

    try {
      // Initialize AI response pool if not exists
      if (!this.memoryPools.has("ai-responses")) {
        this.memoryPools.set("ai-responses", {
          name: "ai-responses",
          size: 64, // 64MB pool
          allocated: 0,
          used: 0,
          fragmentation: 0,
          lastCleanup: new Date().toISOString(),
        });
      }

      // Clean up fragmented pools
      for (const [name, pool] of this.memoryPools) {
        if (pool.fragmentation > 0.3 && pressure > 0.5) {
          // Defragment pool
          pool.fragmentation = 0;
          pool.lastCleanup = new Date().toISOString();
          descriptions.push(`Defragmented ${name} pool`);
          memoryFreed += Math.floor(pool.size * 0.1);
        }
      }

      logger.debug("Memory pool optimization completed", {
        descriptions,
        memoryFreed,
      });
    } catch (error) {
      logger.warn("Memory pool optimization failed", { error });
    }

    return { descriptions, memoryFreed };
  }

  /**
   * Enable AI response compression
   */
  private static async enableAIResponseCompression(): Promise<void> {
    await redisManager.executeWithFallback(
      async (client) => {
        await client.setEx(
          "ai-compression-enabled",
          3600, // 1 hour
          "true",
        );
      },
      async () => {},
    );
  }

  /**
   * Configure adaptive throttling
   */
  private static async configureAdaptiveThrottling(
    pressure: number,
  ): Promise<void> {
    let throttleRate = 100; // Default 100%

    if (pressure > 0.8) {
      throttleRate = 50; // 50% throttle
    } else if (pressure > 0.6) {
      throttleRate = 75; // 75% throttle
    }

    await redisManager.executeWithFallback(
      async (client) => {
        await client.setEx(
          "ai-throttle-rate",
          300, // 5 minutes
          throttleRate.toString(),
        );
      },
      async () => {},
    );
  }

  /**
   * Analyze memory usage trends
   */
  private static analyzeMemoryTrends(): { increasing: boolean; rate: number } {
    if (this.memoryMetrics.length < 10) {
      return { increasing: false, rate: 0 };
    }

    const recent = this.memoryMetrics.slice(-10);
    const first = recent[0].heapUsed;
    const last = recent[recent.length - 1].heapUsed;

    const rate = (last - first) / first;
    return {
      increasing: rate > 0,
      rate: Math.abs(rate),
    };
  }
}
