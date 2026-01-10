import {
  AIProviderStrategy,
  AIProviderConfig,
} from "../lib/services/ai/ai-provider-strategy";
import {
  IFlowStrategy,
  createIFlowStrategy,
} from "../lib/services/ai/strategies/iflow-strategy";
import {
  OpenAIStrategy,
  createOpenAIStrategy,
} from "../lib/services/ai/strategies/openai-strategy";
import { AIProviderRegistry } from "../lib/services/ai/ai-provider-registry";

import type {
  AICompletionRequest,
  ResearchRequest,
} from "../lib/services/service-types";

describe("AI Provider Strategy Pattern", () => {
  describe("IFlowStrategy", () => {
    let strategy: IFlowStrategy;

    beforeEach(() => {
      strategy = createIFlowStrategy({
        apiKey: "test-key",
        baseUrl: "https://test.api.com",
      });
    });

    describe("Strategy Interface Compliance", () => {
      test("should implement AIProviderStrategy interface", () => {
        expect(strategy).toHaveProperty("providerId");
        expect(strategy).toHaveProperty("providerName");
        expect(strategy).toHaveProperty("supportedModels");
        expect(strategy).toHaveProperty("supportsModel");
        expect(strategy).toHaveProperty("getModel");
        expect(strategy).toHaveProperty("generateCompletion");
        expect(strategy).toHaveProperty("conductResearch");
        expect(strategy).toHaveProperty("healthCheck");
        expect(strategy).toHaveProperty("getConfig");
      });

      test("should have unique provider ID", () => {
        expect(strategy.providerId).toBe("iflow");
      });

      test("should have descriptive provider name", () => {
        expect(strategy.providerName).toBe("IFlow (models.dev)");
      });
    });

    describe("Model Management", () => {
      test("should support reasoning model", () => {
        expect(strategy.supportsModel("iflow-reasoning")).toBe(true);
      });

      test("should support fast model", () => {
        expect(strategy.supportsModel("iflow-fast")).toBe(true);
      });

      test("should not support unknown models", () => {
        expect(strategy.supportsModel("unknown-model")).toBe(false);
      });

      test("should get model by ID", () => {
        const model = strategy.getModel("iflow-reasoning");
        expect(model).toBeDefined();
        expect(model?.id).toBe("iflow-reasoning");
        expect(model?.type).toBe("reasoning");
        expect(model?.maxTokens).toBe(4000);
      });

      test("should return undefined for unknown model", () => {
        const model = strategy.getModel("unknown-model");
        expect(model).toBeUndefined();
      });

      test("should have correct supported models", () => {
        expect(strategy.supportedModels).toHaveLength(2);
        expect(strategy.supportedModels[0].id).toBe("iflow-reasoning");
        expect(strategy.supportedModels[1].id).toBe("iflow-fast");
      });
    });

    describe("Configuration", () => {
      test("should return correct configuration", () => {
        const config = strategy.getConfig();
        expect(config.baseUrl).toBeDefined();
        expect(config.supportsResearch).toBe(true);
        expect(config.supportsCompletion).toBe(true);
        expect(config.maxTokens).toBe(4000);
        expect(config.defaultTemperature).toBe(0.7);
      });
    });
  });

  describe("OpenAIStrategy", () => {
    let strategy: OpenAIStrategy;

    beforeEach(() => {
      strategy = createOpenAIStrategy({
        apiKey: "test-key",
        baseUrl: "https://api.openai.com/v1",
      });
    });

    describe("Strategy Interface Compliance", () => {
      test("should implement AIProviderStrategy interface", () => {
        expect(strategy).toHaveProperty("providerId");
        expect(strategy).toHaveProperty("providerName");
        expect(strategy).toHaveProperty("supportedModels");
        expect(strategy).toHaveProperty("supportsModel");
        expect(strategy).toHaveProperty("getModel");
        expect(strategy).toHaveProperty("generateCompletion");
        expect(strategy).toHaveProperty("conductResearch");
        expect(strategy).toHaveProperty("healthCheck");
        expect(strategy).toHaveProperty("getConfig");
      });

      test("should have unique provider ID", () => {
        expect(strategy.providerId).toBe("openai");
      });

      test("should have descriptive provider name", () => {
        expect(strategy.providerName).toBe("OpenAI (GPT)");
      });
    });

    describe("Model Management", () => {
      test("should support GPT-4", () => {
        expect(strategy.supportsModel("gpt-4")).toBe(true);
      });

      test("should support GPT-4 Turbo", () => {
        expect(strategy.supportsModel("gpt-4-turbo")).toBe(true);
      });

      test("should support GPT-3.5 Turbo", () => {
        expect(strategy.supportsModel("gpt-3.5-turbo")).toBe(true);
      });

      test("should not support unknown models", () => {
        expect(strategy.supportsModel("unknown-model")).toBe(false);
      });

      test("should get model by ID", () => {
        const model = strategy.getModel("gpt-4");
        expect(model).toBeDefined();
        expect(model?.id).toBe("gpt-4");
        expect(model?.type).toBe("reasoning");
        expect(model?.maxTokens).toBe(8192);
      });

      test("should have correct supported models", () => {
        expect(strategy.supportedModels).toHaveLength(3);
      });
    });

    describe("Research Support", () => {
      test("should not support research operations", async () => {
        const query: ResearchRequest = {
          query: "test query",
        };

        await expect(strategy.conductResearch(query)).rejects.toThrow(
          "OpenAI strategy does not support research operations",
        );
      });

      test("should reflect research support in config", () => {
        const config = strategy.getConfig();
        expect(config.supportsResearch).toBe(false);
      });
    });
  });

  describe("AIProviderRegistry", () => {
    let registry: AIProviderRegistry;

    beforeEach(() => {
      registry = AIProviderRegistry.getInstance();
      registry.reset();
    });

    describe("Singleton Pattern", () => {
      test("should return same instance", () => {
        const instance1 = AIProviderRegistry.getInstance();
        const instance2 = AIProviderRegistry.getInstance();
        expect(instance1).toBe(instance2);
      });
    });

    describe("Provider Registration", () => {
      test("should register new provider", () => {
        const mockProvider = {
          providerId: "test-provider",
          providerName: "Test Provider",
          supportedModels: [],
          supportsModel: jest.fn(),
          getModel: jest.fn(),
          generateCompletion: jest.fn(),
          conductResearch: jest.fn(),
          healthCheck: jest.fn(),
          getConfig: jest.fn(),
        };

        registry.registerProvider(mockProvider as any);
        expect(registry.hasProvider("test-provider")).toBe(true);
      });

      test("should throw error for duplicate provider", () => {
        const provider = createIFlowStrategy();

        expect(() => {
          registry.registerProvider(provider);
        }).toThrow("Provider with ID 'iflow' already registered");
      });

      test("should unregister provider", () => {
        const providerIds = registry.getProviderIds();
        expect(providerIds.length).toBeGreaterThan(0);

        const removed = registry.unregisterProvider("iflow");
        expect(removed).toBe(true);
        expect(registry.hasProvider("iflow")).toBe(false);
      });

      test("should return false for unregistering non-existent provider", () => {
        const removed = registry.unregisterProvider("non-existent");
        expect(removed).toBe(false);
      });
    });

    describe("Provider Lookup", () => {
      test("should get provider by ID", () => {
        const provider = registry.getProvider("iflow");
        expect(provider).toBeDefined();
        expect(provider?.providerId).toBe("iflow");
      });

      test("should return undefined for unknown provider", () => {
        const provider = registry.getProvider("unknown-provider");
        expect(provider).toBeUndefined();
      });

      test("should get default provider", () => {
        const provider = registry.getDefaultProvider();
        expect(provider).toBeDefined();
        expect(provider?.providerId).toBe("iflow");
      });

      test("should get all providers", () => {
        const providers = registry.getAllProviders();
        expect(providers.length).toBeGreaterThan(0);
        expect(providers[0]).toHaveProperty("providerId");
      });

      test("should get all provider IDs", () => {
        const providerIds = registry.getProviderIds();
        expect(Array.isArray(providerIds)).toBe(true);
        expect(providerIds.length).toBeGreaterThan(0);
      });

      test("should check if provider exists", () => {
        expect(registry.hasProvider("iflow")).toBe(true);
        expect(registry.hasProvider("unknown")).toBe(false);
      });
    });

    describe("Default Provider Management", () => {
      test("should set default provider", () => {
        registry.setDefaultProvider("openai");
        const provider = registry.getDefaultProvider();
        expect(provider?.providerId).toBe("openai");
      });

      test("should throw error for unknown default provider", () => {
        expect(() => {
          registry.setDefaultProvider("unknown-provider");
        }).toThrow("Provider 'unknown-provider' not found");
      });
    });

    describe("Health Monitoring", () => {
      test("should health check all providers", async () => {
        const healthStatus = await registry.healthCheckAll();
        expect(healthStatus).toBeInstanceOf(Map);
        expect(healthStatus.size).toBeGreaterThan(0);
      });
    });

    describe("Statistics", () => {
      test("should return registry statistics", async () => {
        const stats = await registry.getStats();
        expect(stats).toHaveProperty("totalProviders");
        expect(stats).toHaveProperty("defaultProviderId");
        expect(stats).toHaveProperty("providerIds");
        expect(stats).toHaveProperty("models");
      });
    });
  });

  describe("Strategy Pattern Benefits", () => {
    let registry: AIProviderRegistry;

    beforeEach(() => {
      registry = AIProviderRegistry.getInstance();
      registry.reset();
    });

    test("should demonstrate Open/Closed Principle", () => {
      const registry = AIProviderRegistry.getInstance();

      const initialProviders = registry.getProviderIds().length;

      const mockProvider = {
        providerId: "new-provider",
        providerName: "New Provider",
        supportedModels: [],
        supportsModel: () => false,
        getModel: () => undefined,
        generateCompletion: jest.fn(),
        conductResearch: jest.fn(),
        healthCheck: jest.fn(),
        getConfig: jest.fn(),
      };

      registry.registerProvider(mockProvider as any);

      const newProviders = registry.getProviderIds().length;
      expect(newProviders).toBe(initialProviders + 1);
    });

    test("should demonstrate Single Responsibility Principle", () => {
      const iflowStrategy = createIFlowStrategy();
      const openaiStrategy = createOpenAIStrategy();

      expect(iflowStrategy.providerId).not.toBe(openaiStrategy.providerId);
      expect(iflowStrategy.supportedModels.length).toBe(2);
      expect(openaiStrategy.supportedModels.length).toBe(3);

      const iflowConfig = iflowStrategy.getConfig();
      const openaiConfig = openaiStrategy.getConfig();

      expect(iflowConfig.supportsResearch).toBe(true);
      expect(openaiConfig.supportsResearch).toBe(false);
    });

    test("should enable runtime provider switching", () => {
      const registry = AIProviderRegistry.getInstance();

      const initialProvider = registry.getDefaultProvider().providerId;
      expect(initialProvider).toBe("iflow");

      registry.setDefaultProvider("openai");
      const newProvider = registry.getDefaultProvider().providerId;
      expect(newProvider).toBe("openai");
    });
  });
});
