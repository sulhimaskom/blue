/**
 * Simple compression test to verify the middleware works
 */

import { describe, it, expect } from "@jest/globals";
import responseCompressor from "@/lib/middleware/response-compression";

describe("Compression Middleware Basic Tests", () => {
  describe("ResponseCompressor", () => {
    it("should initialize correctly", () => {
      const stats = responseCompressor.getStats();
      expect(stats).toHaveProperty("totalRequests");
      expect(stats).toHaveProperty("compressedResponses");
      expect(stats).toHaveProperty("bytesOriginal");
      expect(stats).toHaveProperty("bytesCompressed");
      expect(stats).toHaveProperty("avgCompressionRatio");
      expect(stats).toHaveProperty("algorithmUsage");
    });

    it("should provide performance metrics", () => {
      const metrics = responseCompressor.getPerformanceMetrics();
      expect(metrics).toHaveProperty("compressionRate");
      expect(metrics).toHaveProperty("avgCompressionRatio");
      expect(metrics).toHaveProperty("bandwidthSaved");
      expect(metrics).toHaveProperty("totalBandwidthReduction");
      expect(metrics).toHaveProperty("algorithmUsage");

      // Should be initialized with zero values
      expect(metrics.compressionRate).toBe(0);
      expect(metrics.avgCompressionRatio).toBe(0);
      expect(metrics.bandwidthSaved).toBe(0);
      expect(metrics.totalBandwidthReduction).toBe(0);
    });

    it("should reset statistics correctly", () => {
      // First set some initial state
      const initialStats = responseCompressor.getStats();
      responseCompressor.resetStats();

      // Verify reset worked
      const resetStats = responseCompressor.getStats();
      expect(resetStats.totalRequests).toBe(0);
      expect(resetStats.compressedResponses).toBe(0);
      expect(resetStats.bytesOriginal).toBe(0);
      expect(resetStats.bytesCompressed).toBe(0);
      expect(resetStats.avgCompressionRatio).toBe(0);
    });
  });
});
