import { env } from "../env";
import { logger } from "../logger";
import { monitoringService } from "../monitoring";
import { AIErrorReporter } from "./ai-error-reporter";
import { circuitBreakerRegistry, SERVICE_CONFIGS } from "../circuit-breaker";
import { UnifiedCacheManager } from "./unified-cache-manager";
import { AIPatternDetector } from "./ai-pattern-detector";
import { IdGenerators } from "../utils/id-generator";
import { Timing } from "../utils/time-measurement";
// Error monitoring imports for future use
// import {
//   captureApiError,
//   createMonitoredError,
// } from "./error-monitoring-service";
import type {
  AIModel,
  AICompletionRequest,
  AICompletionResponse,
  ResearchRequest,
  ResearchResult,
  AIPattern,
} from "./service-types";

// Re-export for backward compatibility
export type { ResearchResult } from "./service-types";

export class AIService {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly iflowCircuitBreaker;
  private readonly tavilyCircuitBreaker;

  // AI Models defined in blueprint.md
  private readonly models = {
    reasoning: {
      id: "iflow-reasoning",
      name: "IFlow Reasoning Model",
      type: "reasoning" as const,
      maxTokens: 4000,
    },
    fast: {
      id: "iflow-fast",
      name: "IFlow Fast Model",
      type: "fast" as const,
      maxTokens: 1000,
    },
  };

  constructor() {
    this.baseUrl = env.IFLOW_BASE_URL;
    this.apiKey = env.IFLOW_API_KEY;

    // Initialize circuit breakers for external services
    this.iflowCircuitBreaker = circuitBreakerRegistry.get(
      SERVICE_CONFIGS.AI_IFLOW.name,
      SERVICE_CONFIGS.AI_IFLOW.config,
    );

    this.tavilyCircuitBreaker = circuitBreakerRegistry.get(
      SERVICE_CONFIGS.RESEARCH_TAVILY.name,
      SERVICE_CONFIGS.RESEARCH_TAVILY.config,
    );
  }

