"use client";

import { ReactNode } from "react";
import { Navigation } from "@/components/navigation/navigation";
import { cn } from "@/lib/constants/ui-themes";

interface AppLayoutProps {
  children: ReactNode;
  className?: string;
  showNavigation?: boolean;
}

export function AppLayout({
  children,
  className,
  showNavigation = true,
}: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-white">
      {showNavigation && <Navigation />}
      <main className={cn(showNavigation ? "pt-0" : "", className)}>
        {children}
      </main>
    </div>
  );
}
