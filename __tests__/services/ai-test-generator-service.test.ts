/**
 * AITestGeneratorService Test Suite
 *
 * @domain ai-agent-engineer
 */

import {
  AITestGeneratorService,
  getAITestGeneratorService,
  aiTestGeneratorService,
  type ServiceAnalysis,
  type TestGenerationRequest,
  type TestGenerationResult,
} from '../../lib/services/ai-test-generator-service';

describe('AITestGeneratorService', () => {
  describe('Exports', () => {
    test('should export AITestGeneratorService class', () => {
      expect(AITestGeneratorService).toBeDefined();
      expect(typeof AITestGeneratorService).toBe('function');
    });

    test('should export getAITestGeneratorService function', () => {
      expect(getAITestGeneratorService).toBeDefined();
      expect(typeof getAITestGeneratorService).toBe('function');
    });

    test('should export aiTestGeneratorService singleton instance', () => {
      expect(aiTestGeneratorService).toBeDefined();
      expect(aiTestGeneratorService).toBeInstanceOf(AITestGeneratorService);
    });

    test('should export ServiceAnalysis interface', () => {
      const analysis: ServiceAnalysis = {
        functions: [],
        imports: [],
        exports: [],
      };
      expect(analysis).toBeDefined();
    });

    test('should export TestGenerationRequest interface', () => {
      const request: TestGenerationRequest = {
        servicePath: 'test-service.ts',
        serviceName: 'test-service',
      };
      expect(request).toBeDefined();
    });

    test('should export TestGenerationResult interface', () => {
      const result: TestGenerationResult = {
        success: true,
        testContent: '',
        testFilePath: '',
      };
      expect(result).toBeDefined();
    });
  });

  describe('Singleton Pattern', () => {
    test('getAITestGeneratorService should return singleton instance', () => {
      const instance1 = getAITestGeneratorService();
      const instance2 = getAITestGeneratorService();
      expect(instance1).toBe(instance2);
    });

    test('aiTestGeneratorService should be instance of AITestGeneratorService', () => {
      expect(aiTestGeneratorService).toBeInstanceOf(AITestGeneratorService);
    });
  });

  describe('AITestGeneratorService Instance', () => {
    let service: AITestGeneratorService;

    beforeEach(() => {
      service = new AITestGeneratorService();
    });

    test('should have servicesDir property', () => {
      expect(service).toHaveProperty('servicesDir');
      expect(typeof service.servicesDir).toBe('string');
    });

    test('should have testsDir property', () => {
      expect(service).toHaveProperty('testsDir');
      expect(typeof service.testsDir).toBe('string');
    });

    test('servicesDir should point to lib/services', () => {
      expect(service.servicesDir).toContain('lib/services');
    });

    test('testsDir should point to __tests__/services', () => {
      expect(service.testsDir).toContain('__tests__/services');
    });
  });

  describe('ServiceAnalysis Type', () => {
    test('should accept valid ServiceAnalysis structure', () => {
      const analysis: ServiceAnalysis = {
        functions: [
          {
            name: 'testMethod',
            params: ['id', 'name'],
            returnType: 'string',
            isPrivate: false,
          },
        ],
        imports: ['logger', 'ValidationError'],
        exports: ['MyService'],
      };

      expect(analysis.functions.length).toBe(1);
      expect(analysis.imports.length).toBe(2);
      expect(analysis.exports.length).toBe(1);
    });

    test('should allow empty arrays', () => {
      const analysis: ServiceAnalysis = {
        functions: [],
        imports: [],
        exports: [],
      };

      expect(analysis.functions).toEqual([]);
      expect(analysis.imports).toEqual([]);
      expect(analysis.exports).toEqual([]);
    });
  });

  describe('TestGenerationRequest Type', () => {
    test('should require servicePath and serviceName', () => {
      const request: TestGenerationRequest = {
        servicePath: 'my-service.ts',
        serviceName: 'my-service',
      };

      expect(request.servicePath).toBe('my-service.ts');
      expect(request.serviceName).toBe('my-service');
    });

    test('should allow optional functions array', () => {
      const request: TestGenerationRequest = {
        servicePath: 'my-service.ts',
        serviceName: 'my-service',
        functions: ['method1', 'method2'],
      };

      expect(request.functions).toBeDefined();
      expect(request.functions?.length).toBe(2);
    });
  });

  describe('TestGenerationResult Type', () => {
    test('should have success flag', () => {
      const result: TestGenerationResult = {
        success: true,
        testContent: "describe('MyService', () => {});",
        testFilePath: '/path/to/test.test.ts',
      };

      expect(result.success).toBe(true);
    });

    test('should allow optional error field on failure', () => {
      const result: TestGenerationResult = {
        success: false,
        testContent: '',
        testFilePath: '',
        error: 'File not found',
      };

      expect(result.success).toBe(false);
      expect(result.error).toBe('File not found');
    });
  });
});
