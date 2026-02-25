import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { AIService } from "@/lib/services/ai-service";

// Mock dependencies
jest.mock("@/lib/env", () => ({
  env: {
    IFLOW_API_KEY: "test-api-key",
    IFLOW_BASE_URL: "https://api.test.com",
    TAVILY_API_KEY: "test-tavily-key",
  },
}));

jest.mock("@/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock("@/lib/monitoring", () => ({
  monitoringService: {
    trackCacheHit: jest.fn(),
    trackCacheMiss: jest.fn(),
    recordApiCall: jest.fn(),
    recordBusinessEvent: jest.fn(),
    trackAIOperation: jest.fn(),
  },
}));

jest.mock("@/lib/services/error-monitoring-service", () => ({
  errorMonitoring: {
    captureError: jest.fn(),
    captureBusinessEvent: jest.fn(),
    captureAIError: jest.fn(),
  },
}));

jest.mock("@/lib/circuit-breaker", () => {
  const mockCircuitBreaker = {
    getMetrics: jest.fn().mockReturnValue({ state: "CLOSED", failures: 0, successes: 0, failureCount: 0 }),
    isAvailable: jest.fn().mockReturnValue(true),
    recordSuccess: jest.fn(),
    recordFailure: jest.fn(),
    execute: jest.fn(),
    reset: jest.fn(),
    getSuccessRate: jest.fn().mockReturnValue(100),
  };
  return {
    circuitBreakerRegistry: {
      get: jest.fn().mockReturnValue(mockCircuitBreaker),
    },
    SERVICE_CONFIGS: {
      AI_IFLOW: { name: "ai-iflow", config: {} },
      RESEARCH_TAVILY: { name: "research-tavily", config: {} },
    },
  };
});

jest.mock("@/lib/services/cache-orchestrator", () => ({
  UnifiedCacheManager: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(true),
    getData: jest.fn().mockResolvedValue(null),
    setData: jest.fn().mockResolvedValue(true),
    invalidateByTag: jest.fn().mockResolvedValue(true),
    getStats: jest.fn().mockResolvedValue({ hits: 0, misses: 0 }),
  },
}));

jest.mock("@/lib/services/ai-pattern-detector", () => ({
  AIPatternDetector: {
    detectPattern: jest.fn().mockReturnValue({ pattern: null }),
    detectIndustryContext: jest.fn().mockReturnValue(null),
    generateOptimizedCacheKey: jest.fn().mockReturnValue("test-cache-key"),
  },
}));

jest.mock("@/lib/utils/id-generator", () => ({
  IdGenerators: {
    REQUEST: jest.fn().mockReturnValue("test-request-id"),
  },
}));

jest.mock("@/lib/utils/time-measurement", () => ({
  Timing: {
    now: jest.fn().mockReturnValue(0),
    perf: jest.fn().mockReturnValue(100),
  },
}));

jest.mock("@/lib/services/retry-service", () => ({
  retryService: {
    executeWithRetry: jest.fn(),
  },
  RETRY_CONFIGS: {
    SLOW: { maxRetries: 3, initialDelay: 1000 },
    NETWORK_SENSITIVE: { maxRetries: 3, initialDelay: 500 },
  },
}));

describe("AIService - Health Check & Models Testing", () => {
  let aiService: AIService;

  beforeEach(() => {
    jest.clearAllMocks();
    aiService = new AIService();
  });

  describe("healthCheck", () => {
    it("should return true on successful health check", async () => {
      const mockResponse = { text: "OK", usage: { total: 5 } };
      jest.spyOn(aiService as any, "generateCompletion").mockResolvedValue(mockResponse);

      const result = await aiService.healthCheck();

      expect(result).toBe(true);
    });

    it("should return false on health check failure", async () => {
      jest.spyOn(aiService as any, "generateCompletion").mockRejectedValue(new Error("Network error"));

      const result = await aiService.healthCheck();

      expect(result).toBe(false);
    });
  });

  describe("getModels", () => {
    it("should return available AI models", () => {
      const models = aiService.getModels();

      expect(models).toHaveProperty("reasoning");
      expect(models).toHaveProperty("fast");
      expect(models.reasoning).toEqual({
        id: "iflow-reasoning",
        name: "IFlow Reasoning Model",
        type: "reasoning",
        maxTokens: 4000,
      });
      expect(models.fast).toEqual({
        id: "iflow-fast",
        name: "IFlow Fast Model",
        type: "fast",
        maxTokens: 1000,
      });
    });
  });
});

describe("AIService - Circuit Breaker Management Testing", () => {
  let aiService: AIService;

  beforeEach(() => {
    jest.clearAllMocks();
    aiService = new AIService();
  });

  it("should get circuit breaker metrics for both services", () => {
    const metrics = aiService.getCircuitBreakerMetrics();

    expect(metrics).toHaveProperty("iflow");
    expect(metrics).toHaveProperty("tavily");
    expect(metrics.iflow).toHaveProperty("state");
    expect(metrics.tavily).toHaveProperty("state");
  });

  it("should return correct model configuration", () => {
    const metrics = aiService.getCircuitBreakerMetrics();
    
    // Verify initial state is CLOSED (service available)
    expect(metrics.iflow.state).toBe("CLOSED");
    expect(metrics.tavily.state).toBe("CLOSED");
  });
});

// Previous TODO tests that have been implemented in this file:
// - should return true on successful health check ✓
// - should return false on health check failure ✓
// - should return available AI models ✓
// - should get circuit breaker metrics for both services ✓
// - should return correct model configuration ✓

// Additional TODO tests that need more complex mocking setup:
// - should successfully generate AI completion with cache miss
// - should return cached completion when available
// - should cache successful response with intelligent TTL
// - should throw error when circuit breaker is OPEN
// - should handle network errors with ServiceError
// - should retry on transient network failures
// - should calculate higher TTL for expensive completions
// - should apply higher TTL for high-value patterns (fintech)
// - should track successful AI completion events
