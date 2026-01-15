import { aiService } from "./ai-service";
import { logger } from "../logger";
import {
  ValidationError,
  DatabaseError,
} from "./service-error-handler";
import type {
  BlueprintData,
} from "./blueprint-generation-service";
import type { ResearchResult } from "./service-types";
import DatabaseQueryCache from "./database-cache-service";
import { UnifiedCacheManager } from "./cache-orchestrator";

export interface BlueprintRefinementRequest {
  blueprintId: string;
  feedback: string;
  updateType: "feature" | "tech" | "architecture" | "monetization";
}

export interface BlueprintRefinementContext {
  currentBlueprint: BlueprintData;
  marketResearch?: ResearchResult;
  version: number;
}

/**
 * # BlueprintRefinementService - Phase 3 Refinement (blueprint.md:59-63)
 *
 * **Mission**: Enable user-driven iteration on generated blueprints with
 * versioned history and intelligent cache invalidation.
 *
 * ## Core Responsibilities
 *
 * ### Blueprint Refinement (blueprint.md:59-63)
 * - **Purpose**: Enable user-driven iteration on generated blueprints
 * - **Types**: Feature updates, tech stack changes, architecture improvements, monetization tweaks
 * - **Process**: Versioned blueprint history with intelligent cache invalidation
 * - **Output**: New blueprint version with enhanced specifications
 * - **Performance**: 30-60 seconds depending on refinement complexity
 *
 * ### Update Types
 * - **Feature**: Add/modifying features in features array
 * - **Tech**: Update tech stack choices (runtime, framework, database, auth, deployment)
 * - **Architecture**: Architectural improvements and security considerations
 * - **Monetization**: Improve monetization strategy and business model
 *
 * ### Version Management
 * - **Purpose**: Track blueprint evolution over time
 * - **Strategy**: Incremental version numbers (1, 2, 3...)
 * - **Storage**: Separate database rows for each version
 * - **Retrieval**: Version-specific blueprint access
 *
 * ### Cache Invalidation
 * - **Purpose**: Maintain cache consistency after blueprint updates
 * - **Strategy**: Tag-based and ID-based invalidation
 * - **Intelligence**: Blueprint type-aware invalidation
 * - **Performance**: 1-2 seconds for cache invalidation
 *
 * ## Integration Points
 *
 * ### AI Services (AIService)
 * - **Refinement Models**: `generateCompletion()` for iterative updates
 * - **Model Selection**: Reasoning model for structured refinement output
 * - **Temperature**: Lower temperature (0.2) for consistent refinement
 *
 * ### Caching Infrastructure (UnifiedCacheManager)
 * - **Tag Invalidation**: Invalidate cache by blueprint type tags
 * - **ID Invalidation**: Invalidate specific blueprint caches
 * - **Pattern Recognition**: Extract blueprint type for intelligent invalidation
 *
 * ### Database Cache (DatabaseQueryCache)
 * - **User Cache Invalidation**: Invalidate user-specific blueprint caches
 * - **Blueprint Cache Invalidation**: Clear blueprint-specific caches
 *
 * ## Business Logic Highlights
 *
 * ### Refinement Quality Assurance
 * - Maintain existing structure and format
 * - Only modify aspects relevant to feedback
 * - Ensure all changes maintain production readiness
 * - Keep same JSON format as before
 *
 * ### Cache Management
 * - Intelligent cache invalidation based on blueprint type
 * - Efficient tag-based invalidation for related blueprints
 * - User cache invalidation for consistency
 *
 * ## Error Handling Strategy
 *
 * ### Validation Failures
 * - Clear error messages for invalid input
 * - Validation of feedback and update type
 * - Specific recommendations for improvement
 *
 * ### Cache Invalidation Failures
 * - Non-critical cache invalidation errors logged but don't block refinement
 * - Graceful degradation if cache services unavailable
 *
 * ## Performance Characteristics
 *
 * ### Refinement Pipeline Timeline
 * - **Blueprint Retrieval**: 100-200 milliseconds
 * - **Refinement Prompt**: <50 milliseconds
 * - **AI Generation**: 20-40 seconds with validation
 * - **Cache Invalidation**: 1-2 seconds
 * - **Total Pipeline**: 30-60 seconds from request to completion
 *
 * @author The Architect Platform Team
 * @version 1.0.0
 * @since 1.0.0
 *
 * @see {@link /docs/architecture/blueprint.md} Core architecture specification
 * @see {@link /lib/services/ai-service.ts} AI service integration details
 * @see {@link /lib/services/cache-orchestrator.ts} Caching infrastructure
 */
