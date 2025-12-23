/**
 * Authentication Setup for Test Infrastructure
 *
 * Centralizes Clerk authentication mocking to provide
 * consistent auth contexts across all test files.
 */

export interface MockUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

export function setupAuthMocks(user: MockUser | null = null) {
  const defaultUser: MockUser = {
    id: "user_test_123",
    email: "test@example.com",
    firstName: "Test",
    lastName: "User",
  };

  const mockUser = user || defaultUser;

  // Mock Clerk server-side authentication
  jest.mock("@clerk/backend", () => ({
    Clerk: jest.fn(() => ({
      users: {
        getUser: jest.fn().mockResolvedValue(mockUser),
      },
    })),
  }));

  // Mock Clerk Next.js server helpers
  jest.mock("@clerk/nextjs/server", () => ({
    currentUser: jest.fn().mockResolvedValue(mockUser),
    auth: jest.fn().mockResolvedValue({
      userId: mockUser?.id || null,
      user: mockUser,
    }),
    getAuth: jest.fn().mockResolvedValue({
      userId: mockUser?.id || null,
      user: mockUser,
    }),
  }));

  return mockUser;
}

export function setupUnauthenticatedMocks() {
  return setupAuthMocks(null);
}
