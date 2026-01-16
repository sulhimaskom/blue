import { NextRequest } from "next/server";
import { formatErrorResponse } from "@/lib/api-utils";
import { logger } from "@/lib/logger";
import { WebhookService } from "@/lib/services/webhook-service";
import { SecurityService } from "@/lib/services/security-service";
import { RateLimiters } from "@/lib/rate-limit-config";
import {
  GitHubWebhookEvent,
  type WebhookContext,
  isGitHubPushEvent,
  isGitHubPullRequestEvent,
  isGitHubIssuesEvent,
  isGitHubRepositoryCreated,
  isGitHubPing,
} from "@/lib/types/webhook-events";

export async function POST(req: NextRequest) {
  const identifier =
    req.headers.get("x-forwarded-for") ||
    req.headers.get("x-real-ip") ||
    "anonymous";
  const rateLimitCheck = await RateLimiters.webhook()(identifier);

  if (!rateLimitCheck.allowed) {
    return formatErrorResponse(
      new Error("Rate limit exceeded. Try again in 60 seconds."),
    );
  }

  return WebhookService.processWebhookWithReliability(req, {
    serviceName: "GitHub",
    verifySignature: SecurityService.verifyGitHubWebhook,
    useQueue: true,
    processEvent: async (
      event: GitHubWebhookEvent,
      context: WebhookContext,
    ) => {
      // Handle ping events (webhook verification)
      if (isGitHubPing(event)) {
        logger.systemEvent("GitHub webhook ping received", {
          requestId: context.requestId,
          zen: event.data.zen,
          hookId: event.data.hook_id,
          repository: event.data.repository?.full_name,
        });
        return;
      }

      // Handle push events
      if (isGitHubPushEvent(event)) {
        const { repository, pusher, ref, commits } = event.data;

        logger.systemEvent("GitHub push event received", {
          requestId: context.requestId,
          repository: repository.full_name,
          branch: ref.replace("refs/heads/", ""),
          pusher: pusher.email,
          commitCount: commits?.length || 0,
        });

        // Update deployment records based on push to main branch
        const isMainBranch = ref === "refs/heads/main" || ref === "refs/heads/master";
        if (isMainBranch && commits && commits.length > 0) {
          const latestCommit = commits[0];
          logger.systemEvent("Main branch push detected - deployment update", {
            requestId: context.requestId,
            repository: repository.full_name,
            commitSha: latestCommit.id,
            commitMessage: latestCommit.message,
            author: latestCommit.author.email,
          });

          // TODO: Emit internal webhook event for deployment record update
          // await WebhookService.emitInternalEvent({
          //   type: "github.push.main",
          //   data: {
          //     repositoryFullName: repository.full_name,
          //     commitSha: latestCommit.id,
          //     commitMessage: latestCommit.message,
          //     author: latestCommit.author.email,
          //   },
          //   requestId: context.requestId,
          // });
        }
      }

      // Handle pull request events
      else if (isGitHubPullRequestEvent(event)) {
        const { action, pull_request, repository, sender } = event.data;

        logger.systemEvent("GitHub pull request event received", {
          requestId: context.requestId,
          action,
          repository: repository.full_name,
          prNumber: pull_request.number,
          prTitle: pull_request.title,
          sender: sender.login,
        });

        // Track PR activity for repository management
        if (action === "opened" || action === "closed" || pull_request.merged) {
          logger.systemEvent("Pull request lifecycle event", {
            requestId: context.requestId,
            action,
            repository: repository.full_name,
            prNumber: pull_request.number,
            prState: pull_request.state,
            merged: pull_request.merged,
          });

          // TODO: Emit internal webhook event for PR tracking
          // await WebhookService.emitInternalEvent({
          //   type: "github.pull_request.lifecycle",
          //   data: {
          //     repositoryFullName: repository.full_name,
          //     prNumber: pull_request.number,
          //     action,
          //     state: pull_request.state,
          //     merged: pull_request.merged,
          //   },
          //   requestId: context.requestId,
          // });
        }
      }

      // Handle issues events
      else if (isGitHubIssuesEvent(event)) {
        const { action, issue, repository, sender } = event.data;

        logger.systemEvent("GitHub issues event received", {
          requestId: context.requestId,
          action,
          repository: repository.full_name,
          issueNumber: issue.number,
          issueTitle: issue.title,
          sender: sender.login,
        });

        // Track issue activity for repository management
        if (action === "opened" || action === "closed") {
          logger.systemEvent("Issue lifecycle event", {
            requestId: context.requestId,
            action,
            repository: repository.full_name,
            issueNumber: issue.number,
            issueState: issue.state,
          });

          // TODO: Emit internal webhook event for issue tracking
          // await WebhookService.emitInternalEvent({
          //   type: "github.issue.lifecycle",
          //   data: {
          //     repositoryFullName: repository.full_name,
          //     issueNumber: issue.number,
          //     action,
          //     state: issue.state,
          //   },
          //   requestId: context.requestId,
          // });
        }
      }

      // Handle repository creation events
      else if (isGitHubRepositoryCreated(event)) {
        const { repository, sender } = event.data;

        logger.systemEvent("GitHub repository created event received", {
          requestId: context.requestId,
          repository: repository.full_name,
          isPrivate: repository.private,
          sender: sender.login,
        });

        // TODO: Emit internal webhook event for repository creation tracking
        // await WebhookService.emitInternalEvent({
        //   type: "github.repository.created",
        //   data: {
        //     repositoryFullName: repository.full_name,
        //     isPrivate: repository.private,
        //     createdBy: sender.login,
        //   },
        //   requestId: context.requestId,
        // });
      }
    },
  });
}

export async function OPTIONS() {
  return WebhookService.handleOptions();
}
