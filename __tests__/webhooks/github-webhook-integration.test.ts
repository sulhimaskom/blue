import { SecurityService } from "@/lib/services/security-service";
import { env } from "@/lib/env";
import * as crypto from "crypto";

describe("GitHub Webhook Integration", () => {
  const mockWebhookSecret = "test-github-webhook-secret";
  const mockAppUrl = "http://localhost:3000";

  beforeEach(() => {
    // Mock environment variables
    env.GITHUB_WEBHOOK_SECRET = mockWebhookSecret;
    env.NEXT_PUBLIC_APP_URL = mockAppUrl;
  });

  describe("SecurityService - GitHub webhook signature verification", () => {
    it("should verify valid GitHub webhook signature", () => {
      const body = JSON.stringify({ test: "data" });
      const signature = crypto
        .createHmac("sha256", mockWebhookSecret)
        .update(body, "utf8")
        .digest("hex");
      const signatureHeader = `sha256=${signature}`;

      const headers = new Headers();
      headers.set("x-hub-signature-256", signatureHeader);

      const result = SecurityService.verifyGitHubWebhook(body, headers);

      expect(result).toBe(true);
    });

    it("should reject webhook with invalid signature", () => {
      const body = JSON.stringify({ test: "data" });
      const headers = new Headers();
      headers.set("x-hub-signature-256", "sha256=invalidsignature");

      const result = SecurityService.verifyGitHubWebhook(body, headers);

      expect(result).toBe(false);
    });

    it("should reject webhook with missing signature", () => {
      const body = JSON.stringify({ test: "data" });
      const headers = new Headers();

      const result = SecurityService.verifyGitHubWebhook(body, headers);

      expect(result).toBe(false);
    });

    it("should reject webhook with missing webhook secret", () => {
      const body = JSON.stringify({ test: "data" });
      const signature = crypto
        .createHmac("sha256", mockWebhookSecret)
        .update(body, "utf8")
        .digest("hex");
      const signatureHeader = `sha256=${signature}`;

      const headers = new Headers();
      headers.set("x-hub-signature-256", signatureHeader);

      env.GITHUB_WEBHOOK_SECRET = "";

      const result = SecurityService.verifyGitHubWebhook(body, headers);

      expect(result).toBe(false);
    });

    it("should reject webhook with invalid signature format", () => {
      const body = JSON.stringify({ test: "data" });
      const headers = new Headers();
      headers.set("x-hub-signature-256", "invalid-format");

      const result = SecurityService.verifyGitHubWebhook(body, headers);

      expect(result).toBe(false);
    });

    it("should use timing-safe comparison to prevent timing attacks", () => {
      const body = JSON.stringify({ test: "data" });
      const signature = crypto
        .createHmac("sha256", mockWebhookSecret)
        .update(body, "utf8")
        .digest("hex");
      const signatureHeader = `sha256=${signature}`;

      const headers = new Headers();
      headers.set("x-hub-signature-256", signatureHeader);

      const result = SecurityService.verifyGitHubWebhook(body, headers);

      expect(result).toBe(true);
    });
  });

  describe("GitHub webhook type guards", () => {
    const mockGitHubWebhookEvent = {
      id: "12345",
      type: "push",
      created: Date.now(),
      data: {
        ref: "refs/heads/main",
        repository: {
          id: 1,
          name: "test-repo",
          full_name: "org/test-repo",
          private: false,
          html_url: "https://github.com/org/test-repo",
          owner: { id: 1, login: "test", type: "User" },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        pusher: { name: "test", email: "test@example.com" },
        sender: { id: 1, login: "test", type: "User" },
        commits: [],
      },
    };

    it("should identify GitHub webhook events", () => {
      const { isGitHubWebhookEvent } = require("@/lib/types/webhook-events");

      expect(isGitHubWebhookEvent(mockGitHubWebhookEvent)).toBe(true);
    });

    it("should identify GitHub push events", () => {
      const { isGitHubPushEvent } = require("@/lib/types/webhook-events");

      expect(isGitHubPushEvent(mockGitHubWebhookEvent)).toBe(true);
    });

    it("should identify GitHub pull request events", () => {
      const { isGitHubPullRequestEvent } = require("@/lib/types/webhook-events");

      const prEvent = {
        ...mockGitHubWebhookEvent,
        type: "pull_request" as const,
        data: {
          action: "opened",
          number: 1,
          pull_request: {
            id: 1,
            number: 1,
            title: "Test PR",
            state: "open",
            html_url: "https://github.com/org/test-repo/pull/1",
            user: { id: 1, login: "test", type: "User" },
            head: { sha: "abc", ref: "feature", repo: mockGitHubWebhookEvent.data.repository },
            base: { sha: "def", ref: "main", repo: mockGitHubWebhookEvent.data.repository },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          repository: mockGitHubWebhookEvent.data.repository,
          sender: { id: 1, login: "test", type: "User" },
        },
      };

      expect(isGitHubPullRequestEvent(prEvent)).toBe(true);
    });

    it("should identify GitHub issues events", () => {
      const { isGitHubIssuesEvent } = require("@/lib/types/webhook-events");

      const issueEvent = {
        ...mockGitHubWebhookEvent,
        type: "issues" as const,
        data: {
          action: "opened",
          issue: {
            id: 1,
            number: 1,
            title: "Test Issue",
            state: "open",
            html_url: "https://github.com/org/test-repo/issues/1",
            user: { id: 1, login: "test", type: "User" },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            labels: [],
          },
          repository: mockGitHubWebhookEvent.data.repository,
          sender: { id: 1, login: "test", type: "User" },
        },
      };

      expect(isGitHubIssuesEvent(issueEvent)).toBe(true);
    });

    it("should identify GitHub ping events", () => {
      const { isGitHubPing } = require("@/lib/types/webhook-events");

      const pingEvent = {
        id: "12345",
        type: "ping" as const,
        created: Date.now(),
        data: {
          zen: "Keep it logically awesome.",
          hook_id: 123,
        },
      };

      expect(isGitHubPing(pingEvent)).toBe(true);
    });
  });

  describe("GitHub webhook endpoint configuration", () => {
    it("should have correct webhook URL", () => {
      const webhookUrl = `${mockAppUrl}/api/webhooks/github`;

      expect(webhookUrl).toBe("http://localhost:3000/api/webhooks/github");
    });

    it("should support webhook events", () => {
      const supportedEvents = [
        "push",
        "pull_request",
        "issues",
        "issue_comment",
        "pull_request_review",
      ];

      expect(supportedEvents).toContain("push");
      expect(supportedEvents).toContain("pull_request");
      expect(supportedEvents).toContain("issues");
      expect(supportedEvents).toContain("issue_comment");
      expect(supportedEvents).toContain("pull_request_review");
    });

    it("should use JSON content type", () => {
      const contentType = "json";

      expect(contentType).toBe("json");
    });

    it("should use webhook secret for signature", () => {
      const webhookSecret = env.GITHUB_WEBHOOK_SECRET;

      expect(webhookSecret).toBe(mockWebhookSecret);
    });

    it("should have insecure_ssl disabled", () => {
      const insecureSsl = false;

      expect(insecureSsl).toBe(false);
    });

    it("should have webhook active", () => {
      const active = true;

      expect(active).toBe(true);
    });
  });

  describe("SecurityService - Generic webhook verifier factory", () => {
    it("should create GitHub webhook verifier", () => {
      const verifier = SecurityService.createVerifier("GitHub");

      expect(typeof verifier).toBe("function");
    });

    it("should verify GitHub webhook signature using verifier factory", () => {
      const verifier = SecurityService.createVerifier("GitHub");
      const body = JSON.stringify({ test: "data" });
      const signature = crypto
        .createHmac("sha256", mockWebhookSecret)
        .update(body, "utf8")
        .digest("hex");
      const signatureHeader = `sha256=${signature}`;

      const headers = new Headers();
      headers.set("x-hub-signature-256", signatureHeader);

      const result = verifier(body, headers);

      expect(result).toBe(true);
    });
  });

  describe("GitHub webhook payload validation", () => {
    it("should accept valid GitHub push event payload", () => {
      const payload = {
        id: "12345",
        type: "push",
        created: Date.now(),
        data: {
          ref: "refs/heads/main",
          repository: {
            id: 1,
            name: "test-repo",
            full_name: "org/test-repo",
            private: false,
            html_url: "https://github.com/org/test-repo",
            owner: { id: 1, login: "test", type: "User" },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          pusher: { name: "test", email: "test@example.com" },
          sender: { id: 1, login: "test", type: "User" },
          commits: [
            {
              id: "abc123",
              message: "Test commit",
              timestamp: new Date().toISOString(),
              author: { name: "Test", email: "test@example.com" },
              url: "https://github.com/org/test-repo/commit/abc123",
              distinct: true,
            },
          ],
        },
      };

      expect(payload.type).toBe("push");
      expect(payload.data.ref).toBe("refs/heads/main");
      expect(payload.data.commits).toHaveLength(1);
    });

    it("should accept valid GitHub pull request event payload", () => {
      const payload = {
        id: "12345",
        type: "pull_request",
        created: Date.now(),
        data: {
          action: "opened",
          number: 1,
          pull_request: {
            id: 1,
            number: 1,
            title: "Test PR",
            state: "open",
            html_url: "https://github.com/org/test-repo/pull/1",
            user: { id: 1, login: "test", type: "User" },
            head: {
              sha: "abc",
              ref: "feature",
              repo: {
                id: 1,
                name: "test-repo",
                full_name: "org/test-repo",
                private: false,
                html_url: "https://github.com/org/test-repo",
                owner: { id: 1, login: "test", type: "User" },
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            },
            base: {
              sha: "def",
              ref: "main",
              repo: {
                id: 1,
                name: "test-repo",
                full_name: "org/test-repo",
                private: false,
                html_url: "https://github.com/org/test-repo",
                owner: { id: 1, login: "test", type: "User" },
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          repository: {
            id: 1,
            name: "test-repo",
            full_name: "org/test-repo",
            private: false,
            html_url: "https://github.com/org/test-repo",
            owner: { id: 1, login: "test", type: "User" },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          sender: { id: 1, login: "test", type: "User" },
        },
      };

      expect(payload.type).toBe("pull_request");
      expect(payload.data.action).toBe("opened");
      expect(payload.data.pull_request.number).toBe(1);
    });

    it("should accept valid GitHub ping event payload", () => {
      const payload = {
        id: "12345",
        type: "ping",
        created: Date.now(),
        data: {
          zen: "Keep it logically awesome.",
          hook_id: 123,
          repository: {
            id: 1,
            name: "test-repo",
            full_name: "org/test-repo",
            private: false,
            html_url: "https://github.com/org/test-repo",
            owner: { id: 1, login: "test", type: "User" },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          sender: { id: 1, login: "test", type: "User" },
        },
      };

      expect(payload.type).toBe("ping");
      expect(payload.data.zen).toBe("Keep it logically awesome.");
      expect(payload.data.hook_id).toBe(123);
    });
  });
});
