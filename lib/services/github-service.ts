import { logger, createRequestContext } from "@/lib/logger";
import { monitoringService } from "@/lib/monitoring";
import { circuitBreakerRegistry, SERVICE_CONFIGS } from "@/lib/circuit-breaker";
import { retryService, RETRY_CONFIGS } from "./retry-service";
import { env } from "@/lib/env";
import * as crypto from "crypto";
import {
  DatabaseError,
  ValidationError,
  AuthenticationError,
} from "@/lib/api-utils";
import { ServiceError } from "./service-error-handler";
import type {
  GitHubRepoConfig,
  GitHubCreateRepoResponse,
} from "./service-types";

/**
 * GitHub App Service
 *
 * Handles GitHub App API integration for repository creation and management.
 * Uses GitHub App authentication for higher rate limits and proper permissions.
 */

class GitHubService {
  private baseUrl = "https://api.github.com";
  private circuitBreaker;
  private static readonly FETCH_TIMEOUT = 30000;

  constructor() {
    // Initialize circuit breaker for GitHub API
    this.circuitBreaker = circuitBreakerRegistry.get(
      SERVICE_CONFIGS.GITHUB_API.name,
      SERVICE_CONFIGS.GITHUB_API.config,
    );
  }

  /**
   * Fetch with timeout protection using AbortController
   * Prevents indefinite hangs on network issues
   */
  private async fetchWithTimeout(
    url: string,
    options: RequestInit = {},
    timeout = GitHubService.FETCH_TIMEOUT,
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === "AbortError") {
        throw ServiceError.network(
          `GitHub API request timeout after ${timeout}ms: ${url}`,
          "GitHubService",
          "fetchWithTimeout",
          undefined,
          { timeout, url },
        );
      }

