import { automatedCacheWarmingService } from "./automated-cache-warming";
import { logger } from "../logger";
import { env } from "../env";

/**
 * Runtime service initializer - Only starts services during actual runtime, not build
 * This prevents services from interfering with Next.js build process
 */
class RuntimeServiceInitializer {
  private static isInitialized = false;
  private static initPromise: Promise<void> | null = null;

  /**
   * Initialize services safely during runtime only
   * Uses lazy initialization to prevent build-time execution
   */
  static async initializeServices(): Promise<void> {
    // Prevent multiple initializations
    if (this.isInitialized) {
      return;
    }

    // Prevent initialization during build
    if (this.isBuildTime()) {
      return;
    }

    // Use promise to prevent race conditions
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.doInitialize();
    return this.initPromise;
  }

  /**
   * Check if current environment is build time
   */
  private static isBuildTime(): boolean {
    // Next.js build detection patterns
    return (
      // Environment variables set during build
      process.env.NEXT_PHASE === "phase-production-build" ||
      (env.NODE_ENV === "production" &&
        typeof require !== "undefined" &&
        require.main?.filename?.includes("next")) ||
      // Static generation detection
      process.env.NEXT_STATIC === "true" ||
      // Build command detection
      process.argv.includes("build") ||
      // Development build safety check
      (env.NODE_ENV === "production" && !this.hasServerRuntime())
    );
  }

  /**
   * Check if we have proper server runtime (not build)
   */
  private static hasServerRuntime(): boolean {
    // Check for server-specific runtime characteristics
    return (
      (typeof process !== "undefined" &&
        process.versions?.node !== undefined &&
        // Additional checks to ensure we're in actual runtime
        typeof global !== "undefined" &&
        !process.argv.includes("next-build") &&
        !process.argv.includes("export") &&
        // Ensure we're not in static generation
        !!process.env.PORT) ||
      !!process.env.HOST ||
      env.NODE_ENV === "development"
    );
  }

  /**
   * Perform actual service initialization
   */
  private static async doInitialize(): Promise<void> {
    try {
      // Only start cache warming in production with proper environment
      if (this.shouldStartCacheWarming()) {
        logger.info("Initializing runtime services", {
          environment: env.NODE_ENV,
          hasRedis: !!env.REDIS_URL,
          port: process.env.PORT,
        });

        // Start automated cache warming service
        automatedCacheWarmingService.start();

        this.isInitialized = true;

        logger.info("Runtime services initialized successfully");
      } else {
        logger.debug(
          "Cache warming service not required in current environment",
          {
            environment: env.NODE_ENV,
            hasRedis: !!env.REDIS_URL,
            isProduction: env.NODE_ENV === "production",
          },
        );

        this.isInitialized = true; // Mark as initialized to prevent re-attempts
      }
    } catch (error) {
      logger.error("Failed to initialize runtime services", {
        error: error instanceof Error ? error.message : "Unknown error",
        environment: env.NODE_ENV,
      });

      // Don't throw to prevent application startup failure
      this.isInitialized = true;
    }
  }

  /**
   * Determine if cache warming should be started
   */
  private static shouldStartCacheWarming(): boolean {
    const isProduction = env.NODE_ENV === "production";
    const hasRedis = !!env.REDIS_URL;
    const hasServer = this.hasServerRuntime();
    const isVercel = process.env.VERCEL === "1";

    // Start conditions:
    // 1. Production environment
    // 2. Has Redis configured
    // 3. Has proper server runtime (not build)
    // 4. Not in Vercel build context
    return isProduction && hasRedis && hasServer && !isVercel;
  }

  /**
   * Get initialization status
   */
  static getInitializationStatus(): {
    isInitialized: boolean;
    isBuildTime: boolean;
    environment: string;
    shouldStartCacheWarming: boolean;
  } {
    return {
      isInitialized: this.isInitialized,
      isBuildTime: this.isBuildTime(),
      environment: env.NODE_ENV || "unknown",
      shouldStartCacheWarming: this.shouldStartCacheWarming(),
    };
  }

  /**
   * Force stop services (useful for testing or cleanup)
   */
  static stopServices(): void {
    if (this.isInitialized) {
      try {
        automatedCacheWarmingService.stop();
        logger.info("Runtime services stopped");
      } catch (error) {
        logger.error("Failed to stop runtime services", {
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  }
}

// Export the runtime initializer
export { RuntimeServiceInitializer };
