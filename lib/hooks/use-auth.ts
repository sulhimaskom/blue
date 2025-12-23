"use client";

import { useUser } from "@clerk/nextjs";

export interface AuthUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
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
