import { NextRequest } from "next/server";
import { formatErrorResponse } from "@/lib/api-utils";
import { logger } from "@/lib/logger";
import { WebhookService } from "@/lib/services/webhook-service";
import { SecurityService } from "@/lib/services/security-service";
import { WebhookEventDispatcher } from "@/lib/services/webhook-event-dispatcher";
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
          const latestCommit = commits[commits.length - 1];
          logger.systemEvent("Main branch push detected - deployment update", {
            requestId: context.requestId,
            repository: repository.full_name,
            commitSha: latestCommit.id,
            commitMessage: latestCommit.message,
            author: latestCommit.author.email,
          });

          await WebhookEventDispatcher.emitGitHubPushByRepository(
            repository.full_name,
            ref.replace("refs/heads/", ""),
            latestCommit.id,
            latestCommit.message,
            latestCommit.author.email,
            context,
          );
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

          await WebhookEventDispatcher.emitGitHubPullRequestByRepository(
            repository.full_name,
            pull_request.number,
            pull_request.title,
            action as "opened" | "closed",
            pull_request.state,
            pull_request.merged ?? false,
            sender.login,
            context,
          );
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

          await WebhookEventDispatcher.emitGitHubIssueByRepository(
            repository.full_name,
            issue.number,
            issue.title,
            action,
            issue.state,
            sender.login,
            context,
          );
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

        await WebhookEventDispatcher.emitGitHubRepositoryCreatedByRepository(
          repository.full_name,
          repository.private,
          sender.login,
          context,
        );
      }
    },
  });
}

export async function OPTIONS() {
  return WebhookService.handleOptions();
}
