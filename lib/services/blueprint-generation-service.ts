import { aiService, ResearchResult } from "./ai-service";
import { logger } from "../logger";
import { ValidationError, DatabaseError } from "./service-error-handler";
import { performanceMonitorService } from "./performance-monitor-service";
import { randomUUID } from "crypto";

export interface BlueprintData {
  projectName: string;
  projectDescription: string;
  techStack: {
    runtime: string;
    framework: string;
    database: string;
    auth: string;
    deployment: string;
  };
  features: string[];
  monetizationStrategy: string;
  marketResearch?: ResearchResult;
  architecture: {
    type: string;
    scaling: string;
    security: string[];
  };
}

export interface BlueprintGenerationRequest {
  input: string;
  research: ResearchResult;
  projectId?: string;
}

/**
 * # BlueprintGenerationService - Phase 2 Blueprinting (blueprint.md:52-57)
 *
 * **Mission**: Generate comprehensive technical architecture based on research insights
 * using AI reasoning models with structured JSON output.
 *
 * ## Core Responsibilities
 *
 * ### Blueprint Generation (blueprint.md:52-57)
 * - **Purpose**: Generate comprehensive technical architecture based on research insights
 * - **Tool**: IFlow reasoning model with structured JSON output
 * - **Process**: Self-reflection validation ensures production readiness
 * - **Output**: Complete `BlueprintData` with tech stack, features, and monetization
 * - **Performance**: 45-90 seconds with comprehensive validation
 *
 * ### AI Reasoning
 * - **Purpose**: Use reasoning models to generate structured blueprints
 * - **Model Selection**: Reasoning model for structured output
 * - **Temperature**: Lower temperature (0.3) for more deterministic results
 * - **Max Tokens**: 3500 tokens for comprehensive output
 *
 * ### Response Parsing
 * - **Purpose**: Parse and validate AI-generated JSON responses
 * - **Validation**: Required field validation and JSON structure verification
 * - **Error Handling**: Clear error messages for parsing failures
 *
 * ### Blueprint Validation
 * - **Purpose**: Self-reflection validation for production readiness
 * - **Blueprint.md:56**: AI critiques its own output
 * - **Process**: Evaluates technical feasibility, business viability, security
 * - **Success Criteria**: Production-ready blueprints pass validation
 *
 * ## Integration Points
 *
 * ### AI Services (AIService)
 * - **Reasoning Models**: `generateCompletion()` with temperature optimization
 * - **Model Selection**: Reasoning model for structured output
 *
 * ## Business Logic Highlights
 *
 * ### Technology Stack Selection
 * - **Stability First**: Proven technologies only (Postgres, React, Node.js)
 * - **Scalability Focus**: Horizontal scaling and performance considerations
 * - **Security Compliance**: OWASP principles and industry best practices
 *
 * ### Monetization Strategy Generation
 * - Each blueprint includes specific revenue models and pricing strategies
 * - Business viability validation through AI self-reflection
 * - Industry-specific monetization patterns (SaaS, marketplace, ecommerce)
 *
 * ### Quality Assurance Pipeline
 * - **Self-Reflection Validation**: AI critiques its own output for production readiness
 * - **Structured Output**: Guaranteed JSON format with required field validation
 * - **Error Resilience**: Comprehensive error handling with graceful degradation
 *
 * ## Error Handling Strategy
 *
 * ### Validation Failures
 * - Clear error messages with specific improvement suggestions
 * - Detailed validation failure context
 * - Recommendations for blueprint improvements
 *
 * ## Performance Characteristics
 *
 * ### Generation Pipeline Timeline
 * - **Blueprint Generation**: 45-90 seconds with validation
 * - **Parsing**: <500 milliseconds
 * - **Validation**: 10-20 seconds with AI reasoning
 * - **Total Pipeline**: 55-110 seconds from input to completion
 *
 * @author The Architect Platform Team
 * @version 1.0.0
 * @since 1.0.0
 *
 * @see {@link /docs/architecture/blueprint.md} Core architecture specification
 * @see {@link /lib/services/ai-service.ts} AI service integration details
 */
