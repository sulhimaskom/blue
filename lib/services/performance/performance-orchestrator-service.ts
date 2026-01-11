import { logger } from "@/lib/logger";
import { UnifiedCacheManager } from "@/lib/services/cache-orchestrator";
import { AIMemoryOptimizationService } from "@/lib/services/performance/ai-memory-optimization-service";
import { AdvancedCacheStrategiesService } from "@/lib/services/performance/advanced-cache-strategies-service";
import { DatabaseQueryOptimizationService } from "@/lib/services/performance/database-query-optimization-service";

/**
 * Performance Orchestrator Service
 *
 * Business logic for coordinating performance optimization across all subsystems:
 * - AI Memory Optimization
 * - Cache Performance Optimization
 * - Database Query Optimization
 * - Cross-system orchestration and improvement estimation
 *
 * Extracted from API route to achieve perfect Service Layer compliance.
 *
 * @module lib/services/performance/performance-orchestrator-service
 */

export interface OrchestratorStatus extends Record<string, unknown> {
  memory?: unknown;
  cache?: unknown;
  database?: unknown;
}

export interface OptimizationResult extends Record<string, unknown> {
  memory?: {
    success?: boolean;
    optimizations?: unknown[];
    memoryFreed?: number;
    error?: string;
  };
  cache?: {
    success?: boolean;
    optimizations?: unknown[];
    memoryFreed?: number;
    hitRateImprovement?: number;
    error?: string;
  };
  database?: {
    success?: boolean;
    improvements?: Record<string, number>;
    error?: string;
  };
  globalWarming?: {
    success: true;
    message: string;
  };
}

export interface OptimizationSummary {
  optimizationsExecuted: number;
  estimatedImprovement: number;
  servicesOptimized: number;
  timestamp: string;
}

export interface OptimizationConfig {
  memory?: Record<string, unknown>;
  cache?: Record<string, unknown>;
  database?: Record<string, unknown>;
}

export interface OrchestratorResponse {
  service: string;
  data: OrchestratorStatus;
  timestamp: string;
}

export interface OptimizationResponse {
  results: OptimizationResult;
  summary: OptimizationSummary;
}

export interface GlobalWarmingResult {
  success: true;
  message: string;
}

/**
 * Performance Orchestrator Service
 *
 * Coordinates performance optimization across all subsystems and provides
 * unified status reporting and improvement estimation.
 */
export class PerformanceOrchestratorService {
  private static instance: PerformanceOrchestratorService;

  private constructor() {}

  public static getInstance(): PerformanceOrchestratorService {
    if (!PerformanceOrchestratorService.instance) {
      PerformanceOrchestratorService.instance = new PerformanceOrchestratorService();
    }
    return PerformanceOrchestratorService.instance;
  }

