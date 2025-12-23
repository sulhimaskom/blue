import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from "@jest/globals";
import {
  githubService,
  GitHubServiceError,
} from "@/lib/services/github-service";

// Mock the logger
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
    process.env = {
      ...originalEnv,
      GITHUB_APP_ID: "test-app-id",
      GITHUB_APP_PRIVATE_KEY: "test-private-key",
      GITHUB_ACCESS_TOKEN: "test-token",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("constructor", () => {
    it("should initialize successfully with valid credentials", () => {
      expect(githubService).toBeDefined();
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

      const result = await githubService.createRepository(mockRepoConfig);

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
        githubService.createRepository(mockRepoConfig),
      ).rejects.toThrow(GitHubServiceError);
    });
  });

  describe("verifyRepository", () => {
    it("should return true for existing repository", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 12345 }),
      } as Response);

      const result = await githubService.verifyRepository("test-org/test-repo");

      expect(result).toBe(true);
    });

    it("should return false for non-existing repository", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response);

      const result = await githubService.verifyRepository(
        "test-org/nonexistent",
      );

      expect(result).toBe(false);
    });

    it("should return false when token is missing", async () => {
      delete process.env.GITHUB_ACCESS_TOKEN;

      const result = await githubService.verifyRepository("test-org/test-repo");

      expect(result).toBe(false);
    });
  });

  describe("GitHubServiceError", () => {
    // Clear the cache to create new instances for proper testing
    let OriginalGitHubServiceError: typeof GitHubServiceError;

    beforeAll(() => {
      OriginalGitHubServiceError = GitHubServiceError;
    });

    it("should serialize to JSON correctly", () => {
      const error = new (OriginalGitHubServiceError as any)("Test error", 400, {
        detail: "Bad request",
      });

      const json = error.toJSON();

      expect(json).toEqual({
        name: "GitHubServiceError",
        message: "Test error",
        statusCode: 400,
        response: { detail: "Bad request" },
      });
    });

    it("should handle missing optional parameters", () => {
      const error = new (OriginalGitHubServiceError as any)("Simple error");

      const json = error.toJSON();

      expect(json).toEqual({
        name: "GitHubServiceError",
        message: "Simple error",
        statusCode: undefined,
        response: undefined,
      });
    });
  });
});
