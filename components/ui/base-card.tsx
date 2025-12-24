import React, { ReactNode } from "react";
import { cn } from "@/lib/utils";

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
    default: "border-gray-200",
    hover: "hover:shadow-md transition-all duration-200 border-gray-200",
    error: "border-red-200 bg-red-50",
  };

  const paddingClasses = {
    sm: "p-4",
    md: "p-6",
    lg: "p-6",
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

BaseCard.displayName = "BaseCard";