  /**
   * Get current orchestrator status for all subsystems
   *
   * @param service - Optional service filter (memory, cache, database, all)
   * @returns Status data for requested subsystems
   */
  async getOrchestratorStatus(
    service?: string | null,
  ): Promise<OrchestratorResponse> {
    const result: OrchestratorStatus = {};

    if (!service || service === "all" || service === "memory") {
      const memoryHealth = await AIMemoryOptimizationService.getAIMemoryHealth();
      result.memory = memoryHealth.success
        ? memoryHealth.data
        : { error: memoryHealth.error?.message };
    }

    if (!service || service === "all" || service === "cache") {
      const cacheAnalytics =
        await AdvancedCacheStrategiesService.getCacheAnalytics();
      const cacheStats = await UnifiedCacheManager.getCacheStats();
      result.cache = cacheAnalytics.success
        ? {
            ...cacheAnalytics.data,
            orchestratorStats: cacheStats,
          }
        : { error: cacheAnalytics.error?.message };
    }

    if (!service || service === "all" || service === "database") {
      const dbMetrics =
        await DatabaseQueryOptimizationService.getDatabasePerformanceMetrics();
      result.database = dbMetrics.success
        ? dbMetrics.data
        : { error: dbMetrics.error?.message };
    }

    return {
      service: service || "all",
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Execute optimization workflow across all subsystems
   *
   * @param action - Optimization action (full-optimization, etc.)
   * @param service - Optional service filter (memory, cache, database, all)
   * @param config - Optional configuration for each subsystem
   * @returns Optimization results and summary
   */
  async executeOptimizationWorkflow(
    action?: string,
    service?: string | null,
    config?: OptimizationConfig,
  ): Promise<OptimizationResponse> {
    logger.info("Performance orchestrator workflow executing", {
      action,
      service,
      config,
    });

    const results: OptimizationResult = {};
    let optimizationsExecuted = 0;

    try {
      // Memory optimization
      if (!service || service === "all" || service === "memory") {
        const memoryOpt = await AIMemoryOptimizationService.optimizeAIMemory(
          config?.memory,
        );
        results.memory = {
          success: memoryOpt.success,
          optimizations: memoryOpt.data?.optimizations || [],
          memoryFreed: memoryOpt.data?.memoryFreed || 0,
          error: memoryOpt.error?.message,
        };
        if (memoryOpt.success) optimizationsExecuted++;
      }

      // Cache optimization
      if (!service || service === "all" || service === "cache") {
        const cacheOpt =
          await AdvancedCacheStrategiesService.optimizeCachePerformance(
            config?.cache,
          );
        results.cache = {
          success: cacheOpt.success,
          optimizations: cacheOpt.data?.optimizations || [],
          memoryFreed: cacheOpt.data?.memoryFreed || 0,
          hitRateImprovement: cacheOpt.data?.hitRateImprovement || 0,
          error: cacheOpt.error?.message,
        };
        if (cacheOpt.success) optimizationsExecuted++;
      }

      // Database optimization
      if (!service || service === "all" || service === "database") {
        const dbOpt =
          await DatabaseQueryOptimizationService.optimizeConnectionPool(
            config?.database,
          );
        results.database = {
          success: dbOpt.success,
          improvements: dbOpt.data?.improvements || {},
          error: dbOpt.error?.message,
        };
        if (dbOpt.success) optimizationsExecuted++;
      }

      // Global cache warming if requested
      if (action === "full-optimization") {
        await UnifiedCacheManager.performIntelligentWarming();
        results.globalWarming = {
          success: true,
          message: "Intelligent cache warming executed",
        } as GlobalWarmingResult;
      }

      // Calculate overall performance score improvement estimation
      const estimatedImprovement =
        this.calculateEstimatedImprovement(results);

      return {
        results,
        summary: {
          optimizationsExecuted,
          estimatedImprovement,
          servicesOptimized: Object.keys(results).length,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      logger.error("Performance optimization workflow error", { error });
      throw new Error(
        `Optimization workflow failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Calculate estimated performance improvement based on optimization results
   *
   * Uses weighted factors to estimate overall system performance improvement:
   * - Memory optimization: 30% weight
   * - Cache optimization: 40% weight
   * - Database optimization: 30% weight
   *
   * @param results - Optimization results from all subsystems
   * @returns Estimated improvement percentage (0-100)
   */
  private calculateEstimatedImprovement(results: OptimizationResult): number {
    let improvement = 0;

    const memoryResult = results.memory as {
      success?: boolean;
      memoryFreed?: number;
    } | undefined;

    const cacheResult = results.cache as {
      success?: boolean;
      hitRateImprovement?: number;
      memoryFreed?: number;
    } | undefined;

    const dbResult = results.database as {
      success?: boolean;
      improvements?: Record<string, number>;
    } | undefined;

    // Memory optimization impact (30% weight)
    if (memoryResult && memoryResult.success) {
      const memoryFreed = memoryResult.memoryFreed || 0;
      improvement += Math.min(30, memoryFreed * 0.5);
    }

    // Cache optimization impact (40% weight)
    if (cacheResult && cacheResult.success) {
      const hitRateImprovement = cacheResult.hitRateImprovement || 0;
      const cacheMemoryFreed = cacheResult.memoryFreed || 0;
      improvement += Math.min(
        40,
        hitRateImprovement * 2 + cacheMemoryFreed * 0.3,
      );
    }

    // Database optimization impact (30% weight)
    if (dbResult && dbResult.success) {
      const dbImprovements = Object.values(dbResult.improvements || {}) as (
        | number
        | undefined
      )[];
      const totalDBImprovement = dbImprovements.reduce(
        (sum: number, val: number | undefined) => sum + (val || 0),
        0,
      );
      improvement += Math.min(30, totalDBImprovement * 0.1);
    }

    return Math.round(Math.min(100, Math.max(0, improvement)));
  }
}

export const performanceOrchestratorService =
  PerformanceOrchestratorService.getInstance();
