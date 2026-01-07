import { z } from "zod";

export interface BlueprintFormData {
  projectName: string;
  input: string;
  projectDescription?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  warnings: Record<string, string>;
  suggestions: Record<string, string[]>;
}

export interface RealtimeValidationResponse {
  field: string;
  value: string;
  result: {
    isValid: boolean;
    message?: string;
    warning?: string;
    suggestions?: string[];
  };
}

const blueprintFormSchema = z.object({
  projectName: z
    .string()
    .min(3, "Project name must be at least 3 characters")
    .max(50, "Project name must be less than 50 characters")
    .regex(
      /^[a-zA-Z0-9\s\-_.()]+$/,
      "Project name can only contain letters, numbers, spaces, hyphens, underscores, periods, and parentheses",
    )
    .refine(
      (name) => !name.trim().startsWith(".") && !name.trim().endsWith("."),
      "Project name cannot start or end with a period",
    ),
  input: z
    .string()
    .min(10, "Blueprint description must be at least 10 characters")
    .max(1000, "Blueprint description must be less than 1000 characters")
    .refine(
      (desc) => desc.trim().length > 0,
      "Blueprint description cannot be empty or just whitespace",
    )
    .refine((desc) => {
      const wordCount = desc.trim().split(/\s+/).length;
      return wordCount >= 3;
    }, "Blueprint description must contain at least 3 words"),
  projectDescription: z
    .string()
    .max(200, "Project description must be less than 200 characters")
    .optional(),
});

export class BlueprintValidationService {
  private static instance: BlueprintValidationService;

  static getInstance(): BlueprintValidationService {
    if (!BlueprintValidationService.instance) {
      BlueprintValidationService.instance = new BlueprintValidationService();
    }
    return BlueprintValidationService.instance;
  }

  /**
   * Real-time validation for individual form fields
   */
  async validateField(
    field: keyof BlueprintFormData,
    value: string,
    fullData?: Partial<BlueprintFormData>,
  ): Promise<RealtimeValidationResponse> {
    try {
      // Prepare form data for validation
      const formData: BlueprintFormData = {
        projectName: fullData?.projectName || "",
        input: fullData?.input || "",
        projectDescription: fullData?.projectDescription || "",
        [field]: value,
      };

      // Run schema validation
      const result = blueprintFormSchema.safeParse(formData);

      if (!result.success) {
        const fieldError = result.error.issues.find(
          (issue) => issue.path[0] === field,
        );

        if (fieldError) {
          return {
            field,
            value,
            result: {
              isValid: false,
              message: fieldError.message,
              suggestions: this.getFieldSuggestions(field, value),
            },
          };
        }
      }

      // Additional business logic validations
      const businessValidation = await this.runBusinessValidation(
        field,
        value,
        formData,
      );

      return {
        field,
        value,
        result: {
          isValid: businessValidation.isValid,
          message: businessValidation.message,
          warning: businessValidation.warning,
          suggestions: businessValidation.suggestions,
        },
      };
    } catch (error) {
      return {
        field,
        value,
        result: {
          isValid: false,
          message: "Validation error occurred",
        },
      };
    }
  }

