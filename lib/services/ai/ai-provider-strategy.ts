import type {
  AIModel,
  AICompletionRequest,
  AICompletionResponse,
  ResearchRequest,
  ResearchResult,
} from "../service-types";

/**
 * AIProviderStrategy - Strategy Pattern Interface for AI Providers
 *
 * Enables interchangeable AI provider implementations while maintaining
 * a consistent contract across all providers.
 *
 * Design Pattern: Strategy (Behavioral)
 * - Define family of algorithms (AI providers)
 * - Make them interchangeable
 * - Client (AIService) selects algorithm at runtime
 *
 * Benefits:
 * - Open/Closed Principle: New providers add new strategies (no changes to existing code)
 * - Single Responsibility: Each strategy handles one provider's logic
 * - Testability: Easy to mock providers for testing
 * - Extensibility: Plug-in architecture for AI providers
 */
export interface AIProviderStrategy {
  /**
   * Unique identifier for this provider
   */
  readonly providerId: string;

  /**
   * Human-readable provider name
   */
  readonly providerName: string;

  /**
   * Supported models for this provider
   */
  readonly supportedModels: AIModel[];

  /**
   * Check if this provider supports a specific model
   */
  supportsModel(_modelId: string): boolean;

  /**
   * Get model configuration by ID
   */
  getModel(_modelId: string): AIModel | undefined;

  /**
   * Generate AI completion using this provider
   *
   * @param request - Completion request with prompt, model, temperature
   * @returns AI completion response with content and usage metrics
   * @throws Error if provider is unavailable or request fails
   */
  generateCompletion(
    _request: AICompletionRequest,
  ): Promise<AICompletionResponse>;

  /**
   * Conduct research using this provider's search capabilities
   *
   * @param query - Research query string
   * @returns Research results with relevant information
   * @throws Error if provider doesn't support research or request fails
   */
  conductResearch(_query: ResearchRequest): Promise<ResearchResult>;

  /**
   * Health check for this provider
   *
   * @returns true if provider is healthy and available
   */
  healthCheck(): Promise<boolean>;

  /**
   * Get provider-specific configuration for monitoring/logging
   */
  getConfig(): {
    baseUrl: string;
    supportsResearch: boolean;
    supportsCompletion: boolean;
    maxTokens: number;
    defaultTemperature: number;
  };
}

/**
 * AIProviderConfig - Configuration for provider strategies
 */
export interface AIProviderConfig {
  apiKey: string;
  baseUrl: string;
  timeout?: number;
  retryAttempts?: number;
  circuitBreakerThreshold?: number;
}
