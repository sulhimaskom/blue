import React, { ReactNode } from "react";
import {
  cn,
  getTextColor,
  getBackgroundColor,
  CARD_VARIANTS,
} from "@/lib/constants/ui-themes";
import { Button } from "@/components/ui/button";

const badgeStyles = {
  success: "bg-green-100 text-green-800",
  neutral: "bg-gray-100 text-gray-800",
} as const;

type BadgeVariant = keyof typeof badgeStyles;

export interface DashboardCardProps {
  title: string;
  description: string;
  buttonText: string;
  href: string;
  buttonVariant?: "primary" | "secondary";
  icon?: ReactNode;
  badge?: {
    text: string;
    variant?: BadgeVariant;
  };
  target?: "_blank" | "_self";
  rel?: string;
  className?: string;
  loading?: boolean;
  disabled?: boolean;
}

/**
 * Reusable dashboard card component following atomic design principles
 * Consolidates duplicate dashboard card pattern from dashboard page
 *
 * Features:
 * - Enhanced hover effects with smooth transitions
 * - Consistent design system alignment using ui-themes
 * - Proper semantic HTML (article element)
 * - Accessible button and focus states
 * - Optional badge and icon
 * - Design token-based coloring
 * - Micro-interactions for improved user feedback
 * - Keyboard navigation support
 * - Loading state support
 */
export const DashboardCard: React.FC<DashboardCardProps> = ({
  title,
  description,
  buttonText,
  href,
  buttonVariant = "primary",
  icon,
  badge,
  target = "_self",
  rel,
  className,
  loading = false,
  disabled = false,
}) => {
  return (
    <article
      className={cn(
        `${getBackgroundColor("card")} p-6 rounded-lg border ${CARD_VARIANTS.default} hover:scale-[1.02] transition-all duration-300 ease-out group`,
        loading && "opacity-60 cursor-not-allowed",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
      aria-busy={loading}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3
            className={cn(
              "text-lg font-semibold mb-2 transition-colors duration-200 group-hover:text-primary",
              getTextColor("heading"),
            )}
          >
            {title}
          </h3>
          <p className={cn("mb-4", getTextColor("body"))}>{description}</p>
        </div>
        {icon && (
          <div className="ml-3 transform transition-transform duration-300 group-hover:scale-110">
            {icon}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Button
          asChild
          variant={buttonVariant === "primary" ? "default" : "secondary"}
          disabled={loading || disabled}
          loading={loading}
        >
          <a
            href={href}
            target={target}
            rel={rel}
            className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {buttonText}
          </a>
        </Button>
      </div>

      {badge && (
        <div className="mt-3">
          <span
            className={cn(
              "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium transition-transform duration-200 hover:scale-105",
              badgeStyles[badge.variant || "neutral"],
            )}
          >
            {badge.text}
          </span>
        </div>
      )}
    </article>
  );
};

DashboardCard.displayName = "DashboardCard";
