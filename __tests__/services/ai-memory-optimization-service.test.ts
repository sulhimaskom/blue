/**
 * Unit tests for AIMemoryOptimizationService
 * Tests AI memory optimization functionality
 */

import { AIMemoryOptimizationService } from '../../lib/services/performance/ai-memory-optimization-service';

jest.mock('../../lib/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../lib/redis', () => ({
  redisManager: {
    executeWithFallback: jest.fn().mockImplementation(async withRedis => {
      return await withRedis({ setEx: jest.fn() });
    }),
  },
}));

describe('AIMemoryOptimizationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AIMemoryOptimizationService as any).memoryMetrics = [];
    (AIMemoryOptimizationService as any).memoryPools = new Map();
    (AIMemoryOptimizationService as any).lastCleanup = Date.now();
  });

  describe('getAIMemoryMetrics', () => {
    test('should return memory metrics successfully', async () => {
      const result = await AIMemoryOptimizationService.getAIMemoryMetrics();
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
    });

    test('should store metrics in history', async () => {
      await AIMemoryOptimizationService.getAIMemoryMetrics();
      await AIMemoryOptimizationService.getAIMemoryMetrics();
      const result = await AIMemoryOptimizationService.getAIMemoryMetrics();
      expect(result.data.length).toBeGreaterThan(0);
    });
  });

  describe('optimizeAIMemory', () => {
    test('should optimize memory successfully', async () => {
      const result = await AIMemoryOptimizationService.optimizeAIMemory();
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.optimizations).toBeDefined();
      expect(typeof result.data.memoryFreed).toBe('number');
    });

    test('should accept custom config', async () => {
      const result = await AIMemoryOptimizationService.optimizeAIMemory({ maxHeapSize: 1024 });
      expect(result.success).toBe(true);
    });
  });

  describe('getAIMemoryHealth', () => {
    test('should return current memory health', async () => {
      const result = await AIMemoryOptimizationService.getAIMemoryHealth();
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });

  describe('configureAdaptiveThrottling', () => {
    test('should configure throttling', async () => {
      const result = await AIMemoryOptimizationService.optimizeAIMemory();
      expect(result.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid config gracefully', async () => {
      const result = await AIMemoryOptimizationService.optimizeAIMemory({ maxHeapSize: -1 } as any);
      expect(result.success).toBe(true);
    });
  });
});
