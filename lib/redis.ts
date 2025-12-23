import { createClient, RedisClientType } from "redis";

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

  constructor() {
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      resetTimeout: 30000, // 30 seconds
      monitoringPeriod: 60000, // 1 minute
    });
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
            connectTimeout: 5000,
            reconnectStrategy: (retries) => {
              if (retries > 10) {
                return new Error("Max reconnection attempts reached");
              }
              return Math.min(retries * 50, 500);
            },
          },
        });

        this.client.on("error", (error) => {
          // eslint-disable-next-line no-console
          console.error("Redis Client Error:", error);
        });

        this.client.on("connect", () => {
          // eslint-disable-next-line no-console
          console.log("Redis Client Connected");
        });

        this.client.on("disconnect", () => {
          // eslint-disable-next-line no-console
          console.log("Redis Client Disconnected");
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
    try {
      const client = await this.getClient();
      return await operation(client);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn("Redis operation failed, using fallback:", error);
      if (fallback) {
        return await fallback();
      }
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client?.isOpen) {
      await this.client.quit();
      this.client = null;
    }
  }

  getCircuitBreakerState() {
    return this.circuitBreaker.getState();
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
