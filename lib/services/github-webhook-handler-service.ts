/**
 * GitHub Webhook Handler Service
 *
 * Centralizes all webhook event processing logic following Service Layer principles.
 * Delegates event-specific processing to WebhookEventDispatcher for broadcasting.
 */

import { logger } from "@/lib/logger";
import { WebhookEventDispatcher } from "@/lib/services/webhook-event-dispatcher";
import type { WebhookContext } from "@/lib/types/webhook-events";
import type {
  GitHubWebhookEvent,
  GitHubPushEventData,
  GitHubPullRequestEventData,
  GitHubIssueEventData,
} from "@/lib/types/webhook-events";
import {
  isGitHubPing,
  isGitHubPushEvent,
  isGitHubPullRequestEvent,
  isGitHubIssuesEvent,
  isGitHubRepositoryCreated,
} from "@/lib/types/webhook-events";

class GitHubWebhookHandlerService {
  private static instance: GitHubWebhookHandlerService;

  private constructor() {}

  public static getInstance(): GitHubWebhookHandlerService {
    if (!GitHubWebhookHandlerService.instance) {
      GitHubWebhookHandlerService.instance = new GitHubWebhookHandlerService();
    }
    return GitHubWebhookHandlerService.instance;
  }

  /**
   * Process GitHub webhook events
   */
  async processWebhookEvent(
    event: GitHubWebhookEvent,
    context: WebhookContext,
  ): Promise<void> {
    // Handle ping events (webhook verification)
    if (isGitHubPing(event)) {
      await this.handlePingEvent(event, context);
      return;
    }

    // Handle push events
    if (isGitHubPushEvent(event)) {
      await this.handlePushEvent(event, context);
      return;
    }

    // Handle pull request events
    if (isGitHubPullRequestEvent(event)) {
      await this.handlePullRequestEvent(event, context);
      return;
    }

    // Handle issues events
    if (isGitHubIssuesEvent(event)) {
      await this.handleIssuesEvent(event, context);
      return;
    }

    // Handle repository creation events
    if (isGitHubRepositoryCreated(event)) {
      await this.handleRepositoryCreatedEvent(event, context);
      return;
    }

    logger.warn("Unhandled GitHub webhook event type", {
      requestId: context.requestId,
      eventType: event.type,
    });
  }

  /**
   * Handle ping events (webhook verification)
   */
  private async handlePingEvent(
    event: GitHubWebhookEvent,
    context: WebhookContext,
  ): Promise<void> {
    const pingData = event.data as { zen?: string; hook_id?: number; repository?: { full_name?: string }; };
    logger.systemEvent("GitHub webhook ping received", {
      requestId: context.requestId,
      zen: pingData.zen,
      hookId: pingData.hook_id,
      repository: pingData.repository?.full_name,
    });
  }

  /**
   * Handle push events
   */
  private async handlePushEvent(
    event: GitHubWebhookEvent,
    context: WebhookContext,
  ): Promise<void> {
    const pushData = event.data as GitHubPushEventData;
    const { repository, pusher, ref, commits } = pushData;

    logger.systemEvent("GitHub push event received", {
      requestId: context.requestId,
      repository: repository.full_name,
      branch: ref.replace("refs/heads/", ""),
      pusher: pusher.email,
      commitCount: commits?.length || 0,
    });

    const isMainBranch =
      ref === "refs/heads/main" || ref === "refs/heads/master";
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

  /**
   * Handle pull request events
   */
  private async handlePullRequestEvent(
    event: GitHubWebhookEvent,
    context: WebhookContext,
  ): Promise<void> {
    const prData = event.data as GitHubPullRequestEventData;
    const { action, pull_request, repository, sender } = prData;

    logger.systemEvent("GitHub pull request event received", {
      requestId: context.requestId,
      action,
      repository: repository.full_name,
      prNumber: pull_request.number,
      prTitle: pull_request.title,
      sender: sender.login,
    });

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
        action,
        pull_request.state,
        pull_request.merged ?? false,
        sender.login,
        context,
      );
    }
  }

  /**
   * Handle issues events
   */
  private async handleIssuesEvent(
    event: GitHubWebhookEvent,
    context: WebhookContext,
  ): Promise<void> {
    const issueData = event.data as GitHubIssueEventData;
    const { action, issue, repository, sender } = issueData;

    logger.systemEvent("GitHub issues event received", {
      requestId: context.requestId,
      action,
      repository: repository.full_name,
      issueNumber: issue.number,
      issueTitle: issue.title,
      sender: sender.login,
    });

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

  /**
   * Handle repository creation events
   */
  private async handleRepositoryCreatedEvent(
    event: GitHubWebhookEvent,
    context: WebhookContext,
  ): Promise<void> {
    const repoData = event.data as { repository: { full_name: string; private: boolean }; sender: { login: string }; };
    const { repository, sender } = repoData;

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
}

export const githubWebhookHandlerService =
  GitHubWebhookHandlerService.getInstance();
