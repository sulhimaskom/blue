import { env } from "../env";
import { logger } from "../logger";
import { monitoringService } from "../monitoring";
import { AIErrorReporter } from "./ai-error-reporter";

export interface AIModel {
  id: string;
  name: string;
  type: "reasoning" | "fast";
  maxTokens: number;
}

export interface AICompletionRequest {
  prompt: string;
  model?: AIModel;
  temperature?: number;
  maxTokens?: number;
  context?: string[];
}

export interface AICompletionResponse {
  content: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface ResearchRequest {
  query: string;
  maxResults?: number;
  includeImages?: boolean;
}

export interface ResearchResult {
  query: string;
  results: Array<{
    title: string;
    url: string;
    snippet: string;
    publishedDate?: string;
  }>;
  answer: string;
}

class AIService {
  private readonly baseUrl: string;
  private readonly apiKey: string;

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
  }

  /**
   * Generate completion using IFlow AI models
   * Blueprint.md:31-32 implementation
   */
  async generateCompletion(
    request: AICompletionRequest,
  ): Promise<AICompletionResponse> {
    const startTime = Date.now();
    const context = { requestId: `req_${Date.now().toString(36)}` };

    try {
      // Default to reasoning model for complex tasks
      const model = request.model || this.models.reasoning;
      const maxTokens = request.maxTokens || model.maxTokens;

      logger.info("AI completion request initiated", {
        model: model.id,
        promptLength: request.prompt.length,
        maxTokens,
        temperature: request.temperature || 0.7,
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

      const duration = Date.now() - startTime;

      logger.info("AI completion completed successfully", {
        model: completion.model,
        promptTokens: completion.usage.promptTokens,
        completionTokens: completion.usage.completionTokens,
        totalTokens: completion.usage.totalTokens,
        duration: `${duration}ms`,
        tokenPerSecond: Math.round(
          (completion.usage.totalTokens / duration) * 1000,
        ),
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

      return completion;
    } catch (error) {
      const duration = Date.now() - startTime;

      logger.error("AI completion failed", {
        error: error instanceof Error ? error.message : String(error),
        model: request.model?.id || "unknown",
        duration: `${duration}ms`,
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
    const startTime = Date.now();
    const context = { requestId: `req_${Date.now().toString(36)}` };

    try {
      logger.info("Market research initiated", {
        query: request.query,
        maxResults: request.maxResults || 10,
        includeImages: request.includeImages || false,
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

      const duration = Date.now() - startTime;

      logger.info("Market research completed successfully", {
        query: request.query,
        resultCount: result.results.length,
        hasAnswer: Boolean(result.answer),
        duration: `${duration}ms`,
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

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      logger.error("Market research failed", {
        query: request.query,
        error: error instanceof Error ? error.message : String(error),
        duration: `${duration}ms`,
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

      logger.info("AI service health check passed");
      return true;
    } catch (error) {
      logger.error("AI service health check failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }
}

// Singleton instance for consistent usage
export const aiService = new AIService();
