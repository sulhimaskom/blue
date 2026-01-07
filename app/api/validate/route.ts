import { NextRequest, NextResponse } from "next/server";
import { blueprintValidationService } from "@/lib/services/blueprint-validation-service";
import {
  withRateLimiter,
  ValidationError,
  formatErrorResponse,
} from "@/lib/api-utils";

export async function POST(request: NextRequest) {
  return withRateLimiter(request, "standard", async () => {
    try {
      const body = await request.json();
      const { field, value, formData } = body;

      if (!field || value === undefined) {
        throw new ValidationError("Field and value are required");
      }

      const validationResult = await blueprintValidationService.validateField(
        field,
        value,
        formData,
      );

      return NextResponse.json(validationResult);
    } catch (error) {
      return formatErrorResponse(
        error instanceof Error ? error : new Error("Validation failed"),
      );
    }
  });
}
