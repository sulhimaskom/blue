import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from "@jest/globals";

// Mock logger
jest.mock("@/lib/logger", () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    userAction: jest.fn(),
    apiError: jest.fn(),
    warn: jest.fn(),
  },
  createRequestContext: jest.fn(() => ({ requestId: "test-request-id" })),
}));

// Mock fetch
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

describe("GitHubService", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetAllMocks();
    jest.resetModules();
    process.env = {
      ...originalEnv,
      GITHUB_APP_ID: "test-app-id",
      GITHUB_APP_PRIVATE_KEY: "test-private-key",
      GITHUB_ACCESS_TOKEN: "test-token",
    };
  });

  // Helper to get fresh service instance after module reset
  function getGitHubService() {
    return require("@/lib/services/github-service").githubService;
  }

  function getGitHubServiceError() {
    return require("@/lib/services/github-service").GitHubServiceError;
  }

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("constructor", () => {
    it("should initialize successfully with valid credentials", () => {
      expect(getGitHubService()).toBeDefined();
    });
  });

  describe("createRepository", () => {
    const mockRepoConfig = {
      org: "test-org",
      name: "test-repo",
      description: "Test repository",
      isPrivate: false,
      blueprintContent: "# Test Blueprint",
    };

    const mockRepoResponse = {
      id: 12345,
      name: "test-repo",
      full_name: "test-org/test-repo",
      html_url: "https://github.com/test-org/test-repo",
      clone_url: "https://github.com/test-org/test-repo.git",
      private: false,
      created_at: "2024-01-01T00:00:00Z",
    };

    it("should create repository successfully", async () => {
      // Mock repository creation
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockRepoResponse,
        } as Response)
        // Mock branch refs
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            object: {
              sha: "test-sha-123",
            },
          }),
        } as Response)
        // Mock blob creation
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ sha: "blob-sha-123" }),
        } as Response)
        // Mock tree creation
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ sha: "tree-sha-123" }),
        } as Response)
        // Mock commit creation
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ sha: "commit-sha-123" }),
        } as Response)
        // Mock branch update
        .mockResolvedValueOnce({ ok: true } as Response);

      const result = await getGitHubService().createRepository(mockRepoConfig);

      expect(result).toEqual(mockRepoResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/orgs/test-org/repos"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "token test-token",
          }),
        }),
      );
    });

    it("should handle API errors gracefully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        text: async () => "Repository already exists",
      } as Response);

      await expect(
        getGitHubService().createRepository(mockRepoConfig),
      ).rejects.toThrow(getGitHubServiceError());
    });
  });

  describe("verifyRepository", () => {
    it("should return true for existing repository", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 12345 }),
      } as Response);

      const result = await getGitHubService().verifyRepository("test-org/test-repo");

      expect(result).toBe(true);
    });

    it("should return false for non-existing repository", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response);

      const result = await getGitHubService().verifyRepository(
        "test-org/nonexistent",
      );

      expect(result).toBe(false);
    });

    it("should return false when token is missing", async () => {
      delete process.env.GITHUB_ACCESS_TOKEN;

      const result = await getGitHubService().verifyRepository("test-org/test-repo");

      expect(result).toBe(false);
    });
  });

  describe("createBranch", () => {
    const mockRepoUrl = "https://github.com/test-org/test-repo";
    const mockBranchName = "rollback-v1.2-1234567890";
    const mockBaseBranchSha = "base-sha-123";
    const mockCreatedBranchSha = "new-branch-sha-456";

    it("should create branch successfully", async () => {
      // Mock base branch ref fetch
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            object: {
              sha: mockBaseBranchSha,
            },
          }),
        } as Response)
        // Mock branch creation
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            object: {
              sha: mockCreatedBranchSha,
            },
          }),
        } as Response);

      const result = await getGitHubService().createBranch(
        mockRepoUrl,
        mockBranchName,
      );

      expect(result).toEqual({
        name: mockBranchName,
        url: `https://github.com/test-org/test-repo/tree/${mockBranchName}`,
        sha: mockCreatedBranchSha,
        createdAt: expect.any(String),
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.github.com/repos/test-org/test-repo/git/refs/heads/main",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "token test-token",
          }),
        }),
      );

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.github.com/repos/test-org/test-repo/git/refs",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "token test-token",
            "Content-Type": "application/json",
          }),
          body: expect.stringContaining(mockBranchName),
        }),
      );
    });

    it("should create branch from custom base branch", async () => {
      const customBaseBranch = "develop";

      // Mock base branch ref fetch
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            object: {
              sha: mockBaseBranchSha,
            },
          }),
        } as Response)
        // Mock branch creation
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            object: {
              sha: mockCreatedBranchSha,
            },
          }),
        } as Response);

      const result = await getGitHubService().createBranch(
        mockRepoUrl,
        mockBranchName,
        customBaseBranch,
      );

      expect(result.name).toBe(mockBranchName);

      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.github.com/repos/test-org/test-repo/git/refs/heads/${customBaseBranch}`,
        expect.any(Object),
      );
    });

    it("should throw ValidationError for non-GitHub URL", async () => {
      await expect(
        getGitHubService().createBranch(
          "https://gitlab.com/test-org/test-repo",
          mockBranchName,
        ),
      ).rejects.toThrow("Invalid GitHub repository URL");
    });

    it("should throw ValidationError for malformed URL", async () => {
      await expect(
        getGitHubService().createBranch(
          "https://github.com/test-org",
          mockBranchName,
        ),
      ).rejects.toThrow("Invalid GitHub repository URL format");
    });

    it("should throw AuthenticationError when token is missing", async () => {
      // Mock env to return undefined for GITHUB_ACCESS_TOKEN
      jest.doMock("@/lib/env", () => ({
        env: {
          GITHUB_ACCESS_TOKEN: undefined,
        },
      }));

      await expect(
        getGitHubService().createBranch(mockRepoUrl, mockBranchName),
      ).rejects.toThrow("GitHub authentication not available");

      // Reset env mock for other tests
      jest.dontMock("@/lib/env");
    });

    it("should throw ValidationError when branch already exists", async () => {
      // Mock base branch ref fetch (succeeds)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          object: {
            sha: mockBaseBranchSha,
          },
        }),
      } as Response);

      // Mock branch creation (fails with 422 - already exists)
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
      } as Response);

      await expect(
        getGitHubService().createBranch(mockRepoUrl, mockBranchName),
      ).rejects.toThrow("Branch already exists");
    });

    it("should throw DatabaseError when base branch fetch fails", async () => {
      // Mock base branch ref fetch (fails)
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ message: "Not Found" }),
      } as Response);

      await expect(
        getGitHubService().createBranch(mockRepoUrl, mockBranchName),
      ).rejects.toThrow("Failed to get base branch");
    });

    it("should throw DatabaseError when branch creation fails", async () => {
      // Mock base branch ref fetch (succeeds)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          object: {
            sha: mockBaseBranchSha,
          },
        }),
      } as Response);

      // Mock branch creation (fails with server error)
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ message: "Internal Server Error" }),
      } as Response);

      await expect(
        getGitHubService().createBranch(mockRepoUrl, mockBranchName),
      ).rejects.toThrow("Failed to create branch");
    });

    it("should parse repo URL correctly with trailing slash", async () => {
      // Mock base branch ref fetch
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            object: {
              sha: mockBaseBranchSha,
            },
          }),
        } as Response)
        // Mock branch creation
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            object: {
              sha: mockCreatedBranchSha,
            },
          }),
        } as Response);

      const result = await getGitHubService().createBranch(
        "https://github.com/test-org/test-repo/",
        mockBranchName,
      );

      expect(result.url).toBe(
        `https://github.com/test-org/test-repo/tree/${mockBranchName}`,
      );
    });

    it("should parse repo URL correctly with .git suffix", async () => {
      // Mock base branch ref fetch
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            object: {
              sha: mockBaseBranchSha,
            },
          }),
        } as Response)
        // Mock branch creation
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            object: {
              sha: mockCreatedBranchSha,
            },
          }),
        } as Response);

      const result = await getGitHubService().createBranch(
        "https://github.com/test-org/test-repo.git",
        mockBranchName,
      );

      expect(result.url).toBe(
        `https://github.com/test-org/test-repo/tree/${mockBranchName}`,
      );
    });
  });
});
