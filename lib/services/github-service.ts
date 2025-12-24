import { logger, createRequestContext } from "@/lib/logger";
import { monitoringService } from "@/lib/monitoring";
import { circuitBreakerRegistry, SERVICE_CONFIGS } from "@/lib/circuit-breaker";
import * as crypto from "crypto";

/**
 * GitHub App Service
 *
 * Handles GitHub App API integration for repository creation and management.
 * Uses GitHub App authentication for higher rate limits and proper permissions.
 */

export interface GitHubRepoConfig {
  org: string;
  name: string;
  description: string;
  isPrivate: boolean;
  blueprintContent: string;
}

export interface GitHubCreateRepoResponse {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  clone_url: string;
  private: boolean;
  created_at: string;
}

export interface GitHubAppConfig {
  appId: string;
  privateKey: string;
  installationId?: string;
}

class GitHubServiceError extends Error {
  // Public properties for error serialization and debugging
  public statusCode?: number;
  public response?: any;

  constructor(message: string, statusCode?: number, response?: any) {
    super(message);
    this.name = "GitHubServiceError";
    this.statusCode = statusCode;
    this.response = response;
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      response: this.response,
    };
  }
}

class GitHubService {
  private baseUrl = "https://api.github.com";
  private circuitBreaker;

  constructor() {
    // Initialize circuit breaker for GitHub API
    this.circuitBreaker = circuitBreakerRegistry.get(
      SERVICE_CONFIGS.GITHUB_API.name,
      SERVICE_CONFIGS.GITHUB_API.config,
    );
  }

  private getCredentials() {
    const appId = process.env.GITHUB_APP_ID || "";
    const privateKey = process.env.GITHUB_APP_PRIVATE_KEY || "";

    if (!appId || !privateKey) {
      logger.error("GitHub App credentials not configured", {
        hasAppId: !!appId,
        hasPrivateKey: !!privateKey,
      });
      throw new GitHubServiceError(
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
        throw new GitHubServiceError(
          "Invalid GitHub App private key format. Please check GITHUB_APP_PRIVATE_KEY environment variable.",
          500,
        );
      }

      throw new GitHubServiceError(
        `Failed to create GitHub App JWT: ${error instanceof Error ? error.message : "Unknown error"}`,
        500,
      );
    }
  }

  /**
   * Get an access token for a specific installation
   */
  private async getInstallationToken(installationId: string): Promise<string> {
    const context = createRequestContext();

    try {
      const jwt = this.createJWT();

      const response = await fetch(
        `${this.baseUrl}/app/installations/${installationId}/access_tokens`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${jwt}`,
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "Architect-Platform/1.0.0",
          },
        },
      );

      if (!response.ok) {
        const error = await response.text();
        logger.error("Failed to get installation token", {
          requestId: context.requestId,
          installationId,
          status: response.status,
          error,
        });
        throw new GitHubServiceError(
          `Failed to get installation token: ${response.statusText}`,
          response.status,
        );
      }

      const data = await response.json();
      return data.token;
    } catch (error) {
      logger.apiError(
        "Installation token error",
        context.requestId,
        error as Error,
        { installationId },
      );
      throw error;
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
        const error = new GitHubServiceError(
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
        const token = process.env.GITHUB_ACCESS_TOKEN;

        if (!token) {
          throw new GitHubServiceError(
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

        // Create repository
        const createResponse = await fetch(
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

        if (!createResponse.ok) {
          const error = await createResponse.text();
          logger.error("Failed to create repository", {
            requestId: context.requestId,
            org: config.org,
            name: config.name,
            status: createResponse.status,
            error,
            circuitState: this.circuitBreaker.getMetrics().state,
          });
          throw new GitHubServiceError(
            `Failed to create repository: ${createResponse.statusText}`,
            createResponse.status,
            error,
          );
        }

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
      const repoResponse = await fetch(
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
        const masterResponse = await fetch(
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
          throw new GitHubServiceError("Could not find default branch");
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

    // Create blueprint.md blob
    const blobResponse = await fetch(
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

    if (!blobResponse.ok) {
      throw new GitHubServiceError("Failed to create blueprint blob");
    }

    const blobData = await blobResponse.json();

    // Create tree with blueprint.md
    const treeResponse = await fetch(
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

    if (!treeResponse.ok) {
      throw new GitHubServiceError("Failed to create tree");
    }

    const treeData = await treeResponse.json();

    // Create commit
    const commitResponse = await fetch(
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

    if (!commitResponse.ok) {
      throw new GitHubServiceError("Failed to create commit");
    }

    const commitData = await commitResponse.json();

    // Update branch reference
    await fetch(
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
      const token = process.env.GITHUB_ACCESS_TOKEN;

      if (!token) {
        return false;
      }

      const response = await fetch(`${this.baseUrl}/repos/${repoFullName}`, {
        headers: {
          Authorization: `token ${token}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "Architect-Platform/1.0.0",
        },
      });

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
}

// Export singleton instance
export const githubService = new GitHubService();

export { GitHubServiceError };
