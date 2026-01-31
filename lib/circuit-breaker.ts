import { logger } from "./logger";

// eslint-disable-next-line no-unused-vars
export enum CircuitState {
  CLOSED = "CLOSED", // eslint-disable-line no-unused-vars
  OPEN = "OPEN", // eslint-disable-line no-unused-vars
  HALF_OPEN = "HALF_OPEN", // eslint-disable-line no-unused-vars
}

export interface CircuitBreakerConfig {
  failureThreshold: number; // Number of failures before opening
  resetTimeout: number; // Time in ms to wait before trying again
  monitoringPeriod: number; // Time window for failure counting
  successThreshold: number; // Successes needed in HALF_OPEN to close
  timeoutMs?: number; // Individual call timeout
}

export interface CircuitBreakerMetrics {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureTime?: number;
  lastSuccessTime?: number;
  totalCalls: number;
  totalFailures: number;
  totalSuccesses: number;
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime?: number;
  private lastSuccessTime?: number;
  private totalCalls: number = 0;
  private totalFailures: number = 0;
  private totalSuccesses: number = 0;
  private nextAttempt: number = 0;

  constructor(
    private readonly circuitBreakerName: string, // eslint-disable-line no-unused-vars
    private readonly circuitBreakerConfig: CircuitBreakerConfig, // eslint-disable-line no-unused-vars
  ) {}

  /**
   * Execute a function through the circuit breaker
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.totalCalls++;

    // Check if circuit should reject call
    if (this.shouldRejectCall()) {
      const error = new Error(
        `Circuit breaker "${this.circuitBreakerName}" is ${this.state}`,
      );
      this.logEvent("call_rejected", { state: this.state });
      throw error;
    }

    // Set timeout for the operation
    const timeoutMs = this.circuitBreakerConfig.timeoutMs || 30000;
    let timeoutId: NodeJS.Timeout | undefined;

    try {
      const result = await Promise.race([
        fn(),
        new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error(`Operation timed out after ${timeoutMs}ms`));
          }, timeoutMs);
        }),
      ]);

      // Clear timeout if operation completed
      if (timeoutId) clearTimeout(timeoutId);

      this.onSuccess();
      return result;
    } catch (error) {
      if (timeoutId) clearTimeout(timeoutId);
      this.onFailure();
      throw error;
    }
  }

  /**
   * Handle successful operation
   */
  private onSuccess(): void {
    this.successCount++;
    this.totalSuccesses++;
    this.lastSuccessTime = Date.now();

    // Reset failure count on success
    if (this.state === CircuitState.CLOSED) {
      this.failureCount = 0;
    }

    // If half-open and enough successes, close circuit
    if (
      this.state === CircuitState.HALF_OPEN &&
      this.successCount >= this.circuitBreakerConfig.successThreshold
    ) {
      this.closeCircuit();
    }

    this.logEvent("success", {
      state: this.state,
      successCount: this.successCount,
    });
  }

  /**
   * Handle failed operation
   */
  private onFailure(): void {
    this.failureCount++;
    this.totalFailures++;
    this.lastFailureTime = Date.now();

    // Reset success count on failure
    this.successCount = 0;

    // Open circuit if threshold exceeded
    if (
      this.state === CircuitState.CLOSED &&
      this.failureCount >= this.circuitBreakerConfig.failureThreshold
    ) {
      this.openCircuit();
    } else if (this.state === CircuitState.HALF_OPEN) {
      // If it fails in half-open, open again
      this.openCircuit();
    }

    this.logEvent("failure", {
      state: this.state,
      failureCount: this.failureCount,
    });
  }

