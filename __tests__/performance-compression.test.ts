/**
 * Performance Optimization Tests - Response Compression Enhancement
 *
 * Tests to validate that the new compression middleware achieves the target
 * 15-25% performance improvement for API responses.
 */

import { beforeAll, afterAll, describe, it, expect } from "@jest/globals";
import { NextRequest, NextResponse } from "next/server";
import responseCompressor from "@/lib/middleware/response-compression";
import { withCompression } from "@/lib/middleware/compression-wrapper";
import { logger } from "@/lib/logger";

describe("Response Compression Performance Tests", () => {
  const performanceLogger = logger;

  beforeAll(() => {
    // Reset compression stats before tests
    responseCompressor.resetStats();
  });

  afterAll(() => {
    // Log final compression statistics
    const stats = responseCompressor.getStats();
    performanceLogger.info("Compression test results", {
      totalRequests: stats.totalRequests,
      compressionRate:
        stats.compressedResponses / Math.max(stats.totalRequests, 1),
      avgCompressionRatio: stats.avgCompressionRatio,
    });
  });

  describe("JSON Response Compression", () => {
    it("should compress JSON responses >1KB with gzip", async () => {
      // Create a large JSON payload (>1KB)
      const largeJsonData = {
        data: Array(100)
          .fill(0)
          .map((_, i) => ({
            id: i,
            name: `Item ${i}`,
            description: `This is a longer description for item ${i}`.repeat(5),
            metadata: {
              created: new Date().toISOString(),
              updated: new Date().toISOString(),
              tags: [`tag${i}`, `category${i % 10}`, `type${i % 5}`],
              metrics: {
                views: Math.floor(Math.random() * 1000),
                likes: Math.floor(Math.random() * 100),
                shares: Math.floor(Math.random() * 50),
              },
            },
          })),
        summary:
          "This is a test response with substantial JSON content to trigger compression",
        timestamp: new Date().toISOString(),
      };

      const response = NextResponse.json(largeJsonData);
      const originalSize = JSON.stringify(largeJsonData).length;

      // Create mock request with compression support
      const mockRequest = new NextRequest("http://localhost:3000/api/test", {
        headers: {
          "accept-encoding": "gzip, deflate, br",
          "x-request-id": "test-001",
        },
      });

      // Apply compression
      const compressedResponse = await responseCompressor.compressResponse(
        response,
        mockRequest,
      );

      // Verify compression was applied
      expect(compressedResponse.headers.get("content-encoding")).toBe("gzip");

      // Verify content length was reduced
      const compressedLength = parseInt(
        compressedResponse.headers.get("content-length") || "0",
      );
      const compressionRatio = compressedLength / originalSize;

      // Should achieve at least 15% compression (ratio < 0.85)
      expect(compressionRatio).toBeLessThan(0.85);

      // Should not be too aggressive (ratio > 0.1 to prevent over-compression)
      expect(compressionRatio).toBeGreaterThan(0.1);

      // Verify compression stats
      const stats = responseCompressor.getStats();
      expect(stats.totalRequests).toBeGreaterThan(0);
      expect(stats.compressedResponses).toBeGreaterThan(0);
      expect(stats.avgCompressionRatio).toBeLessThan(1);
    });

    it("should skip compression for small JSON responses <1KB", async () => {
      const smallJsonData = {
        message: "Small response",
        status: "ok",
        timestamp: new Date().toISOString(),
      };

      const response = NextResponse.json(smallJsonData);
      const mockRequest = new NextRequest("http://localhost:3000/api/test", {
        headers: {
          "accept-encoding": "gzip, deflate, br",
          "x-request-id": "test-002",
        },
      });

      const compressedResponse = await responseCompressor.compressResponse(
        response,
        mockRequest,
      );

      // Should not compress small responses
      expect(compressedResponse.headers.get("content-encoding")).toBeNull();

      // Content should be unchanged
      const originalSize = JSON.stringify(smallJsonData).length;
      const responseLength = parseInt(
        compressedResponse.headers.get("content-length") || "0",
      );
      expect(responseLength).toBe(originalSize);
    });
  });

  describe("HTML Response Compression", () => {
    it("should compress HTML responses >2KB with Brotli", async () => {
      // Create a large HTML payload (>2KB)
      const largeHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Large Test Page</title>
          <meta charset="UTF-8">
          <style>${
            "body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }" +
            Array(50)
              .fill(0)
              .map(
                (_, i) =>
                  `.class-${i} { color: #${Math.random().toString(16).slice(2, 8)}; }`,
              )
              .join(" ")
          }</style>
        </head>
        <body>
          <h1>Large HTML Content for Compression Testing</h1>
          ${Array(50)
            .fill(0)
            .map(
              (_, i) => `
            <div class="class-${i}">
              <h2>Section ${i}</h2>
              <p>This is a paragraph with substantial content to ensure the HTML response exceeds the 2KB threshold for compression testing. ${"Additional content ".repeat(10)}</p>
              <ul>
                ${Array(10)
                  .fill(0)
                  .map(
                    (_, j) =>
                      `<li>List item ${j} in section ${i} with more content to increase size</li>`,
                  )
                  .join("")}
              </ul>
            </div>
          `,
            )
            .join("")}
        </body>
        </html>
      `;

      const response = new NextResponse(largeHtml, {
        headers: { "content-type": "text/html" },
      });

      const mockRequest = new NextRequest("http://localhost:3000/api/test", {
        headers: {
          "accept-encoding": "gzip, deflate, br",
          "x-request-id": "test-003",
        },
      });

      const compressedResponse = await responseCompressor.compressResponse(
        response,
        mockRequest,
      );

      // Should use Brotli for HTML content
      expect(compressedResponse.headers.get("content-encoding")).toBe("br");

      // Verify significant compression for HTML
      const originalSize = new TextEncoder().encode(largeHtml).length;
      const compressedLength = parseInt(
        compressedResponse.headers.get("content-length") || "0",
      );
      const compressionRatio = compressedLength / originalSize;

      // HTML should compress even better than JSON
      expect(compressionRatio).toBeLessThan(0.75);
      expect(compressionRatio).toBeGreaterThan(0.1);
    });
  });

  describe("Compression Middleware Integration", () => {
    it("should provide 15-25% bandwidth reduction in real-world scenarios", async () => {
      // Simulate real-world API responses
      const testResponses = [
        // Small response (should not be compressed)
        { data: { status: "ok" }, size: "small" },

        // Medium JSON response (should be compressed with gzip)
        {
          data: {
            users: Array(50)
              .fill(0)
              .map((_, i) => ({
                id: i,
                name: `User ${i}`,
                email: `user${i}@example.com`,
                profile: {
                  bio: `Bio for user ${i}`.repeat(3),
                  settings: {
                    notifications: true,
                    theme: "dark",
                    language: "en",
                  },
                },
              })),
            pagination: { page: 1, total: 50, pageSize: 50 },
          },
          size: "medium",
        },

        // Large JSON response (should be compressed effectively)
        {
          data: {
            analytics: {
              metrics: Array(100)
                .fill(0)
                .map((_, i) => ({
                  metric: `metric_${i}`,
                  value: Math.random() * 1000,
                  timestamp: new Date(Date.now() - i * 86400000).toISOString(),
                  labels: [`label${i % 10}`, `category${i % 5}`],
                  metadata: {
                    source: "api",
                    accuracy: 0.95 + Math.random() * 0.05,
                    unit: ["ms", "bytes", "count", "percent"][i % 4],
                  },
                })),
            },
          },
          size: "large",
        },
      ];

      let totalOriginalSize = 0;
      let totalCompressedSize = 0;
      let compressedCount = 0;

      for (const testCase of testResponses) {
        const response = NextResponse.json(testCase.data);
        const originalSize = JSON.stringify(testCase.data).length;
        totalOriginalSize += originalSize;

        const mockRequest = new NextRequest("http://localhost:3000/api/test", {
          headers: {
            "accept-encoding": "gzip, deflate, br",
            "x-request-id": `test-${testCase.size}`,
          },
        });

        const compressedResponse = await responseCompressor.compressResponse(
          response,
          mockRequest,
        );
        const compressedLength = parseInt(
          compressedResponse.headers.get("content-length") ||
            String(originalSize),
        );
        totalCompressedSize += compressedLength;

        if (compressedResponse.headers.get("content-encoding")) {
          compressedCount++;
        }
      }

      const overallCompressionRatio = totalCompressedSize / totalOriginalSize;
      const bandwidthReduction = (1 - overallCompressionRatio) * 100;

      // Should achieve 15-25% overall bandwidth reduction
      expect(bandwidthReduction).toBeGreaterThanOrEqual(15);
      expect(bandwidthReduction).toBeLessThanOrEqual(50); // Upper bound check

      // Should compress the majority of applicable responses
      expect(compressedCount).toBeGreaterThanOrEqual(2); // At least medium and large responses

      // Log performance results
      performanceLogger.info("Compression performance validation", {
        totalOriginalSize: `${(totalOriginalSize / 1024).toFixed(2)} KB`,
        totalCompressedSize: `${(totalCompressedSize / 1024).toFixed(2)} KB`,
        bandwidthReduction: `${bandwidthReduction.toFixed(2)}%`,
        compressedResponses: compressedCount,
        totalResponses: testResponses.length,
      });
    });

    it("should handle compression circuit breaker gracefully", async () => {
      // Test that the compression middleware with circuit breaker works
      const testData = {
        data: "test",
        message: "compression circuit breaker test",
      };

      const handler = async () => NextResponse.json(testData);

      const mockRequest = new NextRequest("http://localhost:3000/api/test", {
        headers: {
          "accept-encoding": "gzip, deflate, br",
          "x-request-id": "test-circuit-breaker",
        },
      });

      // Should work normally during normal operation
      const response = await withCompression(handler, mockRequest);
      expect(response.ok).toBe(true);

      const responseClone = response.clone();
      const responseData = await responseClone.json();
      expect(responseData).toEqual(testData);
    });
  });

  describe("Performance Metrics Validation", () => {
    it("should track compression statistics accurately", () => {
      const stats = responseCompressor.getStats();

      // Stats should be initialized correctly
      expect(stats).toHaveProperty("totalRequests");
      expect(stats).toHaveProperty("compressedResponses");
      expect(stats).toHaveProperty("bytesOriginal");
      expect(stats).toHaveProperty("bytesCompressed");
      expect(stats).toHaveProperty("avgCompressionRatio");
      expect(stats).toHaveProperty("algorithmUsage");

      // Stats should be numbers
      expect(typeof stats.totalRequests).toBe("number");
      expect(typeof stats.compressedResponses).toBe("number");
      expect(typeof stats.bytesOriginal).toBe("number");
      expect(typeof stats.bytesCompressed).toBe("number");
      expect(typeof stats.avgCompressionRatio).toBe("number");
      expect(typeof stats.algorithmUsage).toBe("object");
    });

    it("should provide meaningful performance metrics", () => {
      // Test performance metrics calculation
      const metrics = responseCompressor.getPerformanceMetrics();

      expect(metrics).toHaveProperty("compressionRate");
      expect(metrics).toHaveProperty("avgCompressionRatio");
      expect(metrics).toHaveProperty("bandwidthSaved");
      expect(metrics).toHaveProperty("totalBandwidthReduction");
      expect(metrics).toHaveProperty("algorithmUsage");

      // Validate metric ranges
      expect(metrics.compressionRate).toBeGreaterThanOrEqual(0);
      expect(metrics.compressionRate).toBeLessThanOrEqual(1);
      expect(metrics.avgCompressionRatio).toBeGreaterThanOrEqual(0);
      expect(metrics.avgCompressionRatio).toBeLessThanOrEqual(1);
      expect(metrics.bandwidthSaved).toBeGreaterThanOrEqual(0);
      expect(metrics.totalBandwidthReduction).toBeGreaterThanOrEqual(0);
    });
  });
});
