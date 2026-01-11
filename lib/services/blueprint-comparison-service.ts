import { logger } from "@/lib/logger";
import type { Blueprint } from "@/lib/db/schema";
import type { BlueprintData } from "@/lib/services/blueprint-engine";


export interface BlueprintComparisonRequest {
  fromVersion: Blueprint;
  toVersion: Blueprint;
}

export interface LocalBlueprintChange {
  type: string;
  status: string;
  field?: string;
  value?: unknown;
  from?: string | number;
  to?: string | number;
  description: string;
}

export interface BlueprintComparisonSummary {
  totalChanges: number;
  changesByType: Record<string, number>;
  changesByStatus: Record<string, number>;
}

export interface BlueprintComparisonResult {
  changes: LocalBlueprintChange[];
  summary: BlueprintComparisonSummary;
}

/**
 * BlueprintComparisonService - Business Logic for Blueprint Version Comparison
 *
 * This service contains all business logic for comparing two blueprint versions,
 * extracting it from API routes to maintain Service Layer architecture compliance.
 *
 * Follows blueprint.md:208-209 principle - all business logic must be in
 * lib/services/, not in API route handlers or UI components.
 */
export class BlueprintComparisonService {
  private static instance: BlueprintComparisonService;

  static getInstance(): BlueprintComparisonService {
    if (!BlueprintComparisonService.instance) {
      BlueprintComparisonService.instance = new BlueprintComparisonService();
    }
    return BlueprintComparisonService.instance;
  }

  /**
   * Compare two blueprint versions and generate detailed comparison
   *
   * @param request - Comparison request with version data
   * @returns Detailed comparison with changes and summary
   */
  compareBlueprints(request: BlueprintComparisonRequest): BlueprintComparisonResult {
    const { fromVersion, toVersion } = request;
    const changes: LocalBlueprintChange[] = [];

    try {
      const fromData = this.parseStructuredData(fromVersion.structuredData as string | Record<string, unknown>);
      const toData = this.parseStructuredData(toVersion.structuredData as string | Record<string, unknown>);

      this.compareProjectInfo(fromData, toData, changes);
      this.compareFeatures(fromData, toData, changes);
      this.compareTechStack(fromData, toData, changes);
      this.compareArchitecture(fromData, toData, changes);
      this.compareMonetization(fromData, toData, changes);
    } catch (error) {
      this.fallbackToBasicComparison(fromVersion, toVersion, changes);
    }

    const summary = this.generateComparisonSummary(changes);

    logger.debug("Blueprint comparison completed", {
      fromVersionId: fromVersion.id,
      toVersionId: toVersion.id,
      totalChanges: summary.totalChanges,
    });

    return { changes, summary };
  }

  /**
   * Parse structured data (handle both string and object formats)
   */
  private parseStructuredData(data: string | Record<string, unknown>): BlueprintData {
    const parsed = typeof data === "string" ? JSON.parse(data) : data;
    return parsed as unknown as BlueprintData;
  }

  /**
   * Compare project name and description
   */
  private compareProjectInfo(
    fromData: BlueprintData,
    toData: BlueprintData,
    changes: LocalBlueprintChange[],
  ): void {
    if (fromData.projectName !== toData.projectName) {
      changes.push({
        type: "project",
        field: "name",
        status: "changed",
        from: fromData.projectName || "Unnamed Project",
        to: toData.projectName || "Unnamed Project",
        description: "Project name changed",
      });
    }

    if (fromData.projectDescription !== toData.projectDescription) {
      changes.push({
        type: "project",
        field: "description",
        status: "changed",
        from: fromData.projectDescription || "",
        to: toData.projectDescription || "",
        description: "Project description changed",
      });
    }
  }

  /**
   * Compare feature lists
   */
  private compareFeatures(
    fromData: BlueprintData,
    toData: BlueprintData,
    changes: LocalBlueprintChange[],
  ): void {
    if (fromData.features && toData.features) {
      const fromFeatures = new Set(fromData.features);
      const toFeatures = new Set(toData.features);

      for (const feature of toFeatures) {
        if (!fromFeatures.has(feature)) {
          changes.push({
            type: "feature",
            status: "added",
            value: feature,
            description: `Added feature: ${feature}`,
          });
        }
      }

      for (const feature of fromFeatures) {
        if (!toFeatures.has(feature)) {
          changes.push({
            type: "feature",
            status: "removed",
            value: feature,
            description: `Removed feature: ${feature}`,
          });
        }
      }
    }
  }

