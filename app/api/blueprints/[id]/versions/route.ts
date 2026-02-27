import { NextRequest } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { APIRouteHandler } from '@/lib/services/api-route-handler';
import { ProjectDataService } from '@/lib/services/project-data-service';
import { RateLimiters } from '@/lib/rate-limit-config';
import { blueprintVersionService } from '@/lib/services/blueprint-version-service';

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
        user!.clerkId
      );

      // Use service for version sorting and pagination
      const versionResult = blueprintVersionService.getPaginatedVersions(
        blueprintDetails,
        offset,
        limit
      );

      if (!versionResult.success || !versionResult.data) {
        logger.apiError(
          'Failed to get blueprint versions',
          context.requestId,
          new Error(versionResult.error || 'Unknown error'),
          { blueprintId: id }
        );
        return {
          blueprint: {
            id: blueprintDetails.blueprint.id,
            projectId: blueprintDetails.blueprint.projectId,
            currentVersion: blueprintDetails.blueprint.version,
            name: blueprintDetails.project.name,
          },
          versions: [],
          pagination: {
            total: 0,
            limit,
            offset,
            hasMore: false,
          },
          message: 'Failed to retrieve versions',
        };
      }

      const { sortedVersions, pagination, blueprintSummary } = versionResult.data;

      logger.userAction('Blueprint versions listed', user!.clerkId, {
        requestId: context.requestId,
        blueprintId: id,
        totalVersions: pagination.total,
        returnedVersions: sortedVersions.length,
        limit,
        offset,
      });

      return {
        blueprint: blueprintSummary,
        versions: sortedVersions,
        pagination,
        message: 'Blueprint versions retrieved successfully',
      };
    },
  })(req);
}
