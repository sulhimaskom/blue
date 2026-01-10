import { describe, it, expect, jest, beforeEach, afterEach } from "@jest/globals";
import { POST, GET } from "@/app/api/teams/route";
import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { teamService } from "@/lib/services/team-service";

// Mock dependencies

// Mock teamService methods
const mockTeamServiceCreateTeam = jest.fn();
const mockTeamServiceGetUserTeams = jest.fn();

jest.mock("@/lib/services/team-service", () => ({
  teamService: {
    createTeam: mockTeamServiceCreateTeam,
    getUserTeams: mockTeamServiceGetUserTeams,
  },
}));

// Mock APIRouteHandler with proper static methods
const mockCreatePOSTHandler = jest.fn();
const mockCreateGETHandler = jest.fn();

jest.mock("@/lib/services/api-route-handler", () => ({
  APIRouteHandler: {
    createPOSTHandler: mockCreatePOSTHandler,
    createGETHandler: mockCreateGETHandler,
  },
}));
jest.mock("@/lib/rate-limit-config", () => ({
  RateLimiters: {
    standard: jest.fn().mockReturnValue(() => Promise.resolve()),
    moderate: jest.fn().mockReturnValue(() => Promise.resolve()),
  },
}));

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

      mockCreatePOSTHandler.mockReturnValue(mockHandler);
      mockTeamServiceCreateTeam.mockResolvedValue(mockTeam);

      // Mock request and context
      const mockRequest = {
        url: "http://localhost:3000/api/teams",
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
       expect(mockCreatePOSTHandler).toHaveBeenCalledWith({
         requireAuth: true,
         requireCredits: 50,
         rateLimiter: expect.any(Function),
         schema: expect.any(Object), // Zod schema
         handler: expect.any(Function),
       });
     });
    });

     });

    it("should validate team name format", async () => {
      // The validation is handled by Zod schema in APIRouteHandler
      // This test ensures the schema is properly configured
      const mockHandler = jest.fn();
      mockCreatePOSTHandler.mockReturnValue(mockHandler);

      await POST({ url: "http://localhost:3000/api/teams" } as any, {} as any);

      const [config] = mockCreatePOSTHandler.mock.calls[0];
      
      expect(config.schema).toBeDefined();
      
       // Test that invalid names are caught by schema
       expect(
         config.schema.parse({ name: "" })
       ).rejects.toThrow();

       expect(
         config.schema.parse({ name: "a".padEnd(101, "a") })
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

      mockCreateGETHandler.mockReturnValue(mockHandler);
      mockTeamServiceGetUserTeams.mockResolvedValue({
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
        req: mockRequest,
        requestId: "req-1",
      };

      // Act
      await GET(mockRequest, mockContext as any);

       // Assert
       expect(mockCreateGETHandler).toHaveBeenCalledWith({
         requireAuth: true,
         rateLimiter: expect.any(Function),
         handler: expect.any(Function),
       });
    });

    it("should use default options when no parameters provided", async () => {
      // Arrange
      const mockHandler = jest.fn().mockResolvedValue({
        data: { teams: [], total: 0 },
        message: "Teams retrieved successfully",
      });

      APIRouteHandler.createGETHandler.mockReturnValue(mockHandler);
      teamService.getUserTeams.mockResolvedValue({
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
      mockCreatePOSTHandler.mockReturnValue(jest.fn());
      mockCreateGETHandler.mockReturnValue(jest.fn());

      await POST({ url: "http://localhost:3000/api/teams" } as any, {} as any);
      await GET({ url: "http://localhost:3000/api/teams" } as any, {} as any);

      expect(mockCreatePOSTHandler.mock.calls[0][0].requireAuth).toBe(true);
      expect(mockCreateGETHandler.mock.calls[0][0].requireAuth).toBe(true);
    });

    it("should require credits for team creation", async () => {
      mockCreatePOSTHandler.mockReturnValue(jest.fn());

      await POST({ url: "http://localhost:3000/api/teams" } as any, {} as any);

      expect(mockCreatePOSTHandler.mock.calls[0][0].requireCredits).toBe(50);
    });

    it("should use appropriate rate limiters", async () => {
      const { RateLimiters } = await import("@/lib/rate-limit-config");

      mockCreatePOSTHandler.mockReturnValue(jest.fn());
      mockCreateGETHandler.mockReturnValue(jest.fn());

      await POST({ url: "http://localhost:3000/api/teams" } as any, {} as any);
      await GET({ url: "http://localhost:3000/api/teams" } as any, {} as any);

      expect(RateLimiters.standard).toHaveBeenCalled();
      expect(RateLimiters.standard).toHaveBeenCalled();
    });
  });
});