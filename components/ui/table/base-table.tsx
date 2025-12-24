import React, { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface BaseTableProps {
  children: ReactNode;
  className?: string;
  variant?: "default" | "bordered" | "striped";
}

/**
 * Atomic table component with consistent styling patterns
 * Replaces duplicate table implementations across monitoring components
 */
export const BaseTable: React.FC<BaseTableProps> = ({
  children,
  className,
  variant = "default",
}) => {
  const variantClasses = {
    default: "divide-y divide-gray-200",
    bordered: "divide-y divide-gray-200",
    striped: "divide-y divide-gray-200",
  };

  const containerClasses = {
    default: "border border-gray-200",
    bordered: "border border-gray-200 rounded-xl overflow-hidden",
    striped: "border border-gray-200 rounded-xl overflow-hidden",
  };

  return (
    <div className={cn("overflow-hidden", containerClasses[variant])}>
      <div className="overflow-x-auto">
        <table className={cn("min-w-full", variantClasses[variant], className)}>
          {children}
        </table>
      </div>
    </div>
  );
};

BaseTable.displayName = "BaseTable";
