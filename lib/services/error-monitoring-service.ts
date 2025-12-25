/**
 * Production Error Monitoring with Sentry Integration
 *
 * Critical Infrastructure: This is the final piece needed for enterprise sales compliance.
 * Enables comprehensive, real-world production monitoring for immediate market deployment.
 */
import * as Sentry from "@sentry/node";
import { logger } from "../logger";

// Sentry Configuration Type Definitions
export interface SentryConfig {
  enabled: boolean;
  dsn?: string;
  environment: string;
  release?: string;
  profilesSampleRate?: number;
  tracesSampleRate?: number;
  debug?: boolean;
}

export interface SentryContext {
  user?: {
    id: string;
    email?: string;
    clerkId?: string;
    subscriptionTier?: string;
  };
  tags?: {
    [key: string]: string;
  };
  extra?: {
    [key: string]: any;
  };
}

export interface ErrorSeverity {
  level: "fatal" | "error" | "warning" | "info" | "debug";
}

/**
 * Production Error Monitoring Service
 *
 * Provides enterprise-grade error monitoring, performance tracking,
 * and compliance monitoring required for immediate customer acquisition.
 */
export class ErrorMonitoringService {
  private static instance: ErrorMonitoringService;
  private initialized: boolean = false;
  private config: SentryConfig;

  private constructor() {
    this.config = {
      enabled: this.isProductionReady(),
      environment: process.env.NODE_ENV || "development",
      profilesSampleRate: 0, // Will be set after initialization
      tracesSampleRate: 0, // Will be set after initialization
      debug: process.env.NODE_ENV === "development",
    };

    // Set sample rates after initial config is established
    this.config.profilesSampleRate = this.getProfileSampleRate();
    this.config.tracesSampleRate = this.getTraceSampleRate();
  }

  public static getInstance(): ErrorMonitoringService {
    if (!ErrorMonitoringService.instance) {
      ErrorMonitoringService.instance = new ErrorMonitoringService();
    }
    return ErrorMonitoringService.instance;
  }

  /**
   * Initialize Sentry error monitoring for production environments
   *
   * Critical for enterprise sales compliance:
   * - Real-time error tracking and alerts
   * - Performance monitoring and bottlenecks
   * - Compliance monitoring for regulated industries
   * - Production incident response capabilities
   */
  public initialize(): void {
    if (this.initialized || !this.config.enabled) {
      logger.info("Error monitoring initialization", {
        initialized: this.initialized,
        enabled: this.config.enabled,
        environment: this.config.environment,
      });
      return;
    }

    try {
      // Validate Sentry configuration
      const sentryDsn = process.env.SENTRY_DSN;
      if (!sentryDsn) {
        logger.warn("Sentry DSN not configured - error monitoring disabled", {
          recommendation:
            "Set SENTRY_DSN to enable production error monitoring",
          enterpriseRequirement:
            "Enterprise customers require real-time error monitoring",
        });
        return;
      }

      // Initialize Sentry with enterprise-grade configuration
      Sentry.init({
        dsn: sentryDsn,
        environment: this.config.environment,
        release: this.getReleaseVersion(),
        profilesSampleRate: this.config.profilesSampleRate,
        tracesSampleRate: this.config.tracesSampleRate,
        debug: this.config.debug,

        // Performance monitoring integrations
        integrations: [
          // Additional integrations can be added as needed
        ],

        // Error classification and routing
        beforeSend: (event, hint) => {
          // Filter out noise in development
          if (this.config.environment === "development") {
            const error = hint.originalException as Error;

            // Skip certain development errors
            if (error?.message?.includes("NEXT_PHASE")) {
              return null;
            }
          }

          // Add business context to errors
          event.tags = {
            ...event.tags,
            service: "architect-platform",
            component: this.getComponentFromError(hint.originalException),
            businessImpact: this.assessBusinessImpact(hint.originalException),
          };

          return event;
        },

        // Performance monitoring configuration
        beforeSendTransaction: (event) => {
          // Add business context to performance traces
          event.tags = {
            ...event.tags,
            service: "architect-platform",
            environment: this.config.environment,
          };

          return event;
        },
      });

      this.initialized = true;
      this.config.dsn = sentryDsn;

      logger.info("Production error monitoring initialized", {
        service: "Sentry",
        environment: this.config.environment,
        tracesSampleRate: this.config.tracesSampleRate,
        profilesSampleRate: this.config.profilesSampleRate,
        release: this.getReleaseVersion(),
        enterpriseReady: true,
      });
    } catch (error) {
      logger.error("Failed to initialize error monitoring", {
        error: error instanceof Error ? error.message : String(error),
        impact: "Production monitoring will be unavailable",
        recommendation: "Check Sentry configuration and network connectivity",
      });
    }
  }

