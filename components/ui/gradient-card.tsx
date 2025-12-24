import React, { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  GRADIENT_THEMES,
  SIZE_VARIANTS,
  type GradientThemeType,
} from "@/lib/constants/ui-themes";

export interface GradientCardProps {
  children: ReactNode;
  className?: string;
  variant?: GradientThemeType;
  padding?: "md" | "lg";
}

/**
 * Atomic gradient card component for metric displays
 * Eliminates duplicate gradient card patterns across monitoring dashboards
 */
export const GradientCard: React.FC<GradientCardProps> = ({
  children,
  className,
  variant = "blue",
  padding = "lg",
}) => {
  const baseClasses = "text-center rounded-xl border";

  const variantClasses = GRADIENT_THEMES;

  const paddingClasses = {
    md: SIZE_VARIANTS.card.md,
    lg: SIZE_VARIANTS.card.lg,
  };

  return (
    <div
      className={cn(
        baseClasses,
        variantClasses[variant],
        paddingClasses[padding],
        className,
      )}
    >
      {children}
    </div>
  );
};

GradientCard.displayName = "GradientCard";
