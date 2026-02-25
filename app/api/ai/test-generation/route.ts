/**
 * AI Test Generation API
 *
 * Provides endpoints for AI-powered test generation.
 *
 * @domain ai-agent-engineer
 * @author AI Agent Engineer
 * @date 2026-02-25
 */

import { z } from 'zod';
import { APIRouteHandler } from '@/lib/services/api-route-handler';
import { RateLimiters } from '@/lib/rate-limit-config';
import { AITestGeneratorService } from '@/lib/services/ai-test-generator-service';
import { ValidationError } from '@/lib/api-utils';

// Request validation schema
const generateTestSchema = z.object({
  servicePath: z.string().min(1).describe('Service file path relative to lib/services/'),
  serviceName: z.string().min(1).describe('Service name for test file'),
  functions: z.array(z.string()).optional().describe('Specific functions to test'),
});

// Singleton instance
let _testGeneratorService: AITestGeneratorService | null = null;

function getTestGeneratorService(): AITestGeneratorService {
  if (!_testGeneratorService) {
    _testGeneratorService = new AITestGeneratorService();
  }
  return _testGeneratorService;
}

/**
 * POST /api/ai/test-generation
 * Generate tests for a service
 */
export const POST = APIRouteHandler.createPOSTHandler<z.infer<typeof generateTestSchema>>({
  schema: generateTestSchema,
  requireAuth: true,
  rateLimiter: RateLimiters.moderate(),
  handler: async ({ data }) => {
    if (!data) {
      throw new ValidationError('Request body is required');
    }

    const generator = getTestGeneratorService();

    const result = await generator.generateTest({
      servicePath: data.servicePath,
      serviceName: data.serviceName,
      functions: data.functions,
    });

    return {
      success: result.success,
      testFilePath: result.testFilePath,
      error: result.error,
      // Return test content preview (truncated if too long)
      testPreview: result.success
        ? result.testContent.substring(0, 500) + (result.testContent.length > 500 ? '...' : '')
        : undefined,
    };
  },
});

/**
 * GET /api/ai/test-generation
 * List services without tests
 */
export const GET = APIRouteHandler.createGETHandler({
  requireAuth: true,
  rateLimiter: RateLimiters.standard(),
  handler: async () => {
    const generator = getTestGeneratorService();
    const untestedServices = generator.listUntestedServices();

    return {
      total: untestedServices.length,
      services: untestedServices,
    };
  },
});
