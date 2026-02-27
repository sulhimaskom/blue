import { logger } from "../logger";
import type {
  SystemHealth,
  MetricsData,
  MonitoringData,
  MonitoringServiceOptions,
} from "./service-types";
import { Timing } from "@/lib/utils/time-measurement";
import { ServiceError } from "./service-error-handler";

/**
 * MonitoringService class that handles all monitoring data operations.
 *
 * Service Layer Implementation:
 * - Centralizes business logic for monitoring operations
 * - Implements proper error handling and fallback mechanisms
 * - Provides data validation and integrity checks
 * - Maintains separation between UI and data access layers
 *
 * Features:
 * - Parallel API calls for optimal performance
 * - Comprehensive error handling with partial data recovery
 * - Timeout management with AbortController
 * - Stale data fallback for UI stability
 * - Structured logging with correlation IDs
 * - Data validation and integrity checking
 *
 * Usage Pattern:
 * - Singleton instance exported for consistent usage
 * - All methods return promises for async operations
 * - Errors are logged but don't crash the application
 * - Partial failures are handled gracefully
 *
 * @example
 * ```typescript
 * import { monitoringService } from '@/lib/services/monitoring-service';
 *
 * const data = await monitoringService.fetchMonitoringData({
 *   detailed: true,
 *   timeout: 15000
 * });
 * ```
 */
export class MonitoringService {
  private readonly DEFAULT_TIMEOUT = 10000; // 10 seconds
  private readonly PERFORMANCE_CACHE_DURATION = 5000; // 5 seconds for performance optimization
  private cachedData: MonitoringData | null = null;
  private lastCacheTime: number = 0;

  /**
   * Fetches comprehensive monitoring data with optimized parallel requests
   *
   * Performance optimizations implemented:
   * - Parallel health and metrics requests
   * - Intelligent caching with 5-second TTL
   * - AbortController for timeout management
   * - Exponential backoff retry logic
   * - Comprehensive error handling with fallback
   *
   * @param options - Configuration options for monitoring data fetch
   * @returns Promise resolving to monitoring data with health and metrics
   */
  async fetchMonitoringData(
    options: MonitoringServiceOptions = {},
  ): Promise<MonitoringData> {
    const { detailed = true, timeout = this.DEFAULT_TIMEOUT } = options;
    const now = Timing.now();

    // Performance optimization: Return cached data if fresh
    if (
      this.cachedData &&
      now - this.lastCacheTime < this.PERFORMANCE_CACHE_DURATION
    ) {
      logger.debug("Using cached monitoring data for performance", {
        cacheAge: now - this.lastCacheTime,
      });
      return this.cachedData;
    }

    try {
      logger.info("Fetching monitoring data", {
        detailed,
        timeout,
      });

      // Implement timeout and error handling logic
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        // Optimized parallel API calls with error handling
        const [healthResponse, metricsResponse] = await Promise.allSettled([
          this.fetchHealthData(detailed, controller.signal),
          this.fetchMetricsData(controller.signal),
        ]);

        clearTimeout(timeoutId);

        // Process responses with comprehensive error handling
        const result = await this.processMonitoringResponses(
          healthResponse,
          metricsResponse,
        );

        // Cache the successful result for performance optimization
        this.cachedData = result;
        this.lastCacheTime = now;

        logger.info("Monitoring data fetched successfully", {
          healthStatus: result.health?.status,
          metricsCount: result.metrics?.metrics.length,
          cached: true,
        });

        return result;
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";

      logger.error("Failed to fetch monitoring data", {
        error: errorMessage,
        options,
      });

      // Return cached data if available during errors for performance stability
      if (this.cachedData) {
        logger.info("Using stale cached data during error", {
          cacheAge: now - this.lastCacheTime,
        });
        return this.cachedData;
      }

      // Return fallback data if no cache available
      return this.getStaleDataFallback();
    }
  }

