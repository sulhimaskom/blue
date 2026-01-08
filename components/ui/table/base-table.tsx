import React, { ReactNode } from "react";
import { cn, CARD_VARIANTS } from "@/lib/constants/ui-themes";

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
    default: CARD_VARIANTS.default,
    bordered: `${CARD_VARIANTS.default} rounded-xl overflow-hidden`,
    striped: `${CARD_VARIANTS.default} rounded-xl overflow-hidden`,
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
