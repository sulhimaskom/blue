import { logger } from "../../logger";
import type { AIProviderStrategy } from "./ai-provider-strategy";
import { createIFlowStrategy } from "./strategies/iflow-strategy";
import { createOpenAIStrategy } from "./strategies/openai-strategy";
import { ValidationError } from "@/lib/api-utils";

/**
 * AIProviderRegistry - Centralized provider management
 *
 * Registry pattern for managing multiple AI provider strategies.
 * Enables dynamic provider selection and runtime switching.
 *
 * Design Pattern: Registry + Strategy
 * - Centralized provider management
 * - Dynamic provider registration
 * - Runtime provider switching
 * - Provider health monitoring
 *
 * Features:
 * - Provider registration and lookup
 * - Default provider management
 * - Provider health monitoring
 * - Fallback provider support
 * - Automatic provider initialization
 */
export class AIProviderRegistry {
  private static instance: AIProviderRegistry;
  private providers: Map<string, AIProviderStrategy>;
  private defaultProviderId: string;

  private constructor() {
    this.providers = new Map();
    this.defaultProviderId = "iflow";

    this.initializeDefaultProviders();
  }

  /**
   * Get singleton registry instance
   */
  static getInstance(): AIProviderRegistry {
    if (!AIProviderRegistry.instance) {
      AIProviderRegistry.instance = new AIProviderRegistry();
    }
    return AIProviderRegistry.instance;
  }

  /**
   * Initialize default providers
   */
  private initializeDefaultProviders(): void {
    try {
      this.registerProvider(createIFlowStrategy());

      this.registerProvider(createOpenAIStrategy());

      logger.info("AI Provider Registry initialized", {
        providerCount: this.providers.size,
        defaultProvider: this.defaultProviderId,
      });
    } catch (error) {
      logger.error("Failed to initialize default providers", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Register a new AI provider
   *
   * @param provider - Provider strategy instance
   * @throws Error if provider with same ID already registered
   */
  registerProvider(provider: AIProviderStrategy): void {
    const existingProvider = this.providers.get(provider.providerId);

    if (existingProvider) {
      throw new ValidationError(
        `Provider with ID '${provider.providerId}' already registered`,
      );
    }

    this.providers.set(provider.providerId, provider);

    logger.info("AI provider registered", {
      providerId: provider.providerId,
      providerName: provider.providerName,
      models: provider.supportedModels.map((m) => m.id),
      config: provider.getConfig(),
    });
  }

  /**
   * Unregister a provider
   *
   * @param providerId - Provider ID to unregister
   * @returns true if provider was found and removed
   */
  unregisterProvider(providerId: string): boolean {
    const removed = this.providers.delete(providerId);

    if (removed) {
      logger.info("AI provider unregistered", { providerId });
    }

    return removed;
  }

  /**
   * Get provider by ID
   *
   * @param providerId - Provider ID
   * @returns Provider instance or undefined if not found
   */
  getProvider(providerId: string): AIProviderStrategy | undefined {
    return this.providers.get(providerId);
  }

  /**
   * Get default provider
   *
   * @returns Default provider instance
   * @throws Error if default provider not found
   */
  getDefaultProvider(): AIProviderStrategy {
    const provider = this.providers.get(this.defaultProviderId);

    if (!provider) {
      throw new ValidationError(`Default provider '${this.defaultProviderId}' not found`);
    }

    return provider;
  }

  /**
   * Set default provider
   *
   * @param providerId - Provider ID to set as default
   * @throws Error if provider not found
   */
  setDefaultProvider(providerId: string): void {
    const provider = this.providers.get(providerId);

    if (!provider) {
      throw new ValidationError(`Provider '${providerId}' not found`);
    }

    this.defaultProviderId = providerId;

    logger.info("Default AI provider changed", {
      previousProvider: this.defaultProviderId,
      newProvider: providerId,
    });
  }

  /**
   * Get all registered providers
   *
   * @returns Array of all provider instances
   */
  getAllProviders(): AIProviderStrategy[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get all provider IDs
   *
   * @returns Array of provider IDs
   */
  getProviderIds(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Check if provider is registered
   *
   * @param providerId - Provider ID to check
   * @returns true if provider is registered
   */
  hasProvider(providerId: string): boolean {
    return this.providers.has(providerId);
  }

  /**
   * Get provider that supports a specific model
   *
   * @param modelId - Model ID to search for
   * @returns Provider instance or undefined if not found
   */
  getProviderByModel(modelId: string): AIProviderStrategy | undefined {
    for (const provider of this.providers.values()) {
      if (provider.supportsModel(modelId)) {
        return provider;
      }
    }
    return undefined;
  }

  /**
   * Health check all providers
   *
   * @returns Map of provider IDs to health status
   */
  async healthCheckAll(): Promise<Map<string, boolean>> {
    const healthStatus = new Map<string, boolean>();

    for (const [providerId, provider] of this.providers.entries()) {
      try {
        const isHealthy = await provider.healthCheck();
        healthStatus.set(providerId, isHealthy);
      } catch (error) {
        logger.error(`Health check failed for provider '${providerId}'`, {
          error: error instanceof Error ? error.message : String(error),
        });
        healthStatus.set(providerId, false);
      }
    }

    logger.info("AI provider health check completed", {
      totalProviders: healthStatus.size,
      healthyProviders: Array.from(healthStatus.entries()).filter(
        ([_, healthy]) => healthy,
      ).length,
    });

    return healthStatus;
  }

  /**
   * Get healthy provider fallback chain
   *
   * Returns array of healthy providers in priority order:
   * 1. Default provider (if healthy)
   * 2. Other healthy providers
   *
   * @returns Array of healthy provider instances
   */
  async getHealthyProviders(): Promise<AIProviderStrategy[]> {
    const healthStatus = await this.healthCheckAll();
    const healthyProviders: AIProviderStrategy[] = [];

    const defaultProvider = this.providers.get(this.defaultProviderId);
    if (defaultProvider && healthStatus.get(this.defaultProviderId)) {
      healthyProviders.push(defaultProvider);
    }

    for (const [providerId, provider] of this.providers.entries()) {
      if (
        providerId !== this.defaultProviderId &&
        healthStatus.get(providerId)
      ) {
        healthyProviders.push(provider);
      }
    }

    return healthyProviders;
  }

  /**
   * Get registry statistics
   *
   * @returns Registry statistics including provider counts and health
   */
  async getStats(): Promise<{
    totalProviders: number;
    defaultProviderId: string;
    providerIds: string[];
    models: Record<string, string[]>;
  }> {
    const models: Record<string, string[]> = {};
    for (const [providerId, provider] of this.providers.entries()) {
      models[providerId] = provider.supportedModels.map((m) => m.id);
    }

    return {
      totalProviders: this.providers.size,
      defaultProviderId: this.defaultProviderId,
      providerIds: Array.from(this.providers.keys()),
      models,
    };
  }

  /**
   * Reset registry (useful for testing)
   */
  reset(): void {
    this.providers.clear();
    this.defaultProviderId = "iflow";
    this.initializeDefaultProviders();

    logger.info("AI Provider Registry reset");
  }
}

/**
 * Singleton instance export for convenient access
 */
export const aiProviderRegistry = AIProviderRegistry.getInstance();
