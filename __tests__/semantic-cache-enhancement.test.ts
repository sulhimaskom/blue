/**
 * Enhanced Semantic Cache Key Performance Tests
 * Tests the new semantic fingerprinting features for enterprise caching
 */

import { AIPatternDetector } from "../lib/services/ai-pattern-detector";

describe("Enhanced Semantic Cache Key Generation", () => {
  describe("Semantic Signature Extraction", () => {
    test("should extract semantic signatures for marketplace patterns", () => {
      const input =
        "I want to create a marketplace where vendors can list products and buyers can browse";
      const signature = AIPatternDetector["extractSemanticSignature"](input);

      expect(signature).toBe("ecommerce-marketplace");
    });

    test("should extract semantic signatures for fintech patterns", () => {
      const input =
        "I need a payment processing system for investment banking transactions";
      const signature = AIPatternDetector["extractSemanticSignature"](input);

      expect(signature).toBe("fintech");
    });

    test("should extract semantic signatures for healthcare patterns", () => {
      const input =
        "A medical platform where patients can book doctor appointments and access health records";
      const signature = AIPatternDetector["extractSemanticSignature"](input);

      expect(signature).toBe("healthcare");
    });

    test("should extract semantic signatures for complex fintech patterns", () => {
      const input =
        "I need to build an investment platform with payment processing and banking features";
      const signature = AIPatternDetector["extractSemanticSignature"](input);

      expect(signature).toBe("fintech");
    });

    test("should extract semantic signatures for complex healthcare patterns", () => {
      const input =
        "A medical education platform where patients can access health records and students can learn";
      const signature = AIPatternDetector["extractSemanticSignature"](input);

      expect(signature).toBe("edtech-healthcare");
    });

    test("should return empty signature for unrelated content", () => {
      const input = "I want to build a simple weather app";
      const signature = AIPatternDetector["extractSemanticSignature"](input);

      expect(signature).toBe("");
    });

    test("should be case-insensitive for semantic detection", () => {
      const input1 = "E-commerce platform with CART functionality";
      const input2 = "ECOMMERCE platform with cart functionality";

      const signature1 = AIPatternDetector["extractSemanticSignature"](input1);
      const signature2 = AIPatternDetector["extractSemanticSignature"](input2);

      expect(signature1).toBe(signature2);
    });
  });

  describe("Enhanced Cache Key Generation", () => {
    test("should generate semantic-aware cache keys", () => {
      const input1 = "Create a fintech app for payment processing";
      const input2 = "Build a financial technology app for transactions";

      const cacheKey1 = AIPatternDetector.generateOptimizedCacheKey(
        "iflow",
        input1,
        "fintech",
        "fintech",
      );

      const cacheKey2 = AIPatternDetector.generateOptimizedCacheKey(
        "iflow",
        input2,
        "fintech",
        "fintech",
      );

      // Should have same base pattern due to semantic similarity
      expect(cacheKey1).toContain("fintech:");
      expect(cacheKey2).toContain("fintech:");
      expect(cacheKey1.length).toBeGreaterThan(12); // Enhanced length
      expect(cacheKey2.length).toBeGreaterThan(12); // Enhanced length
    });

    test("should handle industry context properly", () => {
      const input = "Healthcare management system";

      const cacheKeyWithoutContext =
        AIPatternDetector.generateOptimizedCacheKey(
          "iflow",
          input,
          "healthcare",
        );

      const cacheKeyWithContext = AIPatternDetector.generateOptimizedCacheKey(
        "iflow",
        input,
        "healthcare",
        "healthcare",
      );

      expect(cacheKeyWithContext).toContain("healthcare:");
      // Without context, it still shows pattern context since it's detected
      expect(cacheKeyWithoutContext).toContain("healthcare:");
      expect(cacheKeyWithContext).not.toBe(cacheKeyWithoutContext);
    });

    test("should generate unique keys for different services", () => {
      const input = "E-commerce platform analysis";
      const cacheKeyAI = AIPatternDetector.generateOptimizedCacheKey(
        "iflow",
        input,
        "ecommerce",
        "ecommerce",
      );

      const cacheKeyResearch = AIPatternDetector.generateOptimizedCacheKey(
        "tavily",
        input,
        "ecommerce",
        "ecommerce",
      );

      expect(cacheKeyAI).toMatch(/^ai-/);
      expect(cacheKeyResearch).toMatch(/^research-/);
      expect(cacheKeyAI).not.toBe(cacheKeyResearch);
    });
  });

  describe("Performance Benefits", () => {
    test("should improve cache hit rates for semantically similar requests", () => {
      const similarRequests = [
        "I want to build a marketplace for handmade goods",
        "Create a vendor platform for artisans",
        "Build a seller marketplace for crafts",
      ];

      const cacheKeys = similarRequests.map((request) =>
        AIPatternDetector.generateOptimizedCacheKey(
          "iflow",
          request,
          "marketplace",
          "ecommerce-marketplace",
        ),
      );

      // All should contain semantic markers for better grouping
      cacheKeys.forEach((key) => {
        expect(key).toContain("ecommerce-marketplace:");
        expect(key.length).toBeGreaterThan(20); // Enhanced with semantic signature
      });
    });

    test("should handle multiple semantic contexts", () => {
      const complexInput =
        "A fintech healthcare platform that processes payments for medical services";

      const cacheKey = AIPatternDetector.generateOptimizedCacheKey(
        "iflow",
        complexInput,
        "fintech",
        "fintech-healthcare",
      );

      expect(cacheKey).toContain("fintech-healthcare:");
      expect(cacheKey).toContain("ai-"); // Service prefix
    });
  });
});
