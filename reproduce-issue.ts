// Quick reproduction script to validate the validateRequest issue
import { validateRequest } from "./lib/api-utils";
import { z } from "zod";
import { NextRequest } from "next/server";

const testSchema = z.object({
  name: z.string(),
});

async function testValidateRequest() {
  // Mock request
  const mockReq = {
    json: async () => ({ name: "test" }),
  } as NextRequest;

  try {
    // This should work according to current implementation
    const validation = await validateRequest(testSchema, "body")(mockReq);
    console.log("Validation result:", validation);
  } catch (error) {
    console.error(
      "Validation error:",
      error instanceof Error ? error.message : String(error),
    );
  }
}

// Run test to confirm issue
testValidateRequest().catch(console.error);
