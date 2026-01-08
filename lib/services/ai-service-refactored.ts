import { logger } from "../logger";
import { errorMonitoring } from "./error-monitoring-service";
import { IdGenerators } from "../utils/id-generator";
import { Timing } from "../utils/time-measurement";
import type {
  AIModel,
  AICompletionRequest,
  AICompletionResponse,
  ResearchRequest,
  ResearchResult,
} from "./service-types";
import { aiProviderRegistry } from "./ai/ai-provider-registry";

/**
 * AIService - Refactored with Strategy Pattern
 *
 * Architectural Improvement: Strategy Pattern Implementation
 * - Extensible AI provider support (Open/Closed Principle)
 * - Runtime provider switching
 * - Provider health monitoring
 * - Backward compatible with existing code
 *
 * Before: 722 lines monolithic service
 * After: ~200 lines with delegated provider logic
 *
 * Benefits:
 * - Modularity: Each provider is self-contained
 * - Testability: Easy to mock providers for testing
 * - Extensibility: New providers add new strategies (no code changes)
 * - Maintainability: Separated concerns, smaller codebase
 *
 * Blueprint.md Integration:
 * - LLM (Reasoning): IFlow models.dev (via strategy)
 * - LLM (Fast): IFlow fast model (via strategy)
 * - Research Tool: Tavily/Perplexity API (via strategy)
 */
export class AIService {
  private static instance: AIService;
  private registry: typeof aiProviderRegistry;

  private constructor() {
    this.registry = aiProviderRegistry;
  }

