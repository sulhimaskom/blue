import { logger } from "./logger";
import { env } from "./env";

/**
 * Redis configuration validator and utility functions
 */
export class RedisConfig {
  static isRedisConfigured(): boolean {
    return !!(env.REDIS_URL && env.REDIS_URL.trim() !== "");
  }

  static getRedisConfig(): {
    url: string;
    password?: string;
    isConfigured: boolean;
    environment: string;
    recommendations: string[];
  } {
    const recommendations: string[] = [];
    const redisUrl = env.REDIS_URL;
    const redisPassword = env.REDIS_PASSWORD;
    const environment = env.NODE_ENV || "development";

    if (!redisUrl) {
      recommendations.push(
        "Set REDIS_URL to enable Redis caching and performance improvements",
      );
      recommendations.push("Example: REDIS_URL=redis://localhost:6379");

      if (environment === "production") {
        recommendations.push(
          "Production environment requires Redis for optimal performance",
        );
        recommendations.push(
          "Consider using Redis Cloud or AWS ElastiCache for production",
        );
      } else {
        recommendations.push(
          "For development, you can run Redis locally: docker run -d -p 6379:6379 redis:alpine",
        );
      }
    } else {
      // Validate Redis URL format
      try {
        new URL(redisUrl);
      } catch (error) {
        recommendations.push(
          "Invalid REDIS_URL format. Expected format: redis://[password@]host:port",
        );
      }

      // Security recommendations
      if (redisUrl.includes("localhost") && environment === "production") {
        recommendations.push(
          "Using localhost Redis in production is not recommended",
        );
        recommendations.push(
          "Use a managed Redis service for production deployments",
        );
      }

      if (!redisPassword && environment === "production") {
        recommendations.push(
          "Consider setting REDIS_PASSWORD for production security",
        );
      }
    }

    return {
      url: redisUrl || "",
      password: redisPassword || undefined,
      isConfigured: this.isRedisConfigured(),
      environment,
      recommendations,
    };
  }

  static logConfigurationStatus(): void {
    const config = this.getRedisConfig();

    if (!config.isConfigured) {
      // Only in production do we warn about missing Redis
      if (config.environment === "production") {
        logger.warn("Redis not configured - caching features will be limited", {
          environment: config.environment,
          recommendations: config.recommendations,
        });
      }
      // For all other environments, stay silent to reduce noise
    } else {
      logger.info("Redis configured successfully", {
        url: this.sanitizeUrl(config.url),
        environment: config.environment,
        hasPassword: !!config.password,
      });
    }
  }

  static sanitizeUrl(url: string): string {
    // Remove password from URL for logging
    try {
      const urlObj = new URL(url);
      if (urlObj.password) {
        urlObj.password = "***";
      }
      return urlObj.toString();
    } catch {
      return "***"; // Return sanitized if URL is invalid
    }
  }

  /**
   * Get development-friendly Redis configuration with enhanced defaults
   */
  static getDevelopmentConfig(): {
    shouldConnect: boolean;
    fallbackMode: boolean;
    connectionTimeout: number;
    maxRetries: number;
    retryDelay: number;
    silentMode: boolean;
    performanceMode: boolean;
  } {
    const isConfigured = this.isRedisConfigured();
    const isProduction = env.NODE_ENV === "production";
    const isTest = env.NODE_ENV === "test";

    return {
      shouldConnect: isConfigured || isProduction, // Always try in production
      fallbackMode: !isConfigured && !isProduction,
      connectionTimeout: isTest ? 1000 : isProduction ? 5000 : 3000,
      maxRetries: isTest ? 1 : isProduction ? 5 : 2,
      retryDelay: isTest ? 100 : isProduction ? 1000 : 500,
      silentMode:
        isTest ||
        (!isConfigured && env.REDIS_VERBOSE_LOGGING !== "true"),
      performanceMode: isProduction || isConfigured,
    };
  }
}