      throw error;
    }
  }

  private getCredentials() {
    const appId = env.GITHUB_APP_ID || "";
    const privateKey = env.GITHUB_APP_PRIVATE_KEY || "";

      if (!appId || !privateKey) {
      logger.error("GitHub App credentials not configured", {
        hasAppId: !!appId,
        hasPrivateKey: !!privateKey,
      });
      throw new AuthenticationError(
        "GitHub App credentials not properly configured",
      );
    }

    return { appId, privateKey };
  }

  /**
   * Create a JWT token for GitHub App authentication
   */
  private createJWT(): string {
    const context = createRequestContext();

    try {
      const { appId, privateKey } = this.getCredentials();

      const header = {
        alg: "RS256",
        typ: "JWT",
      };

      const now = Math.floor(Date.now() / 1000);
      const payload = {
        iat: now,
        exp: now + 600, // 10 minutes max as required by GitHub
        iss: appId,
      };

      // Base64url encode without padding
      const base64urlEncode = (str: string) =>
        Buffer.from(str)
          .toString("base64")
          .replace(/\+/g, "-")
          .replace(/\//g, "_")
          .replace(/=/g, "");

      const encodedHeader = base64urlEncode(JSON.stringify(header));
      const encodedPayload = base64urlEncode(JSON.stringify(payload));

      // Production-grade RSA-SHA256 signing using Node.js crypto
      const signatureInput = `${encodedHeader}.${encodedPayload}`;

      const sign = crypto.createSign("RSA-SHA256");
      sign.update(signatureInput);
      sign.end();

      const signature = sign
        .sign(privateKey, "base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "");

      const jwt = `${encodedHeader}.${encodedPayload}.${signature}`;

      logger.info("GitHub App JWT created successfully", {
        requestId: context.requestId,
        appId,
        expiresAt: new Date((now + 600) * 1000).toISOString(),
      });

      return jwt;
    } catch (error) {
      logger.error("Failed to create GitHub App JWT", {
        requestId: context.requestId,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      if (error instanceof Error && error.message.includes("PEM routines")) {
        throw new ValidationError(
          "Invalid GitHub App private key format. Please check GITHUB_APP_PRIVATE_KEY environment variable.",
        );
      }

      throw new DatabaseError(
        `Failed to create GitHub App JWT: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Create a repository using GitHub App
   */
  async createRepository(
    config: GitHubRepoConfig,
  ): Promise<GitHubCreateRepoResponse> {
    const context = createRequestContext();
    const startTime = Date.now();

    try {
      // Check circuit breaker state before making request
        if (!this.circuitBreaker.isAvailable()) {
        const metrics = this.circuitBreaker.getMetrics();
        const error = new ValidationError(
          `GitHub service temporarily unavailable (circuit breaker: ${metrics.state})`,
        );

        logger.warn("Repository creation blocked by circuit breaker", {
          requestId: context.requestId,
          circuitState: metrics.state,
          failureCount: metrics.failureCount,
          successRate: `${this.circuitBreaker.getSuccessRate()}%`,
        });

        throw error;
      }

      return await this.circuitBreaker.execute(async () => {
        // For now, use personal access token as fallback
        // In production, you'd implement proper GitHub App installation flow
        const token = env.GITHUB_ACCESS_TOKEN;

        if (!token) {
          throw new AuthenticationError(
            "GitHub authentication not available. Please contact administrator.",
          );
        }

        const repoData = {
          name: config.name,
          description: config.description,
          private: config.isPrivate,
          auto_init: true,
          gitignore_template: "Node",
          license_template: "MIT",
        };

        logger.info("Creating GitHub repository", {
          requestId: context.requestId,
          org: config.org,
          name: config.name,
          isPrivate: config.isPrivate,
          circuitState: this.circuitBreaker.getMetrics().state,
        });

        // Layer 1: Retry (inner) - handles transient network failures
        const createResponse = await retryService.executeWithRetry(
          async () => {
            const fetchResponse = await this.fetchWithTimeout(
              `${this.baseUrl}/orgs/${config.org}/repos`,
              {
                method: "POST",
                headers: {
                  Authorization: `token ${token}`,
                  Accept: "application/vnd.github.v3+json",
                  "Content-Type": "application/json",
                  "User-Agent": "Architect-Platform/1.0.0",
                },
                body: JSON.stringify(repoData),
              },
            );

            if (!fetchResponse.ok) {
              // Idempotency check: 409 Conflict means repo already exists
              if (fetchResponse.status === 409) {
                // Don't retry on idempotency conflict
                const errorText = await fetchResponse.text();
                logger.warn(
                  "Repository already exists (idempotency - no retry)",
                  {
                    requestId: context.requestId,
                    org: config.org,
                    name: config.name,
                    status: fetchResponse.status,
                    error: errorText,
                  },
                );
                throw new ValidationError(
                  `Repository already exists: ${config.name}`,
                );
              }

              logger.error("Failed to create repository (will retry)", {
                requestId: context.requestId,
                org: config.org,
                name: config.name,
                status: fetchResponse.status,
              });
              throw new DatabaseError(
                `Failed to create repository: ${fetchResponse.statusText}`,
              );
            }

            return fetchResponse;
          },
          {
            ...RETRY_CONFIGS.NETWORK_SENSITIVE,
              retryableErrors: (error) => {
               // Don't retry on idempotency conflicts (409)
               if (
                 error instanceof ValidationError &&
                 error.message.includes("Repository already exists")
               ) {
                 return false;
               }
              // Use default retryable error detection
              return retryService.isRetryableError(error);
            },
            context: {
              service: "github-api",
              operation: "create-repository",
              org: config.org,
              repo: config.name,
            },
          },
        );

        const repo: GitHubCreateRepoResponse = await createResponse.json();

        // Create initial commit with blueprint
        await this.createBlueprintCommit(repo, config, token);

        const duration = Date.now() - startTime;

        logger.userAction("GitHub repository created", "system", {
          requestId: context.requestId,
          repoId: repo.id,
          fullName: repo.full_name,
          htmlUrl: repo.html_url,
          circuitState: this.circuitBreaker.getMetrics().state,
          circuitSuccessRate: `${this.circuitBreaker.getSuccessRate()}%`,
        });

        // Track successful GitHub operation
        monitoringService.trackGitHubOperation(
          "create-repository",
          true,
          duration,
          {
            repoName: repo.full_name,
            isPrivate: repo.private,
            org: config.org,
          },
        );

        // Create GitHub webhook for bi-directional sync
        await this.createWebhook(repo.full_name, config.name);

        return repo;
      });
    } catch (error) {
      const duration = Date.now() - startTime;

      logger.apiError(
        "Repository creation error",
        context.requestId,
        error as Error,
        {
          org: config.org,
          name: config.name,
          circuitState: this.circuitBreaker.getMetrics().state,
          circuitSuccessRate: `${this.circuitBreaker.getSuccessRate()}%`,
        },
      );

      // Track failed GitHub operation
      monitoringService.trackGitHubOperation(
        "create-repository",
        false,
        duration,
        {
          org: config.org,
          repoName: config.name,
          error: error instanceof Error ? error.message : String(error),
        },
      );

      throw error;
    }
  }

  /**
   * Create webhook for repository to enable bi-directional sync
   */
  async createWebhook(
    repoFullName: string,
    projectName: string,
  ): Promise<void> {
    const context = createRequestContext();
    const startTime = Date.now();

    try {
      const webhookSecret = env.GITHUB_WEBHOOK_SECRET;

      if (!webhookSecret) {
        logger.warn(
          "GitHub webhook secret not configured - skipping webhook creation",
          {
            requestId: context.requestId,
            repoFullName,
            hasWebhookSecret: !!webhookSecret,
          },
        );
        return;
      }

      return await this.circuitBreaker.execute(async () => {
        const token = env.GITHUB_ACCESS_TOKEN;

        if (!token) {
          throw new AuthenticationError(
            "GitHub authentication not available. Please contact administrator.",
          );
        }

        const webhookConfig = {
          name: "web",
          config: {
            url: `${env.NEXT_PUBLIC_APP_URL}/api/webhooks/github`,
            content_type: "json",
            secret: webhookSecret,
            insecure_ssl: false,
          },
          events: [
            "push",
            "pull_request",
            "issues",
            "issue_comment",
            "pull_request_review",
          ],
          active: true,
        };

        logger.info("Creating GitHub webhook", {
          requestId: context.requestId,
          repoFullName,
          projectName,
          webhookUrl: webhookConfig.config.url,
          circuitState: this.circuitBreaker.getMetrics().state,
        });

        const webhookResponse = await retryService.executeWithRetry(
          async () => {
            const fetchResponse = await this.fetchWithTimeout(
              `${this.baseUrl}/repos/${repoFullName}/hooks`,
              {
                method: "POST",
                headers: {
                  Authorization: `token ${token}`,
                  Accept: "application/vnd.github.v3+json",
                  "Content-Type": "application/json",
                  "User-Agent": "Architect-Platform/1.0.0",
                },
                body: JSON.stringify(webhookConfig),
              },
            );

            if (!fetchResponse.ok) {
              // Check if webhook already exists
              if (fetchResponse.status === 422) {
                logger.warn(
                  "Webhook already exists (idempotency - no retry)",
                  {
                    requestId: context.requestId,
                    repoFullName,
                    status: fetchResponse.status,
                  },
                );
                throw new ValidationError(
                  `Webhook already exists for repository: ${repoFullName}`,
                );
              }

              logger.error("Failed to create GitHub webhook (will retry)", {
                requestId: context.requestId,
                repoFullName,
                status: fetchResponse.status,
              });
              throw new DatabaseError(
                `Failed to create webhook: ${fetchResponse.statusText}`,
              );
            }

            return fetchResponse;
          },
          {
            ...RETRY_CONFIGS.NETWORK_SENSITIVE,
            retryableErrors: (error) => {
              if (
                error instanceof ValidationError &&
                error.message.includes("Webhook already exists")
              ) {
                return false;
              }
              return retryService.isRetryableError(error);
            },
            context: {
              service: "github-api",
              operation: "create-webhook",
              repo: repoFullName,
            },
          },
        );

        const webhook = await webhookResponse.json();
        const duration = Date.now() - startTime;

        logger.userAction("GitHub webhook created", "system", {
          requestId: context.requestId,
          repoFullName,
          projectName,
          webhookId: webhook.id,
          webhookUrl: webhookConfig.config.url,
          circuitState: this.circuitBreaker.getMetrics().state,
          circuitSuccessRate: `${this.circuitBreaker.getSuccessRate()}%`,
        });

        // Track successful GitHub operation
        monitoringService.trackGitHubOperation(
          "create-webhook",
          true,
          duration,
          {
            repoName: repoFullName,
            projectName,
            webhookId: webhook.id,
          },
        );
      });
    } catch (error) {
      const duration = Date.now() - startTime;

      // Log but don't fail repository creation if webhook fails
      logger.apiError(
        "Webhook creation error",
        context.requestId,
        error as Error,
        {
          repoFullName,
          projectName,
          circuitState: this.circuitBreaker.getMetrics().state,
          circuitSuccessRate: `${this.circuitBreaker.getSuccessRate()}%`,
        },
      );

      monitoringService.trackGitHubOperation(
        "create-webhook",
        false,
        duration,
        {
          repoName: repoFullName,
          projectName,
          error: error instanceof Error ? error.message : String(error),
        },
      );

      logger.warn(
        "Repository created but webhook creation failed - manual setup may be required",
        {
          requestId: context.requestId,
          repoFullName,
          projectName,
        },
      );
    }
  }

  /**
   * Create initial commit with blueprint.md
   */
  private async createBlueprintCommit(
    repo: GitHubCreateRepoResponse,
    config: GitHubRepoConfig,
    token: string,
  ): Promise<void> {
    const context = createRequestContext();

    try {
      // Get current commit SHA
      const repoResponse = await this.fetchWithTimeout(
        `${this.baseUrl}/repos/${repo.full_name}/git/refs/heads/main`,
        {
          headers: {
            Authorization: `token ${token}`,
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "Architect-Platform/1.0.0",
          },
        },
      );

      if (!repoResponse.ok) {
        // Try master branch if main doesn't exist
        const masterResponse = await this.fetchWithTimeout(
          `${this.baseUrl}/repos/${repo.full_name}/git/refs/heads/master`,
          {
            headers: {
              Authorization: `token ${token}`,
              Accept: "application/vnd.github.v3+json",
              "User-Agent": "Architect-Platform/1.0.0",
            },
          },
        );

        if (!masterResponse.ok) {
          throw new DatabaseError("Could not find default branch");
        }

        const masterData = await masterResponse.json();
        await this.createCommitWithBlueprint(
          repo,
          config,
          token,
          masterData.object.sha,
          "master",
        );
      } else {
        const repoData = await repoResponse.json();
        await this.createCommitWithBlueprint(
          repo,
          config,
          token,
          repoData.object.sha,
          "main",
        );
      }
    } catch (error) {
      logger.apiError(
        "Blueprint commit error",
        context.requestId,
        error as Error,
        { repoFullName: repo.full_name },
      );
      // Don't fail the whole operation if blueprint commit fails
      logger.warn("Repository created but blueprint commit failed", {
        requestId: context.requestId,
        repoFullName: repo.full_name,
      });
    }
  }

  /**
   * Create commit with blueprint.md content
   */
  private async createCommitWithBlueprint(
    repo: GitHubCreateRepoResponse,
    config: GitHubRepoConfig,
    token: string,
    baseCommitSha: string,
    branch: string,
  ): Promise<void> {
    const context = createRequestContext();

    // Layer 1: Retry (inner) - handles transient network failures
    // Create blueprint.md blob
    const blobResponse = await retryService.executeWithRetry(
      async () => {
        const fetchResponse = await this.fetchWithTimeout(
          `${this.baseUrl}/repos/${repo.full_name}/git/blobs`,
          {
            method: "POST",
            headers: {
              Authorization: `token ${token}`,
              Accept: "application/vnd.github.v3+json",
              "Content-Type": "application/json",
              "User-Agent": "Architect-Platform/1.0.0",
            },
            body: JSON.stringify({
              content: config.blueprintContent,
              encoding: "utf-8",
            }),
          },
        );

        if (!fetchResponse.ok) {
          throw new DatabaseError("Failed to create blueprint blob");
        }

        return fetchResponse;
      },
      {
        ...RETRY_CONFIGS.FAST,
        context: {
          service: "github-api",
          operation: "create-blob",
          repo: repo.full_name,
        },
      },
    );

    const blobData = await blobResponse.json();

    // Create tree with blueprint.md
    const treeResponse = await retryService.executeWithRetry(
      async () => {
        const fetchResponse = await this.fetchWithTimeout(
          `${this.baseUrl}/repos/${repo.full_name}/git/trees`,
          {
            method: "POST",
            headers: {
              Authorization: `token ${token}`,
              Accept: "application/vnd.github.v3+json",
              "Content-Type": "application/json",
              "User-Agent": "Architect-Platform/1.0.0",
            },
            body: JSON.stringify({
              base_tree: baseCommitSha,
              tree: [
                {
                  path: "docs/architecture/blueprint.md",
                  mode: "100644",
                  type: "blob",
                  sha: blobData.sha,
                },
              ],
            }),
          },
        );

        if (!fetchResponse.ok) {
          throw new DatabaseError("Failed to create tree");
        }

        return fetchResponse;
      },
      {
        ...RETRY_CONFIGS.FAST,
        context: {
          service: "github-api",
          operation: "create-tree",
          repo: repo.full_name,
        },
      },
    );

    const treeData = await treeResponse.json();

    // Create commit
    const commitResponse = await retryService.executeWithRetry(
      async () => {
        const fetchResponse = await this.fetchWithTimeout(
          `${this.baseUrl}/repos/${repo.full_name}/git/commits`,
          {
            method: "POST",
            headers: {
              Authorization: `token ${token}`,
              Accept: "application/vnd.github.v3+json",
              "Content-Type": "application/json",
              "User-Agent": "Architect-Platform/1.0.0",
            },
            body: JSON.stringify({
              message: "Initial commit: Add AI-generated blueprint",
              tree: treeData.sha,
              parents: [baseCommitSha],
            }),
          },
        );

        if (!fetchResponse.ok) {
          throw new DatabaseError("Failed to create commit");
        }

        return fetchResponse;
      },
      {
        ...RETRY_CONFIGS.STANDARD,
        context: {
          service: "github-api",
          operation: "create-commit",
          repo: repo.full_name,
        },
      },
    );

    const commitData = await commitResponse.json();

    // Update branch reference (no retry - idempotent via sha)
    await this.fetchWithTimeout(
      `${this.baseUrl}/repos/${repo.full_name}/git/refs/heads/${branch}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `token ${token}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
          "User-Agent": "Architect-Platform/1.0.0",
        },
        body: JSON.stringify({
          sha: commitData.sha,
          force: false,
        }),
      },
    );

    logger.userAction("Blueprint committed to repository", "system", {
      requestId: context.requestId,
      repoFullName: repo.full_name,
      commitSha: commitData.sha,
      branch,
    });
  }

  /**
   * Verify repository access
   */
  async verifyRepository(repoFullName: string): Promise<boolean> {
    const context = createRequestContext();

    try {
      const token = env.GITHUB_ACCESS_TOKEN;

      if (!token) {
        return false;
      }

      const response = await retryService.executeWithRetry(
        async () => {
          const fetchResponse = await this.fetchWithTimeout(
            `${this.baseUrl}/repos/${repoFullName}`,
            {
              headers: {
                Authorization: `token ${token}`,
                Accept: "application/vnd.github.v3+json",
                "User-Agent": "Architect-Platform/1.0.0",
              },
            },
          );
          return fetchResponse;
        },
        {
          ...RETRY_CONFIGS.FAST,
          context: {
            service: "github-api",
            operation: "verify-repository",
            repo: repoFullName,
          },
        },
      );

      const exists = response.ok;

      logger.info("Repository verification completed", {
        requestId: context.requestId,
        repoFullName,
        exists,
        status: response.status,
      });

      return exists;
    } catch (error) {
      logger.apiError(
        "Repository verification error",
        context.requestId,
        error as Error,
        { repoFullName },
      );
      return false;
    }
  }

  /**
   * Create a Git branch for rollback safety
   */
  async createBranch(
    repoUrl: string,
    branchName: string,
    baseBranch: string = "main",
  ): Promise<import("./service-types").BranchInfo> {
    const context = createRequestContext();
    const startTime = Date.now();

    try {
      const token = env.GITHUB_ACCESS_TOKEN;

      if (!token) {
        throw new AuthenticationError(
          "GitHub authentication not available. Please contact administrator.",
        );
      }

      const { org, repo } = this.parseRepoUrl(repoUrl);

      logger.info("Creating rollback safety branch", {
        requestId: context.requestId,
        org,
        repo,
        branchName,
        baseBranch,
      });

      return await this.circuitBreaker.execute(async () => {
        const url = `${this.baseUrl}/repos/${org}/${repo}/git/refs`;

        const baseRefResponse = await retryService.executeWithRetry(
          async () => {
            const fetchResponse = await this.fetchWithTimeout(
              `${url}/heads/${baseBranch}`,
              {
                headers: {
                  Authorization: `token ${token}`,
                  Accept: "application/vnd.github.v3+json",
                  "User-Agent": "Architect-Platform/1.0.0",
                },
              },
            );

            if (!fetchResponse) {
              throw new DatabaseError(
                "Failed to get base branch: No response from GitHub API",
              );
            }

            if (!fetchResponse.ok) {
              throw new DatabaseError(
                `Failed to get base branch: ${fetchResponse.statusText}`,
              );
            }

            return fetchResponse;
          },
          {
            ...RETRY_CONFIGS.NETWORK_SENSITIVE,
            context: {
              service: "github-api",
              operation: "get-base-ref",
              org,
              repo,
              branch: baseBranch,
            },
          },
        );

        const baseRefData = await baseRefResponse.json();
        const baseSha = baseRefData.object.sha;

        const createBranchResponse = await retryService.executeWithRetry(
          async () => {
            const fetchResponse = await this.fetchWithTimeout(url, {
              method: "POST",
              headers: {
                Authorization: `token ${token}`,
                Accept: "application/vnd.github.v3+json",
                "Content-Type": "application/json",
                "User-Agent": "Architect-Platform/1.0.0",
              },
              body: JSON.stringify({
                ref: `refs/heads/${branchName}`,
                sha: baseSha,
              }),
            });

            if (!fetchResponse) {
              throw new DatabaseError(
                "Failed to create branch: No response from GitHub API",
              );
            }

            if (!fetchResponse.ok) {
              if (fetchResponse.status === 422) {
                logger.warn("Branch already exists", {
                  requestId: context.requestId,
                  org,
                  repo,
                  branchName,
                });
                throw new ValidationError(
                  `Branch already exists: ${branchName}`,
                );
              }

              throw new DatabaseError(
                `Failed to create branch: ${fetchResponse.statusText}`,
              );
            }

            return fetchResponse;
          },
          {
            ...RETRY_CONFIGS.NETWORK_SENSITIVE,
            context: {
              service: "github-api",
              operation: "create-branch",
              org,
              repo,
              branchName,
            },
          },
        );

        const branchData = await createBranchResponse.json();
        const duration = Date.now() - startTime;

        const branchInfo: import("./service-types").BranchInfo = {
          name: branchName,
          url: `https://github.com/${org}/${repo}/tree/${branchName}`,
          sha: branchData.object.sha,
          createdAt: new Date().toISOString(),
        };

        logger.userAction("Safety branch created", "system", {
          requestId: context.requestId,
          org,
          repo,
          branchName,
          branchSha: branchInfo.sha,
          duration,
        });

        monitoringService.trackGitHubOperation(
          "create-branch",
          true,
          duration,
          {
            repoName: `${org}/${repo}`,
            branchName,
          },
        );

        return branchInfo;
      });
    } catch (error) {
      const duration = Date.now() - startTime;

      logger.apiError(
        "Branch creation error",
        context.requestId,
        error as Error,
        { repoUrl, branchName },
      );

      monitoringService.trackGitHubOperation(
        "create-branch",
        false,
        duration,
        {
          repoUrl,
          branchName,
          error: error instanceof Error ? error.message : String(error),
        },
      );

      throw error;
    }
  }

  /**
   * Parse GitHub repository URL to extract org and repo name
   */
  private parseRepoUrl(repoUrl: string): { org: string; repo: string } {
    try {
      const url = new URL(repoUrl);

      if (!url.hostname.includes("github.com")) {
        throw new ValidationError(
          "Invalid GitHub repository URL",
        );
      }

      const pathParts = url.pathname.split("/").filter(Boolean);

      if (pathParts.length < 2) {
        throw new ValidationError(
          "Invalid GitHub repository URL format",
        );
      }

      let repo = pathParts[1];
      // Remove .git suffix if present
      if (repo.endsWith(".git")) {
        repo = repo.slice(0, -4);
      }

      return {
        org: pathParts[0],
        repo,
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }

      throw new ValidationError(
        `Failed to parse repository URL: ${repoUrl}`,
      );
    }
  }
}

// Export singleton instance
export const githubService = new GitHubService();
