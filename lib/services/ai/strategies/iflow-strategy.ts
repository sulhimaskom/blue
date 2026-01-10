import { logger } from "../../../logger";
import { monitoringService } from "../../../monitoring";
import { errorMonitoring } from "../../error-monitoring-service";
import {
  circuitBreakerRegistry,
  SERVICE_CONFIGS,
} from "../../../circuit-breaker";
import { UnifiedCacheManager } from "../../cache-orchestrator";
import { AIPatternDetector } from "../../ai-pattern-detector";
import { IdGenerators } from "../../../utils/id-generator";
import { DatabaseError } from "@/lib/api-utils";
import { Timing } from "../../../utils/time-measurement";
import { retryService, RETRY_CONFIGS } from "../../retry-service";
import { env } from "../../../env";
import type {
  AIModel,
  AICompletionRequest,
  AICompletionResponse,
  ResearchRequest,
  ResearchResult,
} from "../../service-types";
import type {
  AIProviderStrategy,
  AIProviderConfig,
} from "../ai-provider-strategy";

/**
 * IFlowStrategy - AI Provider Strategy for IFlow (models.dev)
 *
 * Concrete implementation of AIProviderStrategy for IFlow API.
 * Handles both completion generation and market research via Tavily.
 *
 * Blueprint.md Integration:
 * - LLM (Reasoning): IFlow models.dev (free & unlimited)
 * - LLM (Fast): IFlow fast model for quick responses
 * - Research Tool: Tavily/Perplexity API integration
 *
 * Features:
 * - Circuit breaker protection for both IFlow and Tavily
 * - Intelligent caching with pattern-aware TTL
 * - Cost optimization through retry and deduplication
 * - Comprehensive error handling and monitoring
 */
export class IFlowStrategy implements AIProviderStrategy {
  readonly providerId = "iflow";
  readonly providerName = "IFlow (models.dev)";

  private readonly config: AIProviderConfig;
  private readonly iflowCircuitBreaker;
  private readonly tavilyCircuitBreaker;

  readonly supportedModels: AIModel[] = [
    {
      id: "iflow-reasoning",
      name: "IFlow Reasoning Model",
      type: "reasoning",
      maxTokens: 4000,
    },
    {
      id: "iflow-fast",
      name: "IFlow Fast Model",
      type: "fast",
      maxTokens: 1000,
    },
  ];

  constructor(config: AIProviderConfig) {
    this.config = config;

    this.iflowCircuitBreaker = circuitBreakerRegistry.get(
      SERVICE_CONFIGS.AI_IFLOW.name,
      SERVICE_CONFIGS.AI_IFLOW.config,
    );

    this.tavilyCircuitBreaker = circuitBreakerRegistry.get(
      SERVICE_CONFIGS.RESEARCH_TAVILY.name,
      SERVICE_CONFIGS.RESEARCH_TAVILY.config,
    );
  }

  supportsModel(modelId: string): boolean {
    return this.supportedModels.some((model) => model.id === modelId);
  }

  getModel(modelId: string): AIModel | undefined {
    return this.supportedModels.find((model) => model.id === modelId);
  }

