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

    // TODO: In Phase 3, this will implement actual GitHub App API integration
    // For now, we'll update the project with mock deployment data
    const mockRepoUrl = `https://github.com/${githubOrg}/${repoName}`;

    const [updatedProject] = await database
      .update(projects)
      .set({
        status: "deployed",
        repoUrl: mockRepoUrl,
      })
      .where(eq(projects.id, id))
      .returning();

    logger.userAction("Repository deployment initiated", user!.id, {
      requestId: context.requestId,
      projectId: id,
      repoUrl: mockRepoUrl,
      githubOrg,
      repoName,
      isPrivate,
    });

    return formatSuccessResponse({
      projectId: updatedProject.id,
      repoUrl: updatedProject.repoUrl,
      status: updatedProject.status,
      message:
        "Repository deployment simulated. GitHub App integration will be available in Phase 3.",
      deploymentDetails: {
        organization: githubOrg,
        repository: repoName,
        visibility: isPrivate ? "private" : "public",
        simulatedAt: new Date().toISOString(),
      },
    });
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
      error instanceof DatabaseError
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
        project.status !== "deployed" && project.status !== "completed",
      deploymentNotes:
        project.status === "deployed"
          ? "Repository deployment successful. GitHub App integration will be available in Phase 3."
          : "Ready for deployment. GitHub App integration will be available in Phase 3.",
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
