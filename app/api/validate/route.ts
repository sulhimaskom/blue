import { z } from "zod";
import { APIRouteHandler } from "@/lib/services/api-route-handler";
import { blueprintValidationService } from "@/lib/services/blueprint-validation-service";
import { RateLimiters } from "@/lib/rate-limit-config";
import type { BlueprintFormData } from "@/lib/services/blueprint-validation-service";

// Validation schema for blueprint field validation requests
const validateFieldSchema = z.object({
  field: z.enum(["projectName", "input", "projectDescription"], {
    errorMap: () => ({
      message: "Field must be one of: projectName, input, projectDescription",
    }),
  }),
  value: z.string(), // Value must be string for validation
  formData: z.record(z.string().optional()).optional().default({}),
});

export const POST = APIRouteHandler.createPOSTHandler({
  schema: validateFieldSchema,
  requireAuth: true,
  rateLimiter: (identifier: string) => RateLimiters.standard()(identifier),
  handler: async ({ data }) => {
    const { field, value, formData } = data!;

    // Delegate to the blueprint validation service
    const validationResult = await blueprintValidationService.validateField(
      field as keyof BlueprintFormData,
      value,
      formData as Partial<BlueprintFormData>,
    );

    return validationResult;
  },
});
