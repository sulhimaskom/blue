import { logger } from "@/lib/logger";

export interface BlueprintComparisonRequest {
  fromVersion: any;
  toVersion: any;
}

export interface BlueprintChange {
  type: string;
  status: string;
  field?: string;
  value?: unknown;
  from?: string | any;
  to?: string | any;
  description: string;
}

export interface BlueprintComparisonSummary {
  totalChanges: number;
  changesByType: Record<string, number>;
  changesByStatus: Record<string, number>;
}

export interface BlueprintComparisonResult {
  changes: BlueprintChange[];
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
    const changes: BlueprintChange[] = [];

    try {
      const fromData = this.parseStructuredData(fromVersion.structuredData);
      const toData = this.parseStructuredData(toVersion.structuredData);

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
  private parseStructuredData(data: any): any {
    return typeof data === "string" ? JSON.parse(data) : data;
  }

  /**
   * Compare project name and description
   */
  private compareProjectInfo(
    fromData: any,
    toData: any,
    changes: BlueprintChange[],
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
    fromData: any,
    toData: any,
    changes: BlueprintChange[],
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
    fromData: any,
    toData: any,
    changes: BlueprintChange[],
  ): void {
    if (fromData.techStack && toData.techStack) {
      for (const [key, value] of Object.entries(toData.techStack)) {
        if (fromData.techStack[key] !== value) {
          changes.push({
            type: "tech",
            field: key,
            status: "changed",
            from: fromData.techStack[key] || "none",
            to: value,
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
    fromData: any,
    toData: any,
    changes: BlueprintChange[],
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
    changes: BlueprintChange[],
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
    fromData: any,
    toData: any,
    changes: BlueprintChange[],
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
    fromVersion: any,
    toVersion: any,
    changes: BlueprintChange[],
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
  private generateComparisonSummary(changes: BlueprintChange[]): BlueprintComparisonSummary {
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