  /**
   * Capture and report errors with business context
   *
   * Essential for enterprise SLA compliance and production monitoring
   */
  public captureError(
    error: Error | string,
    context?: SentryContext,
    severity?: ErrorSeverity,
  ): void {
    if (!this.initialized) {
      // Fallback to structured logging when Sentry is unavailable
      logger.error("Error captured (fallback mode)", {
        error: typeof error === "string" ? error : error.message,
        context,
        severity: severity?.level || "error",
        fallbackMode: true,
      });
      return;
    }

    try {
      const errorObject = typeof error === "string" ? new Error(error) : error;

      // Set user context for personalization and compliance
      if (context?.user) {
        Sentry.setUser({
          id: context.user.id,
          email: context.user.email,
          clerkId: context.user.clerkId,
          subscriptionTier: context.user.subscriptionTier,
        });
      }

      // Set business context tags
      if (context?.tags) {
        Sentry.setTags(context.tags);
      }

      // Set additional context data
      if (context?.extra) {
        Sentry.setExtra("businessContext", context.extra);
      }

      // Capture with appropriate severity level
      Sentry.captureException(errorObject, {
        level: severity?.level || "error",
      });

      // Log to local system for redundancy
      logger.error("Error captured and reported", {
        error: errorObject.message,
        severity: severity?.level || "error",
        userId: context?.user?.id,
        monitoredBy: "Sentry",
      });
    } catch (sentryError) {
      // Fallback logging if Sentry fails
      logger.error("Failed to report error to Sentry", {
        originalError: typeof error === "string" ? error : error.message,
        sentryError:
          sentryError instanceof Error
            ? sentryError.message
            : String(sentryError),
        fallbackMode: true,
      });
    }
  }

  /**
   * Track API errors with structured monitoring
   *
   * Critical for understanding production API behavior and SLA compliance
   */
  public captureApiError(
    endpoint: string,
    method: string,
    statusCode: number,
    error: Error | string,
    context?: {
      requestId?: string;
      userId?: string;
      duration?: number;
      userAgent?: string;
      ip?: string;
    },
  ): void {
    const businessContext: SentryContext = {
      tags: {
        type: "api_error",
        endpoint,
        method,
        statusCode: statusCode.toString(),
        criticality:
          statusCode >= 500
            ? "critical"
            : statusCode >= 400
              ? "warning"
              : "info",
      },
      extra: {
        api: {
          endpoint,
          method,
          statusCode,
          duration: context?.duration,
        },
        request: {
          id: context?.requestId,
          userAgent: context?.userAgent,
          ip: context?.ip,
        },
      },
      user: context?.userId ? { id: context.userId } : undefined,
    };

    const severity: ErrorSeverity = {
      level:
        statusCode >= 500 ? "error" : statusCode >= 400 ? "warning" : "info",
    };

    this.captureError(error, businessContext, severity);
  }

