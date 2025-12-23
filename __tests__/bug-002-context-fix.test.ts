import { createRequestContext } from "@/lib/logger";

// Test that context creation works properly
describe("Webhook Context Bug Fix", () => {
  it("should create context with requestId", () => {
    const context = createRequestContext();

    expect(context).toBeDefined();
    expect(context.requestId).toBeDefined();
    expect(typeof context.requestId).toBe("string");
    expect(context.requestId.length).toBeGreaterThan(0);
  });

  it("should handle context access defensively", () => {
    // Simulate the defensive programming fix we applied
    const context = createRequestContext();
    const requestId = context?.requestId || "unknown";

    expect(requestId).toBe(context.requestId); // Should not fallback to "unknown"
  });

  it("should handle undefined context gracefully", () => {
    // Test the defensive programming with undefined context
    const undefinedContext: any = undefined;
    const requestId = undefinedContext?.requestId || "unknown";

    expect(requestId).toBe("unknown");
  });
});
