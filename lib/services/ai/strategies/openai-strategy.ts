import { logger } from "../../../logger";
import { monitoringService } from "../../../monitoring";
import { errorMonitoring } from "../../error-monitoring-service";
import { circuitBreakerRegistry } from "../../../circuit-breaker";
import { UnifiedCacheManager } from "../../cache-orchestrator";
import { IdGenerators } from "../../../utils/id-generator";
import { Timing } from "../../../utils/time-measurement";
import { retryService, RETRY_CONFIGS } from "../../retry-service";
import { DatabaseError, ValidationError } from "@/lib/api-utils";
import { env } from "@/lib/env";
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
 * OpenAIStrategy - AI Provider Strategy for OpenAI API
 *
 * Alternative AI provider implementation demonstrating strategy pattern extensibility.
 * Shows how new providers can be added without modifying existing code.
 *
 * Benefits:
 * - Demonstrates Open/Closed Principle (add new provider, don't modify existing)
 * - Consistent interface with IFlowStrategy
 * - Same caching, monitoring, and error handling patterns
 * - Easy to add more providers (Anthropic, Claude, etc.)
 *
 * Note: This is a demonstration strategy. Production use requires:
 * - OpenAI API key configuration
 * - Circuit breaker configuration
 * - OpenAI-specific optimization
 */
export class OpenAIStrategy implements AIProviderStrategy {
  readonly providerId = "openai";
  readonly providerName = "OpenAI (GPT)";

  private readonly config: AIProviderConfig;
  private readonly circuitBreaker;

  readonly supportedModels: AIModel[] = [
    {
      id: "gpt-4",
      name: "GPT-4",
      type: "reasoning",
      maxTokens: 8192,
    },
    {
      id: "gpt-4-turbo",
      name: "GPT-4 Turbo",
      type: "reasoning",
      maxTokens: 4096,
    },
    {
      id: "gpt-3.5-turbo",
      name: "GPT-3.5 Turbo",
      type: "fast",
      maxTokens: 4096,
    },
  ];

  constructor(config: AIProviderConfig) {
    this.config = config;

    this.circuitBreaker = circuitBreakerRegistry.get("openai-provider", {
      failureThreshold: 5,
      resetTimeout: 60000,
      monitoringPeriod: 60000,
      successThreshold: 2,
    });
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
      if (!this.circuitBreaker.isAvailable()) {
        const metrics = this.circuitBreaker.getMetrics();
        throw new DatabaseError(
          `OpenAI service temporarily unavailable (circuit breaker: ${metrics.state})`,
        );
      }

      const cacheKey = `openai-completion:${JSON.stringify({
        model: request.model?.id,
        prompt: request.prompt,
        temperature: request.temperature,
      })}`;

      const cachedResponse = await UnifiedCacheManager.getData(cacheKey);

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

      return await this.circuitBreaker.execute(async () => {
        const model = request.model || this.supportedModels[0];
        const maxTokens = request.maxTokens || model.maxTokens;

        logger.info("OpenAI completion request initiated", {
          model: model.id,
          promptLength: request.prompt.length,
          maxTokens,
          temperature: request.temperature || 0.7,
        });

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
              const errorData = await fetchResponse.json().catch((error) => {
                logger.warn(`Failed to parse OpenAI API error response: ${error instanceof Error ? error.message : String(error)}`);
                return {};
              });
              throw new DatabaseError(
                `OpenAI API error: ${fetchResponse.status} ${JSON.stringify(errorData)}`,
              );
            }

            return fetchResponse;
          },
          {
            ...RETRY_CONFIGS.SLOW,
            context: {
              service: "ai-openai",
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

        logger.info("OpenAI completion completed successfully", {
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
          component: "openai-strategy",
          metadata: {
            model: completion.model,
            responseTime: duration,
            tokens: completion.usage.totalTokens,
          },
        });

        await UnifiedCacheManager.setData(cacheKey, completion, {
          ttl: 3600,
          tags: ["ai-completion", "openai", model.id],
        });

        return completion;
      });
    } catch (error) {
      const duration = Timing.perf(startTime);

      logger.error("OpenAI completion failed", {
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
        `OpenAI completion failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async conductResearch(_query: ResearchRequest): Promise<ResearchResult> {
    throw new ValidationError("OpenAI strategy does not support research operations");
  }

  async healthCheck(): Promise<boolean> {
    try {
      const testRequest: AICompletionRequest = {
        prompt: "Respond with 'OK' if you can read this.",
        model: this.supportedModels[2],
        maxTokens: 10,
      };

      await this.generateCompletion(testRequest);

      logger.info("OpenAI service health check passed", {
        circuitState: this.circuitBreaker.getMetrics().state,
      });

      return true;
    } catch (error) {
      logger.error("OpenAI service health check failed", {
        error: error instanceof Error ? error.message : String(error),
        circuitState: this.circuitBreaker.getMetrics().state,
      });

      return false;
    }
  }

  getConfig() {
    return {
      baseUrl: this.config.baseUrl,
      supportsResearch: false,
      supportsCompletion: true,
      maxTokens: 8192,
      defaultTemperature: 0.7,
    };
  }
}

/**
 * Factory function to create OpenAI strategy instance
 */
export function createOpenAIStrategy(
  config?: Partial<AIProviderConfig>,
): OpenAIStrategy {
  const apiKey = config?.apiKey || env.OPENAI_API_KEY;

  if (!apiKey) {
    logger.warn("OpenAI API key not configured", {
      component: "openai-strategy",
      action: "initialization",
    });
  }

  return new OpenAIStrategy({
    apiKey: apiKey || "",
    baseUrl: config?.baseUrl || "https://api.openai.com/v1",
    timeout: config?.timeout || 60000,
    retryAttempts: config?.retryAttempts || 3,
    circuitBreakerThreshold: config?.circuitBreakerThreshold || 5,
  });
}
