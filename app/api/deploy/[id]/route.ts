import { NextRequest } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { projects, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import {
  validateRequest,
  formatSuccessResponse,
  formatErrorResponse,
  ValidationError,
  AuthenticationError,
  DatabaseError,
} from "@/lib/api-utils";
import { logger, createRequestContext } from "@/lib/logger";
import {
  githubService,
  GitHubServiceError,
} from "@/lib/services/github-service";
import { blueprints } from "@/lib/db/schema";

const deployRepoSchema = z.object({
  githubOrg: z
    .string()
    .min(2, "GitHub organization must be at least 2 characters"),
  repoName: z
    .string()
    .min(3, "Repository name must be at least 3 characters")
    .max(100),
  isPrivate: z.boolean().default(false),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const context = createRequestContext();
  let user: { id: string } | null = null;
  const { id } = await params;

  try {
    // Authentication check
    user = await currentUser();
    if (!user?.id) {
      logger.security("Authentication failed for project deployment", {
        requestId: context.requestId,
        projectId: id,
      });
      throw new AuthenticationError("Authentication required");
    }

    // Validation
    const validation = await validateRequest(deployRepoSchema, "body")(req);
    if (!validation.success) {
      throw new ValidationError(validation.error);
    }

    const { githubOrg, repoName, isPrivate } = validation.data;
    const database = db();

    // Verify user owns the project
    const projectDetails = await database
      .select({
        project: projects,
        user: users,
      })
      .from(projects)
      .innerJoin(users, eq(projects.ownerId, users.id))
      .where(and(eq(projects.id, id), eq(users.clerkId, user.id)))
      .limit(1);

    if (!projectDetails.length) {
      throw new AuthenticationError("Project not found or access denied");
    }

    const { project } = projectDetails[0];

    if (project.status === "completed" || project.status === "deployed") {
      logger.warn("Project deployment attempted on already deployed project", {
        requestId: context.requestId,
        userId: user.id,
        projectId: id,
        currentStatus: project.status,
      });
      throw new ValidationError("Project is already deployed");
    }

    // Get the latest blueprint content
    const [latestBlueprint] = await database
      .select()
      .from(blueprints)
      .where(eq(blueprints.projectId, id))
      .orderBy(blueprints.version)
      .limit(1);

    if (!latestBlueprint) {
      throw new ValidationError("No blueprint found for this project");
    }

    // Update project status to generating
    await database
      .update(projects)
      .set({ status: "generating" })
      .where(eq(projects.id, id));

    logger.info("Starting GitHub repository creation", {
      requestId: context.requestId,
      userId: user.id,
      projectId: id,
      githubOrg,
      repoName,
      blueprintVersion: latestBlueprint.version,
    });

    try {
      // Create GitHub repository with blueprint
      const repo = await githubService.createRepository({
        org: githubOrg,
        name: repoName,
        description: project.description || "AI-generated software project",
        isPrivate: isPrivate || false,
        blueprintContent: latestBlueprint.contentMarkdown,
      });

      const [updatedProject] = await database
        .update(projects)
        .set({
          status: "deployed",
          repoUrl: repo.html_url,
        })
        .where(eq(projects.id, id))
        .returning();

      logger.userAction("Repository deployment successful", user!.id, {
        requestId: context.requestId,
        projectId: id,
        repoUrl: repo.html_url,
        githubOrg,
        repoName,
        isPrivate,
      });

      return formatSuccessResponse({
        projectId: updatedProject.id,
        repoUrl: updatedProject.repoUrl,
        status: updatedProject.status,
        message: "Repository deployment successful",
        deploymentDetails: {
          repositoryId: repo.id,
          fullName: repo.full_name,
          cloneUrl: repo.clone_url,
          organization: githubOrg,
          repository: repoName,
          visibility: isPrivate ? "private" : "public",
          createdAt: repo.created_at,
          blueprintVersion: latestBlueprint.version,
        },
      });
    } catch (error) {
      // Reset project status on failure
      await database
        .update(projects)
        .set({ status: "completed" })
        .where(eq(projects.id, id));

      if (error instanceof GitHubServiceError) {
        logger.error("GitHub service error during deployment", {
          requestId: context.requestId,
          userId: user.id,
          projectId: id,
          statusCode: error.statusCode,
          message: error.message,
        });
        throw new ValidationError(`GitHub deployment failed: ${error.message}`);
      }

      throw error;
    }
  } catch (error) {
    logger.apiError(
      "Repository deployment error",
      context.requestId,
      error as Error,
      {
        userId: user?.id,
        projectId: id,
        endpoint: "/api/deploy/[id]",
      },
    );

    if (
      error instanceof ValidationError ||
      error instanceof AuthenticationError ||
      error instanceof DatabaseError ||
      error instanceof GitHubServiceError
    ) {
      return formatErrorResponse(error);
    }

    return formatErrorResponse(
      new DatabaseError("Unexpected error in repository deployment"),
    );
  }
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const context = createRequestContext();
  let user: { id: string } | null = null;
  const { id } = await params;

  try {
    // Authentication check
    user = await currentUser();
    if (!user?.id) {
      throw new AuthenticationError("Authentication required");
    }

    const database = db();

    // Get project details and deployment status
    const projectDetails = await database
      .select({
        project: projects,
        user: users,
      })
      .from(projects)
      .innerJoin(users, eq(projects.ownerId, users.id))
      .where(and(eq(projects.id, id), eq(users.clerkId, user.id)))
      .limit(1);

    if (!projectDetails.length) {
      throw new AuthenticationError("Project not found or access denied");
    }

    const { project } = projectDetails[0];

    logger.userAction("Project status fetched", user!.id, {
      requestId: context.requestId,
      projectId: id,
      status: project.status,
      isDeployed: project.status === "deployed",
    });

    return formatSuccessResponse({
      projectId: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      repoUrl: project.repoUrl,
      createdAt: project.createdAt,
      isDeployed: project.status === "deployed",
      canDeploy:
        project.status !== "deployed" &&
        project.status !== "completed" &&
        project.status !== "generating",
      deploymentNotes:
        project.status === "deployed"
          ? "Repository deployment successful"
          : project.status === "generating"
            ? "Repository deployment in progress"
            : "Ready for deployment",
    });
  } catch (error) {
    logger.apiError(
      "Project status fetch error",
      context.requestId,
      error as Error,
      {
        userId: user?.id,
        projectId: id,
        endpoint: "/api/deploy/[id]",
      },
    );

    if (error instanceof AuthenticationError) {
      return formatErrorResponse(error);
    }

    return formatErrorResponse(
      new DatabaseError("Failed to fetch project status"),
    );
  }
}