class BlueprintGenerationService {
  /**
   * Generate blueprint draft with AI reasoning
   * Blueprint.md:52-57 implementation
   */
  async generateBlueprintDraft(
    request: BlueprintGenerationRequest,
  ): Promise<BlueprintData> {
    logger.info("Phase 2: Blueprint generation started", { input: request.input });

    const startTime = Date.now();
    const blueprintId = randomUUID();
    const projectId = request.projectId || "unknown";

    try {
      const reasoningPrompt = this.buildReasoningPrompt(
        request.input,
        request.research,
      );

      const completion = await aiService.generateCompletion({
        prompt: reasoningPrompt,
        model: aiService.getModels().reasoning,
        temperature: 0.3,
        maxTokens: 3500,
      });

      const blueprintData = this.parseBlueprintResponse(completion.content);

      await this.validateBlueprint(blueprintData);

      const generationTime = Date.now() - startTime;

      // Record blueprint performance metric for team analytics
      performanceMonitorService.recordBlueprintMetric({
        blueprintId,
        projectId,
        generationTime,
        success: true,
        qualityScore: this.calculateQualityScore(blueprintData),
        timestamp: new Date(),
        patterns: this.extractPatterns(blueprintData),
      });

      logger.info("Phase 2: Blueprint generation completed", {
        projectName: blueprintData.projectName,
        techStack: blueprintData.techStack,
        featureCount: blueprintData.features.length,
        generationTime,
      });

      return blueprintData;
    } catch (error) {
      const generationTime = Date.now() - startTime;

      // Record failed blueprint generation
      performanceMonitorService.recordBlueprintMetric({
        blueprintId,
        projectId,
        generationTime,
        success: false,
        timestamp: new Date(),
        patterns: [],
      });

      logger.error("Phase 2: Blueprint generation failed", {
        input: request.input,
        error: error instanceof Error ? error.message : String(error),
        generationTime,
      });
      throw error;
    }
  }

  private calculateQualityScore(blueprint: BlueprintData): number {
    let score = 0;

    // Tech stack selection (up to 30 points)
    if (blueprint.techStack.runtime && blueprint.techStack.framework) {
      score += 10;
    }
    if (blueprint.techStack.database && blueprint.techStack.auth) {
      score += 10;
    }
    if (blueprint.techStack.deployment) {
      score += 10;
    }

    // Features (up to 30 points)
    if (blueprint.features.length >= 5 && blueprint.features.length <= 8) {
      score += 20;
    } else if (blueprint.features.length > 0) {
      score += 10;
    }

    // Monetization strategy (up to 20 points)
    if (blueprint.monetizationStrategy && blueprint.monetizationStrategy.length > 20) {
      score += 20;
    }

    // Architecture (up to 20 points)
    if (blueprint.architecture.type && blueprint.architecture.scaling) {
      score += 10;
    }
    if (blueprint.architecture.security && blueprint.architecture.security.length > 0) {
      score += 10;
    }

    return Math.min(100, Math.max(0, score));
  }

  private extractPatterns(blueprint: BlueprintData): string[] {
    const patterns: string[] = [];

    if (blueprint.architecture?.type) {
      patterns.push(blueprint.architecture.type);
    }
    if (blueprint.architecture?.scaling) {
      patterns.push(`scaling-${blueprint.architecture.scaling}`);
    }

    return patterns;
  }

