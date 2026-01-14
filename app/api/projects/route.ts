import { z } from "zod";
import { logger } from "@/lib/logger";
import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { ProjectDataService } from "@/lib/services/project-data-service";
import { RateLimiters } from "@/lib/rate-limit-config";

// Validation schemas
const CreateProjectSchema = z.object({
  name: z
    .string()
    .min(3, "Project name must be at least 3 characters long")
    .max(100, "Project name must be less than 100 characters"),
  description: z.string().optional(),
});

export const GET = APIRouteHandler.createCachedGETHandler(
  {
    requireAuth: true,
    rateLimiter: (identifier: string) => RateLimiters.standard()(identifier),
    handler: async ({ context, user }) => {
      // Get all projects for authenticated user
      const userProjects = await ProjectDataService.getUserProjects(
        user!.clerkId,
      );

      logger.userAction("User projects fetched", user!.clerkId, {
        requestId: context.requestId,
        projectsCount: userProjects.length,
      });

      return {
        projects: userProjects,
        message: "Projects retrieved successfully",
      };
    },
  },
  {
    ttl: 60,
    tags: ["projects"],
    varyBy: [],
    initializeServices: true,
  },
);

export const POST = APIRouteHandler.createPOSTHandler({
  schema: CreateProjectSchema,
  requireAuth: true,
  rateLimiter: (identifier: string) => RateLimiters.standard()(identifier),
  handler: async ({ context, user, data }) => {
    const { name, description } = data!;

    // Create new project with context for webhooks
    const newProject = await ProjectDataService.createProject(user!.clerkId, {
      name,
      description: description || "",
    }, context);

    logger.userAction("Project created", user!.clerkId, {
      requestId: context.requestId,
      projectId: newProject.id,
      projectName: name,
    });

    return {
      project: newProject,
      message: "Project created successfully",
    };
  },
});
