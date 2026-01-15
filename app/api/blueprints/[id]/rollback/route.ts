import { NextRequest } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { ProjectDataService } from "@/lib/services/project-data-service";
import { WebhookEventDispatcher } from "@/lib/services/webhook-event-dispatcher";
import { ActivityFeedService } from "@/lib/services/activity-feed-service";
import { RateLimiters } from "@/lib/rate-limit-config";
import { ValidationError, NotFoundError } from '@/lib/api-utils';

const rollbackSchema = z.object({
  targetVersionId: z.string().uuid("Invalid target version ID"),
  reason: z.string().min(5, "Reason must be at least 5 characters").max(200, "Reason too long"),
  createBranch: z.boolean().default(false), // Optional: create safety branch
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/blueprints/[id]/rollback - Rollback blueprint to previous version
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  return APIRouteHandler.createPOSTHandler({
    schema: rollbackSchema,
    requireAuth: true,
    rateLimiter: (identifier: string) => RateLimiters.moderate()(identifier),
    handler: async ({ context, user, data }) => {
      const { targetVersionId, reason, createBranch } = data!;

      // Get current blueprint details
      const blueprintDetails = await ProjectDataService.getBlueprintWithProjectAndVersions(
        id,
        user!.clerkId,
      );
      const { blueprint, project, allVersions } = blueprintDetails;

      // Verify user can rollback (current version is not already target)
      if (blueprint.id === targetVersionId) {
        throw new ValidationError("Cannot rollback to current version");
      }

      // Find target version
      const targetVersion = allVersions.find((v) => v.id === targetVersionId);
      if (!targetVersion) {
        throw new NotFoundError("Target version not found");
      }

      // Calculate next version number
      const maxVersion = Math.max(...allVersions.map((v) => v.version));
      const newVersion = maxVersion + 1;

      // Log rollback initiation
      logger.userAction("Blueprint rollback initiated", user!.clerkId, {
        requestId: context.requestId,
        blueprintId: id,
        currentVersion: blueprint.version,
        targetVersionNumber: targetVersion.version,
        newVersionNumber: newVersion,
        reason,
        createBranch,
      });

      // Optional: Create safety branch (would require Git integration)
      let branchInfo = null;
      if (createBranch) {
        try {
          // This would integrate with Git service to create a branch
          // branchInfo = await GitService.createBranch(project.id, `rollback-v${targetVersion.version}-${Date.now()}`);
          branchInfo = { note: "Branch creation not implemented yet" };
        } catch (error) {
          logger.warn("Failed to create safety branch", {
            requestId: context.requestId,
            blueprintId: id,
            error: error instanceof Error ? error.message : String(error),
          });
          // Continue with rollback even if branch creation fails
        }
      }

      // Create new version based on target version (this preserves history)
      const rolledBackBlueprint = await ProjectDataService.createBlueprintVersion(
        id,
        newVersion,
        targetVersion.contentMarkdown,
        targetVersion.structuredData,
        targetVersion.marketResearch,
      );

      // Emit webhook event for blueprint rollback
      await WebhookEventDispatcher.emitBlueprintRolledBack(
        user!.id,
        user!.clerkId,
        project.id,
        id,
        newVersion,
        blueprint.version,
        reason,
        project.name,
        { createBranch },
        context,
      );

      // Record activity feed event
      await ActivityFeedService.recordActivity({
        userId: user!.id,
        clerkId: user!.clerkId,
        entityType: "blueprint",
        entityId: id,
        eventType: "blueprint.rollback",
        eventData: {
          projectId: project.id,
          projectName: project.name,
          currentVersion: blueprint.version,
          targetVersion: targetVersion.version,
          newVersion: newVersion,
          reason,
          createBranch: !!branchInfo,
        },
      }, context);

      logger.userAction("Blueprint rollback completed", user!.clerkId, {
        requestId: context.requestId,
        blueprintId: id,
        rolledBackVersionId: rolledBackBlueprint.id,
        targetVersionNumber: targetVersion.version,
        newVersionNumber: newVersion,
        reason,
        branchCreated: !!branchInfo,
      });

      return {
        rollback: {
          success: true,
          rolledBackVersion: {
            id: rolledBackBlueprint.id,
            version: rolledBackBlueprint.version,
            createdAt: rolledBackBlueprint.createdAt,
          },
          targetVersion: {
            id: targetVersion.id,
            version: targetVersion.version,
            createdAt: targetVersion.createdAt,
          },
        },
        project: {
          id: project.id,
          name: project.name,
        },
        reason,
        branchInfo,
        message: `Blueprint successfully rolled back to version ${targetVersion.version}`,
      };
    },
  })(req);
}