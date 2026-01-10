import { describe, it, expect, jest, beforeEach, afterEach } from "@jest/globals";
import { POST, GET } from "@/app/api/teams/route";
import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { teamService } from "@/lib/services/team-service";

// Mock dependencies
jest.mock("@/lib/services/team-service");
jest.mock("@/lib/services/api-route-handler");
jest.mock("@/lib/rate-limit-config", () => ({
  RateLimiters: {
    standard: jest.fn().mockReturnValue(() => Promise.resolve()),
    moderate: jest.fn().mockReturnValue(() => Promise.resolve()),
  },
}));

describe("Teams API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe("POST /api/teams", () => {
    it("should create a team successfully", async () => {
      // Arrange
      const mockTeam = {
        id: "team-1",
        name: "Test Team",
        ownerId: 1,
        subscriptionTier: "pro",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      const mockHandler = jest.fn().mockResolvedValue({
        data: mockTeam,
        message: "Team created successfully",
      });

      jest.mocked(APIRouteHandler).createPOSTHandler = (mockHandler);
      jest.mocked(teamService).createTeam = (mockTeam);

      // Mock request and context
      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          name: "Test Team",
          subscriptionTier: "pro",
        }),
      } as any;

      const mockUser = { id: 1, email: "test@example.com" };
      const mockContext = {
        validatedData: {
          name: "Test Team",
          subscriptionTier: "pro",
        },
        user: mockUser,
        request: mockRequest,
        requestId: "req-1",
      };

      // Act
      await POST(mockRequest, mockContext as any);

      // Assert
      expect(APIRouteHandler.createPOSTHandler).toHaveBeenCalledWith({
        requireAuth: true,
        requireCredits: 50,
        rateLimiter: expect.any(Function),
        schema: expect.any(Object), // Zod schema
        handler: expect.any(Function),
      });

      // Test the handler function directly
      const handlerArg = (jest.mocked(APIRouteHandler) as any).createPOSTHandler.mock.calls[0][0];
      const handler = handlerArg.handler;
      const result = await handler(mockContext as any);

      expect(result).toEqual({
        data: mockTeam,
        message: "Team created successfully",
      });
    });

    it("should validate team name format", async () => {
      // The validation is handled by Zod schema in APIRouteHandler
      // This test ensures the schema is properly configured
      const mockHandler = jest.fn();
      jest.mocked(APIRouteHandler).createPOSTHandler = (mockHandler);

      await POST({} as any, {} as any);

      const [config] = (jest.mocked(APIRouteHandler) as any).createPOSTHandler.mock.calls[0];
      
      expect(config.schema).toBeDefined();
      
      // Test that invalid names are caught by schema
      expect(
        config.schema.parse({ name: "" })
      ).rejects.toThrow();

      expect(
        config.schema.parse({ name: "a".repeat(101) })
      ).rejects.toThrow();
    });
  });

  describe("GET /api/teams", () => {
    it("should get user teams with options", async () => {
      // Arrange
      const mockTeams = [
        {
          id: "team-1",
          name: "Test Team",
          memberCount: 3,
        },
      ];

      const mockHandler = jest.fn().mockResolvedValue({
        data: { teams: mockTeams, total: 1 },
        message: "Teams retrieved successfully",
      });

      jest.mocked(APIRouteHandler).createGETHandler = (mockHandler);
      jest.mocked(teamService).getUserTeams = ({
        teams: mockTeams,
        total: 1,
      });

      // Mock request and context
      const mockRequest = {
        url: "http://localhost:3000/api/teams?limit=10&offset=0&search=test",
      } as any;

      const mockUser = { id: 1, email: "test@example.com" };
      const mockContext = {
        user: mockUser,
        request: mockRequest,
        requestId: "req-1",
        searchParams: new URLSearchParams("limit=10&offset=0&search=test"),
      };

      // Act
      await GET(mockRequest, mockContext as any);

      // Assert
      expect(APIRouteHandler.createGETHandler).toHaveBeenCalledWith({
        requireAuth: true,
        rateLimiter: expect.any(Function),
        handler: expect.any(Function),
      });

      // Test the handler function directly
      const handlerArg = (jest.mocked(APIRouteHandler) as any).createGETHandler.mock.calls[0][0];
      const handler = handlerArg.handler;
      const result = await handler(mockContext as any);

      expect(teamService.getUserTeams).toHaveBeenCalledWith(1, {
        limit: 10,
        offset: 0,
        search: "test",
      });

      expect(result).toEqual({
        data: { teams: mockTeams, total: 1 },
        message: "Teams retrieved successfully",
      });
    });

    it("should use default options when no parameters provided", async () => {
      // Arrange
      const mockHandler = jest.fn().mockResolvedValue({
        data: { teams: [], total: 0 },
        message: "Teams retrieved successfully",
      });

      jest.mocked(APIRouteHandler).createGETHandler = (mockHandler);
      jest.mocked(teamService).getUserTeams = ({
        teams: [],
        total: 0,
      });

      // Mock request and context
      const mockRequest = {
        url: "http://localhost:3000/api/teams",
      } as any;

      const mockUser = { id: 1, email: "test@example.com" };
      const mockContext = {
        user: mockUser,
        request: mockRequest,
        requestId: "req-1",
        searchParams: new URLSearchParams(),
      };

      // Act
      await GET(mockRequest, mockContext as any);

      // Assert
      expect(teamService.getUserTeams).toHaveBeenCalledWith(1, {});
    });
  });

  describe("API configuration", () => {
    it("should require authentication for all endpoints", async () => {
      jest.mocked(APIRouteHandler).createPOSTHandler = (jest.fn());
      jest.mocked(APIRouteHandler).createGETHandler = (jest.fn());

      await POST({} as any, {} as any);
      await GET({} as any, {} as any);

      expect((jest.mocked(APIRouteHandler) as any).createPOSTHandler.mock.calls[0][0].requireAuth).toBe(true);
      expect((jest.mocked(APIRouteHandler) as any).createGETHandler.mock.calls[0][0].requireAuth).toBe(true);
    });

    it("should require credits for team creation", async () => {
      jest.mocked(APIRouteHandler).createPOSTHandler = (jest.fn());
      
      await POST({} as any, {} as any);

      expect((jest.mocked(APIRouteHandler) as any).createPOSTHandler.mock.calls[0][0].requireCredits).toBe(50);
    });

    it("should use appropriate rate limiters", async () => {
      const { RateLimiters } = await import("@/lib/rate-limit-config");
      
      jest.mocked(APIRouteHandler).createPOSTHandler = (jest.fn());
      jest.mocked(APIRouteHandler).createGETHandler = (jest.fn());

      await POST({} as any, {} as any);
      await GET({} as any, {} as any);

      expect(RateLimiters.standard).toHaveBeenCalled();
      expect(RateLimiters.standard).toHaveBeenCalled();
    });
  });
});