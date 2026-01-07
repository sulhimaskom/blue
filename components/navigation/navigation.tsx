"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useAuthSafe } from "@/lib/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { getNavigationUI } from "@/lib/constants/navigation-ui";
import { cn, getButtonTheme } from "@/lib/constants/ui-themes";
import { Gradients } from "@/lib/constants/gradients";

interface NavigationProps {
  variant?: "header" | "sidebar";
  className?: string;
}

export function Navigation({ variant = "header", className }: NavigationProps) {
  const { isSignedIn, isLoaded } = useAuthSafe();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isMobileMenuOpen) {
        closeMobileMenu();
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isMobileMenuOpen]);

  const navigationItems = [
    {
      href: "/",
      label: getNavigationUI("navigation", "home"),
      active: true,
    },
    {
      href: "/dashboard",
      label: getNavigationUI("navigation", "dashboard"),
      requiresAuth: true,
    },
    {
      href: "/dashboard/blueprints",
      label: "Blueprints",
      requiresAuth: true,
    },
    {
      href: "/dashboard/monitoring",
      label: getNavigationUI("navigation", "monitoring"),
      requiresAuth: true,
    },
    {
      href: "/dashboard/enterprise/themes",
      label: getNavigationUI("navigation", "enterprise"),
      requiresAuth: true,
    },
  ];

  const filteredItems = navigationItems.filter((item) => {
    if (item.requiresAuth && !isSignedIn) return false;
    return true;
  });

  if (variant === "sidebar") {
    return (
      <nav
        className={cn(
          "w-64 h-full bg-white border-r border-gray-200 p-6",
          className,
        )}
      >
        <div className="space-y-8">
          <div>
            <h2 className={`text-xl font-bold ${Gradients.HERO_TEXT}`}>
              {getNavigationUI("brand", "name")}
            </h2>
          </div>

          <div className="space-y-2">
            {filteredItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "block px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                  item.active
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                )}
                aria-current={item.active ? "page" : undefined}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {isLoaded && isSignedIn && (
            <div className="pt-8 border-t border-gray-200">
              <Link href="/api/auth/logout">
                <Button variant="outline" className="w-full">
                  {getNavigationUI("auth", "signOut")}
                </Button>
              </Link>
            </div>
          )}
        </div>
      </nav>
    );
  }

  return (
    <header
      className={cn("w-full bg-white border-b border-gray-200", className)}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link
              href="/"
              className={`text-xl font-bold ${Gradients.HERO_TEXT}`}
            >
              {getNavigationUI("brand", "name")}
            </Link>
          </div>

          <div className="hidden md:flex items-center space-x-8">
            {filteredItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "text-sm font-medium transition-colors",
                  item.active
                    ? "text-blue-600"
                    : "text-gray-500 hover:text-gray-900",
                )}
                aria-current={item.active ? "page" : undefined}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center space-x-4">
            {isLoaded ? (
              isSignedIn ? (
                <div className="flex items-center space-x-4">
                  <Link href="/api/auth/logout">
                    <Button variant="outline" size="sm">
                      {getNavigationUI("auth", "signOut")}
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="flex items-center space-x-4">
                  <Link href="/sign-in">
                    <Button variant="outline" size="sm">
                      {getNavigationUI("auth", "signIn")}
                    </Button>
                  </Link>
                  <Link href="/sign-up">
                    <Button size="sm" className={getButtonTheme("primary")}>
                      {getNavigationUI("auth", "signUp")}
                    </Button>
                  </Link>
                </div>
              )
            ) : (
              <div className="w-20 h-8 bg-gray-200 rounded animate-pulse" />
            )}

            <button
              className="md:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              onClick={toggleMobileMenu}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-menu"
              aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                {isMobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="md:hidden" id="mobile-menu" ref={mobileMenuRef}>
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              {filteredItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "block px-3 py-2 rounded-md text-base font-medium transition-colors",
                    item.active
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-900",
                  )}
                  onClick={closeMobileMenu}
                  aria-current={item.active ? "page" : undefined}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
