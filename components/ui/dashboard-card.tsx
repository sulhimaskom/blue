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
}

/**
 * Reusable dashboard card component following atomic design principles
 * Consolidates the duplicate dashboard card pattern from the dashboard page
 *
 * Features:
 * - Consistent design system alignment using ui-themes
 * - Proper semantic HTML (article element)
 * - Accessible button states
 * - Optional badge and icon
 * - Design token-based coloring
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
}) => {
  return (
    <article
      className={cn(
        `${getBackgroundColor("card")} p-6 rounded-lg ${CARD_VARIANTS.default}`,
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3
            className={cn(
              "text-lg font-semibold mb-2",
              getTextColor("heading"),
            )}
          >
            {title}
          </h3>
          <p className={cn("mb-4", getTextColor("body"))}>{description}</p>
        </div>
        {icon && <div className="ml-3">{icon}</div>}
      </div>

      <div className="flex items-center gap-3">
        <Button
          asChild
          variant={buttonVariant === "primary" ? "default" : "secondary"}
        >
          <a href={href} target={target} rel={rel}>
            {buttonText}
          </a>
        </Button>
      </div>

      {badge && (
        <div className="mt-3">
          <span
            className={cn(
              "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
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
