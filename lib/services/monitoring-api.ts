import type {
  AdvancedPerformanceMetrics,
  AICacheOptimizationMetrics,
  PredictivePerformanceData,
} from "./service-types";
import { DatabaseError } from "@/lib/api-utils";

export interface WebhookQueueStats {
  queue: {
    size: number;
    processingStats: {
      processedEventsCount: number;
    };
    deadLetterQueue: {
      size: number;
      events: Array<{
        id: string;
        serviceName: string;
        eventType: string;
        attemptCount: number;
        createdAt: string;
        processedAt: string | null;
      }>;
    };
  };
}

export interface CircuitBreakerResetResult {
  timestamp: string;
  action: string;
  message: string;
  affectedServices: string[];
  nextHealthCheck: string;
}

class MonitoringAPI {
  private readonly apiBase = "/api";

  async getWebhookQueueStats(): Promise<WebhookQueueStats> {
    const response = await fetch(`${this.apiBase}/webhooks/monitor`);

    if (!response.ok) {
      throw new DatabaseError(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.success) {
      return data.data as WebhookQueueStats;
    }

    throw new DatabaseError(data.error || "Failed to fetch webhook stats");
  }

  async retryDeadLetterEvents(): Promise<void> {
    const adminToken =
      process.env.NEXT_PUBLIC_WEBHOOK_ADMIN_TOKEN || "admin-debug-token";

    const response = await fetch(`${this.apiBase}/webhooks/monitor`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
    });

    if (!response.ok) {
      throw new DatabaseError(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new DatabaseError(data.error || "Failed to retry dead letter events");
    }
  }

  async resetCircuitBreakers(): Promise<CircuitBreakerResetResult> {
    const response = await fetch(`${this.apiBase}/circuit-breakers/reset`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new DatabaseError(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new DatabaseError(data.error || "Failed to reset circuit breakers");
    }

    return data.data as CircuitBreakerResetResult;
  }

  async getAdvancedMonitoring(): Promise<AdvancedPerformanceMetrics> {
    const response = await fetch(
      `${this.apiBase}/performance/advanced-monitoring`,
    );

    if (!response.ok) {
      throw new DatabaseError(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.success) {
      return data.data as AdvancedPerformanceMetrics;
    }

    throw new DatabaseError(data.error || "Failed to fetch advanced monitoring data");
  }

  async getAICacheOptimization(): Promise<AICacheOptimizationMetrics> {
    const response = await fetch(
      `${this.apiBase}/performance/ai-cache-optimization`,
    );

    if (!response.ok) {
      throw new DatabaseError(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.success) {
      return data.data as AICacheOptimizationMetrics;
    }

    throw new DatabaseError(data.error || "Failed to fetch AI cache optimization data");
  }

  async getPredictivePerformance(): Promise<PredictivePerformanceData> {
    const response = await fetch(`${this.apiBase}/performance/predictive`);

    if (!response.ok) {
      throw new DatabaseError(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.success) {
      return data.data as PredictivePerformanceData;
    }

throw new DatabaseError(
      data.error || "Failed to fetch webhook detailed performance stats",
    );
  }

  async getPredictiveOptimization(params?: {
    optimizationType?: string;
    parameters?: {
      description?: string;
      estimatedSavings?: number;
      confidence?: number;
    };
  }): Promise<{ success: boolean; message?: string }> {
    const response = await fetch(
      `${this.apiBase}/performance/predictive-optimization`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params),
      },
    );

    if (!response.ok) {
      throw new DatabaseError(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.success) {
      return { success: true, message: data.message };
    }

throw new DatabaseError(
      data.error || "Failed to fetch predictive performance monitoring data",
    );
  }
}

export const monitoringAPI = new MonitoringAPI();
