import { NextRequest } from "next/server";
import { logger } from "@/lib/logger";
import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { ProjectDataService } from "@/lib/services/project-data-service";
import { RateLimiters } from "@/lib/rate-limit-config";

interface RouteParams {
  params: Promise<{ id: string; versionId: string }>;
}

/**
 * GET /api/blueprints/[id]/versions/[versionId] - Get specific blueprint version
 */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { id, versionId } = await params;

  return APIRouteHandler.createGETHandler({
    requireAuth: true,
    rateLimiter: (identifier: string) => RateLimiters.permissive()(identifier),
    handler: async ({ context, user }) => {
      // Get all versions for the project
      const blueprintDetails = await ProjectDataService.getBlueprintWithProjectAndVersions(
        id,
        user!.clerkId,
      );
      const { blueprint, project, allVersions } = blueprintDetails;

      // Find the specific version
      const specificVersion = allVersions.find((v) => v.id === versionId);
      if (!specificVersion) {
        throw new Error("Blueprint version not found");
      }

      logger.userAction("Specific blueprint version fetched", user!.clerkId, {
        requestId: context.requestId,
        blueprintId: id,
        versionId,
        versionNumber: specificVersion.version,
      });

      return {
        blueprint: {
          id: specificVersion.id,
          projectId: specificVersion.projectId,
          version: specificVersion.version,
          contentMarkdown: specificVersion.contentMarkdown,
          structuredData: specificVersion.structuredData,
          marketResearch: specificVersion.marketResearch,
          createdAt: specificVersion.createdAt,
          updatedAt: specificVersion.updatedAt,
        },
        project: {
          id: project.id,
          name: project.name,
          description: project.description,
        },
        isCurrentVersion: specificVersion.version === blueprint.version,
        message: "Blueprint version retrieved successfully",
      };
    },
  });
}