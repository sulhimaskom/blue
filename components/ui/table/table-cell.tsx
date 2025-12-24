import React, { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface TableCellProps {
  children: ReactNode;
  className?: string;
  nowrap?: boolean;
}

/**
 * Atomic table cell component for consistent data rendering
 */
export const TableCell: React.FC<TableCellProps> = ({
  children,
  className,
  nowrap = true,
}) => {
  return (
    <td
      className={cn(
        "px-6 py-4 text-sm",
        nowrap && "whitespace-nowrap",
        className,
      )}
    >
      {children}
    </td>
  );
};

TableCell.displayName = "TableCell";