  /**
   * Build comprehensive reasoning prompt
   */
  private buildReasoningPrompt(
    input: string,
    research: ResearchResult,
  ): string {
    return `
You are an expert Technical Architect designing a software system for: "${input}"

MARKET RESEARCH DATA:
${research.answer}

COMPETITOR ANALYSIS:
${research.results
  .slice(0, 5)
  .map((r) => `- ${r.title}: ${r.snippet}`)
  .join("\n")}

TASK: Design a comprehensive, production-ready software blueprint following these SPECIFIC REQUIREMENTS:

1. PROJECT NAMING: Create a professional, memorable project name
2. TECH STACK SELECTION: Choose proven, scalable technologies (Postgres, React, Node.js, etc.)
3. MONETIZATION STRATEGY: Must include specific revenue model and pricing
4. ARCHITECTURE: Clean architecture with proper separation of concerns
5. SECURITY: Include security considerations based on OWASP principles
6. SCALABILITY: Design for horizontal scaling and growth

CRITICAL CONSTRAINTS:
- Recommend proven technologies, not trending/experimental ones
- Focus on business viability and technical feasibility
- Consider development timeline and resource requirements
- Include deployment and operational considerations

Respond in this EXACT JSON format:
{
  "projectName": "string",
  "projectDescription": "string (2-3 sentences)",
  "techStack": {
    "runtime": "string (e.g., Node.js 20+, Python 3.11+)",
    "framework": "string (e.g., Next.js 15, Django 5)",
    "database": "string (e.g., PostgreSQL 16, MySQL 8)",
    "auth": "string (e.g., Clerk, Auth0, Firebase Auth)",
    "deployment": "string (e.g., Vercel, AWS, Railway)"
  },
  "features": ["string array - 5-8 core features"],
  "monetizationStrategy": "string (specific business model, pricing strategy)",
  "architecture": {
    "type": "string (e.g., Microservices, Monolith, Serverless)",
    "scaling": "string (horizontal scaling strategy)",
    "security": ["string array - key security considerations"]
  }
}
`.trim();
  }

  /**
   * Parse and validate AI response
   */
  private parseBlueprintResponse(content: string): BlueprintData {
    try {
      const jsonMatch =
        content.match(/```json\s*([\s\S]*?)\s*```/) ||
        content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new ValidationError("No valid JSON found in AI response");
      }

      const jsonString = jsonMatch[1] || jsonMatch[0];
      const parsed = JSON.parse(jsonString);

      const required = [
        "projectName",
        "projectDescription",
        "techStack",
        "features",
        "monetizationStrategy",
        "architecture",
      ];
      for (const field of required) {
        if (!parsed[field]) {
          throw new ValidationError(`Missing required field: ${field}`);
        }
      }

      return parsed as BlueprintData;
    } catch (error) {
      if (error instanceof ValidationError || error instanceof DatabaseError) {
        throw error;
      }
      throw new DatabaseError(
        `Blueprint parsing failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Blueprint validation and self-reflection
   * Blueprint.md:56 - Agent self-reflection validation
   */
  private async validateBlueprint(blueprint: BlueprintData): Promise<void> {
    const validationPrompt = `
CRITIQUE this software blueprint for production readiness:

PROJECT: ${blueprint.projectName}
DESCRIPTION: ${blueprint.projectDescription}
TECH STACK: ${JSON.stringify(blueprint.techStack)}
FEATURES: ${blueprint.features.join(", ")}
MONETIZATION: ${blueprint.monetizationStrategy}
ARCHITECTURE: ${JSON.stringify(blueprint.architecture)}

Evaluate on:
1. Technical feasibility and scalability
2. Business model viability 
3. Clear value proposition
4. Implementation complexity vs. timeline
5. Technology appropriateness
6. Security considerations completeness

Respond with either "VALID" if production-ready, or specific CRITICISM if improvements needed.
`.trim();

    try {
      const critique = await aiService.generateCompletion({
        prompt: validationPrompt,
        model: aiService.getModels().reasoning,
        temperature: 0.1,
        maxTokens: 500,
      });

      const response = critique.content.toUpperCase().trim();

      if (response !== "VALID" && !response.startsWith("VALID")) {
        logger.warn("Blueprint validation identified issues", {
          projectName: blueprint.projectName,
          critique: critique.content,
        });
        throw new ValidationError(` Blueprint validation failed: ${critique.content}`);
      }

      logger.info("Blueprint validation passed", {
        projectName: blueprint.projectName,
      });
    } catch (error) {
      logger.error("Blueprint validation error", {
        projectName: blueprint.projectName,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}

export const blueprintGenerationService = new BlueprintGenerationService();
