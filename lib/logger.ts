import { randomBytes } from "crypto";

export type LogLevel = "error" | "warn" | "info" | "debug";

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  correlationId?: string;
  requestId?: string;
  userId?: string;
  method?: string;
  path?: string;
  statusCode?: number;
  duration?: number;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  metadata?: Record<string, any>;
}

/**
 * Logger Configuration for Test Environments:
 *
 * To completely suppress all console output during tests, set:
 * - SUPPRESS_TEST_LOGS=true (most effective for clean test output)
 * - CI=true (automatically set in CI environments)
 *
 * To allow error logs during tests (useful for debugging), set:
 * - ALLOW_TEST_ERRORS=true
 *
 * The --silent Jest flag also automatically suppresses all logs
 */
class Logger {
  private static instance: Logger;
  private context: string = "architect-platform";

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private generateId(): string {
    return randomBytes(16).toString("hex");
  }

  private formatLog(entry: LogEntry): string {
    return JSON.stringify(entry);
  }

  private writeLog(
    level: LogLevel,
    message: string,
    metadata?: Record<string, any>,
  ): void {
    const logEntry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...metadata,
    };

    const isDevelopment = process.env.NODE_ENV === "development";
    const isTest = process.env.NODE_ENV === "test";
    const isProductionBuild =
      process.env.NEXT_PHASE === "phase-production-build" ||
      process.env.NEXT_BUILD === "true";

    // Additional test environment control
    const suppressAllTestLogs =
      process.env.SUPPRESS_TEST_LOGS === "true" ||
      process.env.CI === "true" || // CI environments typically suppress logs
      process.argv.includes("--silent");

    // In production, send to logging service only (no console output)
    // In development, show all logs in console
    // In test, control console output to avoid pollution
    // During production build, minimize console output
    if (isProductionBuild && level !== "error") {
      // Only log errors during production builds to reduce console pollution
      return;
    }

    if (isTest) {
      // Enhanced test environment logging control
      if (suppressAllTestLogs) {
        // Completely silence all logs in test mode when explicitly requested
        return;
      }

      if (level !== "error") {
        // Only log errors during tests to avoid pollution
        return;
      }

      // Error logs are allowed by default, but can be suppressed if explicitly requested
      const suppressTestErrors = process.env.SUPPRESS_TEST_ERRORS === "true";
      if (suppressTestErrors) {
        return;
      }
    }

    // Development mode or errors always go to console
    switch (level) {
      case "error":
        // eslint-disable-next-line no-console
        console.error(this.formatLog(logEntry));
        break;
      case "warn":
        if (isDevelopment) {
          // eslint-disable-next-line no-console
          console.warn(this.formatLog(logEntry));
        }
        break;
      case "info":
        if (isDevelopment) {
          // eslint-disable-next-line no-console
          console.info(this.formatLog(logEntry));
        }
        break;
      case "debug":
        if (isDevelopment) {
          // eslint-disable-next-line no-console
          console.debug(this.formatLog(logEntry));
        }
        break;
    }