  static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  /**
   * Generate AI completion using default provider
   *
   * @param request - Completion request
   * @returns AI completion response
   */
  async generateCompletion(
    request: AICompletionRequest,
  ): Promise<AICompletionResponse> {
    const startTime = Timing.now();
    const context = { requestId: IdGenerators.REQUEST() };

    try {
      const provider = this.registry.getDefaultProvider();

      if (!provider) {
        throw new Error("No AI provider available");
      }

      logger.info("AI completion request initiated", {
        providerId: provider.providerId,
        providerName: provider.providerName,
        model: request.model?.id || "default",
        promptLength: request.prompt.length,
      });

      const response = await provider.generateCompletion(request);

      const duration = Timing.perf(startTime);

      logger.info("AI completion completed successfully", {
        providerId: provider.providerId,
        model: response.model,
        promptTokens: response.usage.promptTokens,
        completionTokens: response.usage.completionTokens,
        totalTokens: response.usage.totalTokens,
        duration: `${duration}ms`,
        requestId: context.requestId,
      });

      return response;
    } catch (error) {
      const duration = Timing.perf(startTime);

      logger.error("AI completion failed", {
        error: error instanceof Error ? error.message : String(error),
        duration: `${duration}ms`,
        requestId: context.requestId,
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

      throw error;
    }
  }

  /**
   * Generate AI completion using specific provider
   *
   * @param providerId - Provider ID to use
   * @param request - Completion request
   * @returns AI completion response
   */
  async generateCompletionWithProvider(
    providerId: string,
    request: AICompletionRequest,
  ): Promise<AICompletionResponse> {
    const startTime = Timing.now();
    const context = { requestId: IdGenerators.REQUEST() };

    try {
      const provider = this.registry.getProvider(providerId);

      if (!provider) {
        throw new Error(`Provider '${providerId}' not found`);
      }

      if (!provider.supportsModel(request.model?.id || "")) {
        throw new Error(
          `Provider '${providerId}' does not support requested model`,
        );
      }

      logger.info("AI completion request initiated with specific provider", {
        providerId: provider.providerId,
        providerName: provider.providerName,
        model: request.model?.id || "default",
        promptLength: request.prompt.length,
      });

      const response = await provider.generateCompletion(request);

      const duration = Timing.perf(startTime);

      logger.info("AI completion completed successfully", {
        providerId: provider.providerId,
        model: response.model,
        promptTokens: response.usage.promptTokens,
        completionTokens: response.usage.completionTokens,
        totalTokens: response.usage.totalTokens,
        duration: `${duration}ms`,
        requestId: context.requestId,
      });

      return response;
    } catch (error) {
      const duration = Timing.perf(startTime);

      logger.error("AI completion failed", {
        providerId,
        error: error instanceof Error ? error.message : String(error),
        duration: `${duration}ms`,
        requestId: context.requestId,
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

      throw error;
    }
  }

  /**
   * Conduct market research using default provider
   *
   * @param query - Research query
   * @returns Research results
   */
  async conductResearch(query: ResearchRequest): Promise<ResearchResult> {
    const startTime = Timing.now();
    const context = { requestId: IdGenerators.REQUEST() };

    try {
      const provider = this.registry.getDefaultProvider();

      if (!provider) {
        throw new Error("No AI provider available");
      }

      logger.info("Market research initiated", {
        providerId: provider.providerId,
        providerName: provider.providerName,
        query: query.query,
      });

      const result = await provider.conductResearch(query);

      const duration = Timing.perf(startTime);

      logger.info("Market research completed successfully", {
        providerId: provider.providerId,
        query: result.query,
        resultCount: result.results.length,
        hasAnswer: Boolean(result.answer),
        duration: `${duration}ms`,
        requestId: context.requestId,
      });

      return result;
    } catch (error) {
      const duration = Timing.perf(startTime);

      logger.error("Market research failed", {
        error: error instanceof Error ? error.message : String(error),
        duration: `${duration}ms`,
        requestId: context.requestId,
      });

      errorMonitoring.captureAIError(
        "research",
        error instanceof Error ? error.message : String(error),
        {
          promptLength: query.query.length,
          responseTime: duration,
          requestId: context.requestId,
        },
        "high",
      );

      throw error;
    }
  }

  /**
   * Get available AI models from default provider
   *
   * @returns Map of model IDs to model configurations
   */
  getModels(): Record<string, AIModel> {
    const provider = this.registry.getDefaultProvider();

    if (!provider) {
      throw new Error("No AI provider available");
    }

    const models: Record<string, AIModel> = {};
    for (const model of provider.supportedModels) {
      models[model.id] = model;
    }

    return models;
  }

  /**
   * Get available AI models from specific provider
   *
   * @param providerId - Provider ID
   * @returns Map of model IDs to model configurations
   */
  getModelsByProvider(providerId: string): Record<string, AIModel> {
    const provider = this.registry.getProvider(providerId);

    if (!provider) {
      throw new Error(`Provider '${providerId}' not found`);
    }

    const models: Record<string, AIModel> = {};
    for (const model of provider.supportedModels) {
      models[model.id] = model;
    }

    return models;
  }

  /**
   * Get all available models from all providers
   *
   * @returns Map of model IDs to model configurations
   */
  getAllModels(): Record<string, AIModel> {
    const providers = this.registry.getAllProviders();
    const models: Record<string, AIModel> = {};

    for (const provider of providers) {
      for (const model of provider.supportedModels) {
        models[model.id] = model;
      }
    }

    return models;
  }

  /**
   * Health check for default provider
   *
   * @returns true if provider is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const provider = this.registry.getDefaultProvider();

      if (!provider) {
        logger.error("Health check failed: No provider available");
        return false;
      }

      const isHealthy = await provider.healthCheck();

      if (isHealthy) {
        logger.info("AI service health check passed", {
          providerId: provider.providerId,
          providerName: provider.providerName,
        });
      }

      return isHealthy;
    } catch (error) {
      logger.error("AI service health check failed", {
        error: error instanceof Error ? error.message : String(error),
      });

      return false;
    }
  }

  /**
   * Health check for specific provider
   *
   * @param providerId - Provider ID
   * @returns true if provider is healthy
   */
  async healthCheckProvider(providerId: string): Promise<boolean> {
    try {
      const provider = this.registry.getProvider(providerId);

      if (!provider) {
        logger.error(`Health check failed: Provider '${providerId}' not found`);
        return false;
      }

      return await provider.healthCheck();
    } catch (error) {
      logger.error(`Health check failed for provider '${providerId}'`, {
        error: error instanceof Error ? error.message : String(error),
      });

      return false;
    }
  }

  /**
   * Health check all providers
   *
   * @returns Map of provider IDs to health status
   */
  async healthCheckAll(): Promise<Map<string, boolean>> {
    return await this.registry.healthCheckAll();
  }

  /**
   * Get AI provider registry
   *
   * Provides access to registry for advanced operations
   * such as provider switching, registration, etc.
   */
  getRegistry() {
    return this.registry;
  }

  /**
   * Switch default provider
   *
   * @param providerId - Provider ID to switch to
   */
  switchProvider(providerId: string): void {
    this.registry.setDefaultProvider(providerId);

    logger.info("AI provider switched", { providerId });
  }

  /**
   * Get current provider configuration
   *
   * @returns Current provider's configuration
   */
  getCurrentProviderConfig() {
    const provider = this.registry.getDefaultProvider();

    if (!provider) {
      throw new Error("No AI provider available");
    }

    return {
      providerId: provider.providerId,
      providerName: provider.providerName,
      config: provider.getConfig(),
      supportedModels: provider.supportedModels,
    };
  }
}

/**
 * Singleton instance for backward compatibility
 */
export const aiService = AIService.getInstance();

/**
 * Re-export ResearchResult for backward compatibility
 */
export type { ResearchResult } from "./service-types";