  /**
   * Comprehensive form validation
   */
  async validateForm(formData: BlueprintFormData): Promise<ValidationResult> {
    try {
      // Schema validation
      const schemaResult = blueprintFormSchema.safeParse(formData);

      const errors: Record<string, string> = {};
      const warnings: Record<string, string> = {};
      const suggestions: Record<string, string[]> = {};

      if (!schemaResult.success) {
        schemaResult.error.issues.forEach((issue) => {
          const field = issue.path[0] as string;
          errors[field] = issue.message;
          suggestions[field] = this.getFieldSuggestions(
            field as keyof BlueprintFormData,
            formData[field as keyof BlueprintFormData] || "",
          );
        });
      }

      // Business logic validations
      const businessValidations = await Promise.all([
        this.runBusinessValidation(
          "projectName",
          formData.projectName,
          formData,
        ),
        this.runBusinessValidation("input", formData.input, formData),
      ]);

      businessValidations.forEach((validation, index) => {
        const field = index === 0 ? "projectName" : "input";

        if (validation.warning) {
          warnings[field] = validation.warning;
        }

        if (validation.suggestions && validation.suggestions.length > 0) {
          suggestions[field] = [
            ...(suggestions[field] || []),
            ...validation.suggestions,
          ];
        }
      });

      // Blueprint generation viability assessment
      const viabilityAssessment = await this.assessBlueprintViability(formData);
      if (viabilityAssessment.warning) {
        warnings["input"] = viabilityAssessment.warning;
      }
      if (viabilityAssessment.suggestions) {
        suggestions["input"] = [
          ...(suggestions["input"] || []),
          ...viabilityAssessment.suggestions,
        ];
      }

      return {
        isValid: Object.keys(errors).length === 0,
        errors,
        warnings,
        suggestions,
      };
    } catch (error) {
      return {
        isValid: false,
        errors: {
          form: error instanceof Error ? error.message : "Validation failed",
        },
        warnings: {},
        suggestions: {},
      };
    }
  }

  /**
   * Business logic validation for specific fields
   */
  private async runBusinessValidation(
    field: keyof BlueprintFormData,
    value: string,
    formData: BlueprintFormData,
  ): Promise<{
    isValid: boolean;
    message?: string;
    warning?: string;
    suggestions?: string[];
  }> {
    const suggestions: string[] = [];

    switch (field) {
      case "projectName":
        return this.validateProjectName(value, suggestions);

      case "input":
        return this.validateBlueprintDescription(
          value,
          formData.projectName,
          suggestions,
        );

      default:
        return { isValid: true };
    }
  }

  /**
   * Project name specific validations
   */
  private validateProjectName(
    projectName: string,
    suggestions: string[],
  ): {
    isValid: boolean;
    message?: string;
    warning?: string;
    suggestions?: string[];
  } {
    const trimmedName = projectName.trim();

    // Check for common patterns that might cause issues
    const problematicPatterns = [
      /\s+/g, // Multiple spaces
      /^[.-]/, // Starts with dot or dash
      /[.-]$/, // Ends with dot or dash
      /[.-]{2,}/, // Consecutive dots or dashes
    ];

    const hasIssues = problematicPatterns.some((pattern) =>
      pattern.test(trimmedName),
    );

    if (hasIssues) {
      suggestions.push(
        "Consider using camelCase or snake_case for better readability",
      );
      suggestions.push("Avoid consecutive special characters");
    }

    // Check if name is too generic
    const genericNames = ["app", "project", "my app", "test", "demo"];
    if (genericNames.includes(trimmedName.toLowerCase())) {
      return {
        isValid: true,
        warning:
          "Project name seems generic. Consider something more descriptive.",
        suggestions: [
          "Include your domain or technology stack",
          "Make it memorable and brandable",
          "Consider your target audience",
        ],
      };
    }

    // Tech stack hints in project name
    const techStackHints = [
      "react",
      "vue",
      "angular",
      "next",
      "node",
      "python",
    ];
    const hasTechHint = techStackHints.some((tech) =>
      trimmedName.toLowerCase().includes(tech),
    );

    if (hasTechHint) {
      suggestions.push(
        "Consider if the tech stack reference is necessary in the name",
      );
    }

    return {
      isValid: true,
      suggestions: suggestions.length > 0 ? suggestions : undefined,
    };
  }

