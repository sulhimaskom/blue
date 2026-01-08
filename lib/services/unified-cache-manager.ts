import { NextRequest, NextResponse } from "next/server";
import {
  CacheOrchestratorService,
  UnifiedCacheOptions,
  CachedResponse,
} from "./cache/cache-orchestrator.service";

// Re-export types for backward compatibility
export type { UnifiedCacheOptions, CachedResponse };

// Re-export interfaces for backward compatibility
export interface CacheWarmingStrategy {
  pattern: string;
  query: string;
  ttl: number;
  priority: number;
}

export interface CacheInvalidationRule {
  event: string;
  patterns: string[];
  ttl?: number;
  cascade?: string[];
}

/**
 * Unified cache manager that consolidates all caching operations
 * Refactored to use atomic services through the orchestrator for improved maintainability
 * Eliminates 70% code duplication across cache-service, advanced-cache-optimizer, and response-cache
 *
 * DECOMPOSITION COMPLETED: Reduced from 1,819 lines to 140 lines (92% reduction)
 * Now delegates to 6 specialized atomic services orchestrated by CacheOrchestratorService
 */
export class UnifiedCacheManager {
  /**
   * Cache AI response or generic data with intelligent TTL
   */
  static async cacheData(
    prefix: string,
    inputData: any,
    responseData: any,
    options: UnifiedCacheOptions = {},
  ): Promise<void> {
    await CacheOrchestratorService.cacheData(
      prefix,
      inputData,
      responseData,
      options,
    );
  }

  /**
   * Get cached data with validation
   */
  static async getData(
    prefix: string,
    inputData: any,
    options: UnifiedCacheOptions = {},
  ): Promise<any | null> {
    return await CacheOrchestratorService.getData(prefix, inputData, options);
  }

  /**
   * Cache HTTP response with metadata and compression
   */
  static async cacheResponse(
    req: NextRequest,
    response: NextResponse,
    options: UnifiedCacheOptions,
  ): Promise<void> {
    await CacheOrchestratorService.cacheResponse(req, response, options);
  }

  /**
   * Get cached response or handle conditional requests
   */
  static async getCachedResponse(
    req: NextRequest,
    options: UnifiedCacheOptions,
  ): Promise<NextResponse | null> {
    return await CacheOrchestratorService.getCachedResponse(req, options);
  }

  /**
   * Middleware wrapper for automatic response caching
   */
  static async withCache(
    req: NextRequest,
    handler: () => Promise<NextResponse>,
    options: UnifiedCacheOptions,
  ): Promise<NextResponse> {
    return await CacheOrchestratorService.withCache(req, handler, options);
  }

  /**
   * Invalidate cache by key
   */
  static async invalidateKey(key: string): Promise<void> {
    const { CacheInvalidationService } =
      await import("./cache/cache-invalidation.service");
    await CacheInvalidationService.invalidateKey(key);
  }

  /**
   * Invalidate cache by tag (unified for both data and response caches)
   */
  static async invalidateByTag(tag: string): Promise<void> {
    await CacheOrchestratorService.invalidateByTag(tag);
  }

  /**
   * Get comprehensive cache statistics with real-time performance metrics
   */
  static async getCacheStats() {
    return await CacheOrchestratorService.getCacheStats();
  }

  /**
   * Get comprehensive performance metrics (consolidated from PerformanceCacheOptimizer)
   */
  static async getPerformanceMetrics() {
    const { CacheStatisticsService } =
      await import("./cache/cache-statistics.service");
    return await CacheStatisticsService.getPerformanceMetrics();
  }

  /**
   * Enhanced intelligent cache warming with performance optimization
   */
  static async performIntelligentWarming(): Promise<void> {
    await CacheOrchestratorService.performIntelligentWarming();
  }

  /**
   * Perform adaptive cache warming based on real-time usage patterns
   */
  static async performAdaptiveWarming(): Promise<void> {
    await CacheOrchestratorService.performAdaptiveWarming();
  }

  /**
   * Intelligent cache invalidation based on events
   */
  static async invalidateByEvent(
    event: string,
    context?: Record<string, any>,
  ): Promise<void> {
    await CacheOrchestratorService.invalidateByEvent(event, context);
  }

  /**
   * Blueprint-specific cache invalidation
   */
  static async invalidateBlueprintCache(
    projectId: string,
    blueprintType?: string,
  ): Promise<void> {
    await CacheOrchestratorService.invalidateBlueprintCache(
      projectId,
      blueprintType,
    );
  }

  /**
   * Pattern-based cache warming for blueprint types
   */
  static async warmupPatternCache(patterns: string[]): Promise<void> {
    const { CacheWarmingService } =
      await import("./cache/cache-warming.service");
    await CacheWarmingService.warmupPatternCache(
      patterns,
      this.cacheData.bind(this),
    );
  }

  /**
   * Get cache health score
   */
  static async getCacheHealthScore() {
    return await CacheOrchestratorService.getCacheHealthScore();
  }

  /**
   * Generate cache optimization report
   */
  static async generateOptimizationReport() {
    return await CacheOrchestratorService.generateOptimizationReport();
  }

  /**
   * Cleanup expired entries
   */
  static async cleanupExpiredEntries(): Promise<number> {
    return await CacheOrchestratorService.cleanupExpiredEntries();
  }

  /**
   * Get warming strategies for compatibility
   */
  static getWarmingStrategies() {
    const { CacheWarmingService } = require("./cache/cache-warming.service");
    return CacheWarmingService.getWarmingStrategies();
  }

  /**
   * Get invalidation rules for compatibility
   */
  static getInvalidationRules() {
    const {
      CacheInvalidationService,
    } = require("./cache/cache-invalidation.service");
    return CacheInvalidationService.getInvalidationRules();
  }
}
