import React, { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface TableRowProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

/**
 * Atomic table row component with hover and interaction support
 */
export const TableRow: React.FC<TableRowProps> = ({
  children,
  className,
  hover = false,
  onClick,
}) => {
  return (
    <tr
      className={cn(
        hover && "hover:bg-gray-50 transition-colors cursor-pointer",
        className,
      )}
      onClick={onClick}
    >
      {children}
    </tr>
  );
};

TableRow.displayName = "TableRow";
