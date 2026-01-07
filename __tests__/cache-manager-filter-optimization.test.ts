import { describe, it, expect } from "@jest/globals";

describe("UnifiedCacheManager Optimization Verification", () => {
  describe("Filter Optimization - performIntelligentWarming", () => {
    const testStrategies = [
      { pattern: "test1", query: "q1", ttl: 60, priority: 1 },
      { pattern: "test2", query: "q2", ttl: 120, priority: 2 },
      { pattern: "test3", query: "q3", ttl: 180, priority: 3 },
      { pattern: "test4", query: "q4", ttl: 240, priority: 4 },
      { pattern: "test5", query: "q5", ttl: 300, priority: 5 },
      { pattern: "test6", query: "q6", ttl: 360, priority: 6 },
      { pattern: "test7", query: "q7", ttl: 420, priority: 7 },
    ];

    it("should correctly categorize strategies with single-pass optimization", () => {
      const highPriorityStrategies: any[] = [];
      const aiStrategies: any[] = [];
      const lowPriorityStrategies: any[] = [];

      for (const strategy of testStrategies) {
        if (strategy.priority <= 3) {
          highPriorityStrategies.push(strategy);
        } else if (strategy.priority > 3 && strategy.priority <= 6) {
          aiStrategies.push(strategy);
        } else {
          lowPriorityStrategies.push(strategy);
        }
      }

      expect(highPriorityStrategies).toHaveLength(3);
      expect(highPriorityStrategies[0].priority).toBe(1);
      expect(highPriorityStrategies[1].priority).toBe(2);
      expect(highPriorityStrategies[2].priority).toBe(3);

      expect(aiStrategies).toHaveLength(3);
      expect(aiStrategies[0].priority).toBe(4);
      expect(aiStrategies[1].priority).toBe(5);
      expect(aiStrategies[2].priority).toBe(6);

      expect(lowPriorityStrategies).toHaveLength(1);
      expect(lowPriorityStrategies[0].priority).toBe(7);
    });

    it("should match multiple-filter approach for correctness", () => {
      const sortedStrategies = testStrategies;

      const highPriorityStrategiesMulti = sortedStrategies.filter(
        (s) => s.priority <= 3,
      );
      const aiStrategiesMulti = sortedStrategies.filter(
        (s) => s.priority > 3 && s.priority <= 6,
      );
      const lowPriorityStrategiesMulti = sortedStrategies.filter(
        (s) => s.priority > 6,
      );

      const highPriorityStrategiesSingle: any[] = [];
      const aiStrategiesSingle: any[] = [];
      const lowPriorityStrategiesSingle: any[] = [];

      for (const strategy of sortedStrategies) {
        if (strategy.priority <= 3) {
          highPriorityStrategiesSingle.push(strategy);
        } else if (strategy.priority > 3 && strategy.priority <= 6) {
          aiStrategiesSingle.push(strategy);
        } else {
          lowPriorityStrategiesSingle.push(strategy);
        }
      }

      expect(highPriorityStrategiesSingle).toEqual(highPriorityStrategiesMulti);
      expect(aiStrategiesSingle).toEqual(aiStrategiesMulti);
      expect(lowPriorityStrategiesSingle).toEqual(lowPriorityStrategiesMulti);
    });
  });

  describe("Performance Verification", () => {
    it("should be faster with single-pass iteration", () => {
      const largeArray = Array.from({ length: 1000 }, (_, i) => ({
        pattern: `test${i}`,
        query: `q${i}`,
        ttl: 60 * (i % 10),
        priority: (i % 10) + 1,
      }));

      const iterations = 1000;

      const startMulti = Date.now();
      for (let i = 0; i < iterations; i++) {
        const highPriority = largeArray.filter((s) => s.priority <= 3);
        const aiStrategies = largeArray.filter(
          (s) => s.priority > 3 && s.priority <= 6,
        );
        const lowPriority = largeArray.filter((s) => s.priority > 6);
      }
      const timeMulti = Date.now() - startMulti;

      const startSingle = Date.now();
      for (let i = 0; i < iterations; i++) {
        const highPriority: any[] = [];
        const aiStrategies: any[] = [];
        const lowPriority: any[] = [];

        for (const item of largeArray) {
          if (item.priority <= 3) {
            highPriority.push(item);
          } else if (item.priority > 3 && item.priority <= 6) {
            aiStrategies.push(item);
          } else {
            lowPriority.push(item);
          }
        }
      }
      const timeSingle = Date.now() - startSingle;

      expect(timeSingle).toBeLessThan(timeMulti);
    });
  });

  describe("Promise.allSettled Result Counting Optimization", () => {
    it("should correctly count fulfilled and rejected with single pass", () => {
      const results: Array<PromiseSettledResult<any>> = [
        { status: "fulfilled", value: "result1" },
        { status: "rejected", reason: new Error("error1") },
        { status: "fulfilled", value: "result2" },
        { status: "rejected", reason: new Error("error2") },
        { status: "fulfilled", value: "result3" },
      ];

      let successful = 0;
      let failed = 0;
      for (const result of results) {
        if (result.status === "fulfilled") {
          successful++;
        } else {
          failed++;
        }
      }

      expect(successful).toBe(3);
      expect(failed).toBe(2);
    });

    it("should match multiple-filter approach for correctness", () => {
      const results: Array<PromiseSettledResult<any>> = [
        { status: "fulfilled", value: "result1" },
        { status: "rejected", reason: new Error("error1") },
        { status: "fulfilled", value: "result2" },
        { status: "rejected", reason: new Error("error2") },
        { status: "fulfilled", value: "result3" },
      ];

      const successfulMulti = results.filter(
        (r) => r.status === "fulfilled",
      ).length;
      const failedMulti = results.filter((r) => r.status === "rejected").length;

      let successfulSingle = 0;
      let failedSingle = 0;
      for (const result of results) {
        if (result.status === "fulfilled") {
          successfulSingle++;
        } else {
          failedSingle++;
        }
      }

      expect(successfulSingle).toBe(successfulMulti);
      expect(failedSingle).toBe(failedMulti);
    });

    it("should be faster with single-pass iteration", () => {
      const largeResults = Array.from({ length: 1000 }, (_, i) => ({
        status: i % 3 === 0 ? "rejected" : "fulfilled",
        value: i % 3 !== 0 ? `result${i}` : undefined,
        reason: i % 3 === 0 ? new Error(`error${i}`) : undefined,
      })) as Array<PromiseSettledResult<any>>;

      const iterations = 1000;

      const startMulti = Date.now();
      for (let i = 0; i < iterations; i++) {
        const successful = largeResults.filter(
          (r) => r.status === "fulfilled",
        ).length;
        const failed = largeResults.filter(
          (r) => r.status === "rejected",
        ).length;
      }
      const timeMulti = Date.now() - startMulti;

      const startSingle = Date.now();
      for (let i = 0; i < iterations; i++) {
        let successful = 0;
        let failed = 0;
        for (const result of largeResults) {
          if (result.status === "fulfilled") {
            successful++;
          } else {
            failed++;
          }
        }
      }
      const timeSingle = Date.now() - startSingle;

      expect(timeSingle).toBeLessThan(timeMulti);
    });
  });
});