  /**
   * Open the circuit (fail fast mode)
   */
  private openCircuit(): void {
    this.state = CircuitState.OPEN;
    this.nextAttempt = Date.now() + this.circuitBreakerConfig.resetTimeout;
    
    this.logEvent("circuit_opened", {
      failureCount: this.failureCount,
      nextAttempt: new Date(this.nextAttempt).toISOString(),
    });

    // Emit webhook for circuit breaker trip
    this.emitCircuitBreakerWebhook().catch(error => {
      logger.error("Failed to emit circuit breaker webhook", {
        circuitBreaker: this.circuitBreakerName,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    });
  }

  /**
   * Close the circuit (normal operation)
   */
  private closeCircuit(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.logEvent("circuit_closed", {});
  }

  /**
   * Move to half-open state for testing
   */
  private halfOpenCircuit(): void {
    this.state = CircuitState.HALF_OPEN;
    this.successCount = 0;
    this.failureCount = 0;
    this.logEvent("circuit_half_open", {});
  }

  /**
   * Check if call should be rejected based on circuit state
   */
  private shouldRejectCall(): boolean {
    switch (this.state) {
      case CircuitState.OPEN:
        return Date.now() < this.nextAttempt;
      case CircuitState.HALF_OPEN:
        return false; // Allow some calls through for testing
      case CircuitState.CLOSED:
        return false;
      default:
        return false;
    }
  }

  /**
   * Get current circuit state and metrics
   */
  getMetrics(): CircuitBreakerMetrics {
    // Check if we should transition to half-open
    if (this.state === CircuitState.OPEN && Date.now() >= this.nextAttempt) {
      this.state = CircuitState.HALF_OPEN;
      this.successCount = 0;
      this.failureCount = 0;
      this.logEvent("circuit_half_open", {});
    }

    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      totalCalls: this.totalCalls,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses,
    };
  }

  /**
   * Reset circuit to closed state (for manual recovery)
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = undefined;
    this.lastSuccessTime = undefined;
    this.nextAttempt = 0;
    this.logEvent("circuit_reset", {});
  }

  /**
   * Check if service is currently available
   */
  isAvailable(): boolean {
    return (
      this.state === CircuitState.CLOSED ||
      this.state === CircuitState.HALF_OPEN
    );
  }

  /**
   * Get success rate as percentage
   */
  getSuccessRate(): number {
    if (this.totalCalls === 0) return 100;
    return Math.round((this.totalSuccesses / this.totalCalls) * 100);
  }

  /**
   * Emit webhook event for circuit breaker trip
   */
  private async emitCircuitBreakerWebhook(): Promise<void> {
    try {
      // Import dynamically to avoid circular dependencies
      const { performanceWebhookService } = await import("./services/performance-webhook-service");
      
      await performanceWebhookService.emitCircuitBreakerTrippedAlert(
        this.circuitBreakerName,
        this.getMetrics(),
      );
    } catch (_error) {
      // Error already logged above, but we don't want to throw
      // from the circuit breaker operation itself
    }
  }

  /**
   * Log circuit breaker events
   */
  private logEvent(event: string, data: Record<string, any>): void {
    logger.info(
      `Circuit breaker "${this.circuitBreakerName}" event: ${event}`,
      {
        circuitBreaker: this.circuitBreakerName,
        event,
        state: this.state,
        failureCount: this.failureCount,
        successCount: this.successCount,
        totalCalls: this.totalCalls,
        successRate: `${this.getSuccessRate()}%`,
        isAvailable: this.isAvailable(),
        ...data,
      },
    );
  }
}

// Circuit breaker registry for centralized management
export class CircuitBreakerRegistry {
  private static instance: CircuitBreakerRegistry;
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();

  private constructor() {}

  static getInstance(): CircuitBreakerRegistry {
    if (!CircuitBreakerRegistry.instance) {
      CircuitBreakerRegistry.instance = new CircuitBreakerRegistry();
    }
    return CircuitBreakerRegistry.instance;
  }

  /**
   * Get or create a circuit breaker
   */
  get(name: string, config?: CircuitBreakerConfig): CircuitBreaker {
    let circuitBreaker = this.circuitBreakers.get(name);

    if (!circuitBreaker) {
      const defaultConfig: CircuitBreakerConfig = {
        failureThreshold: 5,
        resetTimeout: 60000, // 1 minute
        monitoringPeriod: 300000, // 5 minutes
        successThreshold: 3,
        timeoutMs: 30000, // 30 seconds
      };

      circuitBreaker = new CircuitBreaker(name, {
        ...defaultConfig,
        ...config,
      });

      this.circuitBreakers.set(name, circuitBreaker);
      logger.info(`Circuit breaker "${name}" created`, {
        config: circuitBreaker.getMetrics(),
      });
    }

    return circuitBreaker;
  }

  /**
   * Get all circuit breaker metrics
   */
  getAllMetrics(): Record<string, CircuitBreakerMetrics> {
    const metrics: Record<string, CircuitBreakerMetrics> = {};

    for (const [circuitName, circuitBreaker] of this.circuitBreakers) {
      metrics[circuitName] = circuitBreaker.getMetrics();
    }

    return metrics;
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    // eslint-disable-next-line no-unused-vars
    for (const [_name, circuitBreaker] of this.circuitBreakers) {
      circuitBreaker.reset();
    }
    logger.info("All circuit breakers reset");
  }

  /**
   * Get circuit breakers that are currently open
   */
  getOpenCircuits(): string[] {
    const openCircuits: string[] = [];

    for (const [name, circuitBreaker] of this.circuitBreakers) {
      if (!circuitBreaker.isAvailable()) {
        openCircuits.push(name);
      }
    }

    return openCircuits;
  }
}

// Export singleton instance
export const circuitBreakerRegistry = CircuitBreakerRegistry.getInstance();

// Predefined circuit breaker configurations for common services
export const SERVICE_CONFIGS = {
  AI_IFLOW: {
    name: "ai-iflow",
    config: {
      failureThreshold: 3,
      resetTimeout: 120000, // 2 minutes
      monitoringPeriod: 300000, // 5 minutes
      successThreshold: 2,
      timeoutMs: 60000, // 1 minute
    } as CircuitBreakerConfig,
  },
  RESEARCH_TAVILY: {
    name: "research-tavily",
    config: {
      failureThreshold: 5,
      resetTimeout: 180000, // 3 minutes
      monitoringPeriod: 300000, // 5 minutes
      successThreshold: 3,
      timeoutMs: 45000, // 45 seconds
    } as CircuitBreakerConfig,
  },
  GITHUB_API: {
    name: "github-api",
    config: {
      failureThreshold: 3,
      resetTimeout: 90000, // 1.5 minutes
      monitoringPeriod: 300000, // 5 minutes
      successThreshold: 2,
      timeoutMs: 30000, // 30 seconds
    } as CircuitBreakerConfig,
  },
};

/* eslint-enable no-unused-vars */
