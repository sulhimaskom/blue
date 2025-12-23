"use client";

import { useAuthStatus } from "@/lib/hooks/use-auth";
import { SignIn } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";
import { AuthLayout } from "./auth-layout";

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const { isLoading, isAuthenticated } = useAuthStatus();

  if (isLoading) {
    return (
      <AuthLayout>
        <Loader2 className="h-8 w-8 animate-spin" />
      </AuthLayout>
    );
  }

  if (!isAuthenticated) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <AuthLayout>
        <div className="w-full max-w-md space-y-4 text-center">
          <h2 className="text-2xl font-semibold">Authentication Required</h2>
          <p className="text-muted-foreground">
            Please sign in to access this feature.
          </p>
          <SignIn path="/sign-in" />
        </div>
      </AuthLayout>
    );
  }

  return <>{children}</>;
}
