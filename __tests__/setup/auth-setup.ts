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

  // Get existing mocks and update their implementations
  const clerkNextjsServer = require("@clerk/nextjs/server");

  // Update the mock implementations
  if (clerkNextjsServer.currentUser) {
    clerkNextjsServer.currentUser.mockResolvedValue(mockUser);
  }
  if (clerkNextjsServer.auth) {
    clerkNextjsServer.auth.mockResolvedValue({
      userId: mockUser?.id || null,
      user: mockUser,
    });
  }
  if (clerkNextjsServer.getAuth) {
    clerkNextjsServer.getAuth.mockResolvedValue({
      userId: mockUser?.id || null,
      user: mockUser,
    });
  }

  return mockUser;
}

export function setupUnauthenticatedMocks() {
  // Get existing mocks and set them to return null
  const clerkNextjsServer = require("@clerk/nextjs/server");

  if (clerkNextjsServer.currentUser) {
    clerkNextjsServer.currentUser.mockResolvedValue(null);
  }
  if (clerkNextjsServer.auth) {
    clerkNextjsServer.auth.mockResolvedValue({
      userId: null,
      user: null,
    });
  }
  if (clerkNextjsServer.getAuth) {
    clerkNextjsServer.getAuth.mockResolvedValue({
      userId: null,
      user: null,
    });
  }

  return null;
}
