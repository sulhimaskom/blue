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
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo/Brand */}
          <div className="flex items-center space-x-4">
            <Link href="/" className="text-xl font-bold">
              Architect Platform
            </Link>
          </div>

          {/* Navigation Items */}
          <div className="flex items-center space-x-6">
            {/* Public Items */}
            <div className="flex items-center space-x-4">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "text-sm font-medium transition-colors hover:text-primary",
                    item.active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </div>

            {/* Dashboard Items (only show when signed in) */}
            {isLoaded && isSignedIn && (
              <div className="flex items-center space-x-4 border-l pl-6">
                {dashboardItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "text-sm font-medium transition-colors hover:text-primary",
                      item.active ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}

            {/* Auth Actions */}
            <div className="flex items-center space-x-2">
              {isLoaded && !isSignedIn && (
                <>
                  <Button variant="ghost" asChild>
                    <Link href="/sign-in">Sign In</Link>
                  </Button>
                  <Button asChild>
                    <Link href="/sign-up">Sign Up</Link>
                  </Button>
                </>
              )}

              {isLoaded && isSignedIn && (
                <Button variant="outline" asChild>
                  <Link href="/sign-in">Sign Out</Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
