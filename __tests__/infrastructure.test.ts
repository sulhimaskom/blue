/**
 * Basic Infrastructure Test
 *
 * This test verifies that the core testing infrastructure
 * is working properly without complex authentication/database logic.
 */

describe("Infrastructure Tests", () => {
  it("should have proper test environment", () => {
    expect(process.env.NODE_ENV).toBe("test");
    expect(typeof jest).toBe("object");
    expect(typeof describe).toBe("function");
    expect(typeof it).toBe("function");
  });

  it("should be able to create basic mocks", () => {
    const mockFn = jest.fn();
    mockFn("test");
    expect(mockFn).toHaveBeenCalledWith("test");
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it("should have Next.js environment properly mocked", () => {
    // Test that basic imports work
    expect(() => require("next/server")).not.toThrow();
  });

  it("should have environment variables mocked", () => {
    // This should pass because we set up process.env in setupEnvironmentMocks
    expect(process.env.DATABASE_URL).toBeDefined();
    expect(process.env.IFLOW_API_KEY).toBeDefined();
    expect(process.env.TAVILY_API_KEY).toBeDefined();
  });
});
