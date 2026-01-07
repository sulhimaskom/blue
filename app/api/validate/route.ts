import { NextRequest, NextResponse } from "next/server";
import { blueprintValidationService } from "@/lib/services/blueprint-validation-service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { field, value, formData } = body;

    if (!field || value === undefined) {
      return NextResponse.json(
        { error: "Field and value are required" },
        { status: 400 },
      );
    }

    const validationResult = await blueprintValidationService.validateField(
      field,
      value,
      formData,
    );

    return NextResponse.json(validationResult);
  } catch (error) {
    return NextResponse.json({ error: "Validation failed" }, { status: 500 });
  }
}
