/**
 * Sentry Configuration and Initialization
 *
 * This module configures Sentry error monitoring for production environments.
 * Critical for enterprise compliance and production incident response.
 */
import * as Sentry from "@sentry/node";
import { errorMonitoring } from "./services/error-monitoring-service";

// Initialize error monitoring in production environments
if (process.env.NODE_ENV === "production") {
  errorMonitoring.initialize();
}

// Global error handlers for comprehensive coverage
process.on("uncaughtException", (error) => {
  errorMonitoring.captureError(
    error,
    {
      tags: {
        type: "uncaught_exception",
        process: "node",
        critical: "true",
      },
    },
    { level: "fatal" },
  );
});

process.on("unhandledRejection", (reason, promise) => {
  errorMonitoring.captureError(
    new Error(`Unhandled rejection: ${reason}`),
    {
      tags: {
        type: "unhandled_rejection",
        process: "node",
        critical: "true",
      },
      extra: {
        promise: promise.toString(),
        reason: String(reason),
      },
    },
    { level: "error" },
  );
});

export { Sentry };
