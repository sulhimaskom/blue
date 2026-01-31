import { createClient, type RedisClientType } from "redis";
import { logger } from "./logger";
import { RedisConfig } from "./redis-config";
import {
  circuitBreakerRegistry,
  type CircuitBreakerMetrics,
} from "./circuit-breaker";

/**
 * RedisError - Error class for Redis-related operations
 */
export class RedisError extends Error {
  constructor(message: string, public readonly _cause?: Error) {
    super(message);
    this.name = "RedisError";
  }
}

interface ConnectionPoolMetrics {
  activeConnections: number;
  idleConnections: number;
  totalConnections: number;
  connectionErrors: number;
  avgResponseTime: number;
  utilizationRate: number;
}

interface PerformanceMetrics {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  avgResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  throughput: number;
  errorRate: number;
}

class RedisManager {
  private client: RedisClientType | null = null;
  private circuitBreaker: ReturnType<typeof circuitBreakerRegistry.get>;
  private isConnecting = false;
  private connectionPool: any[] = [];
  private maxPoolSize = 10;
  private minPoolSize = 2;
  private metrics: ConnectionPoolMetrics;
  private operationMetrics: PerformanceMetrics;
  private responseTimes: number[] = [];
  private lastMetricsUpdate = Date.now();

  constructor() {
    // Log Redis configuration status without warnings in development
    RedisConfig.logConfigurationStatus();

    const devConfig = RedisConfig.getDevelopmentConfig();
    this.circuitBreaker = circuitBreakerRegistry.get("redis-connection", {
      failureThreshold: devConfig.performanceMode ? 5 : 3,
      resetTimeout: devConfig.performanceMode ? 30000 : 15000, // Faster recovery for dev
      monitoringPeriod: devConfig.performanceMode ? 60000 : 30000,
      successThreshold: 2,
      timeoutMs: 30000,
    });

    this.metrics = {
      activeConnections: 0,
      idleConnections: 0,
      totalConnections: 0,
      connectionErrors: 0,
      avgResponseTime: 0,
      utilizationRate: 0,
    };

    this.operationMetrics = {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      avgResponseTime: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
      throughput: 0,
      errorRate: 0,
    };
  }

  async getClient(): Promise<RedisClientType> {
    if (this.client && this.client.isOpen) {
      return this.client;
    }

    if (this.isConnecting) {
      // Wait for connection to complete
      await new Promise((resolve) => setTimeout(resolve, 100));
      return this.getClient();
    }

    this.isConnecting = true;

    try {
      return await this.circuitBreaker.execute(async () => {
        const config = RedisConfig.getRedisConfig();
        const devConfig = RedisConfig.getDevelopmentConfig();

        if (!config.isConfigured) {
          if (devConfig.fallbackMode) {
            // Silent fallback for development - don't throw in noisy environments
            if (devConfig.silentMode) {
              throw new RedisError("Redis not configured - using fallback mode");
            } else {
              throw new RedisError(
                "Redis not configured - see logs for setup instructions",
              );
            }
          }
        }

        this.client = createClient({
          url: config.url,
          password: config.password,
          socket: {
            connectTimeout: devConfig.connectionTimeout,
            reconnectStrategy: (retries) => {
              if (retries > devConfig.maxRetries) {
                return new Error("Max reconnection attempts reached");
              }
              return Math.min(
                (retries * devConfig.retryDelay) / 10,
                devConfig.retryDelay,
              );
            },
          },
        });

        this.client.on("error", (error) => {
          logger.error("Redis Client Error", { error: error.message });
        });

        this.client.on("connect", () => {
          logger.info("Redis Client Connected");
        });

        this.client.on("disconnect", () => {
          logger.info("Redis Client Disconnected");
        });

        await this.client.connect();

        // Test connection
        await this.client.ping();

        return this.client;
      });
    } catch (error) {
      this.isConnecting = false;
      throw error;
    } finally {
      this.isConnecting = false;
    }
  }

