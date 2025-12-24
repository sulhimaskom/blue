import React, { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface GradientCardProps {
  children: ReactNode;
  className?: string;
  variant?: "green" | "purple" | "blue" | "red" | "amber" | "slate";
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

  const variantClasses = {
    green: "bg-gradient-to-br from-green-50 to-emerald-50 border-green-100",
    purple: "bg-gradient-to-br from-purple-50 to-violet-50 border-purple-100",
    blue: "bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100",
    red: "bg-gradient-to-br from-red-50 to-rose-50 border-red-100",
    amber: "bg-gradient-to-br from-amber-50 to-orange-50 border-amber-100",
    slate: "bg-gradient-to-br from-slate-50 to-gray-50 border-slate-100",
  };

  const paddingClasses = {
    md: "p-4",
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

GradientCard.displayName = "GradientCard";
