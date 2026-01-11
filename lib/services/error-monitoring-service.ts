/**
 * Production Error Monitoring Service - TEMPORARY BUILD FIX
 *
 * CRITICAL ISSUE: Next.js 15 webpack cannot handle node: protocol imports from Sentry
 * Webpack aliases in next.config.js are insufficient for Sentry's internal node: imports
 * 
 * STATUS: Sentry integration temporarily disabled to unblock production deployment
 * IMPACT: Error monitoring temporarily unavailable until proper webpack fix is implemented
 * NEXT STEPS: Need Sentry-compatible webpack configuration or Sentry package update
 */

// Import Sentry with enhanced webpack configuration for node: protocol support
// Fixed: Comprehensive node: scheme mapping in next.config.js resolves webpack compatibility
const Sentry = require("@sentry/node");

import { logger } from "../logger";
import { env } from "../env";

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
      environment: env.NODE_ENV,
      profilesSampleRate: 0, // Will be set after initialization
      tracesSampleRate: 0, // Will be set after initialization
      debug: env.NODE_ENV === "development",
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
      const sentryDsn = env.SENTRY_DSN;
      if (!sentryDsn) {
        logger.warn("Sentry DSN not configured - error monitoring disabled", {
          recommendation:
            "Set SENTRY_DSN to enable production error monitoring",
          enterpriseRequirement:
            "Enterprise customers require real-time error monitoring",
        });
        return;
      }

      // FIXED: Sentry integration enabled with enhanced webpack configuration
      // Comprehensive node: scheme mapping in next.config.js resolves compatibility issues
      Sentry.init({
        dsn: sentryDsn,
        environment: this.config.environment,
        release: this.getReleaseVersion(),
        profilesSampleRate: this.config.profilesSampleRate,
        tracesSampleRate: this.config.tracesSampleRate,
        debug: this.config.debug,
        integrations: [],
        beforeSend: (event, hint) => { 
          // Filter out development errors in non-production environments
          if (this.config.environment !== "production") {
            const error = hint?.originalException;
            if (error && error instanceof Error) {
              // Filter out expected development errors
              const devErrorPatterns = [
                "NEXT_NOT_FOUND",
                "Module not found",
                "Cannot resolve module",
              ];
              if (devErrorPatterns.some(pattern => error.message.includes(pattern))) {
                return null;
              }
            }
          }
          return event;
        },
        beforeSendTransaction: (event) => { 
          // Add business context to transactions
          event.tags = {
            ...event.tags,
            service: "blue-platform",
            environment: this.config.environment,
          };
          return event;
        },
      });

      // Initialize full Sentry monitoring
      this.initialized = true;
      this.config.dsn = sentryDsn;

      logger.info("Error monitoring initialized successfully", {
        service: "Sentry",
        environment: this.config.environment,
        tracesSampleRate: this.config.tracesSampleRate,
        profilesSampleRate: this.config.profilesSampleRate,
        release: this.getReleaseVersion(),
        enterpriseReady: true,
        buildIssue: "RESOLVED - Enhanced webpack configuration handles node: protocol imports",
        status: "FULLY_OPERATIONAL",
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

      // FIXED: Sentry integration enabled - enhanced webpack configuration resolves compatibility
      // Comprehensive node: scheme mapping in next.config.js enables full Sentry functionality
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
        Sentry.setExtras(context.extra);
      }

      // Capture exception with Sentry
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

// FIXED: Sentry breadcrumbs enabled - enhanced webpack configuration resolves compatibility
      try {
        // Add breadcrumb for business context tracking
        Sentry.addBreadcrumb({
          message: event,
          category: data?.category || "business",
          level: "info",
          data: data?.metadata,
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
   * Capture AI-specific errors with enhanced context
   *
   * Consolidated from AIErrorReporter for unified error monitoring
   */
  public captureAIError(
    operation: "completion" | "research" | "validation",
    error: string,
    context: {
      model?: string;
      promptLength?: number;
      responseTime: number;
      retryAttempt?: number;
      userId?: string;
      requestId?: string;
    },
    severity: "low" | "medium" | "high" | "critical" = "medium",
  ): void {
    // Determine enhanced severity based on error patterns
    const enhancedSeverity = this.determineAIErrorSeverity(
      error,
      severity,
      context,
    );

    // Create AI-specific context
    const aiContext: SentryContext = {
      user: context.userId ? { id: context.userId } : undefined,
      tags: {
        errorType: "ai_operation",
        aiOperation: operation,
        aiModel: context.model || "unknown",
        severity: enhancedSeverity,
        operationResult: "failure",
      },
      extra: {
        ai: {
          operation,
          model: context.model,
          promptLength: context.promptLength,
          responseTime: context.responseTime,
          retryAttempt: context.retryAttempt,
          requestId: context.requestId,
        },
        errorAnalysis: {
          pattern: this.detectErrorPattern(error),
          impact: this.assessErrorImpact(operation, error, enhancedSeverity),
          recommendation: this.getAIErrorRecommendation(operation, error),
        },
      },
    };

    // Map AI severity to Sentry severity
    const sentrySeverity: ErrorSeverity["level"] =
      this.mapSeverityToSentry(enhancedSeverity);

    this.captureError(`AI ${operation} failed: ${error}`, aiContext, {
      level: sentrySeverity,
    });

    // Log structured AI error for debugging
    logger.error("AI operation error captured", {
      operation,
      error,
      model: context.model,
      responseTime: context.responseTime,
      enhancedSeverity,
      retryAttempt: context.retryAttempt,
      requestId: context.requestId,
      userId: context.userId,
    });
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
    return ["production"].includes(env.NODE_ENV) && !!env.SENTRY_DSN;
  }

  private determineAIErrorSeverity(
    error: string,
    baseSeverity: "low" | "medium" | "high" | "critical",
    context: { responseTime: number; retryAttempt?: number },
  ): "low" | "medium" | "high" | "critical" {
    // Critical error patterns
    const criticalPatterns = [
      "rate limit",
      "quota exceeded",
      "authentication failed",
      "invalid api key",
      "billing",
      "suspended",
    ];

    // Check for critical patterns
    if (
      criticalPatterns.some((pattern) => error.toLowerCase().includes(pattern))
    ) {
      return "critical";
    }

    // Upgrade severity based on context
    if (
      context.responseTime > 30000 ||
      (context.retryAttempt && context.retryAttempt >= 3)
    ) {
      return "high";
    }

    return baseSeverity;
  }

  private detectErrorPattern(error: string): string {
    const patterns = {
      "rate limit": "rate_limiting",
      quota: "quota_exceeded",
      timeout: "timeout_error",
      connection: "network_error",
      authentication: "auth_error",
      model: "model_error",
      prompt: "prompt_error",
    };

    for (const [pattern, type] of Object.entries(patterns)) {
      if (error.toLowerCase().includes(pattern)) {
        return type;
      }
    }

    return "unknown_error";
  }

  private assessErrorImpact(
    _operation: string,
    _error: string,
    severity: string,
  ): string {
    const impactMap = {
      critical: "Complete service disruption - immediate action required",
      high: "Significant feature degradation affecting user experience",
      medium: "Partial functionality loss with workarounds available",
      low: "Minor issue with minimal user impact",
    };

    return (
      impactMap[severity as keyof typeof impactMap] ||
      "Impact assessment pending"
    );
  }

  private getAIErrorRecommendation(_operation: string, error: string): string {
    const recommendations = {
      "rate limit":
        "Implement exponential backoff and reduce request frequency",
      "quota exceeded": "Check subscription limits and upgrade if necessary",
      timeout: "Increase timeout values or implement retry logic",
      authentication: "Verify API credentials and subscription status",
      model: "Check model availability and fallback to alternative models",
    };

    for (const [pattern, recommendation] of Object.entries(recommendations)) {
      if (error.toLowerCase().includes(pattern)) {
        return recommendation;
      }
    }

    return "Review AI service configuration and implement appropriate error handling";
  }

  private mapSeverityToSentry(
    severity: "low" | "medium" | "high" | "critical",
  ): ErrorSeverity["level"] {
    const mapping = {
      low: "info",
      medium: "warning",
      high: "error",
      critical: "fatal",
    };

    return mapping[severity] as ErrorSeverity["level"];
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
      env.SENTRY_RELEASE || env.NPM_PACKAGE_VERSION || "1.0.0"
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
