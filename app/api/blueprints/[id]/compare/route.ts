import { NextRequest } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { ProjectDataService } from "@/lib/services/project-data-service";
import { RateLimiters } from "@/lib/rate-limit-config";

const compareSchema = z.object({
  from: z.string().uuid("Invalid from version ID"),
  to: z.string().uuid("Invalid to version ID"),
  format: z.enum(["summary", "detailed"]).default("summary"),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/blueprints/[id]/compare - Compare two blueprint versions
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  return APIRouteHandler.createGETHandler({
    requireAuth: true,
    rateLimiter: (identifier: string) => RateLimiters.moderate()(identifier),
    handler: async ({ context, user }) => {
      // Parse query parameters manually for GET request
      const { searchParams } = new URL(req.url);
      const parsed = compareSchema.parse({
        from: searchParams.get('from'),
        to: searchParams.get('to'),
        format: searchParams.get('format') || 'summary',
      });
      const { from, to, format } = parsed;

      // Get blueprint details with all versions
      const blueprintDetails = await ProjectDataService.getBlueprintWithProjectAndVersions(
        id,
        user!.clerkId,
      );
      const { allVersions } = blueprintDetails;

      // Find both versions
      const fromVersion = allVersions.find((v) => v.id === from);
      const toVersion = allVersions.find((v) => v.id === to);

      if (!fromVersion) {
        throw new Error("From version not found");
      }
      if (!toVersion) {
        throw new Error("To version not found");
      }

      // Generate comparison
      const comparison = generateBlueprintComparison(fromVersion, toVersion, format);

      logger.userAction("Blueprint versions compared", user!.clerkId, {
        requestId: context.requestId,
        blueprintId: id,
        fromVersionId: from,
        toVersionId: to,
        fromVersionNumber: fromVersion.version,
        toVersionNumber: toVersion.version,
        format,
      });

      return {
        comparison: {
          from: {
            id: fromVersion.id,
            version: fromVersion.version,
            createdAt: fromVersion.createdAt,
            updatedAt: fromVersion.updatedAt,
          },
          to: {
            id: toVersion.id,
            version: toVersion.version,
            createdAt: toVersion.createdAt,
            updatedAt: toVersion.updatedAt,
          },
          changes: comparison.changes,
          summary: comparison.summary,
          // Include detailed content if requested
          ...(format === "detailed" && {
            content: {
              from: {
                markdown: fromVersion.contentMarkdown,
                structuredData: fromVersion.structuredData,
              },
              to: {
                markdown: toVersion.contentMarkdown,
                structuredData: toVersion.structuredData,
              },
            },
          }),
        },
        message: "Blueprint comparison completed successfully",
      };
    },
  })(req);
}

/**
 * Generate detailed blueprint comparison
 */
function generateBlueprintComparison(
  fromVersion: any,
  toVersion: any,
  _format: "summary" | "detailed" = "summary",
): { changes: Array<any>; summary: any } {
  const changes: Array<any> = [];

  try {
    // Parse structured data for comparison
    const fromData = typeof fromVersion.structuredData === 'string' 
      ? JSON.parse(fromVersion.structuredData) 
      : fromVersion.structuredData;
    const toData = typeof toVersion.structuredData === 'string' 
      ? JSON.parse(toVersion.structuredData) 
      : toVersion.structuredData;

    // Compare project name and description
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

    // Compare features
    if (fromData.features && toData.features) {
      const fromFeatures = new Set(fromData.features);
      const toFeatures = new Set(toData.features);

      // Added features
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

      // Removed features
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

    // Compare tech stack
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

    // Compare architecture
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

      // Compare security features
      const fromSecurity = new Set(fromData.architecture.security || []);
      const toSecurity = new Set(toData.architecture.security || []);

      for (const security of toSecurity) {
        if (!fromSecurity.has(security)) {
          changes.push({
            type: "security",
            status: "added",
            value: security,
            description: `Added security feature: ${security}`,
          });
        }
      }

      for (const security of fromSecurity) {
        if (!toSecurity.has(security)) {
          changes.push({
            type: "security",
            status: "removed",
            value: security,
            description: `Removed security feature: ${security}`,
          });
        }
      }
    }

    // Compare monetization strategy
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

  } catch (error) {
    // Fallback to basic comparison if JSON parsing fails
    const contentChanged = fromVersion.contentMarkdown !== toVersion.contentMarkdown;
    if (contentChanged) {
      changes.push({
        type: "content",
        status: "changed",
        description: "Blueprint content updated",
      });
    }
  }

  // Generate summary
  const summary = {
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

  return { changes, summary };
}