  async executeWithFallback<T>(
    // eslint-disable-next-line no-unused-vars
    operation: (_client: RedisClientType) => Promise<T>,
    fallback?: () => Promise<T>,
  ): Promise<T> {
    const startTime = Date.now();
    this.operationMetrics.totalOperations++;

    try {
      const client = await this.getClient();
      const result = await operation(client);

      // Update performance metrics
      const responseTime = Date.now() - startTime;
      this.updateResponseTimeMetrics(responseTime);
      this.operationMetrics.successfulOperations++;

      return result;
    } catch (error) {
      this.operationMetrics.failedOperations++;
      this.metrics.connectionErrors++;

      logger.warn("Redis operation failed, using fallback", {
        error: error instanceof Error ? error.message : "Unknown error",
      });

      if (fallback) {
        return await fallback();
      }
      throw error;
    }
  }

  /**
   * Get pooled connection with intelligent load balancing
   */
  private async getPooledConnection(): Promise<RedisClientType> {
    // Round-robin selection for better load distribution
    const availableConnections = this.connectionPool.filter(
      (conn) => conn.isOpen,
    );

    if (availableConnections.length > 0) {
      // Use simple round-robin for connection selection
      const connectionIndex =
        this.operationMetrics.totalOperations % availableConnections.length;
      const selectedConnection = availableConnections[connectionIndex];

      this.metrics.activeConnections++;
      return selectedConnection;
    }

    // Create new connection if pool isn't full
    if (this.connectionPool.length < this.maxPoolSize) {
      try {
        const newConnection = await this.createNewConnection();
        this.connectionPool.push(newConnection);
        this.metrics.totalConnections++;
        this.metrics.activeConnections++;

        logger.debug("Created new Redis connection", {
          poolSize: this.connectionPool.length,
        });

        return newConnection;
      } catch (error) {
        logger.warn(
          "Failed to create new Redis connection, falling back to primary",
          {
            error: error instanceof Error ? error.message : "Unknown error",
          },
        );
      }
    }

    // Fall back to primary client as last resort
    return await this.getClient();
  }

  /**
   * Create new Redis connection with optimized settings
   */
  private async createNewConnection(): Promise<RedisClientType> {
    const redisUrl = process.env.REDIS_URL;
    const redisPassword = process.env.REDIS_PASSWORD;

    if (!redisUrl) {
      throw new RedisError("REDIS_URL environment variable is required");
    }

    // Use any type to avoid Redis client version conflicts
    const client = createClient({
      url: redisUrl,
      password: redisPassword || undefined,
      socket: {
        connectTimeout: 3000,
        reconnectStrategy: (retries: number) => {
          if (retries > 5) {
            return new Error("Max reconnection attempts reached");
          }
          return Math.min(retries * 30, 300);
        },
      },
    }) as any;

    client.on("error", (error: any) => {
      logger.error("Redis Client Error", { error: error.message });
      this.metrics.connectionErrors++;
    });

    client.on("connect", () => {
      logger.info("Redis Client Connected");
    });

    await client.connect();
    await client.ping();

    return client;
  }

  /**
   * Update response time metrics
   */
  private updateResponseTimeMetrics(responseTime: number): void {
    this.responseTimes.push(responseTime);

    // Keep only last 1000 measurements for percentile calculations
    if (this.responseTimes.length > 1000) {
      this.responseTimes = this.responseTimes.slice(-1000);
    }

    // Calculate percentiles
    const sortedTimes = [...this.responseTimes].sort((a, b) => a - b);
    const len = sortedTimes.length;

    this.operationMetrics.avgResponseTime =
      this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length;
    this.operationMetrics.p95ResponseTime = sortedTimes[Math.floor(len * 0.95)];
    this.operationMetrics.p99ResponseTime = sortedTimes[Math.floor(len * 0.99)];

    // Update throughput (operations per second)
    const now = Date.now();
    const timeDiff = (now - this.lastMetricsUpdate) / 1000;
    if (timeDiff > 0) {
      this.operationMetrics.throughput =
        this.operationMetrics.totalOperations / timeDiff;
    }

    // Update error rate
    this.operationMetrics.errorRate =
      this.operationMetrics.failedOperations /
      this.operationMetrics.totalOperations;

    this.lastMetricsUpdate = now;
  }

