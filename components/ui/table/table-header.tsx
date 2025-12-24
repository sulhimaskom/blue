import React from "react";
import { cn } from "@/lib/utils";

export interface TableColumn {
  key: string;
  label: string;
  className?: string;
}

export interface TableHeaderProps {
  columns: TableColumn[];
  className?: string;
}

/**
 * Atomic table header component for consistent column rendering
 */
export const TableHeader: React.FC<TableHeaderProps> = ({
  columns,
  className,
}) => {
  return (
    <thead className={cn("bg-gray-50", className)}>
      <tr>
        {columns.map((column) => (
          <th
            key={column.key}
            className={cn(
              "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider",
              column.className,
            )}
          >
            {column.label}
          </th>
        ))}
      </tr>
    </thead>
  );
};

TableHeader.displayName = "TableHeader";