  /**
   * Compare tech stack configuration
   */
  private compareTechStack(
    fromData: BlueprintData,
    toData: BlueprintData,
    changes: LocalBlueprintChange[],
  ): void {
    if (fromData.techStack && toData.techStack) {
      for (const [key, value] of Object.entries(toData.techStack)) {
        const fromValue = fromData.techStack[key as keyof BlueprintData["techStack"]];
        if (fromValue !== value) {
          changes.push({
            type: "tech",
            field: key,
            status: "changed",
            from: fromValue ?? "none",
            to: String(value),
            description: `${key} technology changed`,
          });
        }
      }
    }
  }

  /**
   * Compare architecture configuration
   */
  private compareArchitecture(
    fromData: BlueprintData,
    toData: BlueprintData,
    changes: LocalBlueprintChange[],
  ): void {
    if (fromData.architecture && toData.architecture) {
      if (fromData.architecture.type !== toData.architecture.type) {
        changes.push({
          type: "architecture",
          field: "type",
          status: "changed",
          from: fromData.architecture.type,
          to: toData.architecture.type,
          description: "Architecture type changed",
        });
      }

      if (fromData.architecture.scaling !== toData.architecture.scaling) {
        changes.push({
          type: "architecture",
          field: "scaling",
          status: "changed",
          from: fromData.architecture.scaling,
          to: toData.architecture.scaling,
          description: "Scaling strategy changed",
        });
      }

      this.compareSecurityFeatures(
        fromData.architecture.security || [],
        toData.architecture.security || [],
        changes,
      );
    }
  }

  /**
   * Compare security features
   */
  private compareSecurityFeatures(
    fromSecurity: string[],
    toSecurity: string[],
    changes: LocalBlueprintChange[],
  ): void {
    const fromSecuritySet = new Set(fromSecurity);
    const toSecuritySet = new Set(toSecurity);

    for (const security of toSecuritySet) {
      if (!fromSecuritySet.has(security)) {
        changes.push({
          type: "security",
          status: "added",
          value: security,
          description: `Added security feature: ${security}`,
        });
      }
    }

    for (const security of fromSecuritySet) {
      if (!toSecuritySet.has(security)) {
        changes.push({
          type: "security",
          status: "removed",
          value: security,
          description: `Removed security feature: ${security}`,
        });
      }
    }
  }

  /**
   * Compare monetization strategy
   */
  private compareMonetization(
    fromData: BlueprintData,
    toData: BlueprintData,
    changes: LocalBlueprintChange[],
  ): void {
    if (fromData.monetizationStrategy !== toData.monetizationStrategy) {
      changes.push({
        type: "monetization",
        field: "strategy",
        status: "changed",
        from: fromData.monetizationStrategy || "",
        to: toData.monetizationStrategy || "",
        description: "Monetization strategy changed",
      });
    }
  }

  /**
   * Fallback to basic comparison if detailed parsing fails
   */
  private fallbackToBasicComparison(
    fromVersion: Blueprint,
    toVersion: Blueprint,
    changes: LocalBlueprintChange[],
  ): void {
    const contentChanged = fromVersion.contentMarkdown !== toVersion.contentMarkdown;
    if (contentChanged) {
      changes.push({
        type: "content",
        status: "changed",
        description: "Blueprint content updated",
      });
    }
  }

  /**
   * Generate comparison summary statistics
   */
  private generateComparisonSummary(changes: LocalBlueprintChange[]): BlueprintComparisonSummary {
    return {
      totalChanges: changes.length,
      changesByType: {
        project: changes.filter((c) => c.type === "project").length,
        feature: changes.filter((c) => c.type === "feature").length,
        tech: changes.filter((c) => c.type === "tech").length,
        architecture: changes.filter((c) => c.type === "architecture").length,
        security: changes.filter((c) => c.type === "security").length,
        monetization: changes.filter((c) => c.type === "monetization").length,
        content: changes.filter((c) => c.type === "content").length,
      },
      changesByStatus: {
        added: changes.filter((c) => c.status === "added").length,
        removed: changes.filter((c) => c.status === "removed").length,
        changed: changes.filter((c) => c.status === "changed").length,
      },
    };
  }
}

export const blueprintComparisonService = BlueprintComparisonService.getInstance();
