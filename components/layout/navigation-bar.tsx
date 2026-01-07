"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@clerk/nextjs";
import { cn } from "@/lib/utils";

export function NavigationBar() {
  const pathname = usePathname();
  const { isSignedIn, isLoaded } = useAuth();

  // Don't show navigation on auth pages
  if (pathname.startsWith("/sign-")) {
    return null;
  }

  const isActive = (path: string) => {
    if (path === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(path);
  };

  const navItems = [
    {
      href: "/",
      label: "Home",
      active: isActive("/"),
    },
  ];

  const dashboardItems = [
    {
      href: "/dashboard/monitoring",
      label: "Monitoring",
      active: isActive("/dashboard/monitoring"),
    },
    {
      href: "/dashboard/enterprise/themes",
      label: "Enterprise",
      active: isActive("/dashboard/enterprise/themes"),
    },
  ];

  return (
    <nav
      aria-label="Main navigation"
      className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
    >
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo/Brand */}
          <div className="flex items-center space-x-4">
            <Link
              href="/"
              className="text-xl font-bold focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-md px-2 py-1"
              aria-current={isActive("/") ? "page" : undefined}
            >
              Architect Platform
            </Link>
          </div>

          {/* Navigation Items */}
          <div className="flex items-center space-x-6">
            {/* Public Items */}
            <div className="flex items-center space-x-4" role="none">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "text-sm font-medium transition-colors hover:text-primary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-md px-2 py-1",
                    item.active ? "text-primary" : "text-muted-foreground",
                  )}
                  aria-current={item.active ? "page" : undefined}
                >
                  {item.label}
                </Link>
              ))}
            </div>

            {/* Dashboard Items (only show when signed in) */}
            {isLoaded && isSignedIn && (
              <div
                className="flex items-center space-x-4 border-l pl-6"
                role="none"
              >
                {dashboardItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "text-sm font-medium transition-colors hover:text-primary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-md px-2 py-1",
                      item.active ? "text-primary" : "text-muted-foreground",
                    )}
                    aria-current={item.active ? "page" : undefined}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}

            {/* Auth Actions */}
            <div className="flex items-center space-x-2" role="none">
              {isLoaded && !isSignedIn && (
                <>
                  <Button variant="ghost" asChild>
                    <Link href="/sign-in" aria-label="Sign in to your account">
                      Sign In
                    </Link>
                  </Button>
                  <Button asChild>
                    <Link href="/sign-up" aria-label="Create a new account">
                      Sign Up
                    </Link>
                  </Button>
                </>
              )}

              {isLoaded && isSignedIn && (
                <Button variant="outline" asChild>
                  <Link href="/sign-in" aria-label="Sign out of your account">
                    Sign Out
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
