import React, { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface TableBodyProps {
  children: ReactNode;
  className?: string;
}

/**
 * Atomic table body component for consistent row container rendering
 */
export const TableBody: React.FC<TableBodyProps> = ({
  children,
  className,
}) => {
  return (
    <tbody className={cn("bg-white divide-y divide-gray-200", className)}>
      {children}
    </tbody>
  );
};

TableBody.displayName = "TableBody";
