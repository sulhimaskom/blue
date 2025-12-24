import { logger } from "../logger";
import type {
  SystemHealth,
  MetricsData,
  MonitoringData,
  MonitoringServiceOptions,
} from "./service-types";

export class MonitoringService {
  private readonly DEFAULT_TIMEOUT = 10000; // 10 seconds

  /**
   * Fetches comprehensive monitoring data (health and metrics)
   * Implements centralized business logic for monitoring operations
   */
  async fetchMonitoringData(
    options: MonitoringServiceOptions = {},
  ): Promise<MonitoringData> {
    const { detailed = true, timeout = this.DEFAULT_TIMEOUT } = options;

    try {
      logger.info("Fetching monitoring data", {
        detailed,
        timeout,
      });

      // Implement timeout and error handling logic
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      // Parallel API calls with proper error handling
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

      logger.info("Monitoring data fetched successfully", {
        healthStatus: result.health?.status,
        metricsCount: result.metrics?.metrics.length,
      });

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";

      logger.error("Failed to fetch monitoring data", {
        error: errorMessage,
        options,
      });

      // Return partial data rather than throwing to maintain UI stability
      return this.getStaleDataFallback();
    }
  }

  /**
   * Fetches health data with proper error handling and caching headers
   */
  private async fetchHealthData(
    detailed: boolean,
    signal: AbortSignal,
  ): Promise<SystemHealth> {
    const timestamp = Date.now();
    const response = await fetch(
      `/api/health?detailed=${detailed}&_t=${timestamp}`,
      {
        signal,
        headers: { "Cache-Control": "no-cache" },
      },
    );

    if (!response.ok) {
      throw new Error(`Health API failed: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Fetches metrics data with proper error handling and caching headers
   */
  private async fetchMetricsData(signal: AbortSignal): Promise<MetricsData> {
    const timestamp = Date.now();
    const response = await fetch(`/api/metrics?_t=${timestamp}`, {
      signal,
      headers: { "Cache-Control": "no-cache" },
    });

    if (!response.ok) {
      throw new Error(`Metrics API failed: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Processes API responses and handles partial failures gracefully
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
      throw new Error(errors.join("; "));
    }

    return result;
  }

  /**
   * Provides fallback stale data to maintain UI stability during errors
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
   */
  validateMonitoringData(data: MonitoringData): boolean {
    // Basic validation to ensure data structure integrity
    if (!data.health && !data.metrics) {
      return false;
    }

    if (data.health) {
      // Validate health data structure
      if (
        !data.health.status ||
        !data.health.timestamp ||
        !Array.isArray(data.health.checks)
      ) {
        return false;
      }
    }

    if (data.metrics) {
      // Validate metrics data structure
      if (!Array.isArray(data.metrics.metrics) || !data.metrics.summaries) {
        return false;
      }
    }

    return true;
  }

  /**
   * Gets monitoring data summary for quick status checks
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

// Export singleton instance for consistent usage
export const monitoringService = new MonitoringService();
