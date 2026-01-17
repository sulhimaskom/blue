import { z } from "zod";
import { logger } from "@/lib/logger";
import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { ProjectCloneService } from "@/lib/services/project-clone-service";
import { RateLimiters } from "@/lib/rate-limit-config";

// Validation schemas
const CreateFromTemplateSchema = z.object({
  templateId: z.string().min(1, "Template ID is required"),
  name: z.string()
    .min(3, "Project name must be at least 3 characters long")
    .max(100, "Project name must be less than 100 characters"),
  description: z.string().optional(),
});

export const GET = APIRouteHandler.createCachedGETHandler(
  {
    requireAuth: true,
    rateLimiter: (identifier: string) => RateLimiters.standard()(identifier),
    handler: async ({ context, user }) => {
      const templates = await ProjectCloneService.getProjectTemplates();

      logger.userAction("Project templates fetched", user!.clerkId, {
        requestId: context.requestId,
        templatesCount: templates.length,
      });

      return {
        templates,
        message: "Templates retrieved successfully",
      };
    },
  },
  {
    ttl: 1800,
    tags: ["project-templates"],
    varyBy: [],
  },
);

export const POST = APIRouteHandler.createPOSTHandler({
  schema: CreateFromTemplateSchema,
  requireAuth: true,
  rateLimiter: (identifier: string) => RateLimiters.moderate()(identifier),
  handler: async ({ context, user, data }) => {
    const { templateId, name, description } = data!;

    // Create project from template with context for webhooks
    const result = await ProjectCloneService.createFromTemplate(
      templateId,
      user!.clerkId,
      { name, description: description || "" },
      context,
    );

    logger.userAction("Project created from template", user!.clerkId, {
      requestId: context.requestId,
      templateId,
      projectId: result.clonedProject.id,
      projectName: result.clonedProject.name,
      blueprintsCount: result.clonedBlueprints.length,
    });

    return {
      project: result.clonedProject,
      blueprints: result.clonedBlueprints,
      templateId: templateId,
      message: "Project created from template successfully",
    };
  },
});
