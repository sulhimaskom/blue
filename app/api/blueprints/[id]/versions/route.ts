import { NextRequest } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { ProjectDataService } from "@/lib/services/project-data-service";
import { RateLimiters } from "@/lib/rate-limit-config";

const versionsListSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/blueprints/[id]/versions - List all blueprint versions
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  return APIRouteHandler.createGETHandler({
    requireAuth: true,
    rateLimiter: (identifier: string) => RateLimiters.permissive()(identifier),
    handler: async ({ context, user, req }) => {
      // Parse query parameters manually for GET request
      const { searchParams } = new URL(req.url);
      const parsed = versionsListSchema.parse({
        limit: searchParams.get('limit'),
        offset: searchParams.get('offset'),
      });
      const { limit, offset } = parsed;

      // Get blueprint details with all versions (already optimized)
      const blueprintDetails = await ProjectDataService.getBlueprintWithProjectAndVersions(
        id,
        user!.clerkId,
      );
      const { blueprint, project, allVersions } = blueprintDetails;

      // Sort versions by created_at (newest first) and apply pagination
      const sortedVersions = allVersions
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(offset, offset + limit);

      logger.userAction("Blueprint versions listed", user!.clerkId, {
        requestId: context.requestId,
        blueprintId: id,
        totalVersions: allVersions.length,
        returnedVersions: sortedVersions.length,
        limit,
        offset,
      });

      return {
        blueprint: {
          id: blueprint.id,
          projectId: blueprint.projectId,
          currentVersion: blueprint.version,
          name: project.name,
        },
        versions: sortedVersions.map((version) => ({
          id: version.id,
          version: version.version,
          createdAt: version.createdAt,
          updatedAt: version.updatedAt,
        })),
        pagination: {
          total: allVersions.length,
          limit,
          offset,
          hasMore: offset + sortedVersions.length < allVersions.length,
        },
        message: "Blueprint versions retrieved successfully",
      };
    },
  })(req);
}