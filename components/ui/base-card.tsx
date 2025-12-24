import React, { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { CARD_VARIANTS, SIZE_VARIANTS } from "@/lib/constants/ui-themes";

export interface BaseCardProps {
  children: ReactNode;
  className?: string;
  variant?: "default" | "hover" | "error";
  padding?: "sm" | "md" | "lg";
}

/**
 * Atomic base card component with consistent styling
 * Replaces 15+ duplicated card patterns across monitoring components
 */
export const BaseCard: React.FC<BaseCardProps> = ({
  children,
  className,
  variant = "default",
  padding = "lg",
}) => {
  const baseClasses = "bg-white border rounded-lg overflow-hidden";

  const variantClasses = {
    default: CARD_VARIANTS.default,
    hover: CARD_VARIANTS.hover,
    error: CARD_VARIANTS.error,
  };

  const paddingClasses = SIZE_VARIANTS.card;

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

BaseCard.displayName = "BaseCard";
