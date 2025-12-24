import {
  UnifiedCacheManager,
  UnifiedCacheOptions,
} from "./unified-cache-manager";

// Backward compatibility layer - delegates to UnifiedCacheManager
export interface CacheOptions extends UnifiedCacheOptions {}

/**
 * Legacy CacheService - delegates to UnifiedCacheManager for backward compatibility
 * @deprecated Use UnifiedCacheManager directly for new code
 */
export class CacheService {
  /**
   * Cache AI response with intelligent TTL based on content type
   * @deprecated Use UnifiedCacheManager.cacheData()
   */
  static async cacheAIResponse(
    prefix: string,
    inputData: any,
    responseData: any,
    options: CacheOptions = {},
  ): Promise<void> {
    return UnifiedCacheManager.cacheData(
      prefix,
      inputData,
      responseData,
      options,
    );
  }

  /**
   * Get cached AI response
   * @deprecated Use UnifiedCacheManager.getData()
   */
  static async getAIResponse(
    prefix: string,
    inputData: any,
    options: CacheOptions = {},
  ): Promise<any | null> {
    return UnifiedCacheManager.getData(prefix, inputData, options);
  }

  /**
   * Invalidate cache by key
   * @deprecated Use UnifiedCacheManager.invalidateKey()
   */
  static async invalidateKey(key: string): Promise<void> {
    return UnifiedCacheManager.invalidateKey(key);
  }

  /**
   * Invalidate cache by tag
   * @deprecated Use UnifiedCacheManager.invalidateByTag()
   */
  static async invalidateByTag(tag: string): Promise<void> {
    return UnifiedCacheManager.invalidateByTag(tag);
  }

  /**
   * Get cache statistics
   * @deprecated Use UnifiedCacheManager.getCacheStats()
   */
  static async getCacheStats(): Promise<{
    totalKeys: number;
    hitRate: number;
    memoryUsage: number;
  }> {
    const stats = await UnifiedCacheManager.getCacheStats();
    return {
      totalKeys: stats.totalKeys,
      hitRate: stats.hitRate,
      memoryUsage: stats.memoryUsage,
    };
  }

  /**
   * Warm up cache with common patterns
   * @deprecated Use UnifiedCacheManager.performIntelligentWarming()
   */
  static async warmupCache(): Promise<void> {
    return UnifiedCacheManager.performIntelligentWarming();
  }

  /**
   * Intelligent cache invalidation for blueprint updates
   * @deprecated Use UnifiedCacheManager.invalidateBlueprintCache()
   */
  static async invalidateBlueprintCache(
    projectId: string,
    blueprintType?: string,
  ): Promise<void> {
    return UnifiedCacheManager.invalidateBlueprintCache(
      projectId,
      blueprintType,
    );
  }

  /**
   * Pattern-based cache warming for common blueprint types
   * @deprecated Use UnifiedCacheManager.warmupPatternCache()
   */
  static async warmupPatternCache(patterns: string[]): Promise<void> {
    return UnifiedCacheManager.warmupPatternCache(patterns);
  }

  /**
   * Get cache hit rate statistics
   * @deprecated Use UnifiedCacheManager.getCacheStats()
   */
  static async getCacheHitRate(): Promise<number> {
    const stats = await UnifiedCacheManager.getCacheStats();
    return stats.hitRate;
  }
}