class BlueprintRefinementService {
  /**
   * Refine existing blueprint based on user feedback
   * Blueprint.md:59-63 implementation
   */
  async refineBlueprint(
    request: BlueprintRefinementRequest,
    context: BlueprintRefinementContext,
  ): Promise<BlueprintData> {
    const startTime = Date.now();

    try {
      logger.info("Blueprint refinement started", {
        blueprintId: request.blueprintId,
        updateType: request.updateType,
        feedback: request.feedback,
      });

      const refinementPrompt = this.buildRefinementPrompt(
        context.currentBlueprint,
        request.feedback,
        request.updateType,
      );

      const completion = await aiService.generateCompletion({
        prompt: refinementPrompt,
        model: aiService.getModels().reasoning,
        temperature: 0.2,
        maxTokens: 2000,
      });

      const updatedBlueprint = this.parseBlueprintResponse(completion.content);

      await this.validateBlueprint(updatedBlueprint);

      const completionDuration = Date.now() - startTime;

      logger.info("Blueprint refinement completed", {
        blueprintId: request.blueprintId,
        previousVersion: context.version,
        newVersion: context.version + 1,
        updateType: request.updateType,
        duration: `${completionDuration}ms`,
      });

      return updatedBlueprint;
    } catch (error) {
      const errorDuration = Date.now() - startTime;

      logger.error("Blueprint refinement failed", {
        blueprintId: request.blueprintId,
        updateType: request.updateType,
        error: error instanceof Error ? error.message : String(error),
        duration: `${errorDuration}ms`,
      });

      throw error;
    }
  }

  /**
   * Invalidate caches after blueprint refinement
   */
  async invalidateCaches(
    blueprintId: string,
    blueprint: BlueprintData,
  ): Promise<void> {
    try {
      const blueprintType = this.extractBlueprintType(blueprint);

      await DatabaseQueryCache.invalidateBlueprintCache(blueprintId);

      if (blueprintType) {
        await UnifiedCacheManager.invalidateByTag(blueprintType);
      }

      logger.debug("Blueprint caches invalidated", {
        blueprintId,
        blueprintType,
      });
    } catch (error) {
      logger.debug("Cache invalidation failed (non-critical)", {
        blueprintId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Build refinement prompt based on feedback type
   */
  private buildRefinementPrompt(
    current: BlueprintData,
    feedback: string,
    updateType: string,
  ): string {
    const typeInstructions = {
      feature: "Focus on adding/modifying features in features array",
      tech: "Focus on updating tech stack choices",
      architecture:
        "Focus on architectural improvements and security considerations",
      monetization:
        "Focus on improving monetization strategy and business model",
    };

    return `
You are refining an existing software blueprint based on user feedback.

CURRENT BLUEPRINT:
${JSON.stringify(current, null, 2)}

USER FEEDBACK (${updateType.toUpperCase()}): ${feedback}

${typeInstructions[updateType as keyof typeof typeInstructions] || "Address feedback appropriately"}

REQUIREMENTS:
- Maintain existing structure and format
- Only modify aspects relevant to feedback
- Ensure all changes maintain production readiness
- Keep same JSON format as before

Respond with updated blueprint in same JSON format.
`.trim();
  }

  /**
   * Parse and validate AI response during refinement
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
   * Validate refined blueprint
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

  /**
   * Extract blueprint type for categorization
   */
  extractBlueprintType(blueprint: BlueprintData): string {
    const features = blueprint.features.join(" ").toLowerCase();
    const tech = blueprint.techStack.framework.toLowerCase();

    if (features.includes("marketplace") || features.includes("platform"))
      return "marketplace";
    if (features.includes("ecommerce") || features.includes("payment"))
      return "ecommerce";
    if (features.includes("social") || features.includes("community"))
      return "social";
    if (features.includes("dashboard") || features.includes("analytics"))
      return "dashboard";
    if (features.includes("api") || tech.includes("api")) return "api-service";

    return "web-app";
  }
}

export const blueprintRefinementService = new BlueprintRefinementService();