  async generateCompletion(
    request: AICompletionRequest,
  ): Promise<AICompletionResponse> {
    const startTime = Timing.now();
    const context = { requestId: IdGenerators.REQUEST() };

    try {
      if (!this.iflowCircuitBreaker.isAvailable()) {
        const metrics = this.iflowCircuitBreaker.getMetrics();
        throw new DatabaseError(
          `IFlow service temporarily unavailable (circuit breaker: ${metrics.state})`,
        );
      }

      const detectedPattern = AIPatternDetector.detectPattern(request.prompt);
      const industryContext =
        AIPatternDetector.detectIndustryContext(request.prompt) || undefined;
      const optimizedCacheKey = AIPatternDetector.generateOptimizedCacheKey(
        "iflow",
        request.prompt,
        detectedPattern.pattern || undefined,
        industryContext,
      );

      const cachedResponse = await UnifiedCacheManager.getData(
        optimizedCacheKey,
        {
          tags: detectedPattern.pattern
            ? [detectedPattern.pattern || undefined, "ai"]
            : ["ai"],
        },
      );

      if (cachedResponse) {
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
        const model = request.model || this.supportedModels[0];
        const maxTokens = request.maxTokens || model.maxTokens;

        const response = await retryService.executeWithRetry(
          async () => {
            const fetchResponse = await fetch(
              `${this.config.baseUrl}/chat/completions`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${this.config.apiKey}`,
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
              },
            );

            if (!fetchResponse.ok) {
              throw new DatabaseError(
                `IFlow API error: ${fetchResponse.statusText} (${fetchResponse.status})`,
              );
            }

            return fetchResponse;
          },
          {
            ...RETRY_CONFIGS.SLOW,
            context: {
              service: "ai-iflow",
              operation: "completion",
              model: model.id,
              promptLength: request.prompt.length,
            },
          },
        );

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

        logger.info("IFlow completion completed successfully", {
          model: completion.model,
          promptTokens: completion.usage.promptTokens,
          completionTokens: completion.usage.completionTokens,
          totalTokens: completion.usage.totalTokens,
          duration: `${duration}ms`,
          tokenPerSecond: Math.round(
            (completion.usage.totalTokens / duration) * 1000,
          ),
        });

        monitoringService.trackAIOperation("completion", duration, true, {
          model: completion.model,
          promptTokens: completion.usage.promptTokens,
          completionTokens: completion.usage.completionTokens,
          totalTokens: completion.usage.totalTokens,
        });

        errorMonitoring.captureBusinessEvent("ai_completion_success", {
          category: "ai_operations",
          component: "iflow-strategy",
          metadata: {
            model: completion.model,
            responseTime: duration,
            tokens: completion.usage.totalTokens,
          },
        });

        const intelligentTTL = this.calculateCostAwareTTL(
          detectedPattern.pattern || undefined,
          request,
          completion,
        );

        this.trackCacheOptimizationMetrics(
          detectedPattern.pattern || undefined,
          request,
          completion,
          intelligentTTL,
        );

        await UnifiedCacheManager.setData(optimizedCacheKey, completion, {
          ttl: intelligentTTL,
          tags: detectedPattern.pattern
            ? ["ai-completion", model.id, detectedPattern.pattern]
            : ["ai-completion", model.id],
        });

        return completion;
      });
    } catch (error) {
      const duration = Timing.perf(startTime);

      logger.error("IFlow completion failed", {
        error: error instanceof Error ? error.message : String(error),
        model: request.model?.id || "unknown",
        duration: `${duration}ms`,
      });

      errorMonitoring.captureAIError(
        "completion",
        error instanceof Error ? error.message : String(error),
        {
          model: request.model?.id,
          promptLength: request.prompt.length,
          responseTime: duration,
          requestId: context.requestId,
        },
        "high",
      );

      throw new DatabaseError(
        `IFlow completion failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async conductResearch(query: ResearchRequest): Promise<ResearchResult> {
    const startTime = Timing.now();
    const context = { requestId: IdGenerators.REQUEST() };

    try {
      const researchCacheKey = `tavily-research:${JSON.stringify({
        query: query.query,
        maxResults: query.maxResults || 10,
        includeImages: query.includeImages || false,
      })}`;

      const cachedResearch =
        await UnifiedCacheManager.getData(researchCacheKey);

      if (cachedResearch) {
        logger.info("Market research served from cache", {
          query: query.query,
          resultCount: cachedResearch.results.length,
          hasAnswer: Boolean(cachedResearch.answer),
        });

        const duration = Timing.perf(startTime);
        monitoringService.trackAIOperation("research", duration, true, {
          query: query.query,
          resultCount: cachedResearch.results.length,
          cached: true,
        });

        return cachedResearch;
      }

      if (!this.tavilyCircuitBreaker.isAvailable()) {
        const metrics = this.tavilyCircuitBreaker.getMetrics();
        throw new DatabaseError(
          `Research service temporarily unavailable (circuit breaker: ${metrics.state})`,
        );
      }

      return await this.tavilyCircuitBreaker.execute(async () => {
        logger.info("Market research initiated", {
          query: query.query,
          maxResults: query.maxResults || 10,
          includeImages: query.includeImages || false,
        });

        const response = await retryService.executeWithRetry(
          async () => {
            const fetchResponse = await fetch("https://api.tavily.com/search", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                api_key: env.TAVILY_API_KEY,
                query: query.query,
                search_depth: "advanced",
                include_answer: true,
                include_raw_content: false,
                max_results: query.maxResults || 10,
                include_images: query.includeImages || false,
              }),
            });

            if (!fetchResponse.ok) {
              const errorData = await fetchResponse.json().catch(() => ({}));
              throw new DatabaseError(
                `Tavily API error: ${fetchResponse.status} ${JSON.stringify(errorData)}`,
              );
            }

            return fetchResponse;
          },
          {
            ...RETRY_CONFIGS.NETWORK_SENSITIVE,
            context: {
              service: "ai-tavily",
              operation: "research",
              query: query.query,
              maxResults: query.maxResults,
            },
          },
        );

        const data = await response.json();

        const result: ResearchResult = {
          query: query.query,
          results: data.results || [],
          answer: data.answer || "",
        };

        const duration = Timing.perf(startTime);

        logger.info("Market research completed successfully", {
          query: query.query,
          resultCount: result.results.length,
          hasAnswer: Boolean(result.answer),
          duration: `${duration}ms`,
        });

        monitoringService.trackAIOperation("research", duration, true, {
          query: query.query,
          resultCount: result.results.length,
          hasAnswer: Boolean(result.answer),
        });

        errorMonitoring.captureBusinessEvent("ai_research_success", {
          category: "ai_operations",
          component: "iflow-strategy",
          metadata: {
            responseTime: duration,
          },
        });

        await UnifiedCacheManager.setData(researchCacheKey, result, {
          ttl: 7200,
          tags: ["market-research", "tavily"],
        });

        return result;
      });
    } catch (error) {
      const duration = Timing.perf(startTime);

      logger.error("Market research failed", {
        query: query.query,
        error: error instanceof Error ? error.message : String(error),
        duration: `${duration}ms`,
      });

      errorMonitoring.captureAIError(
        "research",
        error instanceof Error ? error.message : String(error),
        {
          responseTime: duration,
          requestId: context.requestId,
        },
        "high",
      );

      throw new DatabaseError(
        `Market research failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const testRequest: AICompletionRequest = {
        prompt: "Respond with 'OK' if you can read this.",
        model: this.supportedModels[1],
        maxTokens: 10,
      };

      await this.generateCompletion(testRequest);

      logger.info("IFlow service health check passed", {
        iflowCircuitState: this.iflowCircuitBreaker.getMetrics().state,
        tavilyCircuitState: this.tavilyCircuitBreaker.getMetrics().state,
      });

      return true;
    } catch (error) {
      logger.error("IFlow service health check failed", {
        error: error instanceof Error ? error.message : String(error),
        iflowCircuitState: this.iflowCircuitBreaker.getMetrics().state,
        tavilyCircuitState: this.tavilyCircuitBreaker.getMetrics().state,
      });

      return false;
    }
  }

  getConfig() {
    return {
      baseUrl: this.config.baseUrl,
      supportsResearch: true,
      supportsCompletion: true,
      maxTokens: 4000,
      defaultTemperature: 0.7,
    };
  }

  private calculateCostAwareTTL(
    pattern: string | undefined,
    request: AICompletionRequest,
    completion: AICompletionResponse,
  ): number {
    const baseTTL = 3600;

    if (pattern) {
      const patternMultiplier = this.getPatternTTLMultiplier(pattern);
      return Math.floor(baseTTL * patternMultiplier);
    }

    const tokenMultiplier = Math.min(completion.usage.totalTokens / 1000, 2);
    return Math.floor(baseTTL * tokenMultiplier);
  }

  private getPatternTTLMultiplier(pattern: string): number {
    const multipliers: Record<string, number> = {
      marketplace: 2.0,
      ecommerce: 1.8,
      social: 1.5,
      dashboard: 1.2,
      "api-service": 1.0,
    };

    return multipliers[pattern] || 1.0;
  }

  private trackCacheOptimizationMetrics(
    pattern: string | undefined,
    request: AICompletionRequest,
    completion: AICompletionResponse,
    ttl: number,
  ): void {
    if (pattern) {
      errorMonitoring.captureBusinessEvent("cache_optimization", {
        category: "ai_operations",
        component: "iflow-strategy",
        metadata: {
          pattern,
          promptLength: request.prompt.length,
          tokenCount: completion.usage.totalTokens,
          ttl,
        },
      });
    }
  }
}

/**
 * Factory function to create IFlow strategy instance
 */
export function createIFlowStrategy(
  config?: Partial<AIProviderConfig>,
): IFlowStrategy {
  return new IFlowStrategy({
    apiKey: config?.apiKey || env.IFLOW_API_KEY,
    baseUrl: config?.baseUrl || env.IFLOW_BASE_URL,
    timeout: config?.timeout || 60000,
    retryAttempts: config?.retryAttempts || 3,
    circuitBreakerThreshold: config?.circuitBreakerThreshold || 5,
  });
}