    // Production logging service integration
    if (!isDevelopment && !isTest) {
      this.sendToProductionLogging(logEntry);
    }
  }

  error(message: string, metadata?: Record<string, any>): void {
    this.writeLog("error", message, metadata);
  }

  warn(message: string, metadata?: Record<string, any>): void {
    this.writeLog("warn", message, metadata);
  }

  info(message: string, metadata?: Record<string, any>): void {
    this.writeLog("info", message, metadata);
  }

  debug(message: string, metadata?: Record<string, any>): void {
    this.writeLog("debug", message, metadata);
  }

  // API-specific logging methods
  apiError(
    message: string,
    requestId: string,
    error: Error,
    metadata?: Record<string, any>,
  ): void {
    this.error(message, {
      requestId,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      ...metadata,
    });
  }

  apiRequest(
    method: string,
    path: string,
    requestId: string,
    userId?: string,
  ): void {
    this.info(`API ${method} ${path}`, {
      method,
      path,
      requestId,
      userId,
    });
  }

  apiResponse(
    method: string,
    path: string,
    requestId: string,
    statusCode: number,
    duration?: number,
  ): void {
    const logLevel = statusCode >= 400 ? "warn" : "info";
    this.writeLog(logLevel, `API ${method} ${path} ${statusCode}`, {
      method,
      path,
      requestId,
      statusCode,
      duration,
    });
  }

  // Business logic logging
  userAction(
    action: string,
    userId: string,
    metadata?: Record<string, any>,
  ): void {
    this.info(`User action: ${action}`, {
      userId,
      action,
      ...metadata,
    });
  }

  systemEvent(event: string, metadata?: Record<string, any>): void {
    this.info(`System event: ${event}`, {
      event,
      ...metadata,
    });
  }

  security(event: string, metadata?: Record<string, any>): void {
    this.warn(`Security event: ${event}`, {
      event,
      ...metadata,
    });
  }

  serviceError(
    service: string,
    message: string,
    metadata?: Record<string, any>,
  ): void {
    this.error(`Service error in ${service}`, {
      service,
      message,
      ...metadata,
    });
  }

  /**
   * Send logs to production monitoring service
   *
   * Environment-aware production logging service integration
   */
  private sendToProductionLogging(logEntry: LogEntry): void {
    try {
      // Only send error and warn levels to production monitoring
      if (logEntry.level === "error" || logEntry.level === "warn") {
        // Use dynamic import to avoid build issues in Next.js client-side
        if (typeof window === "undefined") {
          // Server-side only - import error monitoring service
          import("./services/error-monitoring-service")
            .then(({ errorMonitoring }) => {
              if (logEntry.level === "error") {
                errorMonitoring.captureError(
                  logEntry.error?.message || logEntry.message,
                  {
                    user: logEntry.userId ? { id: logEntry.userId } : undefined,
                    tags: {
                      logLevel: logEntry.level,
                      method: logEntry.method || "unknown",
                      path: logEntry.path || "unknown",
                      service: "architect-platform-logger",
                    },
                    extra: {
                      requestId: logEntry.requestId,
                      correlationId: logEntry.correlationId,
                      statusCode: logEntry.statusCode,
                      duration: logEntry.duration,
                      metadata: logEntry.metadata,
                      timestamp: logEntry.timestamp,
                    },
                  },
                  { level: "error" },
                );
              } else if (logEntry.level === "warn") {
                errorMonitoring.captureBusinessEvent(logEntry.message, {
                  category: "warning",
                  component: "logger",
                  metadata: {
                    method: logEntry.method,
                    path: logEntry.path,
                    requestId: logEntry.requestId,
                    statusCode: logEntry.statusCode,
                    ...logEntry.metadata,
                  },
                });
              }
            })
            .catch((error) => {
              // eslint-disable-next-line no-console
              console.error("Failed to import error monitoring service:", {
                error: error instanceof Error ? error.message : String(error),
              });
            });
        }
      }
    } catch (error) {
      // Fallback to console if production logging fails
      // eslint-disable-next-line no-console
      console.error("Failed to send log to production service:", {
        error: error instanceof Error ? error.message : String(error),
        originalLog: logEntry,
      });
    }
  }

  /**
   * Health check for logging system
   *
   * Checks both local logger and production service integration
   */
  public async healthCheck(): Promise<{
    status: "healthy" | "degraded" | "unhealthy";
    loggingService: "local";
    productionService: string;
    environment: string;
  }> {
    try {
      if (typeof window === "undefined") {
        const { errorMonitoring } =
          await import("./services/error-monitoring-service");
        const productionHealth = errorMonitoring.healthCheck();

        return {
          status: productionHealth.status,
          loggingService: "local",
          productionService: productionHealth.service,
          environment: process.env.NODE_ENV || "development",
        };
      }
    } catch (_error) {
      // Fallback health check if production service unavailable
      return {
        status: "degraded",
        loggingService: "local",
        productionService: "unavailable",
        environment: process.env.NODE_ENV || "development",
      };
    }

    // Default fallback
    return {
      status: "healthy",
      loggingService: "local",
      productionService: "fallback",
      environment: process.env.NODE_ENV || "development",
    };
  }
}

export const logger = Logger.getInstance();

// Helper to create request context
export function createRequestContext(): {
  requestId: string;
  correlationId: string;
} {
  return {
    requestId: `req_${randomBytes(8).toString("hex")}`,
    correlationId: `corr_${randomBytes(8).toString("hex")}`,
  };
}
