// Test case that specifically reproduces the "validateRequest(...) is not a function" error
// This happens when developers use the function incorrectly

import { validateRequest, validateRequestData } from "../lib/api-utils";
import { z } from "zod";
import { NextRequest } from "next/server";

describe("validateRequest Bug Reproduction and Fix", () => {
  const testSchema = z.object({
    name: z.string().min(1),
  });

  it("should work correctly with original factory pattern", async () => {
    const mockReq = {
      json: async () => ({ name: "test" }),
    } as NextRequest;

    // Correct usage: validateRequest returns a function that takes the request
    const validator = validateRequest(testSchema, "body");
    const result = await validator(mockReq);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ name: "test" });
    } else {
      throw new Error(`Validation failed: ${result.error}`);
    }
  });

  it("should demonstrate the confusion point that leads to BUG-003", async () => {
    const mockReq = {
      json: async () => ({ name: "test" }),
    } as NextRequest;

    // INCORRECT USAGE PATTERN THAT LED TO BUG-003:
    // Someone expects validateRequest to return validation data directly
    // @ts-expect-error - Testing the incorrect usage pattern
    const wrongResult = validateRequest(mockReq, testSchema, "body");

    // Now they think wrongResult is the validation data and try to use it
    // Later when they try to access properties or use it as a function, they get errors
    expect(typeof wrongResult).toBe("function");
  });

  it("should provide intuitive validation with validateRequestData (BUG-003 FIX)", async () => {
    const mockReq = {
      json: async () => ({ name: "test" }),
    } as NextRequest;

    // NEW USER-FRIENDLY PATTERN: validateRequestData takes all parameters directly
    const result = await validateRequestData(mockReq, testSchema, "body");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ name: "test" });
    } else {
      throw new Error(`Validation failed: ${result.error}`);
    }
  });

  it("should demonstrate both patterns work but validateRequestData is more intuitive", async () => {
    const mockReq = {
      json: async () => ({ name: "test" }),
    } as NextRequest;

    // Original pattern (confusing factory)
    const factoryValidator = validateRequest(testSchema, "body");
    const factoryResult = await factoryValidator(mockReq);

    // New pattern (intuitive direct call)
    const directResult = await validateRequestData(mockReq, testSchema, "body");

    expect(factoryResult).toEqual(directResult);
    expect(factoryResult.success).toBe(true);
    expect(directResult.success).toBe(true);
  });

  it("should handle validation errors correctly in both patterns", async () => {
    const mockReq = {
      json: async () => ({ name: "" }), // Invalid: empty string
    } as NextRequest;

    // Original pattern with error
    const factoryValidator = validateRequest(testSchema, "body");
    const factoryResult = await factoryValidator(mockReq);

    // New pattern with error
    const directResult = await validateRequestData(mockReq, testSchema, "body");

    expect(factoryResult.success).toBe(false);
    expect(directResult.success).toBe(false);
    if (!factoryResult.success) {
      expect(factoryResult.error).toContain("Validation failed");
    }
    if (!directResult.success) {
      expect(directResult.error).toContain("Validation failed");
    }
  });

  it("should handle query parameter validation", async () => {
    const mockReq = {
      url: "http://localhost:3000/api/test?name=test",
    } as NextRequest;

    const result = await validateRequestData(mockReq, testSchema, "query");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ name: "test" });
    } else {
      throw new Error(`Validation failed: ${result.error}`);
    }
  });
});
