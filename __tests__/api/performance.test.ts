import { GET } from "@/app/api/performance/route";
import { NextRequest } from "next/server";

// Mock monitoring service
jest.mock("@/lib/monitoring", () => ({
  monitoringService: {
    getPerformanceMetrics: jest.fn(),
    trackApiRequest: jest.fn(),
    trackError: jest.fn(),
    trackAPICall: jest.fn(),
    trackGitHubOperation: jest.fn(),
  },
}));

// Mock performance monitor
jest.mock("@/lib/db/performance-monitor", () => ({
  DatabasePerformanceMonitor: {
    getInstance: jest.fn(() => ({
      getMetrics: jest.fn(),
      getHealthStatus: jest.fn(),
      generateRecommendations: jest.fn(),
    })),
  },
}));

// Mock redis config
jest.mock("@/lib/redis-config", () => ({
  getRedisConfig: jest.fn(() => ({
    url: process.env.REDIS_URL || null,
    enabled: !!process.env.REDIS_URL,
  })),
}));

describe("Performance API - Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/performance", () => {
    it("should return comprehensive performance metrics", async () => {
      const { monitoringService } = require("@/lib/monitoring");
      const {
        DatabasePerformanceMonitor,
      } = require("@/lib/db/performance-monitor");
      const { getRedisConfig } = require("@/lib/redis-config");

      // Mock healthy performance metrics
      monitoringService.getPerformanceMetrics.mockResolvedValue({
        api: {
          averageResponseTime: 120,
          requestsPerSecond: 25,
          errorRate: 0.02,
          uptime: 3600,
        },
        system: {
          cpuUsage: 45,
          memoryUsage: 60,
          diskUsage: 30,
        },
      });

      const dbMonitor = DatabasePerformanceMonitor.getInstance();
      dbMonitor.getMetrics.mockReturnValue({
        queryLatency: {
          p50: 50,
          p95: 120,
          p99: 200,
        },
        connectionPool: {
          active: 8,
          idle: 12,
          total: 20,
        },
        cacheHitRate: 0.85,
      });

      dbMonitor.getHealthStatus.mockReturnValue("healthy");
      dbMonitor.generateRecommendations.mockReturnValue([
        "Consider increasing connection pool size",
        "Index optimization may improve query performance",
      ]);

      getRedisConfig.mockReturnValue({
        url: "redis://localhost:6379",
        enabled: true,
      });

      const request = new NextRequest("http://localhost:3000/api/performance");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.timestamp).toBeDefined();

      // API performance metrics
      expect(data.data.metrics.api.averageResponseTime).toBe(120);
      expect(data.data.metrics.api.requestsPerSecond).toBe(25);
      expect(data.data.metrics.api.errorRate).toBe(0.02);
      expect(data.data.metrics.api.uptime).toBe(3600);

      // System metrics
      expect(data.data.metrics.system.cpuUsage).toBe(45);
      expect(data.data.metrics.system.memoryUsage).toBe(60);
      expect(data.data.metrics.system.diskUsage).toBe(30);

      // Database metrics
      expect(data.data.metrics.database.queryLatency.p95).toBe(120);
      expect(data.data.metrics.database.connectionPool.active).toBe(8);
      expect(data.data.metrics.database.cacheHitRate).toBe(0.85);

      // Health status
      expect(data.data.health.overall).toBe("healthy");
      expect(data.data.health.database).toBe("healthy");

      // Recommendations
      expect(Array.isArray(data.data.recommendations)).toBe(true);
      expect(data.data.recommendations.length).toBeGreaterThan(0);
    });

    it("should handle degraded performance gracefully", async () => {
      const { monitoringService } = require("@/lib/monitoring");
      const {
        DatabasePerformanceMonitor,
      } = require("@/lib/db/performance-monitor");

      // Mock degraded performance
      monitoringService.getPerformanceMetrics.mockResolvedValue({
        api: {
          averageResponseTime: 800, // High response time
          requestsPerSecond: 50,
          errorRate: 0.08, // High error rate
          uptime: 3600,
        },
        system: {
          cpuUsage: 85, // High CPU
          memoryUsage: 90, // High memory
          diskUsage: 75, // High disk usage
        },
      });

      const dbMonitor = DatabasePerformanceMonitor.getInstance();
      dbMonitor.getMetrics.mockReturnValue({
        queryLatency: {
          p50: 200,
          p95: 800, // Slow queries
          p99: 1500,
        },
        connectionPool: {
          active: 18, // High connection usage
          idle: 2,
          total: 20,
        },
        cacheHitRate: 0.45, // Low cache hit rate
      });

      dbMonitor.getHealthStatus.mockReturnValue("degraded");
      dbMonitor.generateRecommendations.mockReturnValue([
        "URGENT: Scale database connections immediately",
        "Optimize slow queries with proper indexing",
        "Consider horizontal scaling",
      ]);

      const request = new NextRequest("http://localhost:3000/api/performance");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200); // Still returns 200 for monitoring endpoints
      expect(data.success).toBe(true);

      // Health should indicate degraded status
      expect(data.data.health.overall).toBe("degraded");

      // Should have more urgent recommendations
      const urgentRecs = data.data.recommendations.filter(
        (r: string) => r.includes("URGENT") || r.includes("immediately"),
      );
      expect(urgentRecs.length).toBeGreaterThan(0);
    });

    it("should handle Redis unavailability gracefully", async () => {
      const { monitoringService } = require("@/lib/monitoring");
      const {
        DatabasePerformanceMonitor,
      } = require("@/lib/db/performance-monitor");
      const { getRedisConfig } = require("@/lib/redis-config");

      // Mock service responses
      monitoringService.getPerformanceMetrics.mockResolvedValue({
        api: {
          averageResponseTime: 150,
          requestsPerSecond: 20,
          errorRate: 0.01,
          uptime: 3600,
        },
        system: { cpuUsage: 40, memoryUsage: 55, diskUsage: 25 },
      });

      const dbMonitor = DatabasePerformanceMonitor.getInstance();
      dbMonitor.getMetrics.mockReturnValue({
        queryLatency: { p50: 60, p95: 140, p99: 220 },
        connectionPool: { active: 6, idle: 14, total: 20 },
        cacheHitRate: 0.0, // No cache available
      });

      dbMonitor.getHealthStatus.mockReturnValue("healthy");
      dbMonitor.generateRecommendations.mockReturnValue([
        "Redis not available - missing caching benefits",
        "Consider enabling Redis for improved performance",
      ]);

      // Mock Redis unavailable
      getRedisConfig.mockReturnValue({
        url: null,
        enabled: false,
      });

      const request = new NextRequest(
        "http://localhost:3000/api/performance?detailed=true",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Should indicate Redis is disabled
      expect(data.data.cache.enabled).toBe(false);

      // Should provide Redis-related recommendations
      const redisRecs = data.data.recommendations.filter((r: string) =>
        r.toLowerCase().includes("redis"),
      );
      expect(redisRecs.length).toBeGreaterThan(0);
    });

    it("should validate query parameters", async () => {
      const { monitoringService } = require("@/lib/monitoring");
      const {
        DatabasePerformanceMonitor,
      } = require("@/lib/db/performance-monitor");

      // Mock successful responses
      monitoringService.getPerformanceMetrics.mockResolvedValue({
        api: {
          averageResponseTime: 120,
          requestsPerSecond: 25,
          errorRate: 0.02,
          uptime: 3600,
        },
        system: { cpuUsage: 45, memoryUsage: 60, diskUsage: 30 },
      });

      const dbMonitor = DatabasePerformanceMonitor.getInstance();
      dbMonitor.getMetrics.mockReturnValue({
        queryLatency: { p50: 50, p95: 120, p99: 200 },
        connectionPool: { active: 8, idle: 12, total: 20 },
        cacheHitRate: 0.85,
      });

      dbMonitor.getHealthStatus.mockReturnValue("healthy");

      // Test with minimal details (default)
      let request = new NextRequest(
        "http://localhost:3000/api/performance?details=minimal",
      );
      let response = await GET(request);
      let data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.metrics.api).toBeDefined();

      // With minimal details, should not include recommendations
      expect(data.data.recommendations).toBeUndefined();

      // Test with full details
      request = new NextRequest(
        "http://localhost:3000/api/performance?details=all",
      );
      response = await GET(request);
      data = await response.json();

      expect(response.status).toBe(200);

      // With full details, should include comprehensive data
      expect(data.data.recommendations).toBeDefined();
      expect(Array.isArray(data.data.recommendations)).toBe(true);
    });

    it("should handle service errors gracefully", async () => {
      const { monitoringService } = require("@/lib/monitoring");

      // Mock service failure
      monitoringService.getPerformanceMetrics.mockRejectedValue(
        new Error("Performance monitoring service unavailable"),
      );

      const request = new NextRequest("http://localhost:3000/api/performance");
      const response = await GET(request);
      const data = await response.json();

      // Should handle error gracefully with appropriate status
      expect(response.status).toBe(503);
      expect(data.success).toBe(false);
      expect(data.error).toContain(
        "Performance monitoring service unavailable",
      );
    });

    it("should support conditional requests with ETag", async () => {
      const { monitoringService } = require("@/lib/monitoring");
      const {
        DatabasePerformanceMonitor,
      } = require("@/lib/db/performance-monitor");

      // Mock responses
      monitoringService.getPerformanceMetrics.mockResolvedValue({
        api: {
          averageResponseTime: 120,
          requestsPerSecond: 25,
          errorRate: 0.02,
          uptime: 3600,
        },
        system: { cpuUsage: 45, memoryUsage: 60, diskUsage: 30 },
      });

      const dbMonitor = DatabasePerformanceMonitor.getInstance();
      dbMonitor.getMetrics.mockReturnValue({
        queryLatency: { p50: 50, p95: 120, p99: 200 },
        connectionPool: { active: 8, idle: 12, total: 20 },
        cacheHitRate: 0.85,
      });

      dbMonitor.getHealthStatus.mockReturnValue("healthy");

      // First request to get ETag
      const request1 = new NextRequest("http://localhost:3000/api/performance");
      const response1 = await GET(request1);

      expect(response1.headers.get("etag")).toBeDefined();

      // Second request with matching ETag
      const etag = response1.headers.get("etag");
      const request2 = new NextRequest(
        "http://localhost:3000/api/performance",
        {
          headers: { "if-none-match": etag || "" },
        },
      );
      const response2 = await GET(request2);

      // Should return 304 Not Modified
      expect(response2.status).toBe(304);
    });
  });
});