  /**
   * Get comprehensive performance metrics
   */
  getPerformanceMetrics(): {
    connectionMetrics: ConnectionPoolMetrics;
    operationMetrics: PerformanceMetrics;
    circuitBreakerState: CircuitBreakerMetrics;
  } {
    // Update connection utilization
    this.metrics.utilizationRate =
      this.metrics.totalConnections > 0
        ? this.metrics.activeConnections / this.metrics.totalConnections
        : 0;

    return {
      connectionMetrics: { ...this.metrics },
      operationMetrics: { ...this.operationMetrics },
      circuitBreakerState: this.circuitBreaker.getMetrics(),
    };
  }

  /**
   * Optimize connection pool size based on current load with intelligent scaling
   */
  async optimizeConnectionPool(): Promise<void> {
    const currentLoad = this.metrics.utilizationRate;
    const avgResponseTime = this.operationMetrics.avgResponseTime;

    // Advanced scaling logic considering both load and response time
    if (currentLoad > 0.8 || avgResponseTime > 500) {
      // Scale up under high load or slow response times
      if (this.connectionPool.length < this.maxPoolSize) {
        try {
          const newConnection = await this.createNewConnection();
          this.connectionPool.push(newConnection);
          this.metrics.totalConnections++;
          this.metrics.idleConnections++;

          logger.info("Redis connection pool scaled up", {
            poolSize: this.connectionPool.length,
            load: currentLoad,
            avgResponseTime,
          });
        } catch (error) {
          logger.warn("Failed to scale up Redis connection pool", {
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }
    } else if (currentLoad < 0.2 && avgResponseTime < 200) {
      // Scale down under low load with good performance
      if (this.connectionPool.length > this.minPoolSize) {
        // Find idle connections to close
        const idleConnectionIndex = this.connectionPool.findIndex(
          (conn) => conn !== this.client && conn.isOpen,
        );

        if (idleConnectionIndex >= 0) {
          try {
            const connectionToRemove = this.connectionPool[idleConnectionIndex];
            await connectionToRemove.quit();
            this.connectionPool.splice(idleConnectionIndex, 1);
            this.metrics.totalConnections--;

            // Adjust idle connections count safely
            this.metrics.idleConnections = Math.max(
              0,
              this.metrics.idleConnections - 1,
            );

            logger.info("Redis connection pool scaled down", {
              poolSize: this.connectionPool.length,
              load: currentLoad,
              avgResponseTime,
            });
          } catch (error) {
            logger.warn("Failed to scale down Redis connection pool", {
              error: error instanceof Error ? error.message : "Unknown error",
            });
          }
        }
      }
    }
  }

  async disconnect(): Promise<void> {
    if (this.client?.isOpen) {
      await this.client.quit();
      this.client = null;
    }

    // Disconnect all pooled connections
    for (const connection of this.connectionPool) {
      if (connection.isOpen) {
        await connection.quit();
      }
    }
    this.connectionPool = [];
  }

  getCircuitBreakerState() {
    return this.circuitBreaker.getMetrics();
  }

  /**
   * Advanced health check with comprehensive diagnostics
   */
  async healthCheck(): Promise<{
    status: "healthy" | "degraded" | "unhealthy";
    details: {
      primaryConnection: boolean;
      pooledConnections: number;
      totalConnections: number;
      circuitBreakerState: CircuitBreakerMetrics;
      performanceMetrics: {
        avgResponseTime: number;
        p95ResponseTime: number;
        p99ResponseTime: number;
        errorRate: number;
        throughput: number;
        utilizationRate: number;
      };
      memoryInfo: {
        usedMemory: number;
        peakMemory: number;
        fragmentationRatio: number;
      };
    };
    recommendations: string[];
  }> {
    let primaryConnection = false;
    let pooledConnections = 0;
    let memoryInfo = {
      usedMemory: 0,
      peakMemory: 0,
      fragmentationRatio: 0,
    };
    const recommendations: string[] = [];

    try {
      // Check primary connection with detailed tests
      if (this.client?.isOpen) {
        await this.client.ping();

        primaryConnection = true;

        // Get Redis memory info if available
        try {
          const info = await this.client.info("memory");
          const memoryLines = info.split("\r\n");
          memoryLines.forEach((line) => {
            if (line.startsWith("used_memory:")) {
              memoryInfo.usedMemory = parseInt(line.split(":")[1] || "0");
            }
            if (line.startsWith("used_memory_peak:")) {
              memoryInfo.peakMemory = parseInt(line.split(":")[1] || "0");
            }
            if (line.startsWith("mem_fragmentation_ratio:")) {
              memoryInfo.fragmentationRatio = parseFloat(
                line.split(":")[1] || "0",
              );
            }
          });
        } catch (_memError) {
          // Memory info is optional for health check
        }
      }

      // Check pooled connections with response time validation
      const connectionPromises = this.connectionPool.map(async (connection) => {
        if (connection.isOpen) {
          const startTime = Date.now();
          await connection.ping();
          const responseTime = Date.now() - startTime;

          // Flag slow connections
          if (responseTime > 500) {
            recommendations.push("Some pooled connections are slow (>500ms)");
          }

          return true;
        }
        return false;
      });

      const connectionResults = await Promise.all(connectionPromises);
      pooledConnections = connectionResults.filter(Boolean).length;

      const perfMetrics = {
        avgResponseTime: this.operationMetrics.avgResponseTime,
        p95ResponseTime: this.operationMetrics.p95ResponseTime,
        p99ResponseTime: this.operationMetrics.p99ResponseTime,
        errorRate: this.operationMetrics.errorRate,
        throughput: this.operationMetrics.throughput,
        utilizationRate: this.metrics.utilizationRate,
      };

      // Advanced health status determination with nuanced thresholds
      let status: "healthy" | "degraded" | "unhealthy" = "healthy";

      if (!primaryConnection) {
        status = "unhealthy";
        recommendations.push("Primary Redis connection is down");
      } else if (pooledConnections === 0) {
        status = "unhealthy";
        recommendations.push("No healthy pooled connections available");
      } else if (
        perfMetrics.errorRate > 0.15 ||
        perfMetrics.avgResponseTime > 2000 ||
        perfMetrics.p99ResponseTime > 5000
      ) {
        status = "unhealthy";
        recommendations.push("Performance metrics critically degraded");
      } else if (
        perfMetrics.errorRate > 0.05 ||
        perfMetrics.avgResponseTime > 1000 ||
        perfMetrics.p95ResponseTime > 2000 ||
        perfMetrics.utilizationRate > 0.9
      ) {
        status = "degraded";
        recommendations.push("Performance metrics show degradation");
      }

      // Memory-related recommendations
      if (memoryInfo.fragmentationRatio > 1.5) {
        recommendations.push("High memory fragmentation detected");
      }

      // Connection pool recommendations
      if (perfMetrics.utilizationRate > 0.8) {
        recommendations.push("Consider increasing Redis connection pool size");
      } else if (
        perfMetrics.utilizationRate < 0.2 &&
        this.connectionPool.length > 5
      ) {
        recommendations.push("Consider decreasing Redis connection pool size");
      }

      return {
        status,
        details: {
          primaryConnection,
          pooledConnections,
          totalConnections: this.connectionPool.length,
          circuitBreakerState: this.circuitBreaker.getMetrics(),
          performanceMetrics: perfMetrics,
          memoryInfo,
        },
        recommendations,
      };
    } catch (error) {
      return {
        status: "unhealthy",
        details: {
          primaryConnection: false,
          pooledConnections: 0,
          totalConnections: this.connectionPool.length,
          circuitBreakerState: this.circuitBreaker.getMetrics(),
          performanceMetrics: {
            avgResponseTime: 0,
            p95ResponseTime: 0,
            p99ResponseTime: 0,
            errorRate: 1,
            throughput: 0,
            utilizationRate: 0,
          },
          memoryInfo,
        },
        recommendations: [
          "Redis health check failed",
          error instanceof Error ? error.message : "Unknown error",
        ],
      };
    }
  }
}

// Singleton instance
const redisManager = new RedisManager();

// Graceful shutdown - only register in production/development, skip in tests
// to avoid MaxListenersExceededWarning during Jest test execution
if (process.env.NODE_ENV !== "test") {
  process.on("SIGINT", async () => {
    await redisManager.disconnect();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    await redisManager.disconnect();
    process.exit(0);
  });
}

export { redisManager };