  /**
   * Generate completion using IFlow AI models
   * Blueprint.md:31-32 implementation
   */
  async generateCompletion(
    request: AICompletionRequest,
  ): Promise<AICompletionResponse> {
    const startTime = Timing.now();
    const context = { requestId: IdGenerators.REQUEST() };

    try {
      // Check circuit breaker state before making request
      if (!this.iflowCircuitBreaker.isAvailable()) {
        const metrics = this.iflowCircuitBreaker.getMetrics();
        const error = new Error(
          `AI service temporarily unavailable (circuit breaker: ${metrics.state})`,
        );

        logger.warn("AI completion blocked by circuit breaker", {
          circuitState: metrics.state,
          failureCount: metrics.failureCount,
          successRate: `${this.iflowCircuitBreaker.getSuccessRate()}%`,
        });

        throw error;
      }

      // Detect pattern for intelligent caching
      const detectedPattern = AIPatternDetector.detectPattern(request.prompt);

      // Extract industry context for semantic caching
      const industryContext =
        AIPatternDetector.detectIndustryContext(request.prompt) || undefined;

      // Generate enhanced cache key with semantic fingerprinting
      const optimizedCacheKey = AIPatternDetector.generateOptimizedCacheKey(
        "iflow",
        request.prompt,
        detectedPattern.pattern || undefined,
        industryContext,
      );

      // Check unified cache with enhanced hit rates
      const cacheData = {
        prompt: request.prompt,
        model: request.model?.id || this.models.reasoning.id,
        temperature: request.temperature || 0.7,
        maxTokens: request.maxTokens || this.models.reasoning.maxTokens,
        context: request.context,
      };

      const cachedResponse = await UnifiedCacheManager.getData(
        "iflow-completion",
        cacheData,
        {
          key: optimizedCacheKey,
          tags: detectedPattern.pattern
            ? [detectedPattern.pattern, "ai"]
            : ["ai"],
        },
      );
      if (cachedResponse) {
        logger.info("AI completion served from cache", {
          model: cachedResponse.model,
          totalTokens: cachedResponse.usage.totalTokens,
          promptLength: request.prompt.length,
        });

        const duration = Timing.perf(startTime);
        monitoringService.trackAIOperation("completion", duration, true, {
          model: cachedResponse.model,
          promptTokens: cachedResponse.usage.promptTokens,
          completionTokens: cachedResponse.usage.completionTokens,
          totalTokens: cachedResponse.usage.totalTokens,
          cached: true,
        });

        return cachedResponse;
      }

      return await this.iflowCircuitBreaker.execute(async () => {
        // Default to reasoning model for complex tasks
        const model = request.model || this.models.reasoning;
        const maxTokens = request.maxTokens || model.maxTokens;

        logger.info("AI completion request initiated", {
          model: model.id,
          promptLength: request.prompt.length,
          maxTokens,
          temperature: request.temperature || 0.7,
          circuitState: this.iflowCircuitBreaker.getMetrics().state,
        });

        const response = await fetch(`${this.baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            model: model.id,
            messages: [
              ...(request.context || []).map((content) => ({
                role: "system" as const,
                content,
              })),
              { role: "user" as const, content: request.prompt },
            ],
            temperature: request.temperature || 0.7,
            max_tokens: maxTokens,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            `IFlow API error: ${response.status} ${JSON.stringify(errorData)}`,
          );
        }

        const data = await response.json();

        const completion: AICompletionResponse = {
          content: data.choices[0]?.message?.content || "",
          model: data.model,
          usage: {
            promptTokens: data.usage?.prompt_tokens || 0,
            completionTokens: data.usage?.completion_tokens || 0,
            totalTokens: data.usage?.total_tokens || 0,
          },
        };

        const duration = Timing.perf(startTime);

        logger.info("AI completion completed successfully", {
          model: completion.model,
          promptTokens: completion.usage.promptTokens,
          completionTokens: completion.usage.completionTokens,
          totalTokens: completion.usage.totalTokens,
          duration: `${duration}ms`,
          tokenPerSecond: Math.round(
            (completion.usage.totalTokens / duration) * 1000,
          ),
          circuitState: this.iflowCircuitBreaker.getMetrics().state,
          circuitSuccessRate: `${this.iflowCircuitBreaker.getSuccessRate()}%`,
        });

        // Track AI operation metrics
        monitoringService.trackAIOperation("completion", duration, true, {
          model: completion.model,
          promptTokens: completion.usage.promptTokens,
          completionTokens: completion.usage.completionTokens,
          totalTokens: completion.usage.totalTokens,
        });

        // Report structured success for enhanced monitoring
        AIErrorReporter.reportSuccess("completion", {
          model: completion.model,
          responseTime: duration,
          tokens: completion.usage.totalTokens,
        });

        // Cache the successful response with intelligent TTL
        const intelligentTTL = detectedPattern.pattern
          ? this.getPatternTypicalTTL(detectedPattern.pattern) * 0.5 // Half of pattern TTL for fresh data
          : 1800; // Default 30 minutes

        await UnifiedCacheManager.cacheData(
          "iflow-completion",
          cacheData,
          completion,
          {
            key: optimizedCacheKey,
            ttl: intelligentTTL,
            tags: detectedPattern.pattern
              ? ["ai-completion", model.id, detectedPattern.pattern]
              : ["ai-completion", model.id],
          },
        );

        return completion;
      });
    } catch (error) {
      const duration = Timing.perf(startTime);

      logger.error("AI completion failed", {
        error: error instanceof Error ? error.message : String(error),
        model: request.model?.id || "unknown",
        duration: `${duration}ms`,
        circuitState: this.iflowCircuitBreaker.getMetrics().state,
        circuitSuccessRate: `${this.iflowCircuitBreaker.getSuccessRate()}%`,
      });

      // Report structured error for enhanced monitoring
      AIErrorReporter.reportCompletionError(
        error instanceof Error ? error.message : String(error),
        {
          model: request.model?.id,
          promptLength: request.prompt.length,
          responseTime: duration,
          requestId: context.requestId,
        },
      );

      throw new Error(
        `AI completion failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Conduct market research using Tavily API
   * Blueprint.md:33 integration
   */
  async conductResearch(request: ResearchRequest): Promise<ResearchResult> {
    const startTime = Timing.now();
    const context = { requestId: IdGenerators.REQUEST() };

    try {
      // Check cache first for research queries
      const researchCacheKey = {
        query: request.query,
        maxResults: request.maxResults || 10,
        includeImages: request.includeImages || false,
      };

      const cachedResearch = await UnifiedCacheManager.getData(
        "tavily-research",
        researchCacheKey,
      );
      if (cachedResearch) {
        logger.info("Market research served from cache", {
          query: request.query,
          resultCount: cachedResearch.results.length,
          hasAnswer: Boolean(cachedResearch.answer),
        });

        const duration = Timing.perf(startTime);
        monitoringService.trackAIOperation("research", duration, true, {
          query: request.query,
          resultCount: cachedResearch.results.length,
          cached: true,
        });

        return cachedResearch;
      }

      // Check circuit breaker state before making request
      if (!this.tavilyCircuitBreaker.isAvailable()) {
        const metrics = this.tavilyCircuitBreaker.getMetrics();
        const error = new Error(
          `Research service temporarily unavailable (circuit breaker: ${metrics.state})`,
        );

        logger.warn("Market research blocked by circuit breaker", {
          circuitState: metrics.state,
          failureCount: metrics.failureCount,
          successRate: `${this.tavilyCircuitBreaker.getSuccessRate()}%`,
        });

        throw error;
      }

      return await this.tavilyCircuitBreaker.execute(async () => {
        logger.info("Market research initiated", {
          query: request.query,
          maxResults: request.maxResults || 10,
          includeImages: request.includeImages || false,
          circuitState: this.tavilyCircuitBreaker.getMetrics().state,
        });

        const response = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            api_key: env.TAVILY_API_KEY,
            query: request.query,
            search_depth: "advanced",
            include_answer: true,
            include_raw_content: false,
            max_results: request.maxResults || 10,
            include_images: request.includeImages || false,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            `Tavily API error: ${response.status} ${JSON.stringify(errorData)}`,
          );
        }

        const data = await response.json();

        const result: ResearchResult = {
          query: request.query,
          results: data.results || [],
          answer: data.answer || "",
        };

        const duration = Timing.perf(startTime);

        logger.info("Market research completed successfully", {
          query: request.query,
          resultCount: result.results.length,
          hasAnswer: Boolean(result.answer),
          duration: `${duration}ms`,
          circuitState: this.tavilyCircuitBreaker.getMetrics().state,
          circuitSuccessRate: `${this.tavilyCircuitBreaker.getSuccessRate()}%`,
        });

        // Track research operation metrics
        monitoringService.trackAIOperation("research", duration, true, {
          query: request.query,
          resultCount: result.results.length,
          hasAnswer: Boolean(result.answer),
        });

        // Report structured success for enhanced monitoring
        AIErrorReporter.reportSuccess("research", {
          responseTime: duration,
        });

        // Cache the successful research result
        await UnifiedCacheManager.cacheData(
          "tavily-research",
          researchCacheKey,
          result,
          {
            ttl: 7200, // 2 hours for research results
            tags: ["market-research", "tavily"],
          },
        );

        return result;
      });
    } catch (error) {
      const duration = Timing.perf(startTime);

      logger.error("Market research failed", {
        query: request.query,
        error: error instanceof Error ? error.message : String(error),
        duration: `${duration}ms`,
        circuitState: this.tavilyCircuitBreaker.getMetrics().state,
        circuitSuccessRate: `${this.tavilyCircuitBreaker.getSuccessRate()}%`,
      });

      // Report structured error for enhanced monitoring
      AIErrorReporter.reportResearchError(
        error instanceof Error ? error.message : String(error),
        {
          query: request.query,
          responseTime: duration,
          resultCount: 0,
          requestId: context.requestId,
        },
      );

      throw new Error(
        `Market research failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Get available AI models
   */
  getModels(): Record<string, AIModel> {
    return this.models;
  }

  /**
   * Validate AI service connectivity
   */
  async healthCheck(): Promise<boolean> {
    try {
      const testRequest: AICompletionRequest = {
        prompt: "Respond with 'OK' if you can read this.",
        model: this.models.fast,
        maxTokens: 10,
      };

      await this.generateCompletion(testRequest);

      logger.info("AI service health check passed", {
        iflowCircuitState: this.iflowCircuitBreaker.getMetrics().state,
        tavilyCircuitState: this.tavilyCircuitBreaker.getMetrics().state,
      });
      return true;
    } catch (error) {
      logger.error("AI service health check failed", {
        error: error instanceof Error ? error.message : String(error),
        iflowCircuitState: this.iflowCircuitBreaker.getMetrics().state,
        tavilyCircuitState: this.tavilyCircuitBreaker.getMetrics().state,
      });
      return false;
    }
  }

  /**
   * Get circuit breaker metrics for monitoring
   */
  getCircuitBreakerMetrics() {
    return {
      iflow: this.iflowCircuitBreaker.getMetrics(),
      tavily: this.tavilyCircuitBreaker.getMetrics(),
    };
  }

  /**
   * Reset circuit breakers (for manual recovery)
   */
  resetCircuitBreakers(): void {
    this.iflowCircuitBreaker.reset();
    this.tavilyCircuitBreaker.reset();
    logger.info("AI service circuit breakers reset");
  }

  /**
   * Get typical TTL for detected pattern
   */
  private getPatternTypicalTTL(pattern: AIPattern["type"]): number {
    const ttlMap: Record<AIPattern["type"], number> = {
      error: 300,
      success: 1800,
      anomaly: 600,
      marketplace: 7200,
      ecommerce: 3600,
      social: 5400,
      dashboard: 1800,
      "api-service": 2700,
      "mobile-app": 3600,
      fintech: 10800,
      healthcare: 7200,
      edtech: 5400,
      realestate: 7200,
      logistics: 5400,
      saas: 3600,
    };
    return ttlMap[pattern] || 1800;
  }
}

// Singleton instance for consistent usage
export const aiService = new AIService();