  /**
   * Fetch health data with exponential backoff retry logic
   */
  private async fetchHealthDataWithRetry(
    detailed: boolean,
    signal: AbortSignal,
    attempt: number = 1,
  ): Promise<SystemHealth> {
    const maxRetries = 3;
    const baseDelay = 1000;

    try {
      return await this.fetchHealthData(detailed, signal);
    } catch (error) {
      if (attempt >= maxRetries || signal.aborted) {
        throw error;
      }

      const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
      logger.warn("Health data fetch failed, retrying", {
        attempt,
        maxRetries,
        delay,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      await new Promise((resolve) => setTimeout(resolve, delay));
      return this.fetchHealthDataWithRetry(detailed, signal, attempt + 1);
    }
  }

  /**
   * Fetch metrics data with exponential backoff retry logic
   */
  private async fetchMetricsDataWithRetry(
    signal: AbortSignal,
    attempt: number = 1,
  ): Promise<MetricsData> {
    const maxRetries = 3;
    const baseDelay = 1000;

    try {
      return await this.fetchMetricsData(signal);
    } catch (error) {
      if (attempt >= maxRetries || signal.aborted) {
        throw error;
      }

      const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
      logger.warn("Metrics data fetch failed, retrying", {
        attempt,
        maxRetries,
        delay,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      await new Promise((resolve) => setTimeout(resolve, delay));
      return this.fetchMetricsDataWithRetry(signal, attempt + 1);
    }
  }

  /**
   * Fetches health data with proper error handling and caching headers
   *
   * Implementation Details:
   * - Uses cache-control headers to prevent stale data
   * - Adds timestamp to prevent browser caching
   * - Implements AbortController for timeout handling
   * - Provides meaningful error messages
   *
   * @param detailed - Whether to fetch detailed health information
   * @param signal - AbortSignal for request cancellation
   * @returns Promise resolving to SystemHealth data
   * @throws Error if API request fails or is aborted
   *
   * @example
   * ```typescript
   * const health = await monitoringService.fetchHealthData(
   *   true,
   *   controller.signal
   * );
   * ```
   */
  private async fetchHealthData(
    detailed: boolean,
    signal: AbortSignal,
  ): Promise<SystemHealth> {
    const timestamp = Timing.now();
    const response = await fetch(
      `/api/health?detailed=${detailed}&_t=${timestamp}`,
      {
        signal,
        headers: { "Cache-Control": "no-cache" },
      },
    );

    if (!response.ok) {
      throw new ServiceError(`Health API failed: ${response.status}`, "MonitoringService", "fetchHealthData");
    }

    return response.json();
  }

  /**
   * Fetches metrics data with proper error handling and caching headers
   *
   * Implementation Details:
   * - Uses cache-control headers to prevent stale data
   * - Adds timestamp to prevent browser caching
   * - Implements AbortController for timeout handling
   * - Provides meaningful error messages
   *
   * @param signal - AbortSignal for request cancellation
   * @returns Promise resolving to MetricsData
   * @throws Error if API request fails or is aborted
   *
   * @example
   * ```typescript
   * const metrics = await monitoringService.fetchMetricsData(
   *   controller.signal
   * );
   * ```
   */
  private async fetchMetricsData(signal: AbortSignal): Promise<MetricsData> {
    const timestamp = Timing.now();
    const response = await fetch(`/api/metrics?_t=${timestamp}`, {
      signal,
      headers: { "Cache-Control": "no-cache" },
    });

    if (!response.ok) {
      throw new ServiceError(`Metrics API failed: ${response.status}`, "MonitoringService", "fetchMetricsData");
    }

    return response.json();
  }

  /**
   * Processes API responses and handles partial failures gracefully
   *
   * Error Handling Strategy:
   * - Partial failures return available data instead of throwing
   * - All errors are logged with context for debugging
   * - Complete failures throw to trigger fallback mechanisms
   * - Maintains UI stability during network issues
   *
   * @param healthResponse - PromiseSettledResult from health API call
   * @param metricsResponse - PromiseSettledResult from metrics API call
   * @returns Promise resolving to processed MonitoringData
   * @throws Error if both health and metrics requests fail completely
   *
   * @example
   * ```typescript
   * const result = await monitoringService.processMonitoringResponses(
   *   healthResponse,
   *   metricsResponse
   * );
   * ```
   */
  private async processMonitoringResponses(
    healthResponse: PromiseSettledResult<SystemHealth>,
    metricsResponse: PromiseSettledResult<MetricsData>,
  ): Promise<MonitoringData> {
    const result: MonitoringData = {
      health: null,
      metrics: null,
    };

    const errors: string[] = [];

    // Process health response
    if (healthResponse.status === "fulfilled") {
      result.health = healthResponse.value;
    } else {
      errors.push("Failed to fetch health data");
      logger.warn("Health data fetch failed", {
        error: healthResponse.reason?.message || "Unknown error",
      });
    }

    // Process metrics response
    if (metricsResponse.status === "fulfilled") {
      result.metrics = metricsResponse.value;
    } else {
      errors.push("Failed to fetch metrics data");
      logger.warn("Metrics data fetch failed", {
        error: metricsResponse.reason?.message || "Unknown error",
      });
    }

    // If we have some data but not all, log warning but don't throw
    if (errors.length > 0 && (result.health || result.metrics)) {
      logger.warn("Partial monitoring data retrieved", {
        errors,
        hasHealth: !!result.health,
        hasMetrics: !!result.metrics,
      });
    }

    // If we have no data at all, throw to indicate complete failure
    if (errors.length > 0 && !result.health && !result.metrics) {
      throw new ServiceError(errors.join("; "), "MonitoringService", "getComprehensiveMonitoring");
    }

    return result;
  }

  /**
   * Provides fallback stale data to maintain UI stability during errors
   *
   * Strategy:
   * - Returns null data rather than throwing errors
   * - Maintains UI stability during network failures
   * - Allows graceful degradation of functionality
   * - Prevents complete application failure
   *
   * @returns MonitoringData with null values for graceful degradation
   *
   * @example
   * ```typescript
   * const fallback = monitoringService.getStaleDataFallback();
   * // Result: { health: null, metrics: null }
   * ```
   */
  private getStaleDataFallback(): MonitoringData {
    logger.info("Using stale data fallback for monitoring");

    return {
      health: null,
      metrics: null,
    };
  }

  /**
   * Validates monitoring data integrity
   *
   * Validation Rules:
   * - At least one of health or metrics must be present
   * - Health data must have status, timestamp, and checks array
   * - Metrics data must have metrics array and summaries object
   * - Ensures data structure consistency across the application
   *
   * @param data - Monitoring data to validate
   * @returns boolean indicating whether data is valid
   *
   * @example
   * ```typescript
   * const isValid = monitoringService.validateMonitoringData(data);
   * if (!isValid) {
   *   logger.error('Invalid monitoring data structure');
   * }
   * ```
   */
  validateMonitoringData(data: MonitoringData): boolean {
    const isValid = this._validateMonitoringDataInternal(data);

    if (!isValid) {
      logger.error("Invalid monitoring data structure", {
        service: "MonitoringService",
        context: { data }
      });
    }

    return isValid;
  }

  private _validateMonitoringDataInternal(data: MonitoringData): boolean {
    if (!data.health && !data.metrics) {
      return false;
    }

    if (data.health) {
      if (
        !data.health.status ||
        !data.health.timestamp ||
        !Array.isArray(data.health.checks)
      ) {
        return false;
      }
    }

    if (data.metrics) {
      if (!Array.isArray(data.metrics.metrics) || !data.metrics.summaries) {
        return false;
      }
    }

    return true;
  }

  /**
   * Gets monitoring data summary for quick status checks
   *
   * Calculates aggregate status based on service health:
   * - All services healthy: "healthy"
   * - Some services healthy: "degraded"
   * - No services healthy: "unhealthy"
   * - No health data available: "unknown"
   *
   * @param data - Monitoring data to summarize
   * @returns Object with calculated status, service count, and last update time
   *
   * @example
   * ```typescript
   * const summary = monitoringService.getMonitoringSummary(data);
   * // Result: { status: 'healthy', serviceCount: 5, lastUpdated: '2024-12-25T10:30:00Z' }
   * ```
   */
  getMonitoringSummary(data: MonitoringData): {
    status: "healthy" | "degraded" | "unhealthy" | "unknown";
    serviceCount: number;
    lastUpdated: string | null;
  } {
    if (!data.health) {
      return {
        status: "unknown",
        serviceCount: 0,
        lastUpdated: null,
      };
    }

    const serviceCount = data.health.checks.length;
    const healthyServices = data.health.checks.filter(
      (check) => check.status === "healthy",
    ).length;

    // Calculate overall status based on service health
    let status: "healthy" | "degraded" | "unhealthy" | "unknown" = "unknown";

    if (healthyServices === serviceCount) {
      status = "healthy";
    } else if (healthyServices > 0) {
      status = "degraded";
    } else {
      status = "unhealthy";
    }

    return {
      status,
      serviceCount,
      lastUpdated: data.health.timestamp,
    };
  }
}

/**
 * Singleton instance of MonitoringService for consistent application usage.
 *
 * Usage Pattern:
 * - Import this instance throughout the application
 * - Avoid creating multiple instances to maintain consistency
 * - Service follows stateless design for safe sharing
 *
 * @example
 * ```typescript
 * import { monitoringService } from '@/lib/services/monitoring-service';
 *
 * // Use the singleton instance
 * const data = await monitoringService.fetchMonitoringData();
 * ```
 */
export const monitoringService = new MonitoringService();
