import { describe, it, expect, beforeEach } from "@jest/globals";
import {
  blueprintValidationService,
  type BlueprintFormData,
} from "@/lib/services/blueprint-validation-service";

describe("BlueprintValidationService", () => {
  beforeEach(() => {
    // Reset service state if needed
  });

  describe("Field Validation", () => {
    describe("Project Name Validation", () => {
      it("should validate valid project names", async () => {
        const validNames = [
          "My Awesome Project",
          "E-Commerce Platform",
          "Social Media App",
          "Data Analytics Dashboard",
          "Project-Alpha_v2",
        ];

        for (const name of validNames) {
          const result = await blueprintValidationService.validateField(
            "projectName",
            name,
          );
          expect(result.result.isValid).toBe(true);
          expect(result.result.message).toBeUndefined();
        }
      });

      it("should reject invalid project names", async () => {
        const invalidCases = [
          {
            name: "ab",
            expectedError: "Project name must be at least 3 characters",
          },
          {
            name: "a".repeat(51),
            expectedError: "Project name must be less than 50 characters",
          },
          {
            name: "@invalid",
            expectedError: "Project name can only contain letters",
          },
          {
            name: ".startsWithDot",
            expectedError: "Project name cannot start or end",
          },
          {
            name: "endsWithDot.",
            expectedError: "Project name cannot start or end",
          },
        ];

        for (const { name, expectedError } of invalidCases) {
          const result = await blueprintValidationService.validateField(
            "projectName",
            name,
          );
          expect(result.result.isValid).toBe(false);
          expect(result.result.message).toContain(expectedError);
        }
      });

      it("should provide suggestions for generic project names", async () => {
        const genericNames = ["app", "project", "test", "demo"];

        for (const name of genericNames) {
          const result = await blueprintValidationService.validateField(
            "projectName",
            name,
          );
          expect(result.result.isValid).toBe(true);
          expect(result.result.warning).toBeDefined();
          expect(result.result.suggestions).toBeDefined();
          expect(result.result.suggestions!.length).toBeGreaterThan(0);
        }
      });
    });

    describe("Blueprint Description Validation", () => {
      it("should validate valid blueprint descriptions", async () => {
        const validDescriptions = [
          "Create an e-commerce platform with user authentication and payment processing",
          "Build a social media app for sharing photos and connecting with friends",
          "Develop a data analytics dashboard for tracking business metrics and KPIs",
          "A mobile application that helps users track their fitness goals and workout routines",
        ];

        for (const description of validDescriptions) {
          const result = await blueprintValidationService.validateField(
            "input",
            description,
          );
          expect(result.result.isValid).toBe(true);
          expect(result.result.message).toBeUndefined();
        }
      });

      it("should reject invalid blueprint descriptions", async () => {
        const invalidCases = [
          {
            desc: "short",
            expectedError:
              "Blueprint description must be at least 10 characters",
          },
          {
            desc: "a".repeat(1001),
            expectedError:
              "Blueprint description must be less than 1000 characters",
          },
          {
            desc: "   ",
            expectedError:
              "Blueprint description must be at least 10 characters",
          },
          {
            desc: "one two",
            expectedError:
              "Blueprint description must be at least 10 characters",
          },
        ];

        for (const { desc, expectedError } of invalidCases) {
          const result = await blueprintValidationService.validateField(
            "input",
            desc,
          );
          expect(result.result.isValid).toBe(false);
          expect(result.result.message).toContain(expectedError);
        }
      });

      it("should provide warnings for vague descriptions", async () => {
        const vagueDescriptions = [
          "I want to build a web app",
          "Create a mobile app",
          "Build a website",
        ];

        for (const description of vagueDescriptions) {
          const result = await blueprintValidationService.validateField(
            "input",
            description,
          );
          expect(result.result.isValid).toBe(true);
          expect(result.result.warning).toBeDefined();
          expect(result.result.suggestions).toBeDefined();
        }
      });
    });
  });

  describe("Form Validation", () => {
    it("should validate complete form data", async () => {
      const validFormData: BlueprintFormData = {
        projectName: "E-Commerce Platform",
        input:
          "Create an e-commerce platform with user authentication, product catalog, shopping cart, and payment processing for small businesses",
        projectDescription: "Online marketplace for small businesses",
      };

      const result =
        await blueprintValidationService.validateForm(validFormData);

      expect(result.isValid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
    });

    it("should reject form with multiple errors", async () => {
      const invalidFormData: BlueprintFormData = {
        projectName: "ab",
        input: "short",
        projectDescription: "",
      };

      const result =
        await blueprintValidationService.validateForm(invalidFormData);

      expect(result.isValid).toBe(false);
      expect(Object.keys(result.errors)).toEqual(["projectName", "input"]);
      expect(result.errors.projectName).toBeDefined();
      expect(result.errors.input).toBeDefined();
    });

    it("should provide comprehensive suggestions for improvement", async () => {
      const formDataWithSuggestions: BlueprintFormData = {
        projectName: "app",
        input: "Create a web app",
        projectDescription: "",
      };

      const result = await blueprintValidationService.validateForm(
        formDataWithSuggestions,
      );

      expect(result.suggestions.projectName).toBeDefined();
      expect(result.suggestions.input).toBeDefined();
      expect(result.suggestions.projectName!.length).toBeGreaterThan(0);
      expect(result.suggestions.input!.length).toBeGreaterThan(0);
    });

    it("should identify overly ambitious scope", async () => {
      const ambitiousFormData: BlueprintFormData = {
        projectName: "Everything Platform",
        input:
          "Create a complete platform with everything that solves all problems for everyone with all features",
        projectDescription: "The ultimate solution for everything",
      };

      const result =
        await blueprintValidationService.validateForm(ambitiousFormData);

      expect(result.warnings.input).toBeDefined();
      expect(result.warnings.input).toContain("ambitious");
      expect(result.suggestions.input).toBeDefined();
      expect(result.suggestions.input!.some((s) => s.includes("MVP"))).toBe(
        true,
      );
    });
  });

  describe("Business Logic Validation", () => {
    it("should suggest including action words in descriptions", async () => {
      const result = await blueprintValidationService.validateField(
        "input",
        "A platform for managing customer relationships and sales data",
      );

      expect(result.result.isValid).toBe(true);
      expect(result.result.suggestions).toBeDefined();
      expect(
        result.result.suggestions!.some((s) =>
          s.toLowerCase().includes("action words"),
        ),
      ).toBe(true);
    });

    it("should suggest specifying target audience", async () => {
      const result = await blueprintValidationService.validateField(
        "input",
        "Build a dashboard with analytics and reporting features",
      );

      expect(result.result.isValid).toBe(true);
      expect(result.result.suggestions).toBeDefined();
      expect(
        result.result.suggestions!.some(
          (s) =>
            s.toLowerCase().includes("target") ||
            s.toLowerCase().includes("users"),
        ),
      ).toBe(true);
    });

    it("should handle complex technology requirements", async () => {
      const complexFormData: BlueprintFormData = {
        projectName: "AI Analytics Platform",
        input:
          "Create an artificial intelligence and machine learning platform with advanced analytics and blockchain integration",
        projectDescription: "Advanced AI-powered analytics solution",
      };

      const result =
        await blueprintValidationService.validateForm(complexFormData);

      expect(result.suggestions.input).toBeDefined();
      expect(
        result.suggestions.input!.some(
          (s) =>
            s.toLowerCase().includes("complex") ||
            s.toLowerCase().includes("mvp"),
        ),
      ).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty form data gracefully", async () => {
      const emptyFormData: BlueprintFormData = {
        projectName: "",
        input: "",
        projectDescription: "",
      };

      const result =
        await blueprintValidationService.validateForm(emptyFormData);

      expect(result.isValid).toBe(false);
      expect(result.errors.projectName).toBeDefined();
      expect(result.errors.input).toBeDefined();
    });

    it("should handle maximum length boundaries", async () => {
      const maxLengthProjectName = "a".repeat(50);
      const maxLengthDescription = "a ".repeat(500).trim();

      const result = await blueprintValidationService.validateField(
        "projectName",
        maxLengthProjectName,
      );
      expect(result.result.isValid).toBe(true);

      const descResult = await blueprintValidationService.validateField(
        "input",
        maxLengthDescription,
      );
      expect(descResult.result.isValid).toBe(true);
    });

    it("should handle special characters in project names", async () => {
      const specialCharNames = [
        "Project-Alpha_v2.1",
        "My App (Beta)",
        "Project Name with spaces",
        "123 Project Name",
      ];

      for (const name of specialCharNames) {
        const result = await blueprintValidationService.validateField(
          "projectName",
          name,
        );
        expect(result.result.isValid).toBe(true);
      }
    });
  });
});
