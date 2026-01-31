"use client";

import { useUser, useAuth } from "@clerk/nextjs";

export interface AuthUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

/**
 * Safe version of useAuth that provides fallback values when ClerkProvider is not available
 *
 * This hook wraps the Clerk useAuth hook with try-catch error handling to prevent
 * rendering errors in components that might render outside of the ClerkProvider context.
 *
 * @returns Object with auth state, providing safe defaults when Clerk is unavailable
 */
export function useAuthSafe() {
  try {
    return useAuth();
  } catch (_error) {
    return {
      isSignedIn: false,
      isLoaded: true,
    };
  }
}

export function useAuthStatus() {
  const { isSignedIn, user, isLoaded } = useUser();

  if (!isLoaded) {
    return {
      isLoading: true,
      isAuthenticated: false,
      user: null,
    };
  }

  if (!isSignedIn || !user) {
    return {
      isLoading: false,
      isAuthenticated: false,
      user: null,
    };
  }

  const authUser: AuthUser = {
    id: user.id,
    email: user.primaryEmailAddress?.emailAddress || "",
    firstName: user.firstName || undefined,
    lastName: user.lastName || undefined,
  };

  return {
    isLoading: false,
    isAuthenticated: true,
    user: authUser,
  };
}
