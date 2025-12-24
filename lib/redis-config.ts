import { logger } from "./logger";

/**
 * Redis configuration validator and utility functions
 */
export class RedisConfig {
  static isRedisConfigured(): boolean {
    return !!(process.env.REDIS_URL && process.env.REDIS_URL.trim() !== "");
  }

  static getRedisConfig(): {
    url: string;
    password?: string;
    isConfigured: boolean;
    environment: string;
    recommendations: string[];
  } {
    const recommendations: string[] = [];
    const redisUrl = process.env.REDIS_URL;
    const redisPassword = process.env.REDIS_PASSWORD;
    const environment = process.env.NODE_ENV || "development";

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
      logger.warn("Redis not configured - caching features will be limited", {
        environment: config.environment,
        recommendations: config.recommendations,
      });
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
   * Get development-friendly Redis configuration
   */
  static getDevelopmentConfig(): {
    shouldConnect: boolean;
    fallbackMode: boolean;
    connectionTimeout: number;
    maxRetries: number;
    retryDelay: number;
  } {
    const isConfigured = this.isRedisConfigured();
    const isProduction = process.env.NODE_ENV === "production";

    return {
      shouldConnect: isConfigured || isProduction, // Always try in production
      fallbackMode: !isConfigured && !isProduction,
      connectionTimeout: isProduction ? 5000 : 3000,
      maxRetries: isProduction ? 5 : 2,
      retryDelay: isProduction ? 1000 : 500,
    };
  }
}
