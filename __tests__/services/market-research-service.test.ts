/**
 * Market Research Service Tests
 *
 * @domain ai-agent-engineer
 * @date 2026-02-26
 * @author AI Agent Engineer
 *
 * Tests for the MarketResearchService which provides comprehensive
 * market analysis for software ideas using AI-powered research tools
 * and pattern recognition.
 */

import {
  marketResearchService,
  MarketResearchRequest,
} from '../../lib/services/market-research-service';
import { aiService, ResearchResult } from '../../lib/services/ai-service';
import { UnifiedCacheManager } from '../../lib/services/cache-orchestrator';

// Mock dependencies
jest.mock('../../lib/services/ai-service');
jest.mock('../../lib/services/cache-orchestrator');
jest.mock('../../lib/logger');

describe('MarketResearchService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('analyzeInputPatterns', () => {
    test('should identify marketplace pattern', () => {
      const input = 'I want to build a marketplace platform';
      const patterns = marketResearchService.analyzeInputPatterns(input);

      expect(patterns).toContain('marketplace');
    });

    test('should identify ecommerce pattern', () => {
      const input = 'create an online shop for selling products';
      const patterns = marketResearchService.analyzeInputPatterns(input);

      expect(patterns).toContain('ecommerce');
    });

    test('should identify social pattern', () => {
      const input = 'social community platform for users';
      const patterns = marketResearchService.analyzeInputPatterns(input);

      expect(patterns).toContain('social');
    });

    test('should identify dashboard pattern', () => {
      const input = 'analytics dashboard for business metrics';
      const patterns = marketResearchService.analyzeInputPatterns(input);

      expect(patterns).toContain('dashboard');
    });

    test('should identify api-service pattern', () => {
      const input = 'REST API service for mobile app';
      const patterns = marketResearchService.analyzeInputPatterns(input);

      expect(patterns).toContain('api-service');
    });

    test('should return generic for unrecognized input', () => {
      const input = 'some random application idea';
      const patterns = marketResearchService.analyzeInputPatterns(input);

      expect(patterns).toEqual(['generic']);
    });

    test('should identify multiple patterns', () => {
      const input = 'marketplace with analytics dashboard and social features';
      const patterns = marketResearchService.analyzeInputPatterns(input);

      expect(patterns).toContain('marketplace');
      expect(patterns).toContain('dashboard');
      expect(patterns).toContain('social');
    });

    test('should be case insensitive', () => {
      const input = 'MARKETPLACE platform for ECOMMERCE';
      const patterns = marketResearchService.analyzeInputPatterns(input);

      expect(patterns).toContain('marketplace');
      expect(patterns).toContain('ecommerce');
    });

    test('should handle empty input', () => {
      const input = '';
      const patterns = marketResearchService.analyzeInputPatterns(input);

      expect(patterns).toEqual(['generic']);
    });
  });

  describe('warmupBlueprintCache', () => {
    test('should call warmupPatternCache with identified patterns', async () => {
      const input = 'marketplace platform';
      const mockPatterns = ['marketplace'];

      (UnifiedCacheManager.warmupPatternCache as jest.Mock).mockResolvedValue(undefined);

      await marketResearchService.warmupBlueprintCache(input);

      expect(UnifiedCacheManager.warmupPatternCache).toHaveBeenCalledWith(mockPatterns);
    });

    test('should handle cache warmup failure gracefully', async () => {
      const input = 'test input';

      (UnifiedCacheManager.warmupPatternCache as jest.Mock).mockRejectedValue(
        new Error('Cache error')
      );

      // Should not throw
      await expect(marketResearchService.warmupBlueprintCache(input)).resolves.not.toThrow();
    });

    test('should use analyzeInputPatterns for pattern detection', async () => {
      const input = 'ecommerce shop';
      const spy = jest.spyOn(marketResearchService as any, 'analyzeInputPatterns');

      (UnifiedCacheManager.warmupPatternCache as jest.Mock).mockResolvedValue(undefined);

      await marketResearchService.warmupBlueprintCache(input);

      expect(spy).toHaveBeenCalledWith(input);
      spy.mockRestore();
    });
  });

  describe('conductMarketResearch', () => {
    const mockResearchResult: ResearchResult = {
      query: 'test query',
      answer: 'Test market analysis answer',
      results: [
        {
          title: 'Competitor 1',
          url: 'https://example.com',
          content: 'Competitor analysis content',
          score: 0.95,
        },
        {
          title: 'Competitor 2',
          url: 'https://example2.com',
          content: 'Another competitor',
          score: 0.85,
        },
      ],
      images: [],
      relatedQueries: [],
    };

    test('should conduct market research successfully', async () => {
      const request: MarketResearchRequest = {
        input: 'marketplace platform',
        maxResults: 10,
      };

      (aiService.conductResearch as jest.Mock).mockResolvedValue(mockResearchResult);

      const result = await marketResearchService.conductMarketResearch(request);

      expect(result.research).toEqual(mockResearchResult);
      expect(result.patterns).toContain('marketplace');
    });

    test('should use default maxResults when not specified', async () => {
      const request: MarketResearchRequest = {
        input: 'test input',
      };

      (aiService.conductResearch as jest.Mock).mockResolvedValue(mockResearchResult);

      await marketResearchService.conductMarketResearch(request);

      expect(aiService.conductResearch).toHaveBeenCalledWith(
        expect.objectContaining({
          maxResults: 15, // default value
        })
      );
    });

    test('should use custom maxResults when specified', async () => {
      const request: MarketResearchRequest = {
        input: 'test input',
        maxResults: 25,
      };

      (aiService.conductResearch as jest.Mock).mockResolvedValue(mockResearchResult);

      await marketResearchService.conductMarketResearch(request);

      expect(aiService.conductResearch).toHaveBeenCalledWith(
        expect.objectContaining({
          maxResults: 25,
        })
      );
    });

    test('should enhance query with market analysis context', async () => {
      const request: MarketResearchRequest = {
        input: 'my startup idea',
      };

      (aiService.conductResearch as jest.Mock).mockResolvedValue(mockResearchResult);

      await marketResearchService.conductMarketResearch(request);

      expect(aiService.conductResearch).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.stringContaining('Market analysis for: my startup idea'),
        })
      );
    });

    test('should propagate research errors', async () => {
      const request: MarketResearchRequest = {
        input: 'test input',
      };

      (aiService.conductResearch as jest.Mock).mockRejectedValue(new Error('AI service error'));

      await expect(marketResearchService.conductMarketResearch(request)).rejects.toThrow(
        'AI service error'
      );
    });

    test('should return patterns along with research results', async () => {
      const request: MarketResearchRequest = {
        input: 'ecommerce shop with analytics',
      };

      (aiService.conductResearch as jest.Mock).mockResolvedValue(mockResearchResult);

      const result = await marketResearchService.conductMarketResearch(request);

      expect(result.patterns).toContain('ecommerce');
      expect(result.patterns).toContain('dashboard');
    });
  });
});