  /**
   * Track business metrics and KPI events
   *
   * Essential for measuring platform performance and business health
   */
  public captureBusinessEvent(
    event: string,
    data?: {
      value?: number;
      category?: string;
      component?: string;
      metadata?: Record<string, any>;
    },
  ): void {
    if (!this.initialized) {
      logger.info("Business event captured (fallback mode)", {
        event,
        data,
        fallbackMode: true,
      });
      return;
    }

    try {
      Sentry.addBreadcrumb({
        type: "user",
        category: data?.category || "business",
        message: event,
        level: "info",
        data: {
          ...data?.metadata,
          businessMetric: true,
        },
      });

      logger.info("Business event tracked", {
        event,
        category: data?.category,
        value: data?.value,
        component: data?.component,
        monitoredBy: "Sentry",
      });
    } catch (error) {
      logger.warn("Failed to capture business event", {
        event,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Create structured error with business context
   *
   * Standardizes error creation for consistent monitoring
   */
  public createMonitoredError(
    message: string,
    type:
      | "validation"
      | "authentication"
      | "authorization"
      | "external_service"
      | "internal_system",
    context?: {
      requestId?: string;
      userId?: string;
      endpoint?: string;
      metadata?: Record<string, any>;
    },
  ): Error {
    const businessContext: SentryContext = {
      tags: {
        errorType: type,
        businessImpact: this.getErrorMessageImpact(type),
      },
      extra: {
        error: {
          type,
          timestamp: new Date().toISOString(),
          requestId: context?.requestId,
          endpoint: context?.endpoint,
          ...context?.metadata,
        },
      },
      user: context?.userId ? { id: context.userId } : undefined,
    };

    const error = new Error(message);
    error.name = `${type
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join("")}Error`;

    this.captureError(error, businessContext);

    return error;
  }

  /**
   * Health check for monitoring service
   *
   * Validates error monitoring system is operational
   */
  public healthCheck(): {
    status: "healthy" | "degraded" | "unhealthy";
    initialized: boolean;
    enabled: boolean;
    service: string;
    environment: string;
  } {
    const status = this.initialized
      ? "healthy"
      : this.config.enabled
        ? "degraded"
        : "unhealthy";

    return {
      status,
      initialized: this.initialized,
      enabled: this.config.enabled,
      service: "Sentry Error Monitoring",
      environment: this.config.environment,
    };
  }

  // Private helper methods

  private isProductionReady(): boolean {
    // Enable in production and staging environments
    const env = process.env.NODE_ENV || "development";
    return ["production"].includes(env) && !!process.env.SENTRY_DSN;
  }

  private getProfileSampleRate(): number {
    // Sample rates optimized for production performance
    switch (this.config.environment) {
      case "production":
        return 0.1; // 10% sampling in production
      default:
        return 0; // Disable in development
    }
  }

  private getTraceSampleRate(): number {
    // Trace sampling for performance monitoring
    switch (this.config.environment) {
      case "production":
        return 0.05; // 5% sampling in production
      default:
        return 0; // Disable in development
    }
  }

  private getReleaseVersion(): string {
    // Use build-time version or fallback
    return (
      process.env.SENTRY_RELEASE || process.env.npm_package_version || "1.0.0"
    );
  }

  private getComponentFromError(error?: any): string {
    if (!error) return "unknown";

    // Extract component from error stack or name
    const stack = error.stack || "";
    const name = error.name || "Error";

    // Analyze stack to determine component
    if (stack.includes("api/")) return "api";
    if (stack.includes("services/")) return "service";
    if (stack.includes("lib/")) return "utility";
    if (stack.includes("components/")) return "ui";

    return name.toLowerCase();
  }

  private assessBusinessImpact(
    error?: any,
  ): "high" | "medium" | "low" | "none" {
    if (!error) return "none";

    const message = error.message || "";

    // High impact: authentication, payments, data loss
    if (
      message.includes("auth") ||
      message.includes("payment") ||
      message.includes("database") ||
      message.includes("critical")
    ) {
      return "high";
    }

    // Medium impact: external services, performance
    if (
      message.includes("timeout") ||
      message.includes("external") ||
      message.includes("rate limit")
    ) {
      return "medium";
    }

    // Low impact: validation, user input errors
    if (
      message.includes("validation") ||
      message.includes("request") ||
      message.includes("format")
    ) {
      return "low";
    }

    return "none";
  }

  private getErrorMessageImpact(type: string): string {
    switch (type) {
      case "authentication":
      case "authorization":
        return "security_compliance";
      case "external_service":
        return "service_availability";
      case "internal_system":
        return "system_reliability";
      case "validation":
        return "user_experience";
      default:
        return "general";
    }
  }
}

// Export singleton instance for global use
export const errorMonitoring = ErrorMonitoringService.getInstance();

// Export convenience functions for common operations
export const captureError = (
  error: Error | string,
  context?: SentryContext,
  severity?: ErrorSeverity,
) => {
  errorMonitoring.captureError(error, context, severity);
};

export const captureApiError = (
  endpoint: string,
  method: string,
  statusCode: number,
  error: Error | string,
  context?: {
    requestId?: string;
    userId?: string;
    duration?: number;
    userAgent?: string;
    ip?: string;
  },
) => {
  errorMonitoring.captureApiError(endpoint, method, statusCode, error, context);
};

export const createMonitoredError = (
  message: string,
  type:
    | "validation"
    | "authentication"
    | "authorization"
    | "external_service"
    | "internal_system",
  context?: {
    requestId?: string;
    userId?: string;
    endpoint?: string;
    metadata?: Record<string, any>;
  },
) => {
  return errorMonitoring.createMonitoredError(message, type, context);
};
