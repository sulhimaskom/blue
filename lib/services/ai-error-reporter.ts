import { monitoringService, MonitoringEvent } from "@/lib/monitoring";

export interface AIErrorReport {
  operation: "completion" | "research" | "validation";
  error: string;
  context: {
    model?: string;
    promptLength?: number;
    responseTime: number;
    retryAttempt?: number;
    userId?: string;
    requestId?: string;
  };
  severity: "low" | "medium" | "high" | "critical";
  timestamp: string;
}

export class AIErrorReporter {
  private static errorThresholds = {
    responseTime: 30000, // 30 seconds
    maxRetries: 3,
    criticalErrorPatterns: [
      "rate limit",
      "quota exceeded",
      "authentication failed",
      "invalid api key",
    ],
  };

  static reportError(errorReport: AIErrorReport): void {
    const { operation, error, context, severity, timestamp } = errorReport;

    // Determine enhanced severity based on error patterns
    const enhancedSeverity = this.determineSeverity(error, severity, context);

    // Report to monitoring service
    monitoringService.trackError(
      `ai_${operation}_error`,
      `AI ${operation} failed: ${error}`,
      {
        operation,
        error,
        context,
        enhancedSeverity,
        timestamp,
      },
      enhancedSeverity,
    );

    // Log structured error for debugging
    // eslint-disable-next-line no-console
    console.error("AI Operation Error", JSON.stringify(errorReport, null, 2));

    // Track error patterns for alerting
    this.trackErrorPatterns(errorReport);
  }

  private static determineSeverity(
    error: string,
    baseSeverity: MonitoringEvent["severity"],
    context: AIErrorReport["context"],
  ): MonitoringEvent["severity"] {
    // Critical error patterns
    if (
      this.errorThresholds.criticalErrorPatterns.some((pattern) =>
        error.toLowerCase().includes(pattern),
      )
    ) {
      return "critical";
    }

    // Performance-based severity
    if (context.responseTime > this.errorThresholds.responseTime) {
      return "high";
    }

    // Retry-based severity
    if (
      context.retryAttempt &&
      context.retryAttempt >= this.errorThresholds.maxRetries
    ) {
      return "high";
    }

    // High-value operation failures
    if (context.promptLength && context.promptLength > 5000) {
      return "high";
    }

    return baseSeverity;
  }

  private static trackErrorPatterns(report: AIErrorReport): void {
    // Track error frequency for proactive monitoring
    const errorKey = `${report.operation}_${report.error.substring(0, 50)}`;

    monitoringService.recordMetric(`ai_errors_${errorKey}`, 1, "count", {
      operation: report.operation,
      errorType: report.error.substring(0, 30),
      severity: report.severity,
    });

    // Track operation success rates
    monitoringService.recordMetric(
      `ai_operations_${report.operation}`,
      0, // 0 for failure
      "count",
      {
        success: "false",
        severity: report.severity,
      },
    );
  }

  static reportSuccess(
    operation: AIErrorReport["operation"],
    context: {
      model?: string;
      responseTime: number;
      tokens?: number;
      userId?: string;
      requestId?: string;
    },
  ): void {
    // Track successful operations for success rate metrics
    monitoringService.recordMetric(
      `ai_operations_${operation}`,
      1, // 1 for success
      "count",
      {
        success: "true",
        ...(context.model && { model: context.model }),
      },
    );

    // Track performance metrics
    monitoringService.recordMetric(
      `ai_performance_${operation}`,
      context.responseTime,
      "ms",
      {
        ...(context.model && { model: context.model }),
      },
    );

    // Track token usage if available
    if (context.tokens) {
      monitoringService.recordMetric(
        `ai_tokens_${operation}`,
        context.tokens,
        "count",
        {
          ...(context.model && { model: context.model }),
        },
      );
    }
  }

  // Specialized error reporters for different AI operations

  static reportCompletionError(
    error: string,
    context: AIErrorReport["context"] & {
      promptTokens?: number;
      completionTokens?: number;
      totalTokens?: number;
    },
  ): void {
    this.reportError({
      operation: "completion",
      error,
      context,
      severity: "medium",
      timestamp: new Date().toISOString(),
    });
  }

  static reportResearchError(
    error: string,
    context: AIErrorReport["context"] & {
      query?: string;
      resultCount?: number;
    },
  ): void {
    this.reportError({
      operation: "research",
      error,
      context,
      severity: "medium",
      timestamp: new Date().toISOString(),
    });
  }

  static reportValidationError(
    error: string,
    context: AIErrorReport["context"] & {
      blueprintId?: string;
      validationType?: string;
    },
  ): void {
    this.reportError({
      operation: "validation",
      error,
      context,
      severity: "low",
      timestamp: new Date().toISOString(),
    });
  }

  // Performance anomaly detection
  static reportPerformanceAnomaly(
    operation: AIErrorReport["operation"],
    responseTime: number,
    context: AIErrorReport["context"],
  ): void {
    const avgResponseTime = this.getAverageResponseTime(operation);

    if (responseTime > avgResponseTime * 2) {
      monitoringService.trackError(
        "ai_performance_anomaly",
        `AI operation ${operation} took ${responseTime}ms (${Math.round((responseTime / avgResponseTime) * 100)}% of normal)`,
        {
          operation,
          responseTime,
          averageTime: avgResponseTime,
          context,
        },
        "medium",
      );
    }
  }

  private static getAverageResponseTime(
    operation: AIErrorReport["operation"],
  ): number {
    // This would typically read from stored metrics
    // For now, return baseline values
    const baselines = {
      completion: 5000, // 5 seconds
      research: 3000, // 3 seconds
      validation: 1000, // 1 second
    };

    return baselines[operation] || 2000;
  }

  // Health check integration
  static async getAIHealthStatus(): Promise<{
    status: "healthy" | "degraded" | "unhealthy";
    details: {
      iflow: boolean;
      tavily: boolean;
      errorRate: number;
      avgResponseTime: number;
      lastError?: string;
    };
  }> {
    try {
      // Check API key configurations
      const iflowConfigured = !!process.env.IFLOW_API_KEY;
      const tavilyConfigured = !!process.env.TAVILY_API_KEY;

      // Get recent error metrics
      const recentErrors = monitoringService.getMetrics(
        "ai_errors_completion",
        10,
      );
      const errorRate = recentErrors.length > 0 ? recentErrors.length / 10 : 0;

      // Get recent performance metrics
      const performanceMetrics = monitoringService.getMetrics(
        "ai_performance_completion",
        10,
      );
      const avgResponseTime =
        performanceMetrics.length > 0
          ? performanceMetrics.reduce((sum, m) => sum + m.value, 0) /
            performanceMetrics.length
          : 0;

      // Determine overall health
      let status: "healthy" | "degraded" | "unhealthy";

      if (!iflowConfigured || !tavilyConfigured) {
        status = "unhealthy";
      } else if (errorRate > 0.2 || avgResponseTime > 10000) {
        status = "degraded";
      } else {
        status = "healthy";
      }

      return {
        status,
        details: {
          iflow: iflowConfigured,
          tavily: tavilyConfigured,
          errorRate,
          avgResponseTime,
          lastError: recentErrors[recentErrors.length - 1]?.tags
            ?.errorType as string,
        },
      };
    } catch (error) {
      return {
        status: "unhealthy",
        details: {
          iflow: false,
          tavily: false,
          errorRate: 1,
          avgResponseTime: 0,
          lastError: error instanceof Error ? error.message : "Unknown error",
        },
      };
    }
  }
}
