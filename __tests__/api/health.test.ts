import { GET, HEAD } from "@/app/api/health/route";
import { NextRequest } from "next/server";

// Mock monitoring service directly
jest.mock("@/lib/monitoring", () => ({
  monitoringService: {
    getSystemHealth: jest.fn(),
    trackApiRequest: jest.fn(),
    trackError: jest.fn(),
    trackAPICall: jest.fn(),
    trackGitHubOperation: jest.fn(),
  },
}));

// Mock API metrics service
jest.mock("@/lib/services/api-metrics-service", () => ({
  APIMetricsService: {
    getApplicationHealthChecks: jest.fn(),
    calculateOverallSystemStatus: jest.fn(),
  },
}));

// Mock cache orchestrator
jest.mock("@/lib/services/cache/cache-orchestrator.service", () => ({
  CacheOrchestratorService: {
    withCache: jest.fn(),
  },
}));

describe("Health API - Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/health", () => {
    it("should return healthy status for functioning system", async () => {
      const { monitoringService } = require("@/lib/monitoring");
      const {
        APIMetricsService,
      } = require("@/lib/services/api-metrics-service");
      const {
        UnifiedCacheManager,
      } = require("@/lib/services/unified-cache-manager");

      // Mock healthy system response
      monitoringService.getSystemHealth.mockResolvedValue({
        status: "healthy",
        uptime: 3600,
        checks: [
          { service: "database", status: "healthy", responseTime: 5 },
          { service: "redis", status: "healthy", responseTime: 2 },
        ],
      });

      APIMetricsService.getApplicationHealthChecks.mockReturnValue({
        "api-endpoints": { service: "api-endpoints", status: "healthy" },
        database: { service: "database", status: "healthy" },
      });

      APIMetricsService.calculateOverallSystemStatus.mockReturnValue("healthy");

      UnifiedCacheManager.withCache.mockImplementation((req, handler) => {
        return handler();
      });

      const request = new NextRequest("http://localhost:3000/api/health");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.status).toBe("healthy");
      expect(data.data.uptime).toBe(3600);
      expect(data.data.version).toBeDefined();
      expect(data.data.environment).toBeDefined();
      expect(data.data.timestamp).toBeDefined();
    });

    it("should return 503 for unhealthy system", async () => {
      const { monitoringService } = require("@/lib/monitoring");
      const {
        APIMetricsService,
      } = require("@/lib/services/api-metrics-service");
      const {
        UnifiedCacheManager,
      } = require("@/lib/services/unified-cache-manager");

      monitoringService.getSystemHealth.mockResolvedValue({
        status: "unhealthy",
        uptime: 100,
        checks: [
          {
            service: "database",
            status: "unhealthy",
            error: "Connection timeout",
          },
        ],
      });

      APIMetricsService.getApplicationHealthChecks.mockReturnValue({
        database: { service: "database", status: "unhealthy" },
      });

      APIMetricsService.calculateOverallSystemStatus.mockReturnValue(
        "unhealthy",
      );

      UnifiedCacheManager.withCache.mockImplementation((req, handler) => {
        return handler();
      });

      const request = new NextRequest("http://localhost:3000/api/health");
      const response = await GET(request);

      expect(response.status).toBe(503);
    });

    it("should include detailed checks when requested", async () => {
      const { monitoringService } = require("@/lib/monitoring");
      const {
        APIMetricsService,
      } = require("@/lib/services/api-metrics-service");
      const {
        UnifiedCacheManager,
      } = require("@/lib/services/unified-cache-manager");

      monitoringService.getSystemHealth.mockResolvedValue({
        status: "healthy",
        uptime: 3600,
        checks: [
          {
            service: "database",
            status: "healthy",
            responseTime: 5,
            connections: 8,
            maxConnections: 20,
            lastCheck: new Date().toISOString(),
          },
        ],
      });

      APIMetricsService.getApplicationHealthChecks.mockReturnValue({
        database: { service: "database", status: "healthy" },
      });

      APIMetricsService.calculateOverallSystemStatus.mockReturnValue("healthy");

      UnifiedCacheManager.withCache.mockImplementation((req, handler) => {
        return handler();
      });

      const request = new NextRequest(
        "http://localhost:3000/api/health?detailed=true",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.checks[0]).toHaveProperty("connections");
      expect(data.data.checks[0]).toHaveProperty("maxConnections");
    });
  });

  describe("HEAD /api/health", () => {
    it("should return 200 for healthy system", async () => {
      const { monitoringService } = require("@/lib/monitoring");

      monitoringService.getSystemHealth.mockResolvedValue({
        status: "healthy",
        uptime: 3600,
        checks: [],
      });

      const response = await HEAD();

      expect(response.status).toBe(200);
    });

    it("should return 503 for unhealthy system", async () => {
      const { monitoringService } = require("@/lib/monitoring");

      monitoringService.getSystemHealth.mockResolvedValue({
        status: "unhealthy",
        uptime: 100,
        checks: [],
      });

      const response = await HEAD();

      expect(response.status).toBe(503);
    });
  });
});
