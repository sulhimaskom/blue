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

    // In production, this would write to a proper logging service
    // For now, we'll use console with structured format
    switch (level) {
      case "error":
        // eslint-disable-next-line no-console
        console.error(this.formatLog(logEntry));
        break;
      case "warn":
        // eslint-disable-next-line no-console
        console.warn(this.formatLog(logEntry));
        break;
      case "info":
        // eslint-disable-next-line no-console
        console.info(this.formatLog(logEntry));
        break;
      case "debug":
        if (process.env.NODE_ENV === "development") {
          // eslint-disable-next-line no-console
          console.debug(this.formatLog(logEntry));
        }
        break;
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
