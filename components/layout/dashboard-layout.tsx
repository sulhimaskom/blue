"use client";

import { ReactNode } from "react";
import { Navigation } from "@/components/navigation/navigation";
import { useAuthSafe } from "@/lib/hooks/use-auth";
import { cn } from "@/lib/constants/ui-themes";

interface DashboardLayoutProps {
  children: ReactNode;
  className?: string;
  showSidebar?: boolean;
}

export function DashboardLayout({
  children,
  className,
  showSidebar = true,
}: DashboardLayoutProps) {
  const { isSignedIn, isLoaded } = useAuthSafe();

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Authentication Required
          </h1>
          <p className="text-gray-600 mb-8">
            Please sign in to access the dashboard.
          </p>
          <a
            href="/sign-in"
            className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Sign In
          </a>
        </div>
      </div>
    );
  }

  if (showSidebar) {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <Navigation variant="sidebar" />
        <main className={cn("flex-1 overflow-auto", className)}>
          <div className="p-8">{children}</div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main
        className={cn("max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8", className)}
      >
        {children}
      </main>
    </div>
  );
}