  /**
   * Blueprint description specific validations
   */
  private validateBlueprintDescription(
    description: string,
    projectName: string,
    suggestions: string[],
  ): {
    isValid: boolean;
    message?: string;
    warning?: string;
    suggestions?: string[];
  } {
    const trimmedDesc = description.trim();
    const wordCount = trimmedDesc.split(/\s+/).length;

    // Content quality indicators
    const hasActionWords =
      /create|build|develop|design|launch|make|implement/i.test(trimmedDesc);
    const hasTargetAudience =
      /for|users|customers|business|market|industry/i.test(trimmedDesc);

    if (!hasActionWords) {
      suggestions.push(
        "Consider including action words like 'create', 'build', or 'develop'",
      );
    }

    if (!hasTargetAudience) {
      suggestions.push(
        "Specify who this blueprint is for (users, customers, specific industry)",
      );
    }

    // Check for vague descriptions
    const vaguePhrases = [
      "a web app",
      "a mobile app",
      "a website",
      "something",
      "anything",
    ];
    const hasVaguePhrases = vaguePhrases.some((phrase) =>
      trimmedDesc.toLowerCase().includes(phrase),
    );

    if (hasVaguePhrases) {
      return {
        isValid: true,
        warning:
          "Description contains vague phrases. Be more specific about functionality.",
        suggestions: [
          "Describe the main features or purpose",
          "What problem does this solve?",
          "Who are the target users?",
          "What makes this unique?",
        ],
      };
    }

    // Length-specific recommendations
    if (wordCount < 10) {
      suggestions.push(
        "Consider adding more detail about features and target users",
      );
    } else if (wordCount > 100) {
      suggestions.push(
        "Consider being more concise - focus on core functionality",
      );
    }

    // Project name duplication in description
    if (
      projectName &&
      trimmedDesc.toLowerCase().includes(projectName.toLowerCase())
    ) {
      suggestions.push(
        "Project name is already included - focus on the description of functionality",
      );
    }

    return {
      isValid: true,
      suggestions: suggestions.length > 0 ? suggestions : undefined,
    };
  }

  /**
   * Assess blueprint generation viability
   */
  private async assessBlueprintViability(formData: BlueprintFormData): Promise<{
    warning?: string;
    suggestions?: string[];
  }> {
    const description = formData.input.toLowerCase();
    const suggestions: string[] = [];

    // Check for complex or ambiguous requirements
    const complexIndicators = [
      "artificial intelligence",
      "machine learning",
      "blockchain",
      "quantum computing",
      "advanced analytics",
    ];

    const hasComplexRequirements = complexIndicators.some((indicator) =>
      description.includes(indicator),
    );

    if (hasComplexRequirements) {
      suggestions.push(
        "Complex technologies may require more detailed specifications",
      );
      suggestions.push("Consider starting with MVP features first");
    }

    // Missing key elements
    const hasUsers = /user|customer|client|audience/i.test(description);
    const hasFeatures = /feature|functionality|capability|can.*do|allows/i.test(
      description,
    );

    if (!hasUsers) {
      suggestions.push("Consider who will use this blueprint");
    }

    if (!hasFeatures) {
      suggestions.push("Describe specific features or functionality");
    }

    // Overly ambitious scope indicators
    const scopeIndicators = [
      "everything",
      "all features",
      "complete solution",
      "full platform",
    ];
    const hasOverlyAmbitiousScope = scopeIndicators.some((indicator) =>
      description.includes(indicator),
    );

    if (hasOverlyAmbitiousScope) {
      return {
        warning:
          "This sounds like a very ambitious project. Consider focusing on core features first.",
        suggestions: [
          "Start with Minimum Viable Product (MVP)",
          "Identify must-have vs nice-to-have features",
          "Consider phased approach to development",
        ],
      };
    }

    return {
      suggestions: suggestions.length > 0 ? suggestions : undefined,
    };
  }

  /**
   * Get field-specific improvement suggestions
   */
  private getFieldSuggestions(
    field: keyof BlueprintFormData,
    value: string,
  ): string[] {
    const suggestions: string[] = [];

    switch (field) {
      case "projectName":
        if (value.length < 5) {
          suggestions.push("Consider a more descriptive name");
        }
        suggestions.push("Use clear, professional naming conventions");
        break;

      case "input":
        if (value.length < 50) {
          suggestions.push("Add more detail about the purpose and features");
        }
        suggestions.push("Include target audience and key benefits");
        suggestions.push("Describe the main problem being solved");
        break;
    }

    return suggestions;
  }
}

export const blueprintValidationService =
  BlueprintValidationService.getInstance();
