import { createClient, type RedisClientType } from "redis";
import { logger } from "./logger";

interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
  monitoringPeriod: number;
}

interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  state: "CLOSED" | "OPEN" | "HALF_OPEN";
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

class CircuitBreaker {
  private state: CircuitBreakerState = {
    failures: 0,
    lastFailureTime: 0,
    state: "CLOSED",
  };

  constructor(private config: CircuitBreakerConfig) {
    // Configuration stored for potential future use
    void config;
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state.state === "OPEN") {
      if (Date.now() - this.state.lastFailureTime > this.config.resetTimeout) {
        this.state.state = "HALF_OPEN";
      } else {
        throw new Error("Circuit breaker is OPEN");
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.state.failures = 0;
    this.state.state = "CLOSED";
  }

  private onFailure() {
    this.state.failures++;
    this.state.lastFailureTime = Date.now();

    if (this.state.failures >= this.config.failureThreshold) {
      this.state.state = "OPEN";
    }
  }

  getState() {
    return { ...this.state };
  }
}

class RedisManager {
  private client: RedisClientType | null = null;
  private circuitBreaker: CircuitBreaker;
  private isConnecting = false;
  private connectionPool: any[] = [];
  private maxPoolSize = 10;
  private minPoolSize = 2;
  private metrics: ConnectionPoolMetrics;
  private operationMetrics: PerformanceMetrics;
  private responseTimes: number[] = [];
  private lastMetricsUpdate = Date.now();

  constructor() {
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      resetTimeout: 30000, // 30 seconds
      monitoringPeriod: 60000, // 1 minute
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
        const redisUrl = process.env.REDIS_URL;
        const redisPassword = process.env.REDIS_PASSWORD;

        if (!redisUrl) {
          throw new Error("REDIS_URL environment variable is required");
        }

        this.client = createClient({
          url: redisUrl,
          password: redisPassword || undefined,
          socket: {
            connectTimeout: 3000, // Reduced from 5000ms
            reconnectStrategy: (retries) => {
              if (retries > 5) {
                // Reduced from 10
                return new Error("Max reconnection attempts reached");
              }
              return Math.min(retries * 30, 300); // Faster reconnection
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
   * Get pooled connection for better performance
   */
  private async getPooledConnection(): Promise<RedisClientType> {
    // Try to get an idle connection from pool
    const idleConnection = this.connectionPool.find(
      () => !this.metrics.activeConnections,
    );
    if (idleConnection && idleConnection.isOpen) {
      this.metrics.activeConnections++;
      this.metrics.idleConnections--;
      return idleConnection;
    }

    // Create new connection if pool isn't full
    if (this.connectionPool.length < this.maxPoolSize) {
      const newConnection = await this.createNewConnection();
      this.connectionPool.push(newConnection);
      this.metrics.totalConnections++;
      this.metrics.activeConnections++;
      return newConnection;
    }

    // Fall back to primary client
    return await this.getClient();
  }

  /**
   * Create new Redis connection with optimized settings
   */
  private async createNewConnection(): Promise<RedisClientType> {
    const redisUrl = process.env.REDIS_URL;
    const redisPassword = process.env.REDIS_PASSWORD;

    if (!redisUrl) {
      throw new Error("REDIS_URL environment variable is required");
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
    circuitBreakerState: CircuitBreakerState;
  } {
    // Update connection utilization
    this.metrics.utilizationRate =
      this.metrics.totalConnections > 0
        ? this.metrics.activeConnections / this.metrics.totalConnections
        : 0;

    return {
      connectionMetrics: { ...this.metrics },
      operationMetrics: { ...this.operationMetrics },
      circuitBreakerState: this.circuitBreaker.getState(),
    };
  }

  /**
   * Optimize connection pool size based on current load
   */
  async optimizeConnectionPool(): Promise<void> {
    const currentLoad = this.metrics.utilizationRate;

    // Scale up if under high load (>80% utilization)
    if (currentLoad > 0.8 && this.connectionPool.length < this.maxPoolSize) {
      const newConnection = await this.createNewConnection();
      this.connectionPool.push(newConnection);
      this.metrics.totalConnections++;
      this.metrics.idleConnections++;
    }

    // Scale down if under low load (<20% utilization)
    if (currentLoad < 0.2 && this.connectionPool.length > this.minPoolSize) {
      const idleConnection = this.connectionPool.find(
        () => !this.metrics.activeConnections,
      );
      if (idleConnection) {
        await idleConnection.quit();
        const index = this.connectionPool.indexOf(idleConnection);
        this.connectionPool.splice(index, 1);
        this.metrics.totalConnections--;
        this.metrics.idleConnections--;
      }
    }

    // Scale down if under low load (<20% utilization)
    if (currentLoad < 0.2 && this.connectionPool.length > this.minPoolSize) {
      const idleConnection = this.connectionPool.find(
        () => !this.metrics.activeConnections,
      );
      if (idleConnection) {
        await idleConnection.quit();
        const index = this.connectionPool.indexOf(idleConnection);
        this.connectionPool.splice(index, 1);
        this.metrics.totalConnections--;
        this.metrics.idleConnections--;
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
    return this.circuitBreaker.getState();
  }

  /**
   * Health check for Redis connections
   */
  async healthCheck(): Promise<{
    status: "healthy" | "degraded" | "unhealthy";
    details: {
      primaryConnection: boolean;
      pooledConnections: number;
      circuitBreakerState: CircuitBreakerState;
      avgResponseTime: number;
      errorRate: number;
    };
  }> {
    let primaryConnection = false;
    let pooledConnections = 0;

    try {
      // Check primary connection
      if (this.client?.isOpen) {
        await this.client.ping();
        primaryConnection = true;
      }

      // Check pooled connections
      for (const connection of this.connectionPool) {
        if (connection.isOpen) {
          await connection.ping();
          pooledConnections++;
        }
      }

      const errorRate = this.operationMetrics.errorRate;
      const avgResponseTime = this.operationMetrics.avgResponseTime;

      // Determine health status
      let status: "healthy" | "degraded" | "unhealthy" = "healthy";

      if (!primaryConnection || pooledConnections === 0) {
        status = "unhealthy";
      } else if (errorRate > 0.1 || avgResponseTime > 1000) {
        status = "degraded";
      }

      return {
        status,
        details: {
          primaryConnection,
          pooledConnections,
          circuitBreakerState: this.circuitBreaker.getState(),
          avgResponseTime,
          errorRate,
        },
      };
    } catch (error) {
      return {
        status: "unhealthy",
        details: {
          primaryConnection: false,
          pooledConnections: 0,
          circuitBreakerState: this.circuitBreaker.getState(),
          avgResponseTime: 0,
          errorRate: 1,
        },
      };
    }
  }
}

// Singleton instance
const redisManager = new RedisManager();

// Graceful shutdown
process.on("SIGINT", async () => {
  await redisManager.disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await redisManager.disconnect();
  process.exit(0);
});

export { redisManager };
export type { CircuitBreakerConfig };
