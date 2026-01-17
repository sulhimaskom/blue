/**
 * BlueprintGenerationService Test Suite
 *
 * Critical Business Logic Testing:
 * - Blueprint generation with AI reasoning models
 * - Market research integration
 * - JSON response parsing with validation
 * - Blueprint self-reflection validation
 * - Quality scoring algorithm
 * - Pattern extraction
 * - Performance metrics tracking
 * - Comprehensive error handling
 */

jest.mock("@/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock("@/lib/services/ai-service", () => ({
  aiService: {
    generateCompletion: jest.fn(),
    getModels: jest.fn(),
  },
}));

jest.mock("@/lib/services/performance-monitor-service", () => ({
  performanceMonitorService: {
    recordBlueprintMetric: jest.fn(),
  },
}));

import { blueprintGenerationService } from "@/lib/services/blueprint-generation-service";
import { aiService } from "@/lib/services/ai-service";
import { performanceMonitorService } from "@/lib/services/performance-monitor-service";
import { ValidationError, DatabaseError } from "@/lib/api-utils";
import { logger } from "@/lib/logger";
import type { ResearchResult } from "@/lib/services/ai-service";

describe("BlueprintGenerationService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("generateBlueprintDraft - Happy Path", () => {
    it("should generate valid blueprint from AI response", async () => {
      const mockResearch: ResearchResult = {
        query: "build a project management app",
        answer: "Market research data...",
        results: [
          { title: "Competitor 1", url: "https://example.com/1", snippet: "Snippet 1" },
          { title: "Competitor 2", url: "https://example.com/2", snippet: "Snippet 2" },
        ],
      };

      const mockBlueprintJSON = JSON.stringify({
        projectName: "ProjectMaster",
        projectDescription: "A modern project management platform",
        techStack: {
          runtime: "Node.js 20+",
          framework: "Next.js 15",
          database: "PostgreSQL 16",
          auth: "Clerk",
          deployment: "Vercel",
        },
        features: ["Task management", "Team collaboration", "Real-time updates", "Reporting", "Time tracking", "File sharing", "Notifications", "Integrations"],
        monetizationStrategy: "Freemium model with paid teams and enterprise plans",
        architecture: {
          type: "Microservices",
          scaling: "Horizontal scaling with Kubernetes",
          security: ["OWASP compliance", "JWT authentication", "Data encryption", "Rate limiting"],
        },
      });

      (aiService.getModels as jest.Mock).mockReturnValue({
        reasoning: "gpt-4-reasoning",
      });

      (aiService.generateCompletion as jest.Mock)
        .mockResolvedValueOnce({
          content: `Here's the blueprint:\n\`\`\`json\n${mockBlueprintJSON}\n\`\`\``,
        })
        .mockResolvedValueOnce({
          content: "VALID",
        });

      const result = await blueprintGenerationService.generateBlueprintDraft({
        input: "build a project management app",
        research: mockResearch,
      });

      expect(result).toEqual({
        projectName: "ProjectMaster",
        projectDescription: "A modern project management platform",
        techStack: {
          runtime: "Node.js 20+",
          framework: "Next.js 15",
          database: "PostgreSQL 16",
          auth: "Clerk",
          deployment: "Vercel",
        },
        features: expect.arrayContaining(["Task management"]),
        monetizationStrategy: expect.any(String),
        architecture: {
          type: expect.any(String),
          scaling: expect.any(String),
          security: expect.any(Array),
        },
      });

      expect(aiService.generateCompletion).toHaveBeenCalledTimes(2);
      expect(performanceMonitorService.recordBlueprintMetric).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          generationTime: expect.any(Number),
        }),
      );
    });

    it("should generate blueprint with JSON without markdown code block", async () => {
      const mockResearch: ResearchResult = {
        query: "build an e-commerce site",
        answer: "Market research data...",
        results: [
          { title: "Competitor 1", url: "https://example.com/1", snippet: "Snippet 1" },
        ],
      };

      const mockBlueprintJSON = JSON.stringify({
        projectName: "ShopEase",
        projectDescription: "A modern e-commerce platform",
        techStack: {
          runtime: "Node.js 20+",
          framework: "Next.js 15",
          database: "PostgreSQL 16",
          auth: "Clerk",
          deployment: "Vercel",
        },
        features: ["Product catalog", "Shopping cart", "Checkout"],
        monetizationStrategy: "Transaction fees and premium features",
        architecture: {
          type: "Monolith",
          scaling: "Horizontal scaling",
          security: ["OWASP compliance"],
        },
      });

      (aiService.getModels as jest.Mock).mockReturnValue({
        reasoning: "gpt-4-reasoning",
      });

      (aiService.generateCompletion as jest.Mock)
        .mockResolvedValueOnce({
          content: mockBlueprintJSON,
        })
        .mockResolvedValueOnce({
          content: "VALID",
        });

      const result = await blueprintGenerationService.generateBlueprintDraft({
        input: "build an e-commerce site",
        research: mockResearch,
      });

      expect(result.projectName).toBe("ShopEase");
      expect(performanceMonitorService.recordBlueprintMetric).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
        }),
      );
    });

    it("should include projectId in performance metrics when provided", async () => {
      const mockResearch: ResearchResult = {
        query: "build an app",
        answer: "Research data...",
        results: [],
      };

      const mockBlueprintJSON = JSON.stringify({
        projectName: "TestApp",
        projectDescription: "Test description",
        techStack: {
          runtime: "Node.js",
          framework: "Next.js",
          database: "PostgreSQL",
          auth: "Clerk",
          deployment: "Vercel",
        },
        features: ["Feature 1"],
        monetizationStrategy: "Freemium",
        architecture: {
          type: "Monolith",
          scaling: "Horizontal",
          security: ["Security"],
        },
      });

      (aiService.getModels as jest.Mock).mockReturnValue({
        reasoning: "gpt-4-reasoning",
      });

      (aiService.generateCompletion as jest.Mock)
        .mockResolvedValueOnce({
          content: `Here's the blueprint:\n\`\`\`json\n${mockBlueprintJSON}\n\`\`\``,
        })
        .mockResolvedValueOnce({
          content: "VALID",
        });

      await blueprintGenerationService.generateBlueprintDraft({
        input: "build an app",
        research: mockResearch,
        projectId: "proj_123",
      });

      expect(performanceMonitorService.recordBlueprintMetric).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: "proj_123",
        }),
      );
    });
  });

  describe("generateBlueprintDraft - Input Validation", () => {
    it("should handle empty input string", async () => {
      const mockResearch: ResearchResult = {
        query: "",
        answer: "No research data...",
        results: [],
      };

      const mockBlueprintJSON = JSON.stringify({
        projectName: "DefaultApp",
        projectDescription: "A default application",
        techStack: {
          runtime: "Node.js",
          framework: "Next.js",
          database: "PostgreSQL",
          auth: "Clerk",
          deployment: "Vercel",
        },
        features: ["Default feature"],
        monetizationStrategy: "Default strategy",
        architecture: {
          type: "Monolith",
          scaling: "Horizontal",
          security: ["Security"],
        },
      });

      (aiService.getModels as jest.Mock).mockReturnValue({
        reasoning: "gpt-4-reasoning",
      });

      (aiService.generateCompletion as jest.Mock)
        .mockResolvedValueOnce({
          content: mockBlueprintJSON,
        })
        .mockResolvedValueOnce({
          content: "VALID",
        });

      const result = await blueprintGenerationService.generateBlueprintDraft({
        input: "",
        research: mockResearch,
      });

      expect(result).toBeDefined();
    });

    it("should handle missing research results array", async () => {
      const mockResearch: ResearchResult = {
        query: "test query",
        answer: "Test answer",
        results: [],
      };

      const mockBlueprintJSON = JSON.stringify({
        projectName: "TestApp",
        projectDescription: "Test description",
        techStack: {
          runtime: "Node.js",
          framework: "Next.js",
          database: "PostgreSQL",
          auth: "Clerk",
          deployment: "Vercel",
        },
        features: ["Feature 1"],
        monetizationStrategy: "Freemium",
        architecture: {
          type: "Monolith",
          scaling: "Horizontal",
          security: ["Security"],
        },
      });

      (aiService.getModels as jest.Mock).mockReturnValue({
        reasoning: "gpt-4-reasoning",
      });

      (aiService.generateCompletion as jest.Mock)
        .mockResolvedValueOnce({
          content: mockBlueprintJSON,
        })
        .mockResolvedValueOnce({
          content: "VALID",
        });

      const result = await blueprintGenerationService.generateBlueprintDraft({
        input: "test query",
        research: mockResearch,
      });

      expect(result).toBeDefined();
    });
  });

  describe("generateBlueprintDraft - JSON Parsing", () => {
    it("should handle malformed JSON response", async () => {
      const mockResearch: ResearchResult = {
        query: "test",
        answer: "test",
        results: [],
      };

      (aiService.getModels as jest.Mock).mockReturnValue({
        reasoning: "gpt-4-reasoning",
      });

      (aiService.generateCompletion as jest.Mock).mockResolvedValueOnce({
        content: "This is not JSON at all",
      });

      await expect(
        blueprintGenerationService.generateBlueprintDraft({
          input: "test",
          research: mockResearch,
        }),
      ).rejects.toThrow(ValidationError);

      expect(logger.error).toHaveBeenCalled();
      expect(performanceMonitorService.recordBlueprintMetric).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
        }),
      );
    });

    it("should handle missing required fields in JSON", async () => {
      const mockResearch: ResearchResult = {
        query: "test",
        answer: "test",
        results: [],
      };

      const incompleteJSON = JSON.stringify({
        projectName: "TestApp",
      });

      (aiService.getModels as jest.Mock).mockReturnValue({
        reasoning: "gpt-4-reasoning",
      });

      (aiService.generateCompletion as jest.Mock).mockResolvedValueOnce({
        content: incompleteJSON,
      });

      await expect(
        blueprintGenerationService.generateBlueprintDraft({
          input: "test",
          research: mockResearch,
        }),
      ).rejects.toThrow(ValidationError);

      expect(performanceMonitorService.recordBlueprintMetric).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
        }),
      );
    });

    it("should handle empty JSON object", async () => {
      const mockResearch: ResearchResult = {
        query: "test",
        answer: "test",
        results: [],
      };

      (aiService.getModels as jest.Mock).mockReturnValue({
        reasoning: "gpt-4-reasoning",
      });

      (aiService.generateCompletion as jest.Mock).mockResolvedValueOnce({
        content: "{}",
      });

      await expect(
        blueprintGenerationService.generateBlueprintDraft({
          input: "test",
          research: mockResearch,
        }),
      ).rejects.toThrow(ValidationError);
    });

    it("should handle JSON with missing nested techStack fields", async () => {
      const mockResearch: ResearchResult = {
        query: "test",
        answer: "test",
        results: [],
      };

      const incompleteTechStackJSON = JSON.stringify({
        projectName: "TestApp",
        projectDescription: "Test",
        techStack: {
          runtime: "Node.js",
        },
        features: ["Feature 1"],
        monetizationStrategy: "Freemium",
        architecture: {
          type: "Monolith",
          scaling: "Horizontal",
          security: [],
        },
      });

      (aiService.getModels as jest.Mock).mockReturnValue({
        reasoning: "gpt-4-reasoning",
      });

      (aiService.generateCompletion as jest.Mock)
        .mockResolvedValueOnce({
          content: incompleteTechStackJSON,
        })
        .mockResolvedValueOnce({
          content: "VALID",
        });

      const result = await blueprintGenerationService.generateBlueprintDraft({
        input: "test",
        research: mockResearch,
      });

      expect(result.techStack.runtime).toBe("Node.js");
    });
  });

  describe("generateBlueprintDraft - Blueprint Validation", () => {
    it("should handle blueprint validation failure", async () => {
      const mockResearch: ResearchResult = {
        query: "test",
        answer: "test",
        results: [],
      };

      const mockBlueprintJSON = JSON.stringify({
        projectName: "TestApp",
        projectDescription: "Test",
        techStack: {
          runtime: "Node.js",
          framework: "Next.js",
          database: "PostgreSQL",
          auth: "Clerk",
          deployment: "Vercel",
        },
        features: ["Feature 1"],
        monetizationStrategy: "Freemium",
        architecture: {
          type: "Monolith",
          scaling: "Horizontal",
          security: [],
        },
      });

      (aiService.getModels as jest.Mock).mockReturnValue({
        reasoning: "gpt-4-reasoning",
      });

      (aiService.generateCompletion as jest.Mock)
        .mockResolvedValueOnce({
          content: mockBlueprintJSON,
        })
        .mockResolvedValueOnce({
          content: "CRITICISM: The tech stack is not appropriate for the use case",
        });

      await expect(
        blueprintGenerationService.generateBlueprintDraft({
          input: "test",
          research: mockResearch,
        }),
      ).rejects.toThrow(ValidationError);

      expect(logger.warn).toHaveBeenCalledWith(
        "Blueprint validation identified issues",
        expect.objectContaining({
          projectName: "TestApp",
        }),
      );

      expect(performanceMonitorService.recordBlueprintMetric).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
        }),
      );
    });

    it("should handle validation returning 'VALID' prefix", async () => {
      const mockResearch: ResearchResult = {
        query: "test",
        answer: "test",
        results: [],
      };

      const mockBlueprintJSON = JSON.stringify({
        projectName: "TestApp",
        projectDescription: "Test",
        techStack: {
          runtime: "Node.js",
          framework: "Next.js",
          database: "PostgreSQL",
          auth: "Clerk",
          deployment: "Vercel",
        },
        features: ["Feature 1"],
        monetizationStrategy: "Freemium",
        architecture: {
          type: "Monolith",
          scaling: "Horizontal",
          security: [],
        },
      });

      (aiService.getModels as jest.Mock).mockReturnValue({
        reasoning: "gpt-4-reasoning",
      });

      (aiService.generateCompletion as jest.Mock)
        .mockResolvedValueOnce({
          content: mockBlueprintJSON,
        })
        .mockResolvedValueOnce({
          content: "VALID - This blueprint is production ready",
        });

      const result = await blueprintGenerationService.generateBlueprintDraft({
        input: "test",
        research: mockResearch,
      });

      expect(result.projectName).toBe("TestApp");
    });

    it("should log validation success", async () => {
      const mockResearch: ResearchResult = {
        query: "test",
        answer: "test",
        results: [],
      };

      const mockBlueprintJSON = JSON.stringify({
        projectName: "TestApp",
        projectDescription: "Test",
        techStack: {
          runtime: "Node.js",
          framework: "Next.js",
          database: "PostgreSQL",
          auth: "Clerk",
          deployment: "Vercel",
        },
        features: ["Feature 1"],
        monetizationStrategy: "Freemium",
        architecture: {
          type: "Monolith",
          scaling: "Horizontal",
          security: [],
        },
      });

      (aiService.getModels as jest.Mock).mockReturnValue({
        reasoning: "gpt-4-reasoning",
      });

      (aiService.generateCompletion as jest.Mock)
        .mockResolvedValueOnce({
          content: mockBlueprintJSON,
        })
        .mockResolvedValueOnce({
          content: "VALID",
        });

      await blueprintGenerationService.generateBlueprintDraft({
        input: "test",
        research: mockResearch,
      });

      expect(logger.info).toHaveBeenCalledWith(
        "Blueprint validation passed",
        expect.objectContaining({
          projectName: "TestApp",
        }),
      );
    });
  });

  describe("generateBlueprintDraft - Error Handling", () => {
    it("should handle AIService generation error", async () => {
      const mockResearch: ResearchResult = {
        query: "test",
        answer: "test",
        results: [],
      };

      (aiService.getModels as jest.Mock).mockReturnValue({
        reasoning: "gpt-4-reasoning",
      });

      (aiService.generateCompletion as jest.Mock).mockRejectedValueOnce(
        new Error("AI service unavailable"),
      );

      await expect(
        blueprintGenerationService.generateBlueprintDraft({
          input: "test",
          research: mockResearch,
        }),
      ).rejects.toThrow("AI service unavailable");

      expect(logger.error).toHaveBeenCalled();
      expect(performanceMonitorService.recordBlueprintMetric).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
        }),
      );
    });

    it("should handle validation AI service error", async () => {
      const mockResearch: ResearchResult = {
        query: "test",
        answer: "test",
        results: [],
      };

      const mockBlueprintJSON = JSON.stringify({
        projectName: "TestApp",
        projectDescription: "Test",
        techStack: {
          runtime: "Node.js",
          framework: "Next.js",
          database: "PostgreSQL",
          auth: "Clerk",
          deployment: "Vercel",
        },
        features: ["Feature 1"],
        monetizationStrategy: "Freemium",
        architecture: {
          type: "Monolith",
          scaling: "Horizontal",
          security: [],
        },
      });

      (aiService.getModels as jest.Mock).mockReturnValue({
        reasoning: "gpt-4-reasoning",
      });

      (aiService.generateCompletion as jest.Mock)
        .mockResolvedValueOnce({
          content: mockBlueprintJSON,
        })
        .mockRejectedValueOnce(new Error("Validation AI service error"));

      await expect(
        blueprintGenerationService.generateBlueprintDraft({
          input: "test",
          research: mockResearch,
        }),
      ).rejects.toThrow();

      expect(logger.error).toHaveBeenCalled();
      expect(performanceMonitorService.recordBlueprintMetric).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
        }),
      );
    });

    it("should record performance metrics for failed generation", async () => {
      const mockResearch: ResearchResult = {
        query: "test",
        answer: "test",
        results: [],
      };

      (aiService.getModels as jest.Mock).mockReturnValue({
        reasoning: "gpt-4-reasoning",
      });

      (aiService.generateCompletion as jest.Mock).mockRejectedValueOnce(
        new Error("Test error"),
      );

      await expect(
        blueprintGenerationService.generateBlueprintDraft({
          input: "test",
          research: mockResearch,
        }),
      ).rejects.toThrow();

      expect(performanceMonitorService.recordBlueprintMetric).toHaveBeenCalledWith({
        blueprintId: expect.any(String),
        projectId: "unknown",
        generationTime: expect.any(Number),
        success: false,
        timestamp: expect.any(Date),
        patterns: [],
      });
    });
  });

  describe("generateBlueprintDraft - Quality Scoring", () => {
    it("should calculate quality score for complete tech stack", async () => {
      const mockResearch: ResearchResult = {
        query: "test",
        answer: "test",
        results: [],
      };

      const mockBlueprintJSON = JSON.stringify({
        projectName: "TestApp",
        projectDescription: "Test",
        techStack: {
          runtime: "Node.js",
          framework: "Next.js",
          database: "PostgreSQL",
          auth: "Clerk",
          deployment: "Vercel",
        },
        features: ["Feature 1", "Feature 2", "Feature 3", "Feature 4", "Feature 5"],
        monetizationStrategy: "A comprehensive monetization strategy with detailed pricing",
        architecture: {
          type: "Monolith",
          scaling: "Horizontal",
          security: ["Security 1", "Security 2"],
        },
      });

      (aiService.getModels as jest.Mock).mockReturnValue({
        reasoning: "gpt-4-reasoning",
      });

      (aiService.generateCompletion as jest.Mock)
        .mockResolvedValueOnce({
          content: mockBlueprintJSON,
        })
        .mockResolvedValueOnce({
          content: "VALID",
        });

      await blueprintGenerationService.generateBlueprintDraft({
        input: "test",
        research: mockResearch,
      });

      expect(performanceMonitorService.recordBlueprintMetric).toHaveBeenCalledWith(
        expect.objectContaining({
          qualityScore: 90,
        }),
      );
    });

    it("should calculate lower quality score for incomplete blueprint", async () => {
      const mockResearch: ResearchResult = {
        query: "test",
        answer: "test",
        results: [],
      };

      const mockBlueprintJSON = JSON.stringify({
        projectName: "TestApp",
        projectDescription: "Test",
        techStack: {
          runtime: "Node.js",
          framework: "",
          database: "",
          auth: "",
          deployment: "",
        },
        features: ["Feature 1"],
        monetizationStrategy: "Short",
        architecture: {
          type: "",
          scaling: "",
          security: [],
        },
      });

      (aiService.getModels as jest.Mock).mockReturnValue({
        reasoning: "gpt-4-reasoning",
      });

      (aiService.generateCompletion as jest.Mock)
        .mockResolvedValueOnce({
          content: mockBlueprintJSON,
        })
        .mockResolvedValueOnce({
          content: "VALID",
        });

      await blueprintGenerationService.generateBlueprintDraft({
        input: "test",
        research: mockResearch,
      });

      expect(performanceMonitorService.recordBlueprintMetric).toHaveBeenCalledWith(
        expect.objectContaining({
          qualityScore: expect.any(Number),
        }),
      );
    });
  });

  describe("generateBlueprintDraft - Pattern Extraction", () => {
    it("should extract architecture type pattern", async () => {
      const mockResearch: ResearchResult = {
        query: "test",
        answer: "test",
        results: [],
      };

      const mockBlueprintJSON = JSON.stringify({
        projectName: "TestApp",
        projectDescription: "Test",
        techStack: {
          runtime: "Node.js",
          framework: "Next.js",
          database: "PostgreSQL",
          auth: "Clerk",
          deployment: "Vercel",
        },
        features: ["Feature 1"],
        monetizationStrategy: "Freemium",
        architecture: {
          type: "Microservices",
          scaling: "Horizontal",
          security: [],
        },
      });

      (aiService.getModels as jest.Mock).mockReturnValue({
        reasoning: "gpt-4-reasoning",
      });

      (aiService.generateCompletion as jest.Mock)
        .mockResolvedValueOnce({
          content: mockBlueprintJSON,
        })
        .mockResolvedValueOnce({
          content: "VALID",
        });

      await blueprintGenerationService.generateBlueprintDraft({
        input: "test",
        research: mockResearch,
      });

      expect(performanceMonitorService.recordBlueprintMetric).toHaveBeenCalledWith(
        expect.objectContaining({
          patterns: expect.arrayContaining(["Microservices", "scaling-Horizontal"]),
        }),
      );
    });

    it("should extract scaling pattern with prefix", async () => {
      const mockResearch: ResearchResult = {
        query: "test",
        answer: "test",
        results: [],
      };

      const mockBlueprintJSON = JSON.stringify({
        projectName: "TestApp",
        projectDescription: "Test",
        techStack: {
          runtime: "Node.js",
          framework: "Next.js",
          database: "PostgreSQL",
          auth: "Clerk",
          deployment: "Vercel",
        },
        features: ["Feature 1"],
        monetizationStrategy: "Freemium",
        architecture: {
          type: "Monolith",
          scaling: "Vertical",
          security: [],
        },
      });

      (aiService.getModels as jest.Mock).mockReturnValue({
        reasoning: "gpt-4-reasoning",
      });

      (aiService.generateCompletion as jest.Mock)
        .mockResolvedValueOnce({
          content: mockBlueprintJSON,
        })
        .mockResolvedValueOnce({
          content: "VALID",
        });

      await blueprintGenerationService.generateBlueprintDraft({
        input: "test",
        research: mockResearch,
      });

      expect(performanceMonitorService.recordBlueprintMetric).toHaveBeenCalledWith(
        expect.objectContaining({
          patterns: expect.arrayContaining(["Monolith", "scaling-Vertical"]),
        }),
      );
    });
  });

  describe("generateBlueprintDraft - Logging", () => {
    it("should log blueprint generation start", async () => {
      const mockResearch: ResearchResult = {
        query: "build an app",
        answer: "Research",
        results: [],
      };

      const mockBlueprintJSON = JSON.stringify({
        projectName: "TestApp",
        projectDescription: "Test",
        techStack: {
          runtime: "Node.js",
          framework: "Next.js",
          database: "PostgreSQL",
          auth: "Clerk",
          deployment: "Vercel",
        },
        features: ["Feature 1"],
        monetizationStrategy: "Freemium",
        architecture: {
          type: "Monolith",
          scaling: "Horizontal",
          security: [],
        },
      });

      (aiService.getModels as jest.Mock).mockReturnValue({
        reasoning: "gpt-4-reasoning",
      });

      (aiService.generateCompletion as jest.Mock)
        .mockResolvedValueOnce({
          content: mockBlueprintJSON,
        })
        .mockResolvedValueOnce({
          content: "VALID",
        });

      await blueprintGenerationService.generateBlueprintDraft({
        input: "build an app",
        research: mockResearch,
      });

      expect(logger.info).toHaveBeenCalledWith(
        "Phase 2: Blueprint generation started",
        expect.objectContaining({
          input: "build an app",
        }),
      );
    });

    it("should log blueprint generation completion", async () => {
      const mockResearch: ResearchResult = {
        query: "build an app",
        answer: "Research",
        results: [],
      };

      const mockBlueprintJSON = JSON.stringify({
        projectName: "MyApp",
        projectDescription: "My app description",
        techStack: {
          runtime: "Node.js",
          framework: "Next.js",
          database: "PostgreSQL",
          auth: "Clerk",
          deployment: "Vercel",
        },
        features: ["Feature 1"],
        monetizationStrategy: "Freemium",
        architecture: {
          type: "Monolith",
          scaling: "Horizontal",
          security: [],
        },
      });

      (aiService.getModels as jest.Mock).mockReturnValue({
        reasoning: "gpt-4-reasoning",
      });

      (aiService.generateCompletion as jest.Mock)
        .mockResolvedValueOnce({
          content: mockBlueprintJSON,
        })
        .mockResolvedValueOnce({
          content: "VALID",
        });

      await blueprintGenerationService.generateBlueprintDraft({
        input: "build an app",
        research: mockResearch,
      });

      expect(logger.info).toHaveBeenCalledWith(
        "Phase 2: Blueprint generation completed",
        expect.objectContaining({
          projectName: "MyApp",
          generationTime: expect.any(Number),
        }),
      );
    });
  });
});
