import React from "react";
import { cn } from "@/lib/utils";

export interface SkipLinkProps {
  /** Text to display in the skip link */
  label?: string;
  /** CSS class name */
  className?: string;
}

/**
 * SkipLink component for keyboard accessibility
 *
 * Provides a way for keyboard users to skip navigation and jump directly to main content.
 * This is a WCAG 2.1 Level A requirement (2.4.1 Bypass Blocks).
 *
 * Features:
 * - Only visible when focused (keyboard navigation)
 * - Semantically correct (skip link pattern)
 * - High contrast for visibility
 * - Smooth scrolling to target
 *
 * Usage:
 * ```tsx
 * <SkipLink label="Skip to main content" />
 * <main id="main-content">
 *   // Your main content here
 * </main>
 * ```
 */
export const SkipLink = React.forwardRef<HTMLAnchorElement, SkipLinkProps>(
  ({ label = "Skip to main content", className }, ref) => {
    return (
      <a
        ref={ref}
        href="#main-content"
        className={cn(
          "sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50",
          "focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground",
          "focus:rounded-md focus:font-medium focus:shadow-lg",
          "transition-all duration-200",
          className,
        )}
        aria-label={label}
      >
        {label}
      </a>
    );
  },
);

SkipLink.displayName = "SkipLink";
