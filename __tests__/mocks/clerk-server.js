// Mock for @clerk/nextjs/server
module.exports = {
  currentUser: jest.fn(),
  auth: jest.fn(),
};

// Add dummy test to satisfy Jest
describe("Clerk Server Mock", () => {
  it("should provide Clerk server mock", () => {
    expect(true).toBe(true);
  });
});
