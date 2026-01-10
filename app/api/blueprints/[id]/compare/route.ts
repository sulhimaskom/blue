import { NextRequest } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { ProjectDataService } from "@/lib/services/project-data-service";
import { RateLimiters } from "@/lib/rate-limit-config";
import { NotFoundError } from '@/lib/api-utils';
import { blueprintComparisonService } from "@/lib/services/blueprint-comparison-service";

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
        throw new NotFoundError("From version not found");
      }
      if (!toVersion) {
        throw new NotFoundError("To version not found");
      }

      // Generate comparison using service layer
      const comparison = blueprintComparisonService.compareBlueprints({
        fromVersion,
        toVersion,
      });

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